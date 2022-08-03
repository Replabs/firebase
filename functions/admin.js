const admin = require("firebase-admin");

const gcpServiceAccount = require("./gcpServiceAccount.json");

admin.initializeApp({
  credential: admin.credential.cert(gcpServiceAccount),
});

module.exports = admin;
