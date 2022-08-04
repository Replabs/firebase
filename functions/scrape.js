/* Fetch users that haven't been updated since a day ago.
 *
 * For every user:
 *  - Fetch their latest tweets recursively (only tweets from after last invocation).
 *  - Add the tweets to firestore
 *  - Mark the user as having been scraped in firestore.
 */

const admin = require("./admin");
const arrayUnion = admin.firestore.FieldValue.arrayUnion;
const Timestamp = admin.firestore.FieldValue.Timestamp;
const TwitterApi = require("twitter-api-v2").TwitterApi;

module.exports = function scrape() {
 // The time when the function starts.
 const start = Date.now();

 // The twitter client.
 const client = new TwitterApi({
   appKey: process.env.CONSUMER_KEY,
   appSecret: process.env.CONSUMER_SECRET,
   accessToken: process.env.ACCESS_TOKEN_KEY,
   accessSecret: process.env.ACCESS_TOKEN_SECRET,
 });

 // Fetch the metadata about the crawl.
 const metadata = await getMetadata();

 // The ref of the metadata document (ID is the ISO string of the start time of the crawl).
 const metadata_ref = admin.firestore().collection('crawls').doc(metadata.start_time.toDate().toISOString())

 // The lists.
 const lists = await admin
   .firestore()
   .collection("lists")
   .get();

   // The lists that still haven't been crawled.
  const uncrawledLists = lists.docs.filter(l => !metadata.crawled_lists.includes(l.id));

  //
  // For each uncrawled lists, crawl all the uncrawled users.
  // After finishing crawling a user or a list, update the metadata in firestore.
  //
  for (const list of uncrawledLists) {
    // The users that still haven't been crawled.
    const uncrawledUsers = list.members.filter(m => !metadata.crawled_users.includes(m.id))

    // Loop through the uncrawled users.
    for (const user of uncrawledUsers) {
      // Crawl the user.
      await crawlUser(user.id, client, lastCrawledAt);

      // Mark the user as having been crawled asynchronously.
      metadata_ref.update({
        crawled_users: arrayUnion(user.id),
      });
    }

    // Mark the list as having been crawled asynchronously.
    metadata_ref.update({
      lists: arrayUnion(list.id),
    });
  }

 // Mark the crawl as complete.
 metadata_ref.update({
  completed_at: Timestamp.fromDate(new Date()),  
});

 console.log(
   `Finished crawling. Took ${(Date.now() - start) / 1000} seconds.`
 );
}

/**
 * Get the crawl metadata, with information such as which users and lists have been crawled,
 * and which
 */
async function getMetadata() {
  // Fetch the latest uncompleted crawl's metadata.
  const latest = await admin
    .firestore()
    .collection("crawls")
    .orderBy('started_at')
    .where('completed_at', '!=', null)
    .limit(1)
    .get();

  // If no uncompleted crawl exists, create one.
  if (latest.empty) {
    const now = new Date()

    // The metadata.
    const data = {
      started_at: Timestamp.fromDate(now),
      completed_at: null,
      crawled_users: [],
      crawled_lists: [],
    };

    // Update the metadata in firestore.
    await admin.firestore().collection("crawls").doc(now.toISOString()).set({
      started_at: Timestamp.fromDate(new Date()),
      completed_at: null,
      crawled_users: [],
      crawled_lists: [],
    });

    // Return the metadata.
    return data;
  } else {
    // Return the latest uncompleted crawl's metadata.
    return {...latest.docs[0].data()};
  }
}

/**
 * Crawl recent tweets for a user and adds them to firestore.
 */
async function crawlUser(userId, client) {
  console.log(`Crawling user ${userId}`);
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
      created_at: Timestamp.fromDate(new Date()),
      referenced_tweet: tweets[i].referenced_tweet
        ? {
            id: tweets[i].referenced_tweet.id,
            author_id: tweets[i].referenced_tweet.author_id,
            text: tweets[i].referenced_tweet.text,
          }
        : null,
    };

    // Add the tweet firestore data to the batch.
    batch.set(admin.firestore().collection("tweets").doc(tweets[i].id), data);
  }

  // Add the tweets to firestore.
  await batch.commit();

  console.log(`Finished crawling ${tweets.length} tweets for ${userId}.`);
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

  tweets = tweets.map((tweet) => {
    // Attach the full referenced tweet object to each tweet, if applicable.
    if (tweet.referenced_tweets?.length > 0) {
      const referencedTweetId = tweet.referenced_tweets[0].id;
      const referencedTweet = response.includes.tweets?.find(
        (t) => t.id == referencedTweetId
      );

      // Append the referenced tweet.
      tweet.referenced_tweet = referencedTweet;
    }

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
