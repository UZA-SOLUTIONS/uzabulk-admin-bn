const { alibabaPostRequest } = require('./alibabaOrderService');
const { getAlibabaConfig } = require('./alibabaConfig');

const parseApiDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeTraceEvent = (event = {}) => ({
    time: parseApiDate(event.time || event.acceptTime || event.accept_time) || new Date(),
    location: event.location || event.acceptAddress || event.accept_address || '',
    statusDesc: event.statusDesc || event.status_desc || event.remark || '',
});

/**
 * 1688: alibaba.logistics.trace.get
 * IN: tradeId, logisticsCompanyCode, waybillNumber (logisticsBillNo)
 */
const getLogisticsTrace = async ({
    tradeId,
    logisticsCompanyCode,
    waybillNumber,
} = {}) => {
    const { appKey } = getAlibabaConfig();
    const urlPath =
        `param2/1/com.alibaba.logistics/alibaba.logistics.trace.get/${appKey}`;

    const reqBody = {};
    if (tradeId) reqBody.tradeId = String(tradeId);
    if (logisticsCompanyCode) reqBody.logisticsCompanyCode = String(logisticsCompanyCode);
    if (waybillNumber) reqBody.logisticsBillNo = String(waybillNumber);

    const data = await alibabaPostRequest(urlPath, reqBody);
    if (!data) {
        return { success: false, message: 'ALIBABA_API_NO_RESPONSE' };
    }
    if (data.errorCode) {
        return {
            success: false,
            errorCode: data.errorCode,
            errorMsg: data.errorMsg,
            message: data.errorMsg || data.errorCode,
        };
    }

    const raw = data.result || data.logisticsTrace || data;
    const traceListRaw = raw.traceList || raw.trace_list || raw.logisticsTraceList || [];

    return {
        success: true,
        data: {
            companyName: raw.companyName || raw.company_name || '',
            deliveryStatus: (raw.deliveryStatus || raw.delivery_status || 'IN_TRANSIT').toUpperCase(),
            estimatedDeliveryDate: parseApiDate(
                raw.estimatedDeliveryDate || raw.estimated_delivery_date
            ),
            projectedArrival: parseApiDate(
                raw.projectedArrival || raw.projected_arrival || raw.estimatedDeliveryDate
            ),
            traceList: (Array.isArray(traceListRaw) ? traceListRaw : []).map(normalizeTraceEvent),
            lastPolledAt: new Date(),
        },
    };
};

const DELIVERY_STATUS_TO_TRACKING = {
    DELIVERED: 'delivered',
    IN_TRANSIT: 'in_transit',
    EXCEPTION: 'delayed',
    WAIT_ACCEPT: 'ready_for_dispatch',
    ACCEPT: 'shipped',
};

const deliveryStatusToTrackingMilestone = (deliveryStatus) =>
    DELIVERY_STATUS_TO_TRACKING[(deliveryStatus || '').toUpperCase()] || null;

module.exports = {
    getLogisticsTrace,
    deliveryStatusToTrackingMilestone,
    normalizeTraceEvent,
};
