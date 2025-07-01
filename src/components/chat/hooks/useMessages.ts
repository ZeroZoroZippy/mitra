import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { getMessages, saveMessage, updateLikeStatus } from '../../../utils/firebaseDb';
import { ChatMessage } from '../../../types/chat';
import { Timestamp } from 'firebase/firestore'; 

export const useMessages = (activeChatId: number, user: User | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Effect to fetch messages when the chat room or user changes
  useEffect(() => {
    if (!user) {
      setMessages([]); // Clear messages if user logs out
      return;
    }

    const fetchMessages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetches messages from Firestore for the specific user and thread
        const loadedMessages = await getMessages(user.uid, activeChatId);
        
        // Formats the raw data into the ChatMessage type
        const formatted = loadedMessages.map(msg => {
            let timestampStr = '';
            const msgTimestamp = msg.timestamp;
  
            if (
              typeof msgTimestamp === 'object' &&
              msgTimestamp !== null &&
              typeof (msgTimestamp as any).toDate === 'function'
            ) {
              // If it's a Firestore Timestamp object, convert it
              timestampStr = (msgTimestamp as any).toDate().toISOString();
            } else if (typeof msgTimestamp === 'string') {
              // If it's already a string, use it
              timestampStr = msgTimestamp;
            } else {
              // As a fallback for missing or invalid timestamps, you could use now,
              // but it's better to log this as an error. For now, we prevent a crash.
              console.warn("Invalid or missing timestamp for message:", msg.id);
              timestampStr = new Date().toISOString(); // Fallback to current time
            }

            return {
                ...msg,
                id: msg.id,
                sender: msg.sender as "user" | "assistant",
                timestamp: timestampStr,
                threadID: activeChatId,
                encrypted: msg.encrypted ?? false,
              } as ChatMessage;
            });
            
            setMessages(formatted);
          } catch (e) {
            setError(e as Error);
            console.error("❌ Error loading messages:", e);
          } finally {
            setIsLoading(false);
          }
        };
    
        fetchMessages();
      }, [activeChatId, user]); // Re-run this effect when the user or chat ID changes

  // Function to send a new message
  const sendMessage = useCallback(async (text: string): Promise<ChatMessage | null> => {
    if (!text.trim() || !user) return null;

    // Creates the user message object locally
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      sender: "user",
      timestamp: new Date().toISOString(),
      likeStatus: null,
      encrypted: true, // User messages are encrypted by default
      threadID: activeChatId,
    };

    // Optimistic UI update: Add the message to the screen immediately
    setMessages(prev => [...prev, userMessage]);

    // Persist the message to Firestore in the background
    try {
      await saveMessage(userMessage.text, "user", null, activeChatId);
    } catch (e) {
      console.error("Failed to save message:", e);
      // Optional: Implement rollback logic here to remove the message if saving fails
      setError(e as Error);
    }
    
    return userMessage; // Return the message for other hooks to use (e.g., useChatAI)
  }, [activeChatId, user]);

  // Function to update the like/dislike status of a message
  const likeDislikeMessage = useCallback(async (messageId: string, action: "like" | "dislike") => {
    // Find the current status to toggle it
    const currentMessage = messages.find(msg => msg.id === messageId);
    const currentStatus = currentMessage?.likeStatus;
    const newStatus = currentStatus === action ? null : action;
    
    // Optimistic UI update
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, likeStatus: newStatus } : msg))
    );

    // Persist the change to Firestore
    try {
      await updateLikeStatus(messageId, newStatus);
    } catch (e) {
      console.error("Failed to update like status:", e);
      // Optional: Rollback UI change on failure
      setMessages(prev =>
        prev.map(msg => (msg.id === messageId ? { ...msg, likeStatus: currentStatus } : msg))
      );
      setError(e as Error);
    }
  }, [messages]); // Dependency on messages to get the current status

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  // ✅ NEW: Function to clear messages and optionally add a starting message.
  const clearAllMessages = useCallback(() => {
    const purgeMessage: ChatMessage = {
      text: "Memory refreshed! Let’s start fresh. 😊",
      sender: "assistant",
      timestamp: new Date().toISOString(),
      encrypted: false,
      threadID: activeChatId
    };
    setMessages([purgeMessage]);
  }, [activeChatId]);

  // ✅ MODIFIED: Export the new functions from the hook.
  return { messages, isLoading, error, sendMessage, likeDislikeMessage, addMessage, clearAllMessages };
};