const ObjectId = require('objectid');
const Order = require('../models/ordersTable');
const { applyOrderDateRange, buildOrderSearchOrConditions } = require('../helper/orderListQuery');

const sanitizeLineItems = (lineItems) => {
    if (!Array.isArray(lineItems)) {
        return lineItems || [];
    }
    return lineItems.map((item) => ({
        productId: item.productId || item._id || item.id || null,
        name: item.name || item.productName || null,
        quantity: item.quantity ?? item.qty ?? null,
        price: item.price ?? item.unitPrice ?? null,
        total: item.total ?? item.lineTotal ?? null,
        sku: item.sku || null,
        image: item.image || item.thumbnail || null,
        variation: item.variation || item.variations || null,
    }));
};

const sanitizeAddressBlock = (block) => {
    if (!block || typeof block !== 'object') {
        return null;
    }
    return {
        name: block.name || null,
        email: block.email || null,
        mobileNumber: block.mobileNumber || block.phone || null,
        address: block.address || null,
        city: block.city || null,
        state: block.state || null,
        country: block.country || null,
        zipCode: block.zipCode || block.postalCode || null,
        floorNo: block.floorNo || null,
        landmark: block.landmark || null,
    };
};

const sanitizeUserSummary = (user) => {
    if (!user) {
        return null;
    }
    const raw = user._doc || user;
    return {
        _id: raw._id || null,
        name: raw.name || null,
        email: raw.email || null,
        mobileNumber: raw.mobileNumber || null,
        role: raw.role || null,
    };
};

/**
 * Partner-facing order DTO — strips earnings, slip tokens, raw payment payloads.
 */
const sanitizePartnerOrder = (order) => {
    if (!order) {
        return null;
    }
    const raw = typeof order.toObject === 'function' ? order.toObject() : (order._doc || order);

    const alibaba = raw.alibaba1688 || null;
    const alibabaSafe = alibaba
        ? {
            trade_id: alibaba.trade_id || null,
            primary_order_id: alibaba.primary_order_id || raw.alibabaOrderId || null,
            status: alibaba.status || null,
            logistics: alibaba.logistics || null,
        }
        : raw.alibabaOrderId
            ? { primary_order_id: raw.alibabaOrderId }
            : null;

    return {
        _id: raw._id,
        customOrderId: raw.customOrderId || null,
        orderGroupId: raw.orderGroupId || null,
        orderStatus: raw.orderStatus || null,
        paymentStatus: raw.paymentStatus || null,
        paymentMethod: raw.paymentMethod || null,
        deliveryType: raw.deliveryType || null,
        currency: raw.currency || null,
        subTotal: raw.subTotal ?? null,
        orderTotal: raw.orderTotal ?? null,
        discountTotal: raw.discountTotal ?? null,
        deliveryFee: raw.deliveryFee ?? null,
        tax: raw.tax ?? null,
        taxAmount: raw.taxAmount ?? null,
        coupon: raw.coupon || null,
        line_items: sanitizeLineItems(raw.line_items),
        billingDetails: sanitizeAddressBlock(raw.billingDetails),
        shippingDetails: sanitizeAddressBlock(raw.shippingDetails),
        pickUp: sanitizeAddressBlock(raw.pickUp),
        dropOff: sanitizeAddressBlock(raw.dropOff),
        warehouseLocation: raw.warehouseLocation || null,
        trackingHistory: raw.trackingHistory || null,
        alibabaOrderId: raw.alibabaOrderId || null,
        alibaba1688: alibabaSafe,
        scheduledType: raw.scheduledType || null,
        scheduledDate: raw.scheduledDate || null,
        scheduledTime: raw.scheduledTime || null,
        scheduled_utc: raw.scheduled_utc || null,
        date_created: raw.date_created || null,
        time_created: raw.time_created || null,
        date_created_utc: raw.date_created_utc || null,
        date_modified_utc: raw.date_modified_utc || null,
        storeType: raw.storeType
            ? { _id: raw.storeType._id || raw.storeType, storeType: raw.storeType.storeType || null }
            : null,
        customerDetails: sanitizeUserSummary(raw.customerDetails || raw.user),
        vendorDetails: sanitizeUserSummary(raw.vendorDetails || raw.vendor),
        user: sanitizeUserSummary(raw.user),
        vendor: sanitizeUserSummary(raw.vendor),
    };
};

const buildPartnerListQuery = async (req, data) => {
    const obj = {};

    if (req.partnerStoreScoped && req.store && req.store.storeId) {
        obj.store = ObjectId(req.store.storeId);
    }

    if (data.vendor && ObjectId.isValid(data.vendor)) {
        obj.vendor = ObjectId(data.vendor);
    }
    if (data.customer && ObjectId.isValid(data.customer)) {
        obj.user = ObjectId(data.customer);
    }
    if (data.paymentMethod) {
        obj.paymentMethod = data.paymentMethod;
    }
    if (data.deliveryType) {
        obj.deliveryType = data.deliveryType;
    }
    if (data.orderStatus) {
        obj.orderStatus = data.orderStatus;
    } else {
        obj.orderStatus = { $ne: 'archived' };
    }

    applyOrderDateRange(obj, data.startDate, data.endDate);

    if (data.search) {
        const searchOr = await buildOrderSearchOrConditions(data.search);
        if (searchOr?.length) {
            obj.$or = searchOr;
        }
    }

    return obj;
};

module.exports = {
    listOrders: async (req, res) => {
        try {
            const data = req.body || {};
            const pageSize = data.limit || 10;
            const sortByField = data.orderBy || 'date_created_utc';
            const sortOrder = data.order || -1;
            const paged = data.page || 1;

            const obj = await buildPartnerListQuery(req, data);
            const count = await Order.countDocuments(obj);

            Order.getNewOrdersWithFilter(obj, sortByField, sortOrder, paged, pageSize, (err, resdata) => {
                if (err) {
                    console.log('partner listOrders err', err);
                    return res.json(helper.showDatabaseErrorResponse('INTERNAL_DB_ERROR', err));
                }
                const sanitized = (resdata || []).map(sanitizePartnerOrder);
                return res.json(helper.showSuccessResponseCount('DATA_SUCCESS', sanitized, count));
            });
        } catch (err) {
            console.log('partner listOrders err', err);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },

    getOrderById: async (req, res) => {
        try {
            const id = req.params._id;
            if (!id) {
                return res.json(helper.showValidationErrorResponse('ID_REQUIRED'));
            }
            if (!ObjectId.isValid(id)) {
                return res.json(helper.showValidationErrorResponse('INVALID_ORDER'));
            }

            const order_obj = { _id: ObjectId(id) };
            if (req.partnerStoreScoped && req.store && req.store.storeId) {
                order_obj.store = ObjectId(req.store.storeId);
            }

            Order.getOrderByStoreId(order_obj, (err, resdata) => {
                if (err) {
                    return res.json(helper.showDatabaseErrorResponse('INTERNAL_DB_ERROR', err));
                }
                if (resdata == null) {
                    return res.json(helper.showValidationErrorResponse('INVALID_ORDER'));
                }
                return res.json(helper.showSuccessResponse('DATA_SUCCESS', sanitizePartnerOrder(resdata)));
            });
        } catch (err) {
            console.log('partner getOrderById err', err);
            return res.json(helper.showInternalServerErrorResponse('INTERNAL_SERVER_ERROR'));
        }
    },
};
