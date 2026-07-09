const env = {
    GMAIL: {
        EMAIL: "payment@uzabulk.com",
        PASSWORD: "qmxratdxmefzmdni",
    },
    vendorPanelUrl: "https://vendor.uzabulk.com/",
    "jwtSecret": "uzaBulkAdmin@123",
    "storeVersion": 2,
    "DOMAIN": "admin-api.uzabulk.com",
    "publicIp": "47.253.10.32",
    "favIcon": "606c4c91f6291c11abd56088",
    "logo": "606c4c72f6291c11abd56087",
    "bannerImage": "606c4de9f6291c11abd56089",
    "SEARCH_RADIUS": "200000",
    "version": 1.3,
    "terminologyLang": ["en", "fr", "es", "de", "it", "ru", "ht", "zh"],
    "mongoAtlasUri": (process.env.MONGO_ATLAS_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || "").trim(),
    "socketUrl": "https://uza-admin-api.suffescom.dev",
    "socketIp": "3.136.71.189",
    "socketUrlApi": "https://uza-admin-api.suffescom.dev/authenticationservice/api/v1/store",
    "apiUrl": "https://uza-admin-api.suffescom.dev/authenticationservice/api/v1/",
    "apiBaseUrl": "https://uza-admin-api.suffescom.dev",
    "pay360BaseUrl": "https://secure.test.pay360evolve.com/api/v1/merchants/",
    "adminPanelUrl": "https://admin.uzabulk.com/",
    "deliveryApiUrl": "https://uza-admin-api.suffescom.dev/authenticationservice/api/v1/delivery",
    "dnsUrl": "https://api.cloudflare.com/client/v4/zones/fafc854b010739b54738857a9a82d29b/dns_records",
    "XAuthEmail": "waliaworking@gmail.com",
    "dnsRecordType": "CNAME",
    "dnsIp": "webhost.projectName.com",
    "XAuthKey": "",
    "updateSettings": "https://main.projectNamestore.com",
    "scriptUrl": "http://main.projectNamestore.com/exec.php?action=create&type=common&webname=",
    "scriptUrlDelete": "http://main.projectNamestore.com/exec.php?action=remove&type=common&webname=",
    "scriptUrlUpdate": "https://main.projectNamestore.com/exec.php?action=update-version&type=common&webname=",
    "poweredBy": "projectName",
    "poweredByLink": "https://projectName.com",
    "AWS": {
        "SECRET_ACCESS_KEY": process.env.S3_SECRET_ACCESS_KEY,
        "SECRET_ACCESS_ID": process.env.S3_ACCESS_KEY,
        "REGION_NAME": process.env.S3_REGION,
        "BUCKET_NAME": process.env.S3_BUCKET_NAME,
    },
    "AWS_SES": {
        "EMAIL_SOURCE": process.env.SES_EMAIL_SOURCE,
        "ACCESS_ID": process.env.SES_ACCESS_KEY,
        "SECRET_KEY": process.env.SES_SECRET_ACCESS_KEY,
        "REGION_NAME": process.env.SES_REGION,
    },
    "SMTP": {
        "EMAIL_SOURCE": process.env.EMAIL_SOURCE,
        "HOST": process.env.HOST,
        "USERNAME": process.env.USERNAME,
        "PASSWORD": process.env.PASSWORD
    },
    "twilio": {
        "accountSid": "",
        "authToken": "",
        "twilioFrom": "+18622985101"
    },
    "mailgun": {
        "MAILGUN_API_KEY": "",
        "MAILGUN_DOMAIN": "",
        "MAILGUN_FROM": "<no-reply@mg.ondemandcreations.com>"
    },
    "firebase": {
        "FCM_APIKEY": "",
        "FCM_AUTHDOMAIN": "hyperlocalcloud-62422.firebaseapp.com",
        "FCM_DATABASEURL": "https://themesbrand-admin.firebaseio.com",
        "FCM_PROJECTID": "hyperlocalcloud-62422",
        "FCM_STORAGEBUCKET": "hyperlocalcloud-62422.appspot.com",
        "FCM_MESSAGINGSENDERID": "1022233967182",
        "FCM_APPID": "1:1022233967182:web:12fea9f1cc2778240d211f",
        "FCM_MEASUREMENTID": "G-YNXB6C952D",
        "FCM_CLIENT_EMAIL": "firebase-adminsdk-3szd8@hyperlocalcloud-62422.iam.gserviceaccount.com",
        "FCM_PRIVATE_KEY": ""
    },
    "godaddyApiKey": {
        "mode": "live",
        "sandbox": {
            "apiUrl": "https://api.ote-godaddy.com/v1/domains/available?checkType=full&domain=",
            "key": "",
        },
        "production": {
            "apiUrl": "https://api.godaddy.com/v1/domains/available?checkType=full&domain=",
            "key": ""
        }
    },
    "superAdminStripe": {
        "paymentMode": "live",
        "sandbox": {
            "Default_Payment_Gateway": "Stripe",
            "Stripe_Secret_Key": "",
            "Stripe_Publishable_Key": ""
        },
        "live": {
            "Default_Payment_Gateway": "Stripe",
            "Stripe_Secret_Key": "",
            "Stripe_Publishable_Key": ""
        }
    },
    "superAdminEmail": "admin@projectName.com",
    "GOOGLE_MAP_API_KEY": "",
    "GOOGLE_MAP_API_KEY_WEB": "",
    "orangeMoneyAuthUrl": "https://api.orange.com/oauth/v3/token",
    "orangeMoneyTransactionUrl": "https://api.orange.com/orange-money-webpay/dev/v1/webpayment",
    "orangeMoneyLiveTransactionUrl": "https://api.orange.com/orange-money-webpay/sl/v1/webpayment",
    "import_csv_url": {
        "import_products_combined": "https://uzalives3.s3.us-east-2.amazonaws.com/1635166491791import_products_combined.csv",
        "import_products_FOOD": "https://uzalives3.s3.us-east-2.amazonaws.com/1635166502438import_products_FOOD.csv",
        "import_products": "https://uzalives3.s3.us-east-2.amazonaws.com/1635166510250import_products.csv",
        "import_productVariation": "https://uzalives3.s3.us-east-2.amazonaws.com/1635166538089import_productVariation.csv",
        "import_user": "https://uzalives3.s3.us-east-2.amazonaws.com/1635166559332import_user.csv",
        "import_vendor": "https://uzalives3.s3.us-east-2.amazonaws.com/1635166568623import_vendor.csv",
        "import_driver": "https://uzalives3.s3.us-east-2.amazonaws.com/1635166579982import_driver.csv"
    }
}

module.exports = env;
