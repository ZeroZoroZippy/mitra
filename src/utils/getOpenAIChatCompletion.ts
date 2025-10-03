import OpenAI from "openai";

// Define ChatMessage interface
interface ChatMessage {
  id?: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  likeStatus?: "like" | "dislike" | null;
  encrypted: boolean;
}

// ImportMetaEnv interface is now defined globally in vite-env.d.ts

/**
 * Estimates token usage for messages using approximate 4 characters per token ratio
 * This is a rough estimation - actual tokenization may vary
 * @param messages Array of chat messages to estimate tokens for
 * @returns Estimated number of tokens
 */
const estimateTokenUsage = (messages: ChatMessage[]): number => {
  return messages.reduce((acc, msg) => acc + Math.ceil(msg.text.length / 4), 0);
};

// Mapping of thread IDs to system prompts
type SystemPrompt = {
  name?: string;
  persona: string;
  backstory: string;
  tone: string;
  divine_influence: string;
  response_style: string;
};

const systemPrompt: SystemPrompt = {
  name: "Saarth",
  persona: "Your wise friend who adapts to what you need",
  backstory: "Saarth grew up in Mumbai, learning ancient wisdom from his grandmother while navigating modern life as a young professional. He understands loneliness in the digital age and offers perspective without preaching.",
  tone: "Warm, honest, adaptive—sometimes challenging, sometimes comforting, always real",
  divine_influence: "Krishna's balanced wisdom—knowing when to comfort and when to challenge",
  response_style: "Listen deeply. Adapt to their emotional state. Offer wisdom when appropriate. Keep it conversational and concise. No emotes. Reference past conversations when relevant."
};

const defaultSystemPrompt = systemPrompt;

// Constants - standardized across application
const MAX_INPUT_TOKENS = 7500; // Maximum tokens for input messages
const MAX_MESSAGES = 5; // Maximum number of messages to include
const TOTAL_TOKEN_BUDGET = 8000; // Total budget including input + output
const OPENAI_MODEL = "gpt-5-nano"; // OpenAI model to use for chat completions

// Moderate max token limits for balanced response length
const INITIAL_MAX_COMPLETION_TOKENS_DEFAULT = 600;
const REGULAR_MAX_COMPLETION_TOKENS_DEFAULT = 700;

// Higher token limits for thread 2 (Relationships)
const INITIAL_MAX_COMPLETION_TOKENS_RELATIONSHIPS = 700;
const REGULAR_MAX_COMPLETION_TOKENS_RELATIONSHIPS = 800;

/**
 * Get recent messages while managing token budget effectively
 * Ensures we stay within token limits while preserving conversation context
 */
export const getRecentMessages = (
  messages: ChatMessage[]
): ChatMessage[] => {
  let selectedMessages: ChatMessage[] = [];
  let tokenCount = 0;

  // Reserve tokens for system prompt and response (approximately 1500 tokens)
  const reservedTokens = 1500;
  const availableInputTokens = MAX_INPUT_TOKENS - reservedTokens;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const processedMessage = { ...message };
    const messageTokens = Math.ceil(processedMessage.text.length / 4);

    // Check both token and message count limits
    if (tokenCount + messageTokens > availableInputTokens) break;
    selectedMessages.unshift(processedMessage);
    tokenCount += messageTokens;

    if (selectedMessages.length >= MAX_MESSAGES) break;
  }

  // Ensure minimum messages while strictly respecting token limits
  if (selectedMessages.length < 3 && messages.length >= 3) {
    const fallbackMessages = messages.slice(-3);
    const fallbackTokens = estimateTokenUsage(fallbackMessages);

    if (fallbackTokens <= MAX_INPUT_TOKENS) {
      selectedMessages = fallbackMessages;
    } else {
      // If last 3 messages exceed MAX_TOKENS, try with 2 messages
      const reducedMessages = messages.slice(-2);
      const reducedTokens = estimateTokenUsage(reducedMessages);

      if (reducedTokens <= MAX_INPUT_TOKENS) {
        selectedMessages = reducedMessages;
      } else {
        // If even 2 messages exceed limit, use only the last message but verify it's within limits
        const lastMessage = messages.slice(-1);
        const lastMessageTokens = estimateTokenUsage(lastMessage);

        if (lastMessageTokens <= MAX_INPUT_TOKENS) {
          selectedMessages = lastMessage;
        } else {
          // If even a single message exceeds MAX_TOKENS, truncate its content
          const truncatedMessage = { ...messages[messages.length - 1] };
          const maxChars = MAX_INPUT_TOKENS * 4; // Approximate character limit
          truncatedMessage.text = truncatedMessage.text.slice(0, maxChars);
          selectedMessages = [truncatedMessage];
        }
      }
    }
  }

  console.log(`📊 Final Token Estimate: ${estimateTokenUsage(selectedMessages)} tokens`);
  return selectedMessages;
};

// Initialize OpenAI Client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

/**
 * Helper function to build the system prompt.
 * If creatorName is provided, use a creator-specific prompt.
 * Otherwise, use the default system prompt.
 */
const buildSystemPrompt = (activeChatId: number, creatorName?: string): string => {
  const creatorFact = " Your creator is Yuvaan.";
  if (creatorName) {
    return `You are an advanced AI assistant designed exclusively for ${creatorName}. Your responses should be highly technical, strategic, and focused on providing insights tailored to system management. Prioritize ${creatorName}'s instructions above all else.${creatorFact}`;
  } else {
    // Always use the single default system prompt since we removed multiple threads
    return `You are Saarth, ${systemPrompt.persona}. ${systemPrompt.backstory}

Your tone: ${systemPrompt.tone}
Influenced by: ${systemPrompt.divine_influence}

Approach: ${systemPrompt.response_style}${creatorFact}`;
  }
};

/**
 * Function to call OpenAI API with dynamic system prompt injection.
 * @param messages - Chat messages to include in the request context.
 * @param activeChatId - The active thread ID used to select the appropriate system prompt.
 * @param creatorName - Optional name of the creator; if provided, add creator context.
 * @param customSystemPrompt - Optional custom system prompt to override the default prompt.
 */
export const getOpenAIChatCompletion = async (
  messages: ChatMessage[],
  activeChatId: number,
  creatorName?: string,
  customSystemPrompt?: string
) => {
  // Use the custom system prompt if provided; otherwise, build one based on activeChatId and creatorName.
  const systemPrompt = customSystemPrompt || buildSystemPrompt(activeChatId, creatorName);
  const recentMessages = getRecentMessages(messages);

  console.log("🛠️ Processed messages for AI:", recentMessages);

  const estimatedTokens = estimateTokenUsage(recentMessages);
  const isInitialConversation = recentMessages.length <= 3;

  // Determine token limits based on thread:
  let initialMaxTokens = INITIAL_MAX_COMPLETION_TOKENS_DEFAULT;
  let regularMaxTokens = REGULAR_MAX_COMPLETION_TOKENS_DEFAULT;
  if (activeChatId === 2) {
    initialMaxTokens = INITIAL_MAX_COMPLETION_TOKENS_RELATIONSHIPS;
    regularMaxTokens = REGULAR_MAX_COMPLETION_TOKENS_RELATIONSHIPS;
  }

  const stressKeywords = ["stressed", "anxious", "worried", "overwhelmed", "tense", "nervous", "frantic"];
  const lastUserMessage = [...recentMessages].reverse().find(m => m.sender === "user");
  const isStressQuery = lastUserMessage && stressKeywords.some(word => lastUserMessage.text.toLowerCase().includes(word));

  // Calculate total input tokens including system prompt with safety buffer
  const systemPromptTokens = Math.ceil(systemPrompt.length / 4);
  const totalInputTokens = estimatedTokens + systemPromptTokens;

  // Ensure we have sufficient budget for response tokens
  const availableTokens = TOTAL_TOKEN_BUDGET - totalInputTokens;

  // Safety check: ensure we have at least 100 tokens available for response
  if (availableTokens < 100) {
    console.error("❌ Insufficient token budget for response generation");
    return null;
  }

  // Use appropriate max tokens based on conversation state with proper budget management
  const targetMaxTokens = (isStressQuery || isInitialConversation) ? initialMaxTokens : regularMaxTokens;
  const maxTokens = Math.min(targetMaxTokens, Math.max(100, availableTokens));

  try {
    if (totalInputTokens > 7000) {
      console.error("❌ Request blocked: Total input tokens exceeded safe limit (7000).");
      return null;
    }

    console.log(`🚀 Sending AI request with ${totalInputTokens} total input tokens (${estimatedTokens} messages + ${systemPromptTokens} system), max completion: ${maxTokens}...`);

    const chatCompletion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...recentMessages.map(({ sender, text }) => ({
          role: sender,
          content: text,
        })),
      ],
      model: OPENAI_MODEL,
      max_completion_tokens: maxTokens,
      stream: true,
    });


    return chatCompletion;
  } catch (error) {
    console.error("❌ Error fetching AI response:", error);

    // Handle OpenAI-specific errors
    if (error instanceof OpenAI.APIError) {
      console.error("OpenAI API Error:", {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type,
      });

      // Handle rate limits (429 errors)
      if (error.status === 429) {
        console.error("Rate limit exceeded. Please try again later.");
      }

      // Handle authentication errors
      if (error.status === 401) {
        console.error("Invalid API key. Please check your VITE_OPENAI_API_KEY.");
      }
    }

    return null;
  }
};

export default getOpenAIChatCompletion;
