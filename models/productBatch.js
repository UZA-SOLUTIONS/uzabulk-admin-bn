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
            enum: ["processing", "completed", "already exist"],
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
        enum: ["processing", "completed"],
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
            $project: {
                _id: 1,
                createdAt: 1,
                status: 1,
                total: { $size: "$productIds" },
                title: 1,
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
                }
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
                }
            }
        }
    ]);
};

module.exports.validateOfferIds = async (offerIds) => {
    if (!offerIds || !offerIds.length) {
        throw new Error("OFFER_IDS_IS_REQUIRED");
    }

    const existingBatches = await ProductBatchTable.find({
        "productIds.offerId": { $in: offerIds }
    }).lean();

    if (existingBatches.length > 0) {
        const existingIds = existingBatches.flatMap(batch =>
            batch.productIds
                .map(p => p.offerId)
                .filter(id => offerIds.includes(id))
        );

        throw new Error(`Offer ids are already exists in batch: ${[...new Set(existingIds)].join(", ")}`);
    }

    const activeProducts = await Product.find({
        offerId: { $in: offerIds },
        status: "active"
    }).lean();

    if (activeProducts.length > 0) {
        const foundIds = activeProducts.map(p => p.offerId);
        throw new Error(`Offer ids are already exists in products: ${[...new Set(foundIds)].join(", ")}`);
    }

    return;
};
