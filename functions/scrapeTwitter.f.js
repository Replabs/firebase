/**
 * Every 20 minutes, fetch users that haven't been updated since a day ago.
 * Update the
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

const frequencyMinutes = 15;
const oneDayInMillis = 1000 * 60 * 60 * 24;

module.exports = functions.pubsub
  .schedule(`every ${frequencyMinutes} minutes`)
  .onRun(async (context) => {
    // Set up the twitter client.
    const client = new TwitterApi({
      appKey: firebase.config().config.CONSUMER_KEY,
      appSecret: firebase.config().config.CONSUMER_SECRET,
      accessToken: firebase.config().config.ACCESS_TOKEN_KEY,
      accessSecret: firebase.config().config.ACCESS_TOKEN_SECRET,
    });

    // Fetch accounts to handle.
    const date = new Date(Date.now() - 1000 * 60 * frequencyMinutes);

    const users = await admin
      .firestore()
      .collection("users")
      .where("last_crawled", "<", date)
      .get();

    for (const user of users.docs) {
      try {
        // Get the tweets for the user.
        const tweets = await getMentionsRecursively(user.id);

        //
        // Add the tweet data to firestore.
        //
        const batch = admin.firestore().batch();

        tweets.forEach((tweet) => {
          batch.set(
            admin.firestore().collection("tweets").doc(tweet.id),
            tweet
          );
        });

        await batch.commit();
      } catch (error) {
        // Terminate the function if the rate limit is reached,
        if (error.code === 429) {
          console.log("Reached rate limit, terminating function...");
          return;
        }

        throw error;
      }
    }
  });

/**
 * Fetch a tweet from a tweet ID.
 */
async function getTweet(id) {
  const response = await client.v2.get(`tweets/${id}`);
  return response.data;
}

/**
 * Fetches user mentions recursively until the  @param paginationLimit is hit.
 *
 * Returns a list of mentions.
 */
async function getMentionsRecursively(
  id,
  paginationCount = 0,
  paginationToken = null,
  accumulatedTweets = [],
  paginationLimit = 100
) {
  let params = {
    max_results: 100,
    "tweet.fields": "referenced_tweets",
    expansions: ["author_id", "referenced_tweets.id"],
  };

  if (paginationToken) {
    params.pagination_token = paginationToken;
  }

  // Fetch the mention tweets.
  const response = await client.v2.get(`users/${id}/mentions`, params);

  if (!response || !response.data) {
    return accumulatedTweets;
  }

  // Cache the user info.
  for (const user of response.includes.users) {
    userInfo[user.id] = user;
  }

  // Only include tweets that have a referenced tweet.
  let tweets = response.data.filter((t) => t.referenced_tweets?.length > 0);

  // Fetch the actual content of the referenced tweet (response only includes the ID).
  await Promise.all(
    tweets.map((tweet) => {
      const id = tweet.referenced_tweets[0].id;
      return getTweet(id).then((t) => {
        tweet.referenced_tweet = t;
      });
    })
  );

  accumulatedTweets = accumulatedTweets.concat(tweets);

  // Only recursively fetch tweets which are newer than 24 hours.
  // Older tweets assumed to have already been fetched (as the script runs continously).
  const isFromBeforeYesterday =
    accumulatedTweets.sort((t) => t.created_at).pop().created_at <
    new Date(Date.now() - oneDayInMillis);

  if (accumulatedTweets.sort((t) => t.created_at))
    if (
      response.meta &&
      response.meta.next_token &&
      paginationCount < paginationLimit &&
      !isFromBeforeYesterday
    ) {
      //
      // Fetch tweets for next pagination if appliable.
      //
      return getMentionsRecursively(
        id,
        ++paginationCount,
        response.meta.next_token,
        accumulatedTweets
      );
    } else {
      return accumulatedTweets;
    }
}
