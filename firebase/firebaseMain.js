const admin = require('firebase-admin');

function initFirebaseApp(serviceAccount, appName) {
  const privateKey = (serviceAccount.private_key || "").replace(/\\n/g, "\n");
  if (!serviceAccount.project_id || !serviceAccount.client_email || !privateKey) {
    console.warn(
      `[firebase] Skipping "${appName || "default"}" — set FIREBASE_* credentials in .env`
    );
    return null;
  }

  const options = {
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey,
    }),
    databaseURL: serviceAccount.firebaseURL || undefined,
  };

  return appName
    ? admin.initializeApp(options, appName)
    : admin.initializeApp(options);
}

module.exports = function (app) {
  const customerFDB = initFirebaseApp(require("./firebaseInfoCustomer"));
  if (customerFDB) app.set("customerFDB", customerFDB);

  const driverFDB = initFirebaseApp(require("./firebaseInfoDriver"), "driverFDB");
  if (driverFDB) app.set("driverFDB", driverFDB);

  const restaurantFDB = initFirebaseApp(
    require("./firebaseInfoRestaurant"),
    "restaurantFDB"
  );
  if (restaurantFDB) app.set("restaurantFDB", restaurantFDB);
};
