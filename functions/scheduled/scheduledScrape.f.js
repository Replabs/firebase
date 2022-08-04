/**
 * Every 60 minutes, call the scraping script.
 */

const functions = require("firebase-functions");
const scrape = require("../scrape");

module.exports = functions.pubsub
  .schedule(`every 60 minutes`)
  .onRun(async (_) => scrape());
