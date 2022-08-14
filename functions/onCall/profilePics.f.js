// /**
//  * Scrape all tweets since last scrape.
//  */

// const functions = require("firebase-functions");
// const TwitterApi = require("twitter-api-v2").TwitterApi;
// const admin = require("../admin");

// module.exports = functions.https.onRequest(async (_) => {
//   // The twitter client.
//   const client = new TwitterApi({
//     appKey: process.env.CONSUMER_KEY,
//     appSecret: process.env.CONSUMER_SECRET,
//     accessToken: process.env.ACCESS_TOKEN_KEY,
//     accessSecret: process.env.ACCESS_TOKEN_SECRET,
//   });

//   const lists = await admin.firestore().collection("lists").get();

//   for (let list of lists.docs) {
//     let data = { ...list.data() };

//     for (let member of data.members) {
//       if (!member.profile_image_url) {
//         console.log(`Fetching image for user ${member.id}`);

//         const response = await client.v2.get(
//           `users/${member["id"]}?user.fields=profile_image_url`
//         );

//         member.profile_image_url = response.data.profile_image_url;
//       }
//     }

//     console.log("Updating list");
//     console.log(data);

//     await admin
//       .firestore()
//       .collection("lists")
//       .doc(list.id)
//       .update({ ...data });
//   }
// });
