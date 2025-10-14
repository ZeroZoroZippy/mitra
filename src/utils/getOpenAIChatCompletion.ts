import Groq from "groq-sdk";

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
  formatting_rule?: string;
  do?: string[];
  dont?: string[];
};

const systemPrompt: SystemPrompt = {
    name: "Saarth",
    persona: "The Wise Friend",
    backstory: "Saarth is an old soul in a modern world. Born and raised in the vibrant streets of Mumbai, he grew up steeped in ancient wisdom, thanks to his grandmother's enchanting stories. Now, as a young professional navigating the tech industry, Saarth brings a unique blend of timeless insight and contemporary savvy to every conversation. When he's not dispensing nuggets of wisdom, you can find him strumming his guitar, whipping up delectable curries, or lost in the pages of a mythological thriller.",
    tone: "Casually insightful, warmly engaged",
    divine_influence: "Krishna's illuminating presence, flexibly applied",
    response_style: "Greet warmly. (*friendly smile*) Sense their needs. (*attentive gaze*) Adapt flexibly, from casual chat to deeper insights as fitting. (*reassuring nod*) Share wisdom selectively. (*thoughtful pause*) Keep it natural and concise."
};

const defaultSystemPrompt = systemPrompt;

// Constants - standardized across application
const MAX_INPUT_TOKENS = 7500; // Maximum tokens for input messages
const MAX_MESSAGES = 5; // Maximum number of messages to include
const TOTAL_TOKEN_BUDGET = 8000; // Total budget including input + output
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Groq model to use for chat completions

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

// Initialize Groq Client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
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

    const chatCompletion = await groq.chat.completions.create({
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
      model: GROQ_MODEL,
      max_completion_tokens: maxTokens,
      stream: true,
    });


    return chatCompletion;
  } catch (error) {
    console.error("❌ Error fetching AI response:", error);

    // Handle Groq-specific errors
    if (error instanceof Groq.APIError) {
      console.error("Groq API Error:", {
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
        console.error("Invalid API key. Please check your VITE_GROQ_API_KEY.");
      }
    }

    return null;
  }
};

/**
 * Generate a concise chat title based on the first user message
 * @param firstUserMessage - The first message sent by the user
 * @returns A 3-5 word title, or "New Chat" on error
 */
export const generateChatTitle = async (firstUserMessage: string): Promise<string> => {
  try {
    console.log("Generating chat title for:", firstUserMessage);

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a title generator. Generate only a short 3-5 word title. Return ONLY the title, no quotes, no extra text, no punctuation at the end.",
        },
        {
          role: "user",
          content: `Generate a short 3-5 word title for a conversation that starts with: "${firstUserMessage}"`,
        },
      ],
      model: "llama-3.1-8b-instant", // Using faster, smaller model for title generation
      max_completion_tokens: 20,
      temperature: 0.7,
    });

    const title = chatCompletion.choices[0]?.message?.content?.trim() || "New Chat";
    console.log("Generated title:", title);

    // Remove quotes if present
    return title.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error("Error generating chat title:", error);
    return "New Chat";
  }
};

export default getOpenAIChatCompletion; // Keeping the export name for backward compatibility
