/**
 * Every day, embed tweets.
 */

const functions = require("firebase-functions");
const embed = require("../embed");

module.exports = functions.pubsub
  .schedule(`0 0 * * *`) // Every day.
  .onRun(async (_) => embed());
