const productBatchTable = require('../models/productBatch');
const mongoose = require('mongoose');
const { processOfferIds } = require('../helper/productBatchImport');

const ALLOWED_SORT_FIELDS = ["createdAt", "updatedAt"];

const extractOfferId = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const fromUrl = raw.match(/offer\/(\d+)/i);
    if (fromUrl) return fromUrl[1];
    if (/^\d+$/.test(raw)) return raw;
    const digits = raw.match(/(\d{6,})/);
    return digits ? digits[1] : "";
};

const normalizeOfferIds = (offerIds = []) => {
    const list = Array.isArray(offerIds) ? offerIds : String(offerIds).split(",");
    return [...new Set(list.map(extractOfferId).filter(Boolean))];
};

const toTime = (value) => {
    const time = value ? new Date(value).getTime() : 0;
    return Number.isNaN(time) ? 0 : time;
};

const sortProductIdsNewestFirst = (productIds = [], batchCreatedAt) => {
    return productIds
        .map((item, index) => ({ item, index }))
        .sort((a, b) => {
            const aTime = toTime(a.item.processedAt) || toTime(a.item.createdAt) || toTime(batchCreatedAt);
            const bTime = toTime(b.item.processedAt) || toTime(b.item.createdAt) || toTime(batchCreatedAt);
            if (bTime !== aTime) return bTime - aTime;
            return a.index - b.index;
        })
        .map(({ item }) => item);
};

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isIncompleteProduct = (item, catalogProduct) => {
    if (!item) return true;
    if (item.status === "failed" || item.status === "processing") return true;
    if (!catalogProduct) return true;
    if (!String(catalogProduct.name || "").trim()) return true;
    if (catalogProduct.status === "archived") return true;
    return false;
};

module.exports = {

    addProductBatch: async (req, res) => {
        try {

            let { offerIds, title } = req.body;
            const normalizedOfferIds = normalizeOfferIds(offerIds);

            // if (!title) {
            //     return res.json(helper.showValidationErrorResponse('TITLE_IS_REQUIRED'));
            // }

            if (!normalizedOfferIds.length) {
                return res.json(helper.showValidationErrorResponse('OFFER_IDS_IS_REQUIRED'));
            }

            if (normalizedOfferIds.length > 50) {
                return res.json(helper.showValidationErrorResponse('OFFER_IDS_MAX_VALIDATION'));
            }

            const usage = await productBatchTable.findOfferIdUsage(normalizedOfferIds);
            const catalogByOffer = {};
            (usage.catalogProducts || []).forEach(product => {
                catalogByOffer[String(product.offerId)] = product;
            });
            const inBatchIds = new Set(usage.inBatches.map(item => String(item.offerId)));
            const incompleteItems = usage.inBatches.filter(item =>
                isIncompleteProduct(item, catalogByOffer[String(item.offerId)])
            );
            const completeItems = usage.inBatches.filter(item =>
                !isIncompleteProduct(item, catalogByOffer[String(item.offerId)])
            );
            const newOfferIds = normalizedOfferIds.filter(id => !inBatchIds.has(id));

            let processedIncomplete = [];
            if (incompleteItems.length) {
                await productBatchTable.requeueOfferIds(incompleteItems.map(item => item.offerId));
                processedIncomplete = await processOfferIds(incompleteItems.map(item => item.offerId));
            }

            if (!newOfferIds.length && incompleteItems.length) {
                return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', {
                    requeued: true,
                    processedNow: true,
                    _id: incompleteItems[0].batchId,
                    items: processedIncomplete,
                    catalogProducts: usage.catalogProducts
                }));
            }

            if (!newOfferIds.length) {
                const uniqueBatchIds = [...new Set(completeItems.map(item => String(item.batchId)))];
                const batchId = uniqueBatchIds[0];
                return res.json(helper.showValidationResponseWithData(
                    "These offer IDs already imported with a product name. Open the existing batch to review them.",
                    {
                        alreadyExists: true,
                        batchId,
                        batches: uniqueBatchIds,
                        items: completeItems,
                        catalogProducts: usage.catalogProducts
                    }
                ));
            }

            const createdAt = new Date();
            const batch = await productBatchTable({
                title,
                productIds: newOfferIds.map(i => ({
                    offerId: i,
                    status: "processing",
                    createdAt
                }))
            }).save();

            if (!batch) {
                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
            }

            return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', {
                _id: batch._id,
                requeued: incompleteItems.length > 0,
                skipped: completeItems,
                catalogProducts: usage.catalogProducts
            }));

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse(error.message));
        }
    },

    getBatchList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields, search } = req.body

            let pageSize = limit || 10;
            let sortByField = ALLOWED_SORT_FIELDS.includes(orderBy) ? orderBy : "createdAt";
            let sortOrder = parseInt(order, 10);
            if (sortOrder !== 1 && sortOrder !== -1) sortOrder = -1;
            let paged = parseInt(page, 10) || 1;
            if (paged < 1) paged = 1;

            const andConditions = [];
            const status = fields?.find(x => x.fieldName == "status")?.fieldValue || null;
            if (status === "processing") {
                andConditions.push({ "productIds.status": "processing" });
            } else if (status === "failed") {
                andConditions.push({ "productIds.status": "failed" });
                andConditions.push({ productIds: { $not: { $elemMatch: { status: "processing" } } } });
            } else if (status === "completed") {
                andConditions.push({ productIds: { $not: { $elemMatch: { status: "processing" } } } });
                andConditions.push({ productIds: { $not: { $elemMatch: { status: "failed" } } } });
            } else if (status) {
                andConditions.push({ status });
            }

            const trimmedSearch = typeof search === "string" ? search.trim() : "";
            if (trimmedSearch) {
                const regex = { $regex: escapeRegex(trimmedSearch), $options: "i" };
                andConditions.push({
                    $or: [{ title: regex }, { "productIds.offerId": regex }]
                });
            }

            let obj = {};
            if (andConditions.length === 1) {
                obj = andConditions[0];
            } else if (andConditions.length > 1) {
                obj = { $and: andConditions };
            }

            const count = await productBatchTable.aggregate([{ $match: obj }, { $group: { _id: null, count: { $sum: 1 } } }]);
            const list = await productBatchTable.getBatchList(obj, sortByField, sortOrder, paged, pageSize);

            let countdata = count[0] ? count[0]?.count : 0;
            return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', list, countdata));
        }
        catch (err) { return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR')); }
    },

    getBatchDetails: async (req, res) => {
        try {

            const { id } = req.params;

            if (!mongoose.isValidObjectId(id)) {
                return res.json(helper.showDatabaseErrorResponse("BATCH_NOT_FOUND"));
            };

            const batch = (await productBatchTable.getBatchDetail(id))[0];

            if (!batch) {
                return res.json(helper.showDatabaseErrorResponse("BATCH_NOT_FOUND"));
            };

            batch.productIds = sortProductIdsNewestFirst(batch.productIds, batch.createdAt);

            return res.json(helper.showSuccessResponse('DATA_SUCCESS', batch));
        }
        catch (err) { return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR')); }
    },

    reprocessOfferIds: async (req, res) => {
        try {
            const normalizedOfferIds = normalizeOfferIds(req.body.offerIds);
            if (!normalizedOfferIds.length) {
                return res.json(helper.showValidationErrorResponse('OFFER_IDS_IS_REQUIRED'));
            }

            const result = await productBatchTable.requeueOfferIds(normalizedOfferIds);
            if (!result.requeued.length) {
                return res.json(helper.showValidationErrorResponse('BATCH_NOT_FOUND'));
            }

            const items = await processOfferIds(normalizedOfferIds);

            return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', {
                requeued: true,
                processedNow: true,
                _id: result.requeued[0].batchId,
                items
            }));
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse(error.message));
        }
    }
}
