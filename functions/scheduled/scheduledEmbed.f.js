/**
 * Every hour, embed unembedded tweets.
 */

const functions = require("firebase-functions");
const embed = require("../embed");

module.exports = functions.pubsub
  .schedule(`30 * * * *`) // Every hour at minute 30.
  .onRun(async (_) => embed());
