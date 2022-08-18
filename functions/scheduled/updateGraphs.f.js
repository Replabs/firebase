///
/// Uncomment to use.
///

// /**
//  * Every day at midnight, update the graphs on disk.
//  */

// const functions = require("firebase-functions");

// module.exports = functions.pubsub
//   .schedule(`0 * * * *`) // Every hour at minute 0.
//   .onRun(async (_) => {
//     // The embedded tweets.
//     await axios.post(baseUrl + "/update_graphs", {
//       api_key: process.env.TWITTER_FLASK_API_KEY,
//     });
//   });
