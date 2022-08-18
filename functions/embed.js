const admin = require("./admin");
const axios = require("axios");

// The batch size of the updates.
const batchSize = 10;

// The base url for the flask app.
const baseUrl = process.env.FUNCTIONS_EMULATOR
  ? "http://127.0.0.1:5000"
  : "https://backend-bo3523uimq-uc.a.run.app";

module.exports = async () => {
  // Unembedded tweets.
  const tweets = await admin
    .firestore()
    .collection("tweets")
    .where("sentiment", "==", null)
    .limit(500)
    .get();

  console.log(
    `About to calculate embeddings and sentiments for ${tweets.docs.length} tweets.`
  );

  for (let i = 0; i < tweets.docs.length; i += batchSize) {
    // The tweets for the batch.
    const batch = tweets.docs.slice(i, i + batchSize).map((t) => t.data());

    // The embedded tweets.
    await axios.post(baseUrl + "/embed", {
      api_key: process.env.TWITTER_FLASK_API_KEY,
      tweets: batch,
    });

    console.log(
      `Calculated embeddings and sentiment scores for ${i + batchSize} / ${
        tweets.docs.length
      } tweets.`
    );
  }
};
