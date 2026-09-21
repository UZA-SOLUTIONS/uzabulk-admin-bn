const getAlibabaConfig = () => ({
    baseUrl: process.env.ALIBABA_BASE_APP_URL || "https://gw.open.1688.com/openapi/",
    appKey: process.env.ALIBABA_APP_KEY || "7320613",
    appSecret: process.env.ALIBABA_APP_SECRET || "Y4RC9QHrI91v",
    authToken: process.env.ALIBABA_AUTH_TOKEN || "",
});

const logAlibabaError = (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message = data?.error_message || data?.exception || data?.error_code || error?.message;
    console.error("1688 API error:", status || "", message);
    if (status === 401 || String(data?.error_code) === "401") {
        console.error("1688 access_token is invalid or expired. Set a fresh ALIBABA_AUTH_TOKEN in admin-bn .env (use the same token as uzabulk-bn).");
    }
    if (/AppKey is not allowed/i.test(String(message)) || String(data?.error_code || "").includes("APIACL")) {
        console.error("This 1688 AppKey is not subscribed to product.search.queryProductDetail. Enable that API on the app at open.1688.com, or use an AppKey that already has it.");
    }
};

module.exports = { getAlibabaConfig, logAlibabaError };
