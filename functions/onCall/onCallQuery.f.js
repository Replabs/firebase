/**
 * Query for scores for a list and keyword.
 */

const functions = require("firebase-functions");
const admin = require("../admin");
const axios = require("axios");

// The base url for the flask app.
const baseUrl = process.env.FUNCTIONS_EMULATOR
  ? "http://127.0.0.1:5000"
  : "https://replabs-flask-app-aucndxjanq-ew.a.run.app";

module.exports = functions.https.onCall(async (data) => {
  // The list.
  const list = await admin
    .firestore()
    .collection("lists")
    .doc(data.list_id)
    .get();

  // The list members.
  const members = list.data()["members"];

  console.log(members.length + " list members!");
  console.log("about to fetch tweets!");

  // Get all of the relevant tweets.
  const tweets = await Promise.all(
    members.map(async (member) => {
      const tweets = await admin
        .firestore()
        .collection("tweets")
        .where("author_id", "==", member.id)
        .get();

      return tweets.docs.map((t) => t.data());
    })
  )
    .then((r) => r.flat())
    .then((r) => r.filter((t) => t.embedding));

  console.log(tweets.length);

  //
  // Calculate the PageRank score from a graph created from the tweets.
  //
  // Users represent nodes, and reply-tweets represent directed edges between two users.
  // The graph is weighted by the relevance of the context (represented by the
  // similarity between the topic and the referenced tweet embeddings) as well as the
  // sentiment score of the reply tweet.
  //
  const response = await axios.post(baseUrl + "/twitter/query", {
    api_key: process.env.TWITTER_FLASK_API_KEY,
    topic: data.topic,
    tweets: tweets,
  });

  // Return the PageRank scores.
  return response;
});
