/**
 * Every 15 minutes, fetch users that haven't been updated since a day ago.
 * For every user, fetch their latest mention tweets recursively, until they are older since last time the function was run.
 */

const functions = require("firebase-functions");
const admin = require("./admin");

const TwitterApi = require("twitter-api-v2").TwitterApi;

module.exports = functions.pubsub
  .schedule(`every 60 minutes`)
  .onRun(async (_) => {
    // The time when the function starts.
    const start = Date.now();

    // The twitter client.
    const client = new TwitterApi({
      appKey: process.env.CONSUMER_KEY,
      appSecret: process.env.CONSUMER_SECRET,
      accessToken: process.env.ACCESS_TOKEN_KEY,
      accessSecret: process.env.ACCESS_TOKEN_SECRET,
    });

    // Get users that haven't been crawled in a day.
    const users = await admin
      .firestore()
      .collection("users")
      .where("last_crawled_at", "<", new Date(Date.now() - 1000 * 60 * 60 * 24))
      .get();

    console.log(`About to crawl ${users.docs.length} users.`);

    // Crawl tweets for each user.
    for (const user of users.docs) {
      const lastCrawledAt = user.data()["last_crawled_at"]?.toDate();

      await crawlUser(user.id, client, lastCrawledAt);
    }

    console.log(
      `Finished crawling. Took ${(Date.now() - start) / 1000} seconds.`
    );
  });

/**
 * Crawl recent tweets for a user and update firestore with the result.
 */
async function crawlUser(userId, client, lastCrawl) {
  console.log(`Crawling user ${userId}`);

  try {
    // Get the tweets for the user.
    const tweets = await getReplyTweetsRecursively(userId, client, lastCrawl);

    //
    // Add the tweets to firestore.
    //

    let batch = admin.firestore().batch();

    for (let i = 0; i < tweets.length; i++) {
      //
      // There is a 500 write limit to firestore batches.
      // If the limit is reached, commit and refresh the batch before continuing.
      //
      if (i >= 499) {
        await batch.commit();

        batch = admin.firestore().batch();
      }

      // Map the twitter data to the firestore object.
      const data = {
        id: tweets[i].id,
        author_id: tweets[i].author_id,
        text: tweets[i].text,
        created_at: admin.firestore.Timestamp.fromDate(new Date()),
        referenced_tweet: {
          id: tweets[i].referenced_tweet.id,
          author_id: tweets[i].referenced_tweet.author_id,
          text: tweets[i].referenced_tweet.text,
        },
      };

      // Add the tweet firestore data to the batch.
      batch.set(admin.firestore().collection("tweets").doc(tweets[i].id), data);
    }

    await batch.commit();

    //
    // Update the `last_crawled_at` property of the user.
    //
    await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .update({
        last_crawled_at: admin.firestore.Timestamp.fromDate(new Date()),
      });

    console.log(`Finished crawling ${tweets.length} tweets for ${userId}.`);
  } catch (error) {
    // Terminate the function gracefully if the rate limit is reached.
    if (error.code === 429) {
      console.log("Reached rate limit, terminating function...");
      return;
    }

    console.error(error);

    throw error;
  }
}

/**
 * Fetches user mentions recursively until the  @param paginationLimit is hit.
 *
 * Returns a list of mentions.
 */
async function getReplyTweetsRecursively(
  id,
  client,
  lastCrawledAt,
  paginationCount = 1,
  paginationToken = null,
  accumulatedTweets = [],
  paginationLimit = 100
) {
  console.log(lastCrawledAt?.toISOString());

  let params = {
    max_results: 100,
    start_time: lastCrawledAt?.toISOString(),
    exclude: ["retweets"],
    expansions: ["author_id", "referenced_tweets.id", "in_reply_to_user_id"],
    "tweet.fields": ["author_id", "referenced_tweets", "text"],
  };

  // Attach the pagination token to the parameters if one exists.
  if (paginationToken) {
    params.pagination_token = paginationToken;
  }

  // Fetch the mention tweets.
  const response = await client.v2.get(`users/${id}/tweets`, params);

  if (!response || !response.data) {
    return accumulatedTweets;
  }

  // Only include tweets that have a referenced tweet.
  let tweets = response.data.filter((t) => t.referenced_tweets?.length > 0);

  // Attach the full referenced tweet object to each tweet.
  tweets = tweets.map((tweet) => {
    const referencedTweetId = tweet.referenced_tweets[0].id;
    const referencedTweet = response.includes.tweets?.find(
      (t) => t.id == referencedTweetId
    );

    // Append the referenced tweet.
    tweet.referenced_tweet = referencedTweet;

    return tweet;
  });

  // Filter out tweets which couldn't be matched with a referenced tweet.
  // This can happen if the referenced tweet was deleted.
  accumulatedTweets = accumulatedTweets.concat(
    tweets.filter((t) => t.referenced_tweet)
  );

  if (
    response.meta &&
    response.meta.next_token &&
    paginationCount < paginationLimit
  ) {
    //
    // Fetch tweets for next pagination if appliable.
    //
    return getReplyTweetsRecursively(
      id,
      client,
      lastCrawledAt,
      ++paginationCount,
      response.meta.next_token,
      accumulatedTweets
    );
  } else {
    return accumulatedTweets;
  }
}
