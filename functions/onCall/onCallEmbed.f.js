/**
 * Embed all unembedded tweets.
 */

const functions = require("firebase-functions");
const admin = require("./admin");

// The base url for the flask app.
const baseUrl = process.env.FUNCTIONS_EMULATOR
  ? "http://127.0.0.1:5000"
  : "https://replabs-flask-app-aucndxjanq-ew.a.run.app";

functions.https.onCall(async (_) => {
  // Unembedded tweets.
  const tweets = await admin
    .firestore()
    .collection("tweets")
    .where("sentiment", "==", null)
    .get();

  for (const tweet of tweets.docs) {
    // Get the response from the backend server.
    const response = await axios.post(baseUrl + "/embed", {
      api_key: process.env.TWITTER_FLASK_API_KEY,
      tweets: [tweet.data()],
    });

    // Update the firestore entry.
    await admin
      .firestore()
      .collection("tweets")
      .doc(snap.id)
      .update(response.data);
  }
});
