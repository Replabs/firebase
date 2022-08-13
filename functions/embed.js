const admin = require("./admin");
const axios = require("axios");

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
    .get();

  console.log(
    `About to calculate embeddings and sentiments for ${tweets.docs.length} tweets.`
  );

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
      .doc(tweet.id)
      .update(response.data);

    console.log(`Updated tweet ${tweet.id}`);
  }
};
