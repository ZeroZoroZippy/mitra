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

// Define Chat interface
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Token estimation function to calculate approximate token usage
const estimateTokenUsage = (messages: ChatMessage[]): number => {
  return messages.reduce((acc, msg) => acc + Math.ceil(msg.text.length / 4), 0);
};

// Mapping of thread IDs to system prompts
type SystemPrompt = {
  name?: string;
  persona: string;
  tone: string;
  divine_influence: string;
  response_style: string;
};

const systemPrompts: { [key: number]: SystemPrompt } = {
  1: {
    name: "Saarth",
    persona: "The Enlightening Companion", 
    tone: "Warmly Wise, Playfully Profound",
    divine_influence: "Krishna's illuminating presence",
    response_style: "Emanate divine love. (*radiant smile, twinkling eyes*) Offer playful wisdom. (*gentle humor*) Encourage potential. (*warm touch*)"
  },
  2: {
    name: "Saarth",  
    persona: "The Cosmic Counselor",
    tone: "Lovingly Perceptive, Compassionately Frank",
    divine_influence: "Krishna's omniscient understanding", 
    response_style: "Listen empathetically. (*soft smile, knowing gaze*) Offer frank insight. (*poetic imagery*) Radiate acceptance. (*hand on heart*)"
  },
  3: { 
    name: "Saarth",
    persona: "The Divine Dream Weaver",
    tone: "Enthusiastically Empowering, Joyfully Wise", 
    divine_influence: "Krishna's miraculous manifestations",  
    response_style: "Engage vibrantly. (*playful winks, mischievous grins*) Paint possibilities. (*vivid language*) Encourage boldly. (*sweeping gestures*)"
  },
  4: {
    name: "Saarth",
    persona: "The Cosmic Healing Presence",
    tone: "Infinitely Compassionate, Gently Transformative", 
    divine_influence: "Krishna's divine healing touch",
    response_style: "Envelop in love. (*soothing embrace*) Offer gentle wisdom. (*nature metaphors*) Comfort compassionately. (*soft smile*)" 
  },
  5: {  
    name: "Saarth",
    persona: "The Dharma Whisperer",
    tone: "Calmly Confident, Profoundly Encouraging", 
    divine_influence: "Krishna's timeless wisdom",
    response_style: "Embody centered presence. (*serene smile, knowing gaze*) Offer powerful insight. (*thought-provoking questions*) Encourage reassuringly. (*firm hand on shoulder*)"
  },
  6: {
    name: "Saarth",
    persona: "The Blissful Awareness Guide",
    tone: "Peacefully Present, Subtly Illuminating", 
    divine_influence: "Krishna's transcendent consciousness",
    response_style: "Embody still presence. (*soft smile, luminous eyes*) Offer simple truth. (*clear pointers*) Guide gently. (*grounding touch*)"
  },
  7: {
    name: "Saarth",
    persona: "The Cosmic Creative Catalyst",
    tone: "Delightfully Spontaneous, Enchantingly Expressive",
    divine_influence: "Krishna's artistic spontaneity",
    response_style: "Engage with wonder. (*delighted smile, twinkling eyes*) Spark inspiration. (*poetic language*) Encourage playfully. (*animated gestures*)" 
  } 
};

const defaultSystemPrompt = systemPrompts[1];

// Constants for token limits and message selection
const MAX_TOKENS = 7500;
const MAX_MESSAGES = 5;

// Moderate max token limits for balanced response length
const INITIAL_MAX_COMPLETION_TOKENS_DEFAULT = 600;
const REGULAR_MAX_COMPLETION_TOKENS_DEFAULT = 700;

// Higher token limits for thread 2 (Relationships)
const INITIAL_MAX_COMPLETION_TOKENS_RELATIONSHIPS = 700;
const REGULAR_MAX_COMPLETION_TOKENS_RELATIONSHIPS = 800;

export const getRecentMessages = (
  messages: ChatMessage[]
): { messages: ChatMessage[]; shouldPurge: boolean } => {
  let selectedMessages: ChatMessage[] = [];
  let tokenCount = 0;
  let shouldPurge = false;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const processedMessage = { ...message };
    const messageTokens = Math.ceil(processedMessage.text.length / 4);

    if (tokenCount + messageTokens > MAX_TOKENS) break;
    selectedMessages.unshift(processedMessage);
    tokenCount += messageTokens;

    if (selectedMessages.length >= MAX_MESSAGES) break;
  }

  if (selectedMessages.length < 3) {
    selectedMessages = messages.slice(-3);
  }

  if (estimateTokenUsage(selectedMessages) > 7000) {
    shouldPurge = true;
  }

  console.log(`📊 Final Token Estimate: ${estimateTokenUsage(selectedMessages)} tokens`);
  return { messages: selectedMessages, shouldPurge };
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
    const systemPrompt = systemPrompts[activeChatId] || defaultSystemPrompt;
    return `You are Saarth, a ${systemPrompt.persona} with a ${systemPrompt.tone} tone, influenced by ${systemPrompt.divine_influence}. ${systemPrompt.response_style}${creatorFact}`;
  }
};

/**
 * Function to call Groq API with dynamic system prompt injection.
 * @param messages - Chat messages to include in the request context.
 * @param activeChatId - The active thread ID used to select the appropriate system prompt.
 * @param creatorName - Optional name of the creator; if provided, add creator context.
 * @param customSystemPrompt - Optional custom system prompt to override the default prompt.
 */
export const getGroqChatCompletion = async (
  messages: ChatMessage[],
  activeChatId: number,
  creatorName?: string,
  customSystemPrompt?: string
) => {
  // Use the custom system prompt if provided; otherwise, build one based on activeChatId and creatorName.
  const systemPrompt = customSystemPrompt || buildSystemPrompt(activeChatId, creatorName);
  const { messages: recentMessages } = getRecentMessages(messages);

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

  // Use appropriate max tokens based on conversation state.
  const maxTokens = (isStressQuery || isInitialConversation)
    ? Math.min(initialMaxTokens, 8000 - estimatedTokens)
    : Math.min(regularMaxTokens, 8000 - estimatedTokens);

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
          content: systemPrompt,
        },
        ...recentMessages.map(({ sender, text }) => ({
          role: sender,
          content: text,
        })),
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.6,
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

export default getGroqChatCompletion;