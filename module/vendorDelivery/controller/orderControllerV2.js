const Order = require('../../../models/ordersTable');
const deliveryRequest = require('../utility/deliveryRequest');
const sendRequestHelper = require('../../../helper/sendRequest');
const Transaction = require('../utility/transaction');
const emailService = require("../utility/emailService");
const refoundPayment = require("../../../middleware/refoundPayment");
const orderService = require("../../../helper/orderService")
const {
    mergeTrackingHistory,
    syncTrackingStatusToLogistics,
} = require("../../../helper/logisticsTracking");

module.exports = {

    acceptRequestByRestaurant: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsyncForRes(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            if (getOrder.orderStatus === "cancelled") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            }

            data.orderStatus = "confirmed";
            data.isScheduleProcess = getOrder.scheduledType === "now" ? true : false;
            data.date_vendor_confirmed_utc = new Date();
            data.nearByTempDrivers = [];
            data.isDriverFound = "no";

            Order.updateOrderVendorNew(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', { orderId: resdata._id }));
                    deliveryRequest.afterAcceptRequest(resdata);
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    rejectRequest: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }
            if (getOrder.orderStatus == "cancelled") {
                return res.json(helper.showValidationErrorResponse('ORDER_ALREADY_CANCEL'));
            }
            if (getOrder.orderStatus == "rejected") {
                return res.json(helper.showValidationErrorResponse('ORDER_ALREADY_REJECTED'));
            }
            // refoundPayment.refundamountTouser(getOrder); //refunding amount (not working)
            data.orderStatus = "rejected";
            data.date_vendor_rejected_utc = new Date();
            data.adminEarning = 0;
            data.vendorEarning = 0;
            data.deliveryBoyEarning = 0;

            Order.updateOrderVendorNew(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let orderResponseData = {
                        orderId: resdata._id
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', orderResponseData));
                    deliveryRequest.afterRejectRequest(resdata);
                    orderService.manageProductStock(resdata.line_items, true);
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    cancelRequest: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }
            if (getOrder.orderStatus == "cancelled") {
                return res.json(helper.showValidationErrorResponse('ORDER_ALREADY_CANCEL'));
            }
            refoundPayment.refundamountTouser(getOrder); //refunding amount
            data.orderStatus = "cancelled";
            data.date_vendor_cancel_utc = new Date();

            Order.updateOrderVendorNew(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let orderResponseData = {
                        orderId: resdata._id
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', orderResponseData));
                    deliveryRequest.afterOrderCancelledByVendor(resdata);
                    orderService.manageProductStock(resdata.line_items, true);

                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    markOrderReadyByRestaurant: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsyncForRes(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            data.isOrderMarkReady = true;
            data.date_vendor_ready_utc = new Date();

            Order.updateOrderVendorNew(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let orderResponseData = {
                        orderId: resdata._id,
                        success: true,
                        type: resdata.orderStatus
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', orderResponseData));
                    deliveryRequest.afterMarkReady(resdata);
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    inProcessOrderByRestaurant: async (req, res) => {
        try {
            let data = req.body;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsyncForRes(data._id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            data.isScheduleProcess = true;
            data.nearByTempDrivers = [];
            data.isDriverFound = "no";

            Order.updateOrderVendorNew(data, (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let orderResponseData = {
                        orderId: resdata._id,
                        success: true,
                        type: resdata.orderStatus
                    }
                    res.json(helper.showSuccessResponse('UPDATE_SUCCESS', orderResponseData));
                    deliveryRequest.afterScheduleProcess(resdata);
                    sendRequestHelper.sendRequest(resdata._id)
                }
            });
        } catch (error) {
            console.log(">>>>>>>>>>>>>", error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    completeOrderByVendor: async (req, res) => {
        try {
            let data = req.body;
            let user = req.user;

            if (!data._id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            }

            const getOrder = await Order.getOrderByIdAsync(data._id);

            if (getOrder == null) {
                return res.json(helper.showValidationErrorResponse('NOT_A_VALID_ORDER'));
            }

            data.orderStatus = "completed";
            data.date_driver_delivered_utc = new Date();

            Order.updateOrderVendorNew(data, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    let orderResponseData = {
                        success: true,
                        driverStatus: 'online',
                        orderId: resdata._id,
                        type: resdata.orderStatus,
                    }


                    res.json(helper.showSuccessResponse('ORDER_DELIVERED_SUCCESS', orderResponseData));
                    Transaction.transactionForFoodOrGrocerType(resdata);
                    // deliveryRequest.afterVendorDeliveredRequest(resdata);
                    emailService.userOrderDeliveredEmail(resdata)
                }
            });
        } catch (error) {
            console.log(error);
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
    statusToggle: async (req, res) => {
        try {

            let { orderStatus } = req.body;
            let id = req.params.id;

            let supportedStatus = ["ready_for_shipment", "shipped", "delayed", "out_for_delivery"];

            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_IS_REQUIRED'));
            };

            if (!orderStatus) {
                return res.json(helper.showValidationErrorResponse('ORDER_STATUS_IS_REQUIRED'));
            };

            if (!supportedStatus.includes(orderStatus)) {
                return res.json(helper.showValidationErrorResponse('ORDER_STATUS_IS_NOT_SUPPORTED'));
            };

            const getOrder = await Order.getOrderByIdAsyncForRes(id);

            if (getOrder === null) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER_ID'));
            }

            if (getOrder.orderStatus === "cancelled") {
                return res.json(helper.showValidationErrorResponse('ORDER_CANCELLED'));
            };


            let updatedTrackingHistory = mergeTrackingHistory(
                getOrder.trackingHistory,
                orderStatus
            );

            let update = {
                _id: id,
                orderStatus: orderStatus,
                trackingHistory: updatedTrackingHistory
            };

            Order.updateOrderVendorNew(update, async (err, resdata) => {
                if (err) {
                    res.json(helper.showDatabaseErrorResponse("INTERNAL_DB_ERROR", err));
                } else {
                    await syncTrackingStatusToLogistics({
                        orderId: id,
                        orderStatus: orderStatus,
                        orderDoc: resdata || {},
                        source: "vendor_status_toggle",
                    });
                    res.json(helper.showSuccessResponse('DATA_SUCCESS', { orderId: resdata._id }));
                }
            });
        } catch (error) {
            res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },


}

