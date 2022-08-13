/**
 * Every hour, embed unembedded tweets.
 */

const functions = require("firebase-functions");
const embed = require("../embed");

module.exports = functions.pubsub
  .schedule(`*/15 * * * *`) // Every 15th minute.
  .onRun(async (_) => embed());
