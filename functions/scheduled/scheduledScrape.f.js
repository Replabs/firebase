/**
 * Every 24 hours, fetch tweets.
 */

const functions = require("firebase-functions");
const scrape = require("../scrape");

module.exports = functions.pubsub
  .schedule(`0 0 * * *`) // Every day at minute 0.
  .onRun(async (_) => scrape());
