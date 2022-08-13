/**
 * Every 10th minute, embed unembedded tweets.
 */

const functions = require("firebase-functions");
const embed = require("../embed");

module.exports = functions.pubsub
  .schedule(`*/10 * * * *`) // Every 10th minute.
  .onRun(async (_) => embed());
