const axios = require('axios');
const crypto = require('crypto');
const { getAlibabaConfig, logAlibabaError } = require("./alibabaConfig");

const generateHmacSha1Signature = (data, secretKey) => {
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(data);
    return hmac.digest('hex').toUpperCase();
};

const generateApiSignature = (urlPath, params, secretKey) => {
    const paramString = Object.entries(params)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}${value}`)
        .join('');
    const signature = generateHmacSha1Signature(`${urlPath}${paramString}`, secretKey);
    const urlParams = new URLSearchParams(params);
    urlParams.append('_aop_signature', signature);
    return `${urlPath}?${urlParams.toString()}`;
};

const request1688 = async (method, urlPath, params) => {
    const { appSecret, baseUrl } = getAlibabaConfig();
    try {
        const signedUrl = generateApiSignature(urlPath, params, appSecret);
        const url = new URL(signedUrl, baseUrl).toString();
        const response = method === "POST"
            ? await axios.post(url, null, { headers: { "Content-Type": "application/x-www-form-urlencoded" } })
            : await axios.get(url, { headers: { "Content-Type": "application/json" } });
        const raw = response.data;
        if (raw?.result?.success) {
            return { ok: true, product: raw.result.result, raw, error: null };
        }
        const error = raw?.error_message || raw?.exception || raw?.result?.message || "1688_API_FAILED";
        return { ok: false, product: raw?.result?.result || null, raw, error };
    } catch (error) {
        logAlibabaError(error);
        const raw = error?.response?.data || { message: error.message };
        return {
            ok: false,
            product: null,
            raw,
            error: raw.error_message || raw.exception || raw.error_code || error.message
        };
    }
};

const normalizeProduct = (productInfo, productId) => {
    if (!productInfo || typeof productInfo !== "object") return null;
    const nested = productInfo.productInfo && typeof productInfo.productInfo === "object"
        ? productInfo.productInfo
        : productInfo;
    return {
        ...nested,
        status: nested.status || "published",
        subjectTrans: nested.subjectTrans || nested.subject || nested.title || nested.name || "",
        offerId: nested.offerId || nested.productID || nested.productId || productId,
    };
};

const getProductDetail = async (productId) => {
    const { appKey, authToken } = getAlibabaConfig();
    if (!authToken) {
        return {
            product: null,
            raw: null,
            error: "ALIBABA_ACCESS_TOKEN_MISSING",
            api: null
        };
    }

    const detailPath = `param2/1/com.alibaba.fenxiao.crossborder/product.search.queryProductDetail/${appKey}`;
    const crossborder = await request1688("GET", detailPath, {
        offerDetailParam: JSON.stringify({ offerId: productId, country: "en" }),
        access_token: authToken
    });
    if (crossborder.ok && crossborder.product) {
        return {
            product: normalizeProduct(crossborder.product, productId),
            raw: crossborder.raw,
            error: null,
            api: "product.search.queryProductDetail"
        };
    }

    const getPath = `param2/1/com.alibaba.product/alibaba.product.get/${appKey}`;
    const domestic = await request1688("POST", getPath, {
        productID: String(productId),
        scene: "1688",
        access_token: authToken
    });
    const domesticProduct = normalizeProduct(domestic.product, productId);
    if (domestic.ok && domesticProduct) {
        return {
            product: domesticProduct,
            raw: domestic.raw,
            error: null,
            api: "alibaba.product.get"
        };
    }

    const raw = {
        queryProductDetail: crossborder.raw,
        productGet: domestic.raw
    };
    console.log("1688 JSON:", JSON.stringify(raw, null, 2));
    return {
        product: null,
        raw,
        error: domestic.error || crossborder.error,
        api: "product.search.queryProductDetail"
    };
};

module.exports = { getProductDetail };
