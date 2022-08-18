// /**
//  * Get a user's lists.
//  */

// const TwitterApi = require("twitter-api-v2").TwitterApi;
// const functions = require("firebase-functions");

// module.exports = functions.https.onRequest(async (data, _) => {
//   // Verify the API key.
//   if (!data.api_key || data.api_key != process.env.TWITTER_FLASK_API_KEY) {
//     return;
//   }

//   // The twitter client.
//   const client = new TwitterApi({
//     appKey: process.env.CONSUMER_KEY,
//     appSecret: process.env.CONSUMER_SECRET,
//     accessToken: process.env.ACCESS_TOKEN_KEY,
//     accessSecret: process.env.ACCESS_TOKEN_SECRET,
//   });

//   // Get the user's lists.
//   const lists = await client.v2.get(`users/${data.id}/owned_lists`);
//   return lists;
// });
