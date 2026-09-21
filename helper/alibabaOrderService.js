const axios = require('axios');
const crypto = require('crypto');
const { getAlibabaConfig, logAlibabaError } = require("./alibabaConfig");

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

const alibabaPostRequest = async (urlPath, requestBody) => {
    try {
        const { authToken, appSecret, baseUrl } = getAlibabaConfig();
        const signedUrl = generateApiSignature(urlPath, {
            "access_token": authToken,
            ...requestBody,
        }, appSecret);
        const url = new URL(signedUrl, baseUrl);
        const headers = { 'Content-Type': 'application/json' };
        return (await axios.post(url.toString(), requestBody, { headers })).data;
    }
    catch (error) {
        logAlibabaError(error);
        return null;
    }
};

const alibabaGetRequest = async (urlPath, requestBody) => {
    try {
        const { authToken, appSecret, baseUrl } = getAlibabaConfig();
        const signedUrl = generateApiSignature(urlPath, {
            "access_token": authToken,
            ...requestBody,
        }, appSecret);
        const url = new URL(signedUrl, baseUrl);
        const headers = { 'Content-Type': 'application/json' };
        return (await axios.get(url.toString(), requestBody, { headers })).data;
    }
    catch (error) { logAlibabaError(error); }
};

/**
 * 
 * @param {*} orders
 * [{offerId, specId, quantity}] 
 * @returns 
 */
const alibabaCreateOrder = async (orders) => {
    const { appKey } = getAlibabaConfig();
    const urlPath = `param2/1/com.alibaba.trade/alibaba.trade.createCrossOrder/${appKey}`;
    const reqBody = {
        "flow": "general",
        "addressParam": JSON.stringify({ "address": "8th Floor, Trade, No. 888, Jinda Road, Taopu Town", "phone": "0517-88990077", "mobile": "15251667788", "fullName": "Zhang San", "postCode": "000000", "districtCode": "310107" }),
        "cargoParamList": JSON.stringify(orders)
    };

    return alibabaPostRequest(urlPath, reqBody);
};

const alibabaViewOrder = async (orderId) => {
    const { appKey } = getAlibabaConfig();
    const urlPath = `param2/1/com.alibaba.trade/alibaba.trade.get.buyerView/${appKey}`;
    const reqBody = {
        "webSite": "1688",
        "orderId": orderId,
    };

    return alibabaGetRequest(urlPath, reqBody);
};

/**
 * 1688 logistics: alibaba.logistics.myFreightTemplate.list.get
 * @see https://gw.open.1688.com/openapi/param2/1/com.alibaba.logistics/alibaba.logistics.myFreightTemplate.list.get
 * @param {{ templateId?: number|string, querySubTemplate?: boolean, queryRate?: boolean }} options
 */
const getFreightTemplateList = async (options = {}) => {
    const { appKey } = getAlibabaConfig();
    const urlPath =
        `param2/1/com.alibaba.logistics/alibaba.logistics.myFreightTemplate.list.get/${appKey}`;

    const reqBody = {};
    if (options.templateId != null && options.templateId !== '') {
        reqBody.templateId = String(options.templateId);
    }
    if (options.querySubTemplate != null) {
        reqBody.querySubTemplate = String(Boolean(options.querySubTemplate));
    }
    if (options.queryRate != null) {
        reqBody.queryRate = String(Boolean(options.queryRate));
    }

    const data = await alibabaPostRequest(urlPath, reqBody);
    if (!data) {
        return {
            success: false,
            message: 'ALIBABA_API_NO_RESPONSE',
            result: [],
        };
    }
    if (data.errorCode) {
        return {
            success: false,
            errorCode: data.errorCode,
            errorMsg: data.errorMsg,
            message: data.errorMsg || data.errorCode,
            result: [],
        };
    }

    return {
        success: true,
        result: Array.isArray(data.result) ? data.result : [],
    };
};

module.exports = {
    alibabaPostRequest,
    alibabaCreateOrder,
    alibabaViewOrder,
    getFreightTemplateList,
};