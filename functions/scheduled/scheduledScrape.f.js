/**
 * Every 10 minutes, scrape tweets for all lists since last time
 * a scrape was performed.
 */

const functions = require("firebase-functions");
const scrape = require("../scrape");

module.exports = functions.pubsub
  .schedule(`*/10 * * * *`) // Every 10th minute.
  .onRun(async (_) => scrape());
