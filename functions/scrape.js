/**
 * Scrape tweets on a list basis.
 *
 * Fetch tweets since last scrape was finished.
 * Add all tweets to firestore.
 */

const admin = require("./admin");
const TwitterApi = require("twitter-api-v2").TwitterApi;

// From whence tweets should be crawled.
const genesisTimestamp = admin.firestore.Timestamp.fromDate(
  new Date(2020, 0, 1)
);

module.exports = async () => {
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
  const { metadata, previousMetadata } = await getMetadata();

  // The ref of the metadata document (ID is the ISO string of the start time of the crawl).
  const metadataRef = admin
    .firestore()
    .collection("crawls")
    .doc(metadata.start_time.toDate().toISOString());

  // The lists.
  const lists = await admin.firestore().collection("lists").get();

  // The lists that still haven't been crawled.
  const uncrawledLists = lists.docs.filter(
    (l) => !metadata.crawled_lists.includes(l.id)
  );

  console.log(`uncrawled lists: ${uncrawledLists.length}`);

  //
  // For each uncrawled lists, crawl all the uncrawled users.
  // After finishing crawling a user or a list, update the metadata in firestore.
  //
  for (const list of uncrawledLists) {
    await crawlList(list, metadata, previousMetadata, metadataRef, client);
  }

  // Mark the crawl as complete.
  metadataRef.update({
    completed_at: admin.firestore.Timestamp.fromDate(new Date()),
  });

  console.log(
    `Finished crawling. Took ${(Date.now() - start) / 1000} seconds.`
  );
};

/**
 * Crawls users in a list in batches.
 */
async function crawlList(
  list,
  metadata,
  previousMetadata,
  metadataRef,
  client,
  batchSize = 10
) {
  // The users that still haven't been crawled.
  const users = list.data()["members"].filter((m) => {
    return !metadata.crawled_users.includes(m.id);
  });

  // Loop through the users in a batch (to prevent losing data due to rate limit errors).
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const promises = batch.map((user) => {
      return new Promise(async (resolve) => {
        // The start time for the user.
        const startTime = getStartTime(user.id, metadata, previousMetadata);

        // Crawl the user.
        await crawlUser(user.id, client, startTime.toDate());

        // Mark the user as having been crawled asynchronously.
        await metadataRef.update({
          crawled_users: admin.firestore.FieldValue.arrayUnion(user.id),
        });

        resolve();
      });
    });

    // Crawl the users in the batch.
    await Promise.all(promises);

    console.log("Updated batch");
  }

  // Mark the list as having been crawled.
  metadataRef.update({
    crawled_lists: admin.firestore.FieldValue.arrayUnion(list.id),
  });
}

/**
 * Get the time from which a user's tweets should be crawled.
 *
 * If the list has not been crawled before,
 * it should be crawled from the genesis timestamp.
 */
function getStartTime(userId, metadata, previousMetadata) {
  if (!previousMetadata || previousMetadata.crawled_users.includes(userId)) {
    return metadata.start_time;
  }

  console.log(
    `User ${userId} has not been crawled yet, starting from ${genesisTimestamp
      .toDate()
      .toISOString()}`
  );

  return genesisTimestamp;
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
    .orderBy("start_time", "desc")
    .limit(2)
    .get();

  // If no uncompleted crawl exists, create one.
  if (latest.empty || latest.docs[0].data()["completed_at"] != null) {
    let startTimestamp = genesisTimestamp;

    // If a previous completed crawl exists, use the end time
    // of that crawl as starting time instead.
    if (!latest.empty) {
      startTimestamp = latest.docs[0].data()["completed_at"];
    }

    // The metadata.
    const data = {
      start_time: startTimestamp,
      completed_at: null,
      crawled_users: [],
      crawled_lists: [],
    };

    // Update the metadata in firestore.
    await admin
      .firestore()
      .collection("crawls")
      .doc(data.start_time.toDate().toISOString())
      .set(data);

    // Return the metadata.
    return {
      metadata: data,
      previousMetadata:
        latest.docs.length > 1 ? { ...latest.docs[1].data() } : null,
    };
  } else {
    // Update the start time to match the ID of the document.
    if (
      latest.docs[0].data().start_time.toDate().toISOString() !=
      latest.docs[0].id
    ) {
      console.log("Invalid start time of the crawl, updating...");

      await admin
        .firestore()
        .collection("crawls")
        .doc(latest.docs[0].id)
        .update({
          start_time: admin.firestore.Timestamp.fromDate(
            new Date(latest.docs[0].id)
          ),
        });
    }

    // Return the latest uncompleted crawl's metadata.
    return {
      metadata: { ...latest.docs[0].data() },
      previousMetadata:
        latest.docs.length > 1 ? { ...latest.docs[1].data() } : null,
    };
  }
}

/**
 * Crawl recent tweets for a user and adds them to firestore.
 */
async function crawlUser(userId, client, lastCrawledAt) {
  console.log(`Crawling user ${userId}`);
  // Get the tweets for the user.
  const tweets = await getReplyTweetsRecursively(userId, client, lastCrawledAt);

  //
  // Add the tweets to firestore.
  //

  let batch = admin.firestore().batch();

  for (let i = 0; i < tweets.length; i++) {
    //
    // There is a write limit to firestore batches.
    // If the limit is reached, commit and refresh the batch before continuing.
    //
    if (i >= 250) {
      await batch.commit();

      batch = admin.firestore().batch();
    }

    //
    // Map the twitter data to the firestore object.
    //
    const data = {
      id: tweets[i].id,
      author_id: tweets[i].author_id,
      recipient_id: tweets[i].referenced_tweet?.author_id,
      text: tweets[i].text,
      created_at: admin.firestore.Timestamp.fromDate(new Date()),
      sentiment: null,
      referenced_tweet: tweets[i].referenced_tweet
        ? {
            id: tweets[i].referenced_tweet.id,
            author_id: tweets[i].referenced_tweet.author_id,
            text: tweets[i].referenced_tweet.text,
            embedding: null,
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
  paginationLimit = 10
) {
  const params = {
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

  tweets = response.data.map((tweet) => {
    // Attach the full referenced tweet object to each tweet, if applicable.
    if (tweet.referenced_tweets?.length > 0) {
      // The referenced tweet's ID.
      const referencedTweetId = tweet.referenced_tweets[0].id;

      // The data of the referenced tweet.
      const referencedTweet = response.includes.tweets?.find(
        (t) => t.id == referencedTweetId
      );

      // Append the referenced tweet.
      tweet.referenced_tweet = referencedTweet;
    }

    return tweet;
  });

  // Filter out tweets where the referenced tweet's author is themself.
  tweets = tweets.filter((t) => {
    if (t.referenced_tweet) {
      return t.referenced_tweet.author_id != t.author_id;
    }

    // Don't include tweets without a reference tweet!
    return false;
  });

  // Add the tweets to the total accumulated tweets.
  accumulatedTweets = accumulatedTweets.concat(tweets);

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
