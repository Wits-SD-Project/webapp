// authenticate.js  (complete, ready to paste)
const { admin } = require("./firebase");

async function extractToken(req) {
  if (req.cookies?.authToken) return req.cookies.authToken;

  const hdr = req.headers.authorization;
  if (!hdr) return null;
  return hdr.startsWith("Bearer ") ? hdr.slice(7) : hdr; // accept both styles
}

const authenticate = async (req, res, next) => {
  try {
    const tokenString = await extractToken(req);
    if (!tokenString) {
      return res.status(401).json({
        message: "Authentication required",
        errorCode: "MISSING_AUTH_TOKEN",
      });
    }

    // 1️⃣ Verify signature (and revocation) — returns uid / email, *maybe* role
    const decoded = await admin.auth().verifyIdToken(tokenString, true);

    // 2️⃣ Pull the freshest role from Firestore
    const doc = await admin
      .firestore()
      .collection("users")
      .doc(decoded.email)
      .get();

    const role = doc.exists && doc.data().role ? doc.data().role : "user";

    // 3️⃣ Attach to request
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      role,
    };

    next();
  } catch (err) {
    console.error("Authentication error:", err.message);
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    res.status(401).json({
      message: "Invalid or expired token",
      errorCode: "INVALID_AUTH_TOKEN",
    });
  }
};

module.exports =  authenticate ;
