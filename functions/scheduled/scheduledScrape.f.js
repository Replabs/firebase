/**
 * Every 60 minutes, scrape tweets for all lists since last time
 * a scrape was performed.
 */

const functions = require("firebase-functions");
const scrape = require("../scrape");

module.exports = functions.pubsub
  .schedule(`0 * * * *`) // Every hour at minute 0.
  .onRun(async (_) => scrape());
