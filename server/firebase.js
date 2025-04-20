const { getFirestore } = require("firebase-admin/firestore");
require("dotenv").config();
const admin = require("firebase-admin");

let serviceAccount;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production (Azure): Load from env
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else if (process.env.FIREBASE_KEY_PATH) {
    // Local dev: Load from file path in .env
    serviceAccount = require(process.env.FIREBASE_KEY_PATH);
  } else {
    throw new Error("No Firebase service account credentials found.");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  console.log("Firebase Admin initialized.");
} catch (error) {
  console.error("Firebase Admin init failed:", error);
}

const db = getFirestore();
const auth = admin.auth();

module.exports = { admin, db, auth };