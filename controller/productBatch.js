const productBatchTable = require('../models/productBatch');
const mongoose = require('mongoose');

const ALLOWED_SORT_FIELDS = ["createdAt", "updatedAt"];

const normalizeOfferIds = (offerIds = []) => {
    const list = Array.isArray(offerIds) ? offerIds : [];
    return [...new Set(list.map(id => String(id).trim()).filter(Boolean))];
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
            await productBatchTable.validateOfferIds(normalizedOfferIds);
            const createdAt = new Date();
            const batch = await productBatchTable({
                title,
                productIds: normalizedOfferIds.map(i => ({
                    offerId: i,
                    status: "processing",
                    createdAt
                }))
            }).save();

            if (!batch) {
                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
            }

            return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS', { _id: batch._id }));

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
            if (status) andConditions.push({ status });

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
    }
}
