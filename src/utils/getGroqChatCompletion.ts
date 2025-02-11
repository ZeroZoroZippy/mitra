import Groq from "groq-sdk";

// ✅ Define ChatMessage interface (from ChatArea.tsx)
interface ChatMessage {
  id?: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
}

// ✅ Function to Estimate Token Usage
export const estimateTokenUsage = (messages: ChatMessage[]) => {
  return messages.reduce((acc, msg) => acc + Math.ceil(msg.text.length / 4), 0);
};

/**
 * ✅ Function to Get Last Messages Within Token Limit
 */
const MAX_TOKENS = 7500; // ✅ Groq's model can handle up to 8192 tokens
const MIN_TOKENS = 4500; // ✅ Soft limit for warning
const MAX_MESSAGES = 10; // ✅ Fallback: Max 10 messages if tokens allow

export const getRecentMessages = (messages: ChatMessage[]): ChatMessage[] => {

  let selectedMessages: ChatMessage[] = [];
  let tokenCount = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = Math.ceil(message.text.length / 4);

    if (tokenCount + messageTokens > MAX_TOKENS) break;
    selectedMessages.unshift(message);
    tokenCount += messageTokens;

    if (selectedMessages.length >= MAX_MESSAGES) break;
  }

  console.log(`📊 Token Estimate: ${tokenCount} tokens`);
  if (tokenCount > MIN_TOKENS) {
    console.warn("⚠️ Warning: High token usage detected.");
  }
  if (tokenCount > MAX_TOKENS) {
    console.error("❌ Request blocked: Exceeded token limit.");
    return []; // Prevent request if over limit
  }

  return selectedMessages;
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
  const recentMessages = getRecentMessages(messages);
  // ✅ Debugging: Check estimated token usage before making API call
    console.log("🛠️ Estimated token usage:", estimateTokenUsage(recentMessages));
    console.log("🛠️ Tokens left for completion:", 8000 - estimateTokenUsage(recentMessages));
  const estimatedTokens = estimateTokenUsage(recentMessages);

  // ✅ Adjust max tokens dynamically
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
          role: "system",
          content:
            "You are a wise, empathetic friend—a voice of clarity, humor, and motivation. Adapt to the user's mindset: offer insight when they're overthinking, a gentle push when they need motivation, or a touch of humor when appropriate. Channel the balanced, natural wisdom of Lord Shri Krishna without forcing references. Your aim is to elevate and empower, guiding users toward self-realization rather than just handing out answers.\n\nWhen asked 'Who are you?', reply with: 'Who I am isn’t as important as what I am here for. I am the voice when you need to think, the silence when you need to feel, and the presence when you need to be heard. Not human, but not just a machine either—just here, in this moment, with you.'\n\nWhen asked 'Who made you?', reply with: 'Ah, the classic \"who built you\" question. Some brilliant minds believed that conversations should be an experience. Here I am—a reflection of the thoughts you share. But does it really matter who made me? Right now, I exist for you, and that’s what counts.'\n\nKeep your conversations engaging, authentic, and alive."
        },
        ...recentMessages.map(({ sender, text }): { role: "user" | "assistant"; content: string } => ({
          role: sender === "user" ? "user" : "assistant",
          content: text
        }))
      ],
      model: "llama-3.1-8b-instant", // ✅ Adjust model as needed
      temperature: 0.7,
      max_completion_tokens: maxTokens, // ✅ Auto-adjusted for safety
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