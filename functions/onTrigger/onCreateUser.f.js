/**
 * Create or update the user's lists.
 */

const functions = require("firebase-functions");
const admin = require("../admin");
const TwitterApi = require("twitter-api-v2").TwitterApi;

module.exports = functions.firestore
  .document("/users/{documentId}")
  .onCreate(async (snap, _) => {
    // The twitter client.
    const client = new TwitterApi({
      appKey: process.env.CONSUMER_KEY,
      appSecret: process.env.CONSUMER_SECRET,
      accessToken: process.env.ACCESS_TOKEN_KEY,
      accessSecret: process.env.ACCESS_TOKEN_SECRET,
    });

    // Get the user's lists.
    const lists = await client.v2.get(`users/${snap.id}/owned_lists`);

    // Create a firestore batch.
    const batch = admin.firestore().batch();

    for (const list of lists.data) {
      // Get the list members.
      const response = await client.v2.get(`lists/${list.id}/members`);

      // Add the list to the firestore batch, updating the list if it already exists.
      batch.set(
        admin.firestore().collection("lists").doc(list.id),
        {
          id: list.id,
          name: list.name,
          owner_id: snap.id,
          members: response.data ?? [],
        },
        { merge: true }
      );
    }

    // Commit the batch.
    await batch.commit();
  });
