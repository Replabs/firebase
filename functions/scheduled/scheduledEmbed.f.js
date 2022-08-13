/**
 * Every hour, embed unembedded tweets.
 */

const functions = require("firebase-functions");
const embed = require("../embed");

module.exports = functions.pubsub
  .schedule(`0 * * * *`) // Every hour.
  .onRun(async (_) => embed());
