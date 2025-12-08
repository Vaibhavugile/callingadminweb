// functions/index.js (GEN 2 version)
const { onCall } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2/options");
const admin = require("firebase-admin");

// Initialize admin once
if (!admin.apps.length) {
  admin.initializeApp();
}

// Default options for all functions
setGlobalOptions({
  region: "us-central1",
  memory: "512MiB",
});

// GEN 2 Callable Function
exports.createTenantUser = onCall(
  async (request) => {
    try {
      const data = request.data || {};
      console.log("createTenantUser raw data:", JSON.stringify(data));

      const tenantId = (data.tenantId || "").trim();
      const email = (data.email || "").trim();
      const password = (data.password || "").trim();
      const displayName = (data.displayName || tenantId || email).trim();

      if (!tenantId) {
        throw new Error("tenantId is required");
      }

      if (!email || !password) {
        throw new Error("Email and password are required");
      }

      // Create Firebase Auth user
      const userRecord = await admin.auth().createUser({
        email,
        password,
        displayName,
        disabled: false,
      });

      console.log("Created Auth user:", {
        tenantId,
        uid: userRecord.uid,
        email: userRecord.email,
      });

      const uid = userRecord.uid;
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Create userProfiles/{uid}
      await admin.firestore().doc(`userProfiles/${uid}`).set(
        {
          uid,
          tenantId,
          email: userRecord.email || email,
          displayName,
          role: "tenant",
          createdAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      // Update tenants/{tenantId}
      await admin.firestore().doc(`tenants/${tenantId}`).set(
        {
          authUid: uid,
          loginEmail: userRecord.email || email,
          updatedAt: now,
        },
        { merge: true }
      );

      return {
        ok: true,
        tenantId,
        uid,
        email: userRecord.email || email,
      };
    } catch (err) {
      console.error("createTenantUser ERROR:", err);
      return {
        ok: false,
        error: err.message || "Unexpected error",
      };
    }
  }
);
