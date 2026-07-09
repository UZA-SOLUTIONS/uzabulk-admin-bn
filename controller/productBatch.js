const productBatchTable = require('../models/productBatch');
const mongoose = require('mongoose');

module.exports = {

    addProductBatch: async (req, res) => {
        try {

            let { offerIds, title } = req.body;

            // if (!title) {
            //     return res.json(helper.showValidationErrorResponse('TITLE_IS_REQUIRED'));
            // }

            if (!offerIds?.length) {
                return res.json(helper.showValidationErrorResponse('OFFER_IDS_IS_REQUIRED'));
            }

            if (offerIds?.length > 50) {
                return res.json(helper.showValidationErrorResponse('OFFER_IDS_MAX_VALIDATION'));
            }
            await productBatchTable.validateOfferIds(offerIds);
            const batch = await productBatchTable({ title, productIds: offerIds.map(i => ({ offerId: i })) }).save();

            if (!batch) {
                return res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR"));
            }

            return res.json(helper.showSuccessResponse('DATA_ADDED_SUCCESS'));

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse(error.message));
        }
    },

    getBatchList: async (req, res) => {
        try {
            const { orderBy, order, page, limit, fields } = req.body

            let pageSize = limit || 10;
            let sortByField = orderBy || "createdAt";
            let sortOrder = order || -1;
            let paged = page || 1;
            let obj = {};
            const status = fields?.find(x => x.fieldName == "status")?.fieldValue || null;
            if (status) obj["status"] = status;

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

            return res.json(helper.showSuccessResponse('DATA_SUCCESS', batch));
        }
        catch (err) { return res.status(500).json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR')); }
    }
}