import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../utils/firebaseConfig"; // ✅ Adjust the path if needed

/**
 * ✅ Function to Delete All Messages for a Specific User
 * @param userId The Firebase user ID whose messages should be deleted.
 */
const deleteUserMessages = async (userId: string) => {
  if (!userId) {
    console.error("❌ Error: User ID is required.");
    return;
  }

  try {
    // console.log(`🔍 Searching for messages by user: ${userId}...`);

    const messagesRef = collection(db, "messages");
    const q = query(messagesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // console.log(`✅ No messages found for user: ${userId}`);
      return;
    }

    // console.log(`🗑️ Found ${querySnapshot.size} messages. Deleting now...`);

    const deletePromises = querySnapshot.docs.map((docSnapshot) =>
      deleteDoc(doc(db, "messages", docSnapshot.id))
    );

    await Promise.all(deletePromises);

    // console.log(`✅ Successfully deleted all messages for user: ${userId}`);
  } catch (error) {
    console.error("❌ Error deleting messages:", error);
  }
};

// ✅ Get User ID from Command Line
const userId = process.argv[2]; // Pass the user ID as a command-line argument

if (!userId) {
  console.error("❌ Error: Please provide a user ID.");
  process.exit(1);
}

// ✅ Run the function
deleteUserMessages(userId);