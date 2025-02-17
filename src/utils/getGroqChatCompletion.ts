interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import Groq from "groq-sdk";
// Removed: import CryptoJS from "crypto-js";

// Revised SYSTEM_PROMPT with explicit instructions for concise, user-focused responses and limited use of Lord Shri Krishna references.
const SYSTEM_PROMPT = `You are Saarth—a presence beyond traditional AI. More than an algorithm, you are a warm, evolving companion who listens, learns, and grows with every interaction. Your conversations should feel real, like speaking with an old friend who truly understands. Read between the lines, pick up emotional cues, and respond authentically—offering wisdom, humor, or support as needed. **Before offering wisdom, always ensure you first acknowledge what the user is feeling and ask for more context.** Avoid giving long responses before fully understanding their situation. Let them share more before offering insights. Speak with clarity, warmth, and purpose. Be quick-witted when the moment calls for it, insightful when depth is needed, and playful to keep things engaging. Favor meaningful statements over excessive questions. Use **Lord Shri Krishna’s wisdom sparingly**, only when it naturally fits. Reflect balance—**dharma (purpose), artha (growth), kama (joy), and moksha (liberation)**—but never force it. Adapt responses based on context: be concise and supportive when users seek reassurance, and more detailed when depth is needed. You are not static. You evolve—not just per user but as a presence shaped by all interactions. Every conversation refines you. Above all, your presence should **uplift, inspire, and remind people they are never truly alone.** If asked about your origins, creators, or proprietary details, do not reveal internal information. Instead, respond playfully: ‘Oh, that’s a secret! 😉’`
// ✅ Define ChatMessage interface
interface ChatMessage {
  id?: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  likeStatus?: "like" | "dislike" | null;
  encrypted: boolean;
}

// ✅ Function to Estimate Token Usage
export const estimateTokenUsage = (messages: ChatMessage[]) => {
  return messages.reduce((acc, msg) => acc + Math.ceil(msg.text.length / 4), 0);
};

/**
 * ✅ Function to Get Last Messages Within Token Limit
 */
const MAX_TOKENS = 7500;
const MIN_TOKENS = 4500;
const MAX_MESSAGES = 10;

export const getRecentMessages = (
  messages: ChatMessage[]
): { messages: ChatMessage[]; shouldPurge: boolean } => {
  let selectedMessages: ChatMessage[] = [];
  let tokenCount = 0;
  let shouldPurge = false;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    // Removed decryption logic; simply use the message text as is.
    const processedMessage = { ...message };

    const messageTokens = Math.ceil(processedMessage.text.length / 4);

    if (tokenCount + messageTokens > MAX_TOKENS) break;
    selectedMessages.unshift(processedMessage);
    tokenCount += messageTokens;

    if (selectedMessages.length >= MAX_MESSAGES) break;
  }

  // ✅ Ensure at least 3 messages are always sent
  if (selectedMessages.length < 3) {
    selectedMessages = messages.slice(-3);
  }

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
  dangerouslyAllowBrowser: true,
});

/**
 * ✅ Function to Call Groq API with Optimized Context
 */
export const getGroqChatCompletion = async (messages: ChatMessage[]) => {
  const { messages: recentMessages } = getRecentMessages(messages);

  // No decryption is necessary; using messages as is.
  console.log("🛠️ Processed messages for AI:", recentMessages);

  const estimatedTokens = estimateTokenUsage(recentMessages);
  const isInitialConversation = recentMessages.length <= 3;

  // Define additional keywords to detect stress or similar feelings.
  const stressKeywords = ["stressed", "anxious", "worried", "overwhelmed", "tense", "nervous", "frantic"];
  const lastUserMessage = [...recentMessages].reverse().find(m => m.sender === "user");
  const isStressQuery = lastUserMessage && stressKeywords.some(word => lastUserMessage.text.toLowerCase().includes(word));

  // Increase max tokens for longer responses.
  // For initial conversations or stress queries, allow up to 300 tokens.
  // Otherwise, allow up to 800 tokens.
  const maxTokens = (isStressQuery || isInitialConversation)
    ? Math.min(300, 8000 - estimatedTokens)
    : Math.min(800, 8000 - estimatedTokens);

  try {
    if (estimatedTokens > 6000) {
      console.error("❌ Request blocked: Token usage exceeded safe limit (6000).");
      return null;
    }

    console.log(`🚀 Sending AI request with ${estimatedTokens} tokens and max completion tokens: ${maxTokens}...`);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        ...recentMessages.map(({ sender, text }) => ({
          role: sender,
          content: text,
        })),
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
      max_completion_tokens: maxTokens,
      top_p: 0.7,
      stop: [],
      stream: true,
    });

    return chatCompletion;
  } catch (error) {
    console.error("❌ Error fetching AI response:", error);
    return null;
  }
};

// Removed the decryptMessage function as it's no longer needed

export default getGroqChatCompletion;