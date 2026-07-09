const Order = require('../../../models/ordersTable');
module.exports = {
    addNotes: async (req, res) => {
        try {

            let user = req.user;

            let { content } = req.body;

            let { id } = req.params;


            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            };

            if (!content) {
                return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
            };

            const getOrder = await Order.getOrderByIdAsyncForRes(id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            if (getOrder.orderStatus === "cancelled") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            };

            let update = {
                _id: id,
                $push: { notes: { content, addedBy: user._id } }
            };

            Order.updateOrderVendorNew(update, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('NOTES_ADDED_SUCCESS', {}));
                }
            });
        } catch (error) {
            console.log(error)

            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    getNotes: async (req, res) => {
        try {
            let { id } = req.params;

            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            };

            const getOrder = await Order.findById(id, 'notes');
            if (!getOrder) return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));

            res.json(helper.showSuccessResponse('NOTES_FETCHED_SUCCESS', getOrder.notes));

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    updateNote: async (req, res) => {
        try {
            let { id, noteId } = req.params;

            let { content } = req.body;

            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            };

            if (!noteId) {
                return res.json(helper.showValidationErrorResponse('NOTE_ID_REQUIRED'));
            };

            if (!content) {
                return res.json(helper.showValidationErrorResponse('CONTENT_IS_REQUIRED'));
            };

            const update = { "notes.$.content": content, "notes.$.updatedAt": new Date() };
            const result = await Order.updateOne({ _id: id, "notes._id": noteId }, { $set: update });

            if (result.modifiedCount === 0) {
                return res.json(helper.showValidationErrorResponse('INVALID_NOTE_ID'));
            }

            res.json(helper.showSuccessResponse('NOTE_UPDATED_SUCCESS', {}));

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    deleteNote: async (req, res) => {
        try {
            let { id, noteId } = req.params;

            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            };

            if (!noteId) {
                return res.json(helper.showValidationErrorResponse('NOTE_ID_REQUIRED'));
            };

            const result = await Order.updateOne({ _id: id }, { $pull: { notes: { _id: noteId } } });
            if (result.modifiedCount === 0) {
                return res.json(helper.showValidationErrorResponse('INVALID_NOTE_ID'));
            };

            res.json(helper.showSuccessResponse('NOTE_DELETED_SUCCESS', {}));

        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    }


}





