const mongoose = require('mongoose');
const ObjectId = require('objectid');
const User = require('../models/userTable');

const escapeRegex = value =>
    String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Apply date_created_utc range when startDate and/or endDate are provided (YYYY-MM-DD).
 */
const applyOrderDateRange = (obj, startDate, endDate) => {
    if (!startDate && !endDate) {
        return obj;
    }

    let rangeStart;
    let rangeEnd;

    if (startDate) {
        rangeStart = new Date(
            new Date(new Date(startDate).setHours(0, 0, 0, 0))
                .toString()
                .split('GMT')[0] + ' UTC'
        );
        rangeStart = new Date(rangeStart);
        rangeStart.setHours(0, 0, 0, 0);
    } else {
        rangeStart = new Date();
        rangeStart.setDate(rangeStart.getDate() - 365);
        rangeStart.setHours(0, 0, 0, 0);
    }

    if (endDate) {
        rangeEnd = new Date(
            new Date(new Date(endDate).setHours(0, 0, 0, 0))
                .toString()
                .split('GMT')[0] + ' UTC'
        );
        rangeEnd = new Date(rangeEnd);
        rangeEnd.setDate(rangeEnd.getDate() + 1);
        rangeEnd.setHours(0, 0, 0, 0);
    } else {
        rangeEnd = new Date();
        rangeEnd.setDate(rangeEnd.getDate() + 1);
        rangeEnd.setHours(0, 0, 0, 0);
    }

    obj.date_created_utc = { $gte: rangeStart, $lt: rangeEnd };
    return obj;
};

const buildOrderSearchOrConditions = async search => {
    const term = String(search || '').trim();
    if (!term) {
        return null;
    }

    const searchRegex = { $regex: escapeRegex(term), $options: 'i' };
    const orConditions = [
        { customOrderId: searchRegex },
        { paymentMethod: searchRegex },
        { deliveryType: searchRegex },
        { alibabaOrderId: searchRegex },
        { 'billingDetails.name': searchRegex },
        { 'billingDetails.email': searchRegex },
        { 'billingDetails.mobileNumber': searchRegex },
        { 'shippingDetails.name': searchRegex },
        { 'shippingDetails.email': searchRegex },
        { 'shippingDetails.mobileNumber': searchRegex },
        { 'pickUp.name': searchRegex },
        { 'pickUp.mobileNumber': searchRegex },
        { 'dropOff.name': searchRegex },
        { 'dropOff.mobileNumber': searchRegex },
    ];

    try {
        const users = await User.find({
            $or: [
                { name: searchRegex },
                { email: searchRegex },
                { mobileNumber: searchRegex },
            ],
        })
            .select('_id')
            .limit(150)
            .lean();

        const userIds = users.map(u => u._id).filter(Boolean);
        if (userIds.length) {
            orConditions.push({ user: { $in: userIds } });
            orConditions.push({ vendor: { $in: userIds } });
            orConditions.push({ driver: { $in: userIds } });
        }
    } catch (err) {
        console.log('buildOrderSearchOrConditions user lookup', err);
    }

    return orConditions;
};

module.exports = {
    applyOrderDateRange,
    buildOrderSearchOrConditions,
};
