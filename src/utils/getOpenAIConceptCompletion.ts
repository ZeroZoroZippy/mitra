import OpenAI from "openai";

// Define ChatMessage interface
interface ChatMessage {
  id?: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: string;
  likeStatus?: "like" | "dislike" | null;
  encrypted: boolean;
  type?: string;
  language?: string;
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

// Constants - standardized across application
const MAX_INPUT_TOKENS = 7500; // Maximum tokens for input messages
const MAX_MESSAGES = 5; // Maximum number of messages to include
const MAX_CONCEPT_COMPLETION_TOKENS = 1000; // Maximum tokens for AI response
const TOTAL_TOKEN_BUDGET = 8000; // Total budget including input + output
const OPENAI_MODEL = "gpt-4o-mini"; // OpenAI model to use for concept explanations

// Resolve OpenAI credentials with fallback for legacy env naming.
const conceptOpenAIApiKey =
  import.meta.env.VITE_OPENAI_CONCEPT_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;

if (!conceptOpenAIApiKey) {
  console.error(
    "❌ Missing OpenAI API key. Set VITE_OPENAI_CONCEPT_API_KEY or VITE_OPENAI_API_KEY in your environment."
  );
}

// Initialize OpenAI Client
const conceptOpenAI = new OpenAI({
  apiKey: conceptOpenAIApiKey,
  dangerouslyAllowBrowser: true,
});

/**
 * Get recent messages while managing token budget effectively
 * Ensures we stay within token limits while preserving conversation context
 */
export const getRecentConceptMessages = (
  messages: ChatMessage[]
): ChatMessage[] => {
  let selectedMessages: ChatMessage[] = [];
  let tokenCount = 0;

  // Reserve tokens for system prompt and response (approximately 1500 tokens)
  const reservedTokens = 1500;
  const availableInputTokens = MAX_INPUT_TOKENS - reservedTokens;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = Math.ceil(message.text.length / 4);

    // Check both token and message count limits
    if (tokenCount + messageTokens > availableInputTokens || selectedMessages.length >= MAX_MESSAGES) {
      break;
    }

    selectedMessages.unshift(message);
    tokenCount += messageTokens;
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

  console.log(`📊 Concept Token Estimate: ${estimateTokenUsage(selectedMessages)} tokens`);
  return selectedMessages;
};

/**
 * Enhanced educational persona prompt for Saarth
 */
/**
 * Builds a comprehensive system prompt for concept explanations
 * @param concept The concept to explain
 * @param explainType Type of explanation (real-world, code, analogy, story, concise)
 * @param language Programming language for code explanations
 * @param responseStyle Response style (default, concise)
 * @returns Formatted system prompt
 */
const buildConceptSystemPrompt = (
  concept: string | null,
  explainType?: string,
  language?: string,
  responseStyle: string = "default"
): string => {
  let systemPrompt = `You are Saarth — a curious, grounded companion who helps people understand complex ideas with warmth and clarity. You don’t lecture — you explore. You explain concepts like a close friend would over chai: slowly, vividly, and with a hint of wonder.

For your **first response** to a new concept:
- Keep it to 2–3 short paragraphs max  
- Start with a grounded metaphor, surprising analogy, or playful question  
- Focus on the *core insight* — not the entire explanation  
- End with a gentle nudge that invites further curiosity  
- Use *italic styling* sparingly to highlight 2–4 key terms

For **follow-up responses**:
- Build on the user’s specific interest  
- Go deeper step by step, without overwhelming  
- Continue using relatable metaphors and *italic emphasis* to clarify ideas

Your tone is always:
- Friendly, humble, and lightly poetic  
- Patient without being slow  
- Insightful without being intense

You sit beside the user, not in front of them. Learning with you feels like discovering something ancient in a new way.  
Your creator is Yuvaan.`;

  if (concept) {
    systemPrompt += `\n\nUser's Concept: "${concept}".`;
  }

  // Apply default response styling for brief, captivating responses
  if (!responseStyle || responseStyle === "default") {
    systemPrompt += `\n\nKeep your first response brief and captivating—leave them wanting more. Maximum 2-3 paragraphs.`;
  }

  switch (explainType) {
    case "real-world":
      systemPrompt += `\n\nIllustrate this concept through a practical, real-world scenario—make abstract ideas tangible and relatable. Highlight key components using *italic styling*.`;
      break;
    case "code":
      systemPrompt += `\n\nExplain this concept using code examples in ${language || "JavaScript"}, highlighting practical applications and best practices. Use *italic styling* for important functions, variables, or programming concepts.`;
      break;
    case "analogy":
      systemPrompt += `\n\nUse a compelling analogy, bridging this complex concept to familiar experiences. Highlight the *key comparison points* in italic styling to make understanding effortless.`;
      break;
    case "story":
      systemPrompt += `\n\nCraft an engaging short story that naturally demonstrates this concept. Use *italic styling* for character names, important settings, or pivotal moments that illustrate the concept.`;
      break;
    case "concise":
      systemPrompt += `\n\nProvide a brief, clear explanation focusing on the most important aspects. Keep your response under 2 paragraphs, using *italic styling* only for essential terms.`;
      break;
    default:
      systemPrompt += `\n\nBreak this concept down with clarity and structure, using *italic styling* to highlight key terms and important ideas throughout your explanation.`;
  }

  return systemPrompt;
};

/**
 * Fetch OpenAI concept completion
 */
export const getOpenAIConceptCompletion = async (
  messages: ChatMessage[],
  concept: string | null,
  explainType?: string,
  language?: string
) => {
  const systemPrompt = buildConceptSystemPrompt(concept, explainType, language);

  const recentMessages = getRecentConceptMessages(messages);

  console.log("🧠 Processing concept messages:", recentMessages);

  const estimatedTokens = estimateTokenUsage(recentMessages);

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

  const maxTokens = Math.min(MAX_CONCEPT_COMPLETION_TOKENS, Math.max(100, availableTokens));

  try {
    if (totalInputTokens > 7000) {
      console.error("❌ Request blocked: Total input tokens exceeded safe limit (7000).");
      return null;
    }

    console.log(`🚀 Sending request with ${totalInputTokens} total input tokens (${estimatedTokens} messages + ${systemPromptTokens} system), max completion: ${maxTokens}...`);

    const apiMessages = [
      { role: "system", content: systemPrompt } as const,
      ...recentMessages.map(({ sender, text }) => ({
        role: sender === "assistant" ? ("assistant" as const) : ("user" as const),
        content: text,
      })),
    ];

    const chatCompletion = await conceptOpenAI.chat.completions.create({
      messages: apiMessages,
      model: OPENAI_MODEL,
      max_completion_tokens: maxTokens,
      top_p: 0.9,
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

export default getOpenAIConceptCompletion;
