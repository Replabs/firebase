const functions = require("firebase-functions");
const axios = require("axios");

const algoveraApiKey = "adecc845-d854-4f19-a278-3e0915139a18";

module.exports = functions.firestore
  .document("/algovera/{documentId}")
  .onCreate(async (snap, context) => {
    const text = snap.data().text;

    return axios.post(
      "https://replabs-flask-app-aucndxjanq-ew.a.run.app/create_embedding",
      {
        api_key: algoveraApiKey,
        server: "algovera",
        id: snap.id,
        text: text,
      }
    );
  });
