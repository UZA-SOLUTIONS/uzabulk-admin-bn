const { deliveryApiCall } = require("./delivery");

const TRACKING_STATUS_MAP = {
    pending: "order_placed",
    confirmed: "order_confirmed",
    ready_for_shipment: "ready_for_dispatch",
    shipped: "shipped",
    delayed: "delayed",
    out_for_delivery: "out_for_delivery",
    inroute: "in_transit",
    completed: "delivered",
    refunded: "refund_completed",
    rejected: "order_rejected",
    cancelled: "order_cancelled",
    archived: "archived",
};

const LOGISTICS_ORDER_STATUSES = [
    "ready_for_shipment",
    "shipped",
    "delayed",
    "out_for_delivery",
];

const mapOrderStatusToTrackingStatus = orderStatus =>
    TRACKING_STATUS_MAP[orderStatus] || null;

/** Append or refresh a milestone in trackingHistory when order status changes. */
const mergeTrackingHistory = (existingHistory = [], orderStatus) => {
    const trackingStatus = mapOrderStatusToTrackingStatus(orderStatus);
    if (!trackingStatus) {
        return Array.isArray(existingHistory) ? existingHistory : [];
    }

    const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    const filtered = history.filter(entry => entry.status !== trackingStatus);
    filtered.push({ status: trackingStatus, updatedAt: new Date() });
    return filtered;
};

const resolveStoreApiKey = (orderDoc) =>
    orderDoc?.store?.api_key || orderDoc?.store?.apiKey || "";

const syncTrackingStatusToLogistics = async ({
    orderId,
    orderStatus,
    orderDoc = {},
    source = "store_order_status",
}) => {
    try {
        if (!env.deliveryApiUrl || !orderId || !orderStatus) {
            return;
        }

        await deliveryApiCall({
            apiType: "trackOrderStatus",
            orderId: String(orderId),
            customOrderId: orderDoc?.customOrderId || "",
            orderStatus,
            trackingStatus: TRACKING_STATUS_MAP[orderStatus] || orderStatus,
            source,
            storeId: orderDoc?.store?._id ? String(orderDoc.store._id) : "",
            vendorId: orderDoc?.vendor?._id ? String(orderDoc.vendor._id) : "",
            driverId: orderDoc?.driver?._id ? String(orderDoc.driver._id) : "",
            userId: orderDoc?.user?._id ? String(orderDoc.user._id) : "",
            apiKey: resolveStoreApiKey(orderDoc),
        });
    } catch (error) {
        // Don't block order status updates when logistics sync fails.
        console.log("syncTrackingStatusToLogistics error", error?.message || error);
    }
};

module.exports = {
    TRACKING_STATUS_MAP,
    LOGISTICS_ORDER_STATUSES,
    mapOrderStatusToTrackingStatus,
    mergeTrackingHistory,
    syncTrackingStatusToLogistics,
};
