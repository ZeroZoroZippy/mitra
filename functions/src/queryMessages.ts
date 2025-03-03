import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

async function queryMessages() {
  try {
    const messagesSnapshot = await db.collectionGroup("messages").get();
    messagesSnapshot.forEach((doc) => {
      console.log(`Message ID: ${doc.id}, Timestamp: ${doc.data().timestamp}`);
    });
  } catch (error) {
    console.error("Error querying messages:", error);
  }
}

queryMessages();
