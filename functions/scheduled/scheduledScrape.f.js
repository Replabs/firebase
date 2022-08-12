/**
 * Every day, scrape tweets for all lists since last time
 * a scrape was performed.
 */

const functions = require("firebase-functions");
const scrape = require("../scrape");

module.exports = functions.pubsub
  .schedule(`0 1 * * *`) // Every day at minute 0 and hour 1.
  .onRun(async (_) => scrape());
