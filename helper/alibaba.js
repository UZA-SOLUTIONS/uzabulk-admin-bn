const axios = require('axios');
const crypto = require('crypto');

const ALIBABA_BASE_APP_URL = "https://gw.open.1688.com/openapi/";
const ALIBABA_APP_KEY = "7320613";
const ALIBABA_APP_SECRET = "Y4RC9QHrI91v";
const ALIBABA_AUTH_TOKEN = "104e44a2-77d7-46ca-8c3d-d06772a3fcee";

const generateHmacSha1Signature = (data, secretKey) => {
    const hmac = crypto.createHmac('sha1', secretKey);
    hmac.update(data);
    return hmac.digest('hex').toUpperCase();
}

const generateApiSignature = (urlPath, params, secretKey) => {
    const paramString = Object.entries(params).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, value]) => `${key}${value}`).join('');
    const concatString = `${urlPath}${paramString}`;
    const signature = generateHmacSha1Signature(concatString, secretKey);
    const urlParams = new URLSearchParams(params);
    urlParams.append('_aop_signature', signature);
    return `${urlPath}?${urlParams.toString()}`;
}

const makeApiCall = async (urlPath, params, secretKey) => {
    try {
        const signedUrl = generateApiSignature(urlPath, params, secretKey);
        const url = new URL(signedUrl, ALIBABA_BASE_APP_URL);
        const headers = { 'Content-Type': 'application/json' };
        const response = await axios.get(url.toString(), { headers });
        if (response.data?.result?.success)
            return response.data.result.result;
        return null;
    }
    catch (error) { console.error('API Call Error: Unsuccessful response', error); }
};

// Import Product Detail
const getProductDetail = async (productId) => {

    const urlPath = `param2/1/com.alibaba.fenxiao.crossborder/product.search.queryProductDetail/${ALIBABA_APP_KEY}`;
    const params = { "offerDetailParam": JSON.stringify({ "offerId": productId, "country": "en" }), "access_token": ALIBABA_AUTH_TOKEN };
    const secretKey = ALIBABA_APP_SECRET;

    return await makeApiCall(urlPath, params, secretKey);
};

module.exports = { getProductDetail };