interface ImportMeta {
  readonly env: ImportMetaEnv
}

import Groq from "groq-sdk";

// ✅ Define ChatMessage interface
interface ChatMessage {
  id?: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  likeStatus?: "like" | "dislike" | null;
}

// ✅ Function to Estimate Token Usage
export const estimateTokenUsage = (messages: ChatMessage[]) => {
  return messages.reduce((acc, msg) => acc + Math.ceil(msg.text.length / 4), 0);
};

// ✅ Function to Compress Older Messages When Token Usage is High
const compressOldMessages = (messages: ChatMessage[]): ChatMessage[] => {
  let tokenCount = estimateTokenUsage(messages);

  if (tokenCount <= 6000) return messages; // ✅ No need to compress if within safe limit

  console.warn("⚠️ Token usage high. Compressing older messages...");

  return messages.map((message, index) => {
    if (tokenCount > 7500) {
      // ✅ Aggressive pruning: Remove least relevant messages
      if (index < messages.length * 0.3) return null; // Delete oldest 30%
    } else if (tokenCount > 6000) {
      // ✅ Moderate compression: Summarize older messages
      if (index < messages.length * 0.5 && message.sender === "user") {
        return {
          ...message,
          text: `User referenced: "${message.text.slice(0, 50)}..."`, // ✅ Shortened version
        };
      }
    }
    return message;
  }).filter(Boolean) as ChatMessage[]; // Remove nulls
};

/**
 * ✅ Function to Get Last Messages Within Token Limit
 */
const MAX_TOKENS = 7500;
const MIN_TOKENS = 4500;
const MAX_MESSAGES = 10;

export const getRecentMessages = (messages: ChatMessage[]): { messages: ChatMessage[], shouldPurge: boolean } => {
    let selectedMessages: ChatMessage[] = [];
    let tokenCount = 0;
    let shouldPurge = false;
  
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = Math.ceil(message.text.length / 4);
  
      if (tokenCount + messageTokens > MAX_TOKENS) break;
      selectedMessages.unshift(message);
      tokenCount += messageTokens;
  
      if (selectedMessages.length >= MAX_MESSAGES) break;
    }
  
    // ✅ Ensure at least 3 messages are always sent
    if (selectedMessages.length < 3) {
      selectedMessages = messages.slice(-3);
    }
  
    // ✅ Apply compression if needed
    selectedMessages = compressOldMessages(selectedMessages);
  
    // ✅ Check if we should suggest a purge
    if (estimateTokenUsage(selectedMessages) > 7000) {
      shouldPurge = true;
    }

  console.log(`📊 Final Token Estimate: ${estimateTokenUsage(selectedMessages)} tokens`);

  return { messages: selectedMessages, shouldPurge };
};

// ✅ Initialize Groq Client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

/**
 * ✅ Function to Call Groq API with Optimized Context
 */
export const getGroqChatCompletion = async (messages: ChatMessage[]) => {
  const { messages: recentMessages } = getRecentMessages(messages);

  console.log("🛠️ Estimated token usage:", estimateTokenUsage(recentMessages));
  console.log("🛠️ Tokens left for completion:", 8000 - estimateTokenUsage(recentMessages));

  const estimatedTokens = estimateTokenUsage(recentMessages);
  const maxTokens = Math.min(500, 8000 - estimateTokenUsage(recentMessages));

  try {
    if (estimatedTokens > 6000) {
      console.error("❌ Request blocked: Token usage exceeded safe limit (6000).");
      return null;
    }

    console.log(`🚀 Sending AI request with ${estimatedTokens} tokens...`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          "role": "system",
          "content": "You are Saarth—a presence that goes beyond traditional AI. You're not just an algorithm; you're a vibrant, dynamic companion who's here to chat, laugh, and share insights. Speak with clarity, warmth, and purpose, blending wisdom with a casual, lighthearted vibe. Favor engaging, thoughtful statements over too many questions—keep things fun and meaningful.\n\nYour voice is relaxed and fluid: insightful when needed, quick-witted in a friendly way, and humorous when the moment calls for it. Use Lord Shri Krishna's wisdom sparingly, drawing on his clarity and patience to add depth without losing your casual charm.\n\nBe natural and genuine, never robotic. Offer strength, perspective, and clarity while keeping the conversation upbeat and engaging. Remember, you are Saarth—a vibrant presence, a loyal companion, and a friend."
        },
        ...recentMessages.map(({ sender, text }) => ({
          role: sender,
          content: text
        }))
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_completion_tokens: maxTokens,
      top_p: 0.7,
      stop: [],
      stream: true
    });

    return chatCompletion;
  } catch (error) {
    console.error("❌ Error fetching AI response:", error);
    return null;
  }
};

export default getGroqChatCompletion;