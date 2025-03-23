import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    serverTimestamp,
    DocumentData,
    doc,
    increment,
    updateDoc,
    setDoc,
    getDoc,
    Timestamp,
    FieldValue,
    arrayUnion,
    arrayRemove
} from "firebase/firestore";
import { auth } from "./firebaseConfig";

const db = getFirestore();

/**
 * Interface for concept messages
 */
export interface ConceptMessage {
    id?: string;
    text: string;
    sender: "user" | "assistant";
    timestamp: string;
    conceptId: string | null;
    type?: string;
    language?: string;
    encrypted?: boolean;
}

/**
 * Interface for Firestore concept document data
 */
interface ConceptDocData {
    text: string;
    sender: "user" | "assistant";
    timestamp: Timestamp | string | FieldValue;
    conceptId: string | null;
    type: string | null;
    language: string | null;
    createdAt: string;
    encrypted: boolean;
}

/**
 * Interface for Custom Concept
 */
export interface CustomConcept {
  id: string;
  title: string;
  createdAt: string;
  lastAccessed: string;
}

/**
 * Generate a unique ID for custom concepts
 */
export const generateCustomConceptId = (): string => {
  return `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

/**
 * Save a custom concept to user preferences
 */
export const saveCustomConcept = async (conceptId: string, title: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    // Get user preferences document or create if it doesn't exist
    const userPrefsRef = doc(db, `users/${user.uid}/preferences/concepts`);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    const newConcept = {
      id: conceptId,
      title: title,
      createdAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString()
    };
    
    if (userPrefsDoc.exists()) {
      // Add to existing custom concepts array
      await updateDoc(userPrefsRef, {
        customConcepts: arrayUnion(newConcept),
        recentConcepts: arrayUnion(conceptId)
      });
    } else {
      // Create new preferences document with custom concepts array
      await setDoc(userPrefsRef, {
        customConcepts: [newConcept],
        recentConcepts: [conceptId]
      });
    }
  } catch (error) {
    console.error("Error saving custom concept:", error);
  }
};

/**
 * Update the lastAccessed timestamp for a concept
 */
export const updateConceptAccess = async (conceptId: string): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const userPrefsRef = doc(db, `users/${user.uid}/preferences/concepts`);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      const data = userPrefsDoc.data();
      const customConcepts = data.customConcepts || [];
      const recentConcepts = data.recentConcepts || [];
      
      // For predefined concepts, just update recentConcepts
      if (!conceptId.startsWith('custom-')) {
        // Remove from array if exists and add to beginning
        const updatedRecentConcepts = [
          conceptId,
          ...recentConcepts.filter(id => id !== conceptId)
        ].slice(0, 10); // Keep only 10 most recent
        
        await updateDoc(userPrefsRef, {
          recentConcepts: updatedRecentConcepts
        });
        return;
      }
      
      // For custom concepts, update lastAccessed in the custom concept
      const conceptIndex = customConcepts.findIndex(c => c.id === conceptId);
      if (conceptIndex !== -1) {
        // Create a new array with the updated concept
        const updatedConcepts = [...customConcepts];
        updatedConcepts[conceptIndex] = {
          ...updatedConcepts[conceptIndex],
          lastAccessed: new Date().toISOString()
        };
        
        // Update recentConcepts array too
        const updatedRecentConcepts = [
          conceptId,
          ...recentConcepts.filter(id => id !== conceptId)
        ].slice(0, 10); // Keep only 10 most recent
        
        await updateDoc(userPrefsRef, {
          customConcepts: updatedConcepts,
          recentConcepts: updatedRecentConcepts
        });
      }
    }
  } catch (error) {
    console.error("Error updating concept access:", error);
  }
};

/**
 * Get custom concepts for the current user
 */
export const getCustomConcepts = async (): Promise<CustomConcept[]> => {
  const user = auth.currentUser;
  if (!user) return [];
  
  try {
    const userPrefsRef = doc(db, `users/${user.uid}/preferences/concepts`);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      const data = userPrefsDoc.data();
      return data.customConcepts || [];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching custom concepts:", error);
    return [];
  }
};

/**
 * Get recent concept IDs (both predefined and custom)
 */
export const getRecentConceptIds = async (): Promise<string[]> => {
  const user = auth.currentUser;
  if (!user) return [];
  
  try {
    const userPrefsRef = doc(db, `users/${user.uid}/preferences/concepts`);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      const data = userPrefsDoc.data();
      return data.recentConcepts || [];
    }
    
    return [];
  } catch (error) {
    console.error("Error fetching recent concepts:", error);
    return [];
  }
};

/**
 * Get custom concept by ID
 */
export const getCustomConceptById = async (conceptId: string): Promise<CustomConcept | null> => {
  if (!conceptId.startsWith('custom-')) return null;
  
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const userPrefsRef = doc(db, `users/${user.uid}/preferences/concepts`);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      const data = userPrefsDoc.data();
      const customConcepts = data.customConcepts || [];
      return customConcepts.find(c => c.id === conceptId) || null;
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching custom concept:", error);
    return null;
  }
};

/**
 * Save a concept message to Firestore
 */
export const saveConceptMessage = async (
    text: string,
    sender: "user" | "assistant",
    conceptId: string | null = null,
    type?: string,
    language?: string
): Promise<string | null> => {
    const user = auth.currentUser;
    if (!user) {
        console.warn("Cannot save concept message: No authenticated user");
        return null;
    }

    if (conceptId) {
      // Update the last accessed timestamp for the concept
      await updateConceptAccess(conceptId);
    }

    try {
        const messageData: ConceptDocData = {
            text,
            sender,
            timestamp: serverTimestamp(),
            conceptId,
            type: type || null,
            language: language || null,
            createdAt: new Date().toISOString(),
            encrypted: false
        };

        console.log(`Saving concept message with conceptId: ${conceptId}`);

        const docRef = await addDoc(
            collection(db, `users/${user.uid}/preferences/concepts/messages`),
            messageData
        );

        // Update analytics - ensure document exists first
        await updateConceptAnalytics(sender);

        console.log("✅ Concept message saved with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("❌ Error saving concept message:", error);
        return null;
    }
};

/**
 * Helper function to ensure analytics document exists and update it
 */
const updateConceptAnalytics = async (sender: string) => {
    try {
        const analyticsRef = doc(db, "statistics", "conceptUsage");
        const docSnap = await getDoc(analyticsRef);

        if (!docSnap.exists()) {
            // Create the document if it doesn't exist
            await setDoc(analyticsRef, {
                totalMessages: 1,
                userMessages: sender === "user" ? 1 : 0,
                assistantMessages: sender === "assistant" ? 1 : 0,
                concepts: {}
            });
        } else {
            // Update the existing document
            await updateDoc(analyticsRef, {
                totalMessages: increment(1),
                [sender === "user" ? "userMessages" : "assistantMessages"]: increment(1)
            });
        }
    } catch (error) {
        console.error("Error updating concept analytics:", error);
    }
};

/**
 * Get concept messages for a specific concept
 */
export const getConceptMessages = async (
  conceptId: string | null
): Promise<ConceptMessage[]> => {
  const user = auth.currentUser;
  if (!user) {
      console.warn("Cannot fetch concept messages: No authenticated user");
      return [];
  }

  try {
      console.log(`Fetching concept messages for conceptId: ${conceptId}`);
      
      // Modified query - removed orderBy to avoid requiring composite index
      const q = query(
          collection(db, `users/${user.uid}/preferences/concepts/messages`),
          where("conceptId", "==", conceptId)
      );

      const querySnapshot = await getDocs(q);
      console.log(`Found ${querySnapshot.docs.length} concept messages`);

      if (querySnapshot.empty) {
          return [];
      }

      const messages: ConceptMessage[] = [];

      querySnapshot.docs.forEach((doc) => {
          const data = doc.data();
          
          // Handle Firestore timestamp consistently
          let timestamp: string;
          
          if (data.timestamp && typeof data.timestamp === 'object' && 'toDate' in data.timestamp) {
              // For Firestore Timestamp objects
              timestamp = data.timestamp.toDate().toISOString();
          } else if (typeof data.timestamp === 'string') {
              // For string timestamps
              timestamp = data.timestamp;
          } else {
              // Fallback to createdAt or current time
              timestamp = data.createdAt || new Date().toISOString();
          }

          messages.push({
              id: doc.id,
              text: data.text,
              sender: data.sender,
              timestamp,
              conceptId: data.conceptId,
              type: data.type || undefined,
              language: data.language || undefined,
              encrypted: data.encrypted || false,
          });
      });

      // We'll still sort messages by timestamp in memory
      const sortedMessages = messages.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      console.log(`Returning ${sortedMessages.length} sorted concept messages`);
      return sortedMessages;

  } catch (error) {
      console.error("❌ Error fetching concept messages:", error);
      return [];
  }
};

/**
 * Track concept usage for analytics
 */
export const trackConceptUsage = async (
    conceptId: string | null,
    conceptTitle: string | null
): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Add to concept history
        await addDoc(collection(db, "conceptAnalytics"), {
            userId: user.uid,
            conceptId,
            conceptName: conceptTitle,
            timestamp: serverTimestamp(),
        });

        // Update concept frequency counter
        if (conceptTitle) {
            const sanitizedConceptName = conceptTitle.replace(/[.#$/[\]]/g, "_");
            const analyticsRef = doc(db, "statistics", "conceptUsage");
            const docSnap = await getDoc(analyticsRef);

            if (!docSnap.exists()) {
                // Create the document if it doesn't exist
                await setDoc(analyticsRef, {
                    concepts: { [sanitizedConceptName]: 1 },
                    totalMessages: 0,
                    userMessages: 0,
                    assistantMessages: 0
                });
            } else {
                // Update the existing document
                await updateDoc(analyticsRef, {
                    [`concepts.${sanitizedConceptName}`]: increment(1)
                });
            }
        }
    } catch (error) {
        console.error("Error tracking concept usage:", error);
    }
};

/**
 * Convert a concept message to the standard chat message format
 */
export const convertToChatMessage = (conceptMessage: ConceptMessage) => {
    return {
        id: conceptMessage.id,
        text: conceptMessage.text,
        sender: conceptMessage.sender,
        timestamp: conceptMessage.timestamp,
        encrypted: false,
        threadID: 0, // Use a default thread ID
        type: conceptMessage.type,
        language: conceptMessage.language
    };
};

export { db };