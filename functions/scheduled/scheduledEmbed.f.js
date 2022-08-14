/**
 * Every 15th minute, embed unembedded tweets.
 */

const functions = require("firebase-functions");
const embed = require("../embed");

module.exports = functions.pubsub
  .schedule(`/15 * * * *`) // Every 10th minute.
  .onRun(async (_) => embed());
