/**
 * Scrape all tweets since last scrape.
 */

const functions = require("firebase-functions");
const scrape = require("../scrape");

module.exports = functions.https.onRequest(async (_) => scrape());
