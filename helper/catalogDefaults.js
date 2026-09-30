const STORE_TYPE_ID = "660e3c271095513081ed2223";
const VENDOR_ID = "6625f5426b433d206e538ec2";

const applyCatalogDefaults = (data = {}, { isVendor = false } = {}) => {
    if (!data.type) data.type = "simple";
    if (!data.status) data.status = "active";
    if (!data.stock_status) data.stock_status = "instock";
    if (data.price === undefined || data.price === null || data.price === "") {
        data.price = 0;
    }
    if (!Array.isArray(data.images)) data.images = [];
    if (!Array.isArray(data.categories)) data.categories = [];
    if (!Array.isArray(data.attributes)) data.attributes = [];
    if (!Array.isArray(data.variations)) data.variations = [];
    if (data.featureAttribute && !Array.isArray(data.featureAttribute)) {
        data.featureAttribute = [data.featureAttribute];
    }

    if (!isVendor) {
        if (!data.vendor) data.vendor = VENDOR_ID;
        if (!data.storeType) data.storeType = data.storeTypeId || STORE_TYPE_ID;
        if (data.adminSold === undefined) data.adminSold = true;
        if (!data.baseCurrency) data.baseCurrency = "CNY";
        if (!data.region) data.region = "CH";
    }

    return data;
};

const imageUrlValue = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return value.url || value.link || "";
};

const keepImageUrls = (data = {}) => {
    data.featured_image = imageUrlValue(data.featured_image) || undefined;
    data.images = (Array.isArray(data.images) ? data.images : [])
        .map(imageUrlValue)
        .filter(Boolean);
    if (!data.featured_image && data.images[0]) {
        data.featured_image = data.images[0];
    }
    return data;
};

module.exports = {
    STORE_TYPE_ID,
    VENDOR_ID,
    applyCatalogDefaults,
    keepImageUrls,
    imageUrlValue,
};
