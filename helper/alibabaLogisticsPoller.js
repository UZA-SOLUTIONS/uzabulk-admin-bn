const Order = require('../models/ordersTable');
const {
    getLogisticsTrace,
    deliveryStatusToTrackingMilestone,
} = require('./alibabaLogisticsTrace');
const {
    mergeTrackingHistory,
    syncTrackingStatusToLogistics,
} = require('./logisticsTracking');

const ACTIVE_ORDER_STATUSES = [
    'pending',
    'confirmed',
    'ready_for_shipment',
    'shipped',
    'delayed',
    'out_for_delivery',
    'inroute',
];

const buildTraceQuery = (order) => ({
    tradeId:
        order?.alibabaLogistics?.tradeId ||
        order.alibabaOrderId ||
        order?.alibabaOrderResponse?.orderId,
    logisticsCompanyCode: order?.alibabaLogistics?.logisticsCompanyCode || '',
    waybillNumber:
        order?.alibabaLogistics?.waybillNumber ||
        order?.alibabaLogistics?.waybill_number ||
        '',
});

const canPollOrder = (order) => {
    const q = buildTraceQuery(order);
    return !!(q.tradeId && q.logisticsCompanyCode && q.waybillNumber);
};

/**
 * Poll 1688 trace API and persist on order document.
 */
const pollOrderLogisticsTrace = async (orderId) => {
    const order = await Order.findById(orderId).exec();
    if (!order) {
        return { success: false, message: 'INVALID_ORDER_ID' };
    }

    const query = buildTraceQuery(order);
    if (!query.tradeId) {
        return { success: false, message: 'ALIBABA_TRADE_ID_REQUIRED' };
    }
    if (!query.logisticsCompanyCode || !query.waybillNumber) {
        return {
            success: false,
            message: 'LOGISTICS_COMPANY_AND_WAYBILL_REQUIRED',
        };
    }

    const traceResponse = await getLogisticsTrace(query);
    if (!traceResponse.success) {
        await Order.updateOne(
            { _id: order._id },
            {
                $set: {
                    'alibabaLogistics.lastPolledAt': new Date(),
                    'alibabaLogistics.lastPollError':
                        traceResponse.message || traceResponse.errorMsg || 'TRACE_POLL_FAILED',
                },
            }
        );
        return traceResponse;
    }

    const trace = traceResponse.data;
    let trackingHistory = order.trackingHistory || [];
    const milestone = deliveryStatusToTrackingMilestone(trace.deliveryStatus);
    if (milestone) {
        trackingHistory = mergeTrackingHistory(trackingHistory, mapMilestoneToOrderStatus(milestone));
    }

    const update = {
        alibabaLogistics: {
            tradeId: String(query.tradeId),
            logisticsCompanyCode: query.logisticsCompanyCode,
            waybillNumber: query.waybillNumber,
            companyName: trace.companyName,
            deliveryStatus: trace.deliveryStatus,
            estimatedDeliveryDate: trace.estimatedDeliveryDate,
            projectedArrival: trace.projectedArrival,
            lastPolledAt: trace.lastPolledAt,
            lastPollError: '',
            traceList: trace.traceList,
        },
        trackingHistory,
    };

    if (trace.deliveryStatus === 'DELIVERED') {
        update.orderStatus = 'completed';
    } else if (trace.deliveryStatus === 'IN_TRANSIT' && ['pending', 'confirmed'].includes(order.orderStatus)) {
        update.orderStatus = 'shipped';
    }

    await Order.updateOne({ _id: order._id }, { $set: update });

    if (update.orderStatus && update.orderStatus !== order.orderStatus) {
        await syncTrackingStatusToLogistics({
            orderId: order._id,
            orderStatus: update.orderStatus,
            orderDoc: order,
            source: 'alibaba_logistics_trace_poll',
        });
    }

    return { success: true, data: update.alibabaLogistics };
};

const mapMilestoneToOrderStatus = (milestone) => {
    const map = {
        delivered: 'completed',
        in_transit: 'inroute',
        delayed: 'delayed',
        ready_for_dispatch: 'ready_for_shipment',
        shipped: 'shipped',
    };
    return map[milestone] || 'shipped';
};

const pollActiveShipmentOrders = async () => {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const orders = await Order.find({
        alibabaOrderId: { $exists: true, $nin: [null, ''] },
        orderStatus: { $in: ACTIVE_ORDER_STATUSES },
        'alibabaLogistics.waybillNumber': { $exists: true, $nin: [null, ''] },
        'alibabaLogistics.logisticsCompanyCode': { $exists: true, $nin: [null, ''] },
        $or: [
            { 'alibabaLogistics.lastPolledAt': { $exists: false } },
            { 'alibabaLogistics.lastPolledAt': { $lte: sixHoursAgo } },
        ],
    })
        .select('_id customOrderId alibabaOrderId alibabaLogistics orderStatus trackingHistory alibabaOrderResponse')
        .limit(200)
        .lean();

    const summary = { total: orders.length, synced: 0, failed: 0, skipped: 0 };

    for (const row of orders) {
        if (!canPollOrder(row)) {
            summary.skipped += 1;
            continue;
        }
        try {
            const result = await pollOrderLogisticsTrace(row._id);
            if (result.success) summary.synced += 1;
            else summary.failed += 1;
        } catch (err) {
            summary.failed += 1;
            console.log('pollActiveShipmentOrders error', row._id, err?.message || err);
        }
    }

    return summary;
};

module.exports = {
    pollOrderLogisticsTrace,
    pollActiveShipmentOrders,
    buildTraceQuery,
    canPollOrder,
};
