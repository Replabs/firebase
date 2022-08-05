/*
 * Every 60 minutes, calculate PageRank for lists that haven't been updated since a day ago.
 */

const functions = require("firebase-functions");
const admin = require("../admin");

const TwitterApi = require("twitter-api-v2").TwitterApi;

module.exports = functions.pubsub
  .schedule(`every 60 minutes`)
  .onRun(async (_) => {
    // @TODO!
    // // The time when the function starts.
    // const start = Date.now();
    // // The twitter client.
    // const client = new TwitterApi({
    //   appKey: process.env.CONSUMER_KEY,
    //   appSecret: process.env.CONSUMER_SECRET,
    //   accessToken: process.env.ACCESS_TOKEN_KEY,
    //   accessSecret: process.env.ACCESS_TOKEN_SECRET,
    // });
    // // Get lists that haven't been crawled in a day.
    // const lists = await admin
    //   .firestore()
    //   .collection("lists")
    //   .where("last_crawled_at", "<", new Date(Date.now() - 1000 * 60 * 60 * 24))
    //   .get();
    // console.log(`About to crawl ${users.docs.length} lists.`);
    // // Crawl tweets for each list.
    // for (const list of lists.docs) {
    //   // The members of the list.
    //   const members = list.data()["members"];
    //   // Crawl tweets for each user.
    //   for (const user of members) {
    //       console.log(
    //         `User ${user.id} has already been crawled, skipping ahead.`
    //       );
    //       continue;
    //       // crawl tweets for user.
    //       // update crawledMembers.
    //     }
    //   }
    //   const lastCrawledAt = user.data()["last_crawled_at"]?.toDate();
    //   await crawlUser(user.id, client, lastCrawledAt);
    // }
    // console.log(
    //   `Finished crawling. Took ${(Date.now() - start) / 1000} seconds.`
    // );
  });
