const env = {
    GMAIL: {
        EMAIL: "payment@uzabulk.com",
        PASSWORD: "qmxratdxmefzmdni",
    },
    vendorPanelUrl: "https://vendor.uzabulk.com/",
    "jwtSecret": "uzaBulkAdmin@123",
    "storeVersion": 2,
    "DOMAIN": "staging-admin-api.uzabulk.com",
    "publicIp": "47.253.10.32",
    "favIcon": "605434e1eb99d4628e08ff21",
    "logo": "60534f40c3cdd556371e7ff6",
    "bannerImage": "5ffd69ca538cc66dd74714eb",
    "SEARCH_RADIUS": "20000",
    "version": 1.3,
    "terminologyLang": ["en", "fr", "es", "de", "it", "ru", "ht", "zh"],
    "mongoAtlasUri": (process.env.MONGO_ATLAS_URI || process.env.MONGODB_URI || process.env.DATABASE_URL || "").trim(),
    "socketUrl": "https:/staging-admin-api.uzabulk.com",
    "pay360BaseUrl": "https://secure.test.pay360evolve.com/api/v1/merchants/",
    "socketIp": "18.216.189.191",
    "socketUrlApi": "https:/staging-admin-api.uzabulk.com/authenticationservice/api/v1/store",
    "apiUrl": "https://staging-admin-api.uzabulk.com/authenticationservice/api/v1/",
    "apiBaseUrl": "https://staging-admin-api.uzabulk.com",
    "adminPanelUrl": "https://staging-admin.uzabulk.com/",
    "deliveryApiUrl": "https://staging-admin-api.uzabulk.com/authenticationservice/api/v1/delivery",
    "dnsUrl": "https://api.cloudflare.com/client/v4/zones/3c41ffcfb5e5fc0679bf9cc8ce32e80a/dns_records",
    "XAuthEmail": "waliaworking@gmail.com",
    "dnsRecordType": "A",
    "dnsIp": "3.22.91.123",
    "XAuthKey": "",
    "updateSettings": "https://uza-admin-api.suffescom.dev",
    "scriptUrl": "http://main.uza-staging.com/exec.php?action=create&type=common&webname=",
    "scriptUrlDelete": "http://main.uza-staging.com/exec.php?action=remove&type=common&webname=",
    "scriptUrlUpdate": "https://uza-admin-api.suffescom.dev/exec.php?action=update-version&type=common&webname=",
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
        "MAILGUN_FROM": ""
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
        "mode": "sandbox",
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
        "paymentMode": "sandbox",
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
        "import_products_combined": "https://uzastagings3.s3.us-east-2.amazonaws.com/1635166277917import_products_combined.csv",
        "import_products_FOOD": "https://uzastagings3.s3.us-east-2.amazonaws.com/1635166337287import_products_FOOD.csv",
        "import_products": "https://uzastagings3.s3.us-east-2.amazonaws.com/1635166359506import_products.csv",
        "import_productVariation": "https://uzastagings3.s3.us-east-2.amazonaws.com/1635166376537import_productVariation.csv",
        "import_user": "https://uzastagings3.s3.us-east-2.amazonaws.com/1635166398802import_user.csv",
        "import_vendor": "https://uzastagings3.s3.us-east-2.amazonaws.com/1635166421130import_vendor.csv",
        "import_driver": "https://uzastagings3.s3.us-east-2.amazonaws.com/1635166455043import_driver.csv"
    }


}

module.exports = env;
