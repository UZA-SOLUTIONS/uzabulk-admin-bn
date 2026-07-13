/**
 * Load Firebase service-account credentials from environment variables.
 * Never commit private keys — set them in `.env` or the host secret store.
 *
 * Shared vars (used when role-specific ones are unset):
 *   FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY_ID, FIREBASE_PRIVATE_KEY,
 *   FIREBASE_CLIENT_EMAIL, FIREBASE_CLIENT_ID, FIREBASE_CLIENT_X509_CERT_URL,
 *   FIREBASE_DATABASE_URL
 *
 * Optional role overrides (CUSTOMER | DRIVER | RESTAURANT):
 *   FIREBASE_<ROLE>_PROJECT_ID, FIREBASE_<ROLE>_PRIVATE_KEY, ...
 */
function envKey(role, name) {
  if (role) {
    const specific = process.env[`FIREBASE_${role}_${name}`];
    if (specific) return specific;
  }
  return process.env[`FIREBASE_${name}`] || "";
}

function loadServiceAccount(role = "") {
  const privateKey = envKey(role, "PRIVATE_KEY");
  return {
    type: "service_account",
    project_id: envKey(role, "PROJECT_ID"),
    private_key_id: envKey(role, "PRIVATE_KEY_ID"),
    private_key: privateKey,
    client_email: envKey(role, "CLIENT_EMAIL"),
    client_id: envKey(role, "CLIENT_ID"),
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: envKey(role, "CLIENT_X509_CERT_URL"),
    firebaseURL: envKey(role, "DATABASE_URL"),
  };
}

module.exports = { loadServiceAccount };
