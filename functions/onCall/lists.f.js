/**
 * Get a user's lists.
 */

const TwitterApi = require("twitter-api-v2").TwitterApi;
const functions = require("firebase-functions");

module.exports = functions.https.onRequest(async (snap, _) => {
  // The twitter client.
  const client = new TwitterApi({
    appKey: process.env.CONSUMER_KEY,
    appSecret: process.env.CONSUMER_SECRET,
    accessToken: process.env.ACCESS_TOKEN_KEY,
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
  });

  // Get the user's lists.
  return await client.v2.get(`users/${snap.id}/owned_lists`);
});
