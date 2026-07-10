const socketHelper = require("./socketHelper");
const Push = require("./pushNotification");
const Notification = require("../models/notificationTable");
const { sendEmail } = require("../lib/ses");

const resolveCargoLocationDisplay = (warehouseLocation = {}) => {
    const location = String(
        warehouseLocation.location || warehouseLocation.label || ""
    ).trim();
    if (location) return location;

    const legacy = [warehouseLocation.zone, warehouseLocation.aisle, warehouseLocation.shelf, warehouseLocation.bin]
        .map((part) => String(part || "").trim())
        .filter(Boolean)
        .join("-");

    return legacy;
};

const appendCargoLocatedMilestone = (existingHistory = []) => {
    const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
    const filtered = history.filter((entry) => entry?.status !== "cargo_located");
    filtered.push({ status: "cargo_located", updatedAt: new Date() });
    return filtered;
};

const notifyCustomerCargoLocated = async (order, warehouseLocation = {}) => {
    if (!order?.user?._id) return;

    const locationLabel = resolveCargoLocationDisplay(warehouseLocation) || "in our warehouse network";
    const title = "Cargo location update";
    const body = `Your order cargo is now at: ${locationLabel}. Open your order for details.`;

    const payload = {
        orderId: order._id,
        type: "cargoLocated",
        warehouseLocation,
        location: locationLabel,
    };

    try {
        socketHelper.singleSocket(order.user._id, "Customer", payload);
    } catch (err) {
        console.log("notifyCustomerCargoLocated socket err", err?.message || err);
    }

    const tokens = order.user?.firebaseTokens;
    if (Array.isArray(tokens) && tokens.length && order.store?.firebase) {
        try {
            Push.sendPushToAll(
                tokens,
                title,
                body,
                {
                    orderId: String(order._id),
                    type: "cargoLocated",
                    location: locationLabel,
                },
                order.store.firebase
            );
        } catch (err) {
            console.log("notifyCustomerCargoLocated push err", err?.message || err);
        }
    }

    try {
        Notification.addNotification({
            store: order.store?._id || order.store,
            storeType: order.storeType?._id || order.storeType,
            title,
            body,
            type: "USER",
            count: 1,
            date_created: new Date(),
            meta_data: [
                { key: "orderId", value: String(order._id) },
                { key: "type", value: "cargoLocated" },
                { key: "location", value: locationLabel },
            ],
        }, () => {});
    } catch (err) {
        console.log("notifyCustomerCargoLocated notification log err", err?.message || err);
    }

    const userEmail = String(order.user?.email || "").trim();
    if (userEmail) {
        try {
            const orderRef = order.customOrderId || String(order._id);
            const customerName = String(order.user?.name || "Customer").trim();
            const notes = String(warehouseLocation.notes || "").trim();
            const html = `
                <p>Hi ${customerName},</p>
                <p>We have an update on your order <strong>${orderRef}</strong>.</p>
                <p>Your cargo is now at: <strong>${locationLabel}</strong></p>
                ${notes ? `<p>${notes}</p>` : ""}
                <p>Sign in to your UZA Bulk account to view full order details.</p>
            `;
            await sendEmail(userEmail, title, html);
    } catch (err) {
        console.warn("notifyCustomerCargoLocated email err:", err?.message || err);
    }
    }
};

module.exports = {
    resolveCargoLocationDisplay,
    appendCargoLocatedMilestone,
    notifyCustomerCargoLocated,
};
