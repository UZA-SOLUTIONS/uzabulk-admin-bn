const mongoose = require('mongoose');
const Product = require("./productsTable");

let ProductBatchSchema = mongoose.Schema({

    productIds: [{
        offerId: String,
        productDetails: {
            type: Object,
            default: null
        },
        status: {
            type: String,
            enum: ["processing", "completed", "already exist", "failed"],
            default: "processing"
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        processedAt: {
            type: Date,
            default: null
        }
    }],
    title: String,
    status: {
        type: String,
        enum: ["processing", "completed", "failed"],
        default: "processing"
    }
}, {
    timestamps: true,
    versionKey: false
});

// Indexing
ProductBatchSchema.index({ createdAt: -1 });
ProductBatchSchema.index({ "productIds.offerId": 1 });

const ProductBatchTable = module.exports = mongoose.model('ProductBatch', ProductBatchSchema);

const countByStatusExpr = (value) => ({
    $size: {
        $filter: {
            input: { $ifNull: ["$productIds", []] },
            as: "product",
            cond: { $eq: ["$$product.status", value] }
        }
    }
});

const derivedStatusExpr = {
    $cond: [
        { $gt: ["$processing", 0] },
        "processing",
        {
            $cond: [
                { $gt: ["$failed", 0] },
                "failed",
                "completed"
            ]
        }
    ]
};

module.exports.getBatchList = (obj, sortByField, sortOrder, paged, pageSize) => {

    return ProductBatchTable.aggregate([
        { $match: obj },
        {
            $sort: sortByField === "createdAt"
                ? { createdAt: parseInt(sortOrder), _id: -1 }
                : { [sortByField]: parseInt(sortOrder), createdAt: -1, _id: -1 }
        },
        { $skip: (paged - 1) * pageSize },
        { $limit: parseInt(pageSize) },
        {
            $addFields: {
                total: { $size: { $ifNull: ["$productIds", []] } },
                processing: countByStatusExpr("processing"),
                completed: countByStatusExpr("completed"),
                alreadyExist: countByStatusExpr("already exist"),
                failed: countByStatusExpr("failed"),
                firstOfferId: { $arrayElemAt: ["$productIds.offerId", 0] },
                firstProductName: { $arrayElemAt: ["$productIds.productDetails.name", 0] }
            }
        },
        {
            $addFields: {
                status: derivedStatusExpr
            }
        },
        {
            $project: {
                _id: 1,
                createdAt: 1,
                status: 1,
                total: 1,
                title: 1,
                processing: 1,
                completed: 1,
                alreadyExist: 1,
                failed: 1,
                firstOfferId: 1,
                firstProductName: 1
            }
        }
    ]);
};

module.exports.getBatchDetail = (batchId) => {

    return ProductBatchTable.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(batchId) } },
        {
            $project: {
                _id: 1,
                createdAt: 1,
                status: 1,
                title: 1,
                total: { $size: "$productIds" },
                productIds: 1,
                processing: {
                    $size: {
                        $filter: {
                            input: "$productIds",
                            as: "product",
                            cond: { $eq: ["$$product.status", "processing"] }
                        }
                    }
                },
                completed: {
                    $size: {
                        $filter: {
                            input: "$productIds",
                            as: "product",
                            cond: { $eq: ["$$product.status", "completed"] }
                        }
                    }
                },
                alreadyExist: {
                    $size: {
                        $filter: {
                            input: "$productIds",
                            as: "product",
                            cond: { $eq: ["$$product.status", "already exist"] }
                        }
                    }
                },
                failed: {
                    $size: {
                        $filter: {
                            input: "$productIds",
                            as: "product",
                            cond: { $eq: ["$$product.status", "failed"] }
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                status: derivedStatusExpr
            }
        }
    ]);
};

module.exports.findOfferIdUsage = async (offerIds) => {
    if (!offerIds || !offerIds.length) {
        throw new Error("OFFER_IDS_IS_REQUIRED");
    }

    const existingBatches = await ProductBatchTable.find({
        "productIds.offerId": { $in: offerIds }
    }).select("_id title status productIds.offerId productIds.status").lean();

    const inBatches = [];
    existingBatches.forEach(batch => {
        (batch.productIds || []).forEach(product => {
            if (offerIds.includes(product.offerId)) {
                inBatches.push({
                    offerId: product.offerId,
                    status: product.status,
                    batchId: batch._id,
                    batchStatus: batch.status,
                    title: batch.title || ""
                });
            }
        });
    });

    const catalogProducts = await Product.find({
        offerId: { $in: offerIds }
    }).select("offerId status name").lean();

    return { inBatches, catalogProducts };
};

module.exports.requeueOfferIds = async (offerIds) => {
    const usage = await module.exports.findOfferIdUsage(offerIds);
    const requeued = [];

    for (const item of usage.inBatches) {
        await ProductBatchTable.updateOne(
            { _id: item.batchId, "productIds.offerId": item.offerId },
            {
                $set: {
                    status: "processing",
                    "productIds.$.status": "processing",
                    "productIds.$.processedAt": null
                }
            }
        );
        requeued.push(item);
    }

    return { ...usage, requeued };
};
