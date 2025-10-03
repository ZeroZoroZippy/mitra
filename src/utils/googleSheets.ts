import { collection, getDocs, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";

const GOOGLE_SHEETS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyYgyUrioU0wd6bWj13pt_6xwlovq3B6mXQlAxdtr0iIS0IFvMxqqmx1sPBPKUaqiGC8A/exec"; // ✅ Replace with actual URL

/**
 * ✅ Track synced messages to prevent duplicates
 */
let lastSyncedMessageIds = new Set<string>();

/**
 * ✅ Prevent multiple Firestore listeners
 */
let unsubscribeFirestoreListener: (() => void) | null = null;

/**
 * ✅ Function to Send a Single New Message to Google Sheets (Real-Time Sync)
 */
const sendMessageToGoogleSheets = async (message: any) => {
  try {
    // ✅ Prevent duplicate sends for the same message
    if (lastSyncedMessageIds.has(message.id)) {
      // console.log("⚠️ Duplicate message detected, skipping sync:", message.id);
      return;
    }

    const formattedMessage = {
      id: message.id,
      userId: message.userId || "Unknown User",
      text: message.text || "",
      sender: message.sender || "Unknown",
      timestamp: message.timestamp || new Date().toISOString(),
      likeStatus: message.likeStatus || "None",
    };

    await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(formattedMessage),
      headers: { "Content-Type": "application/json" },
      mode: "no-cors",
    });

    lastSyncedMessageIds.add(message.id);
  } catch (error) {
    console.error("❌ Error", error);
  }
};

/**
 * ✅ Real-Time Sync (onSnapshot) - Sends Only New Messages
 */
export const syncFirestoreToGoogleSheets = () => {
  if (unsubscribeFirestoreListener) {
    // console.log("⚠️ Firestore listener already running. Skipping duplicate listener.");
    return;
  }

  const messagesRef = collection(db, "messages");

  unsubscribeFirestoreListener = onSnapshot(messagesRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const newMessage = { id: change.doc.id, ...change.doc.data() };

        // ✅ Prevent duplicate sends
        if (lastSyncedMessageIds.has(newMessage.id)) {
          // console.log("⚠️ Duplicate message detected, skipping sync:", newMessage.id);
          return;
        }

        setTimeout(() => {
          sendMessageToGoogleSheets(newMessage);
        }, 500);
      }
    });
  });
};

/**
 * ✅ Scheduled Backup Sync (Every 5 Minutes) - Ensures All Messages Are Stored
 */
export const exportToGoogleSheets = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "messages"));
    const messages = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      userId: doc.data().userId || "Unknown User",
      text: doc.data().text || "",
      sender: doc.data().sender || "Unknown",
      timestamp: doc.data().timestamp || new Date().toISOString(),
      likeStatus: doc.data().likeStatus || "None",
      syncedToSheets: doc.data().syncedToSheets || false, // ✅ Check if already synced
    }));

    // ✅ Only send messages that haven't been synced before
    const newMessages = messages.filter((msg) => !lastSyncedMessageIds.has(msg.id));

    if (newMessages.length === 0) {
      // console.log("✅ No new messages to sync.");
      return;
    }

    // console.log(`⏳ Syncing ${newMessages.length} new messages`);

    await fetch(GOOGLE_SHEETS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(newMessages),
      headers: { "Content-Type": "application/json" },
      mode: "no-cors",
    });

    // ✅ Mark messages as synced in Firestore
    newMessages.forEach(async (msg) => {
      const messageRef = doc(db, "messages", msg.id);
      await updateDoc(messageRef, { syncedToSheets: true });
      lastSyncedMessageIds.add(msg.id); // ✅ Prevent re-syncing
    });

  } catch (error) {
    console.error("❌ Error exporting", error);
  }
};