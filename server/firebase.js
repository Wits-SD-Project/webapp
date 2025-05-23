const { getFirestore } = require("firebase-admin/firestore");
require("dotenv").config();
const admin = require("firebase-admin");

try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("Firebase Admin initialized.");
} catch (error) {
  console.error("Firebase Admin init failed:", error);
}

const db = getFirestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
