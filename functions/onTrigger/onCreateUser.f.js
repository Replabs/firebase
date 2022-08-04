/**
 * Create or update the user's lists.
 */

const functions = require("firebase-functions");
const admin = require("./admin");
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

    // The twitter ID of the user.
    const twitterId = snap.id;

    // Get the user's lists.
    const lists = await client.lists.listUserOwnedLists(twitterId);

    for (const list of lists.data) {
      // Get the list members.
      const members = await client.v2.get(`/2/lists/${list.id}/members`);

      // Upsert the list in firestore.
      await admin.firestore().collection("lists").doc(list.id).set(
        {
          id: list.id,
          members: members,
        },
        { merge: true }
      );
    }
  });
