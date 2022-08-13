// /**
//  * Update the embeddings for a tweet.
//  */

// const functions = require("firebase-functions");
// const admin = require("../admin");
// const axios = require("axios");

// // The base url for the flask app.
// const baseUrl = process.env.FUNCTIONS_EMULATOR
//   ? "http://127.0.0.1:5000"
//   : "https://backend-bo3523uimq-uc.a.run.app";

// module.exports = functions.firestore
//   .document("/tweets/{documentId}")
//   .onCreate(async (snap, _) => {
//     // Get the embeddings for the tweet.
//     const response = await axios.post(baseUrl + "/embed", {
//       api_key: process.env.TWITTER_FLASK_API_KEY,
//       tweets: [snap.data()],
//     });

//     // Update the firestore entry.
//     await admin
//       .firestore()
//       .collection("tweets")
//       .doc(snap.id)
//       .update(response.data);
//   });
