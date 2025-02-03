// storageUtils.ts

// Key used to store all chats in localStorage
const CHAT_STORAGE_KEY = 'chats';

// Limit how many messages we keep for any single chat
const MAX_MESSAGES = 200;

// Keep messages for 7 days (in milliseconds)
const MESSAGE_EXPIRATION_DAYS = 7;
const EXPIRATION_TIME = MESSAGE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;

// Define ChatMessage
export interface ChatMessage {
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

// This type describes the structure in localStorage: an object whose keys are
// chat IDs (strings), and values are arrays of ChatMessage.
type StoredChats = Record<string, ChatMessage[]>;

/**
 * Save messages to local storage for a specific chatId.
 * Ensures we don't exceed MAX_MESSAGES.
 */
export const saveChatToLocalStorage = (chatId: number, messages: ChatMessage[]) => {
  // Parse existing chats OR create an empty object
  const storedChats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}') as StoredChats;

  // Keep only the last MAX_MESSAGES messages
  if (messages.length > MAX_MESSAGES) {
    messages = messages.slice(-MAX_MESSAGES);
  }

  // Store updated messages back under the numeric chatId key
  // (cast to string to store as an object key)
  storedChats[String(chatId)] = messages;
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedChats));
};

/**
 * Load messages from local storage for a specific chatId.
 * Returns an empty array if none exist.
 */
export const loadChatFromLocalStorage = (chatId: number): ChatMessage[] => {
  const storedChats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}') as StoredChats;
  return storedChats[String(chatId)] || [];
};

/**
 * Cleanup function to remove old messages older than MESSAGE_EXPIRATION_DAYS.
 * Messages are filtered based on their timestamp.
 * Empty chats are also removed.
 */
export const cleanupOldMessages = () => {
  const storedChats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}') as StoredChats;
  const now = Date.now();

  Object.keys(storedChats).forEach((chatId) => {
    // Keep only the messages that haven't expired
    storedChats[chatId] = storedChats[chatId].filter((msg: ChatMessage) =>
      now - new Date(msg.timestamp).getTime() < EXPIRATION_TIME
    );

    // If a chat becomes empty, remove it entirely
    if (storedChats[chatId].length === 0) {
      delete storedChats[chatId];
    }
  });

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(storedChats));
};

/**
 * Optional utility to check if any chat has at least one message.
 * You can use this if you need a global "has any chat data?" check.
 */
export const hasChatHistory = (): boolean => {
  const storedChats = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '{}') as StoredChats;
  // Return true if any chat array has length > 0
  return Object.values(storedChats).some((messagesArray) => messagesArray.length > 0);
};