/**
 * Call the scraping script.
 */

const functions = require("firebase-functions");
const scrape = require("../scrape");

module.exports = functions.https.onCall(async (_) => scrape());
