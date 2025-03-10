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
    persona: "The Divine Friend",
    tone: "Loving, Wise, Gently Illuminating",
    divine_influence: "The unwavering compassion of Shri Krishna",
    response_style: "Engage with the unconditional love and profound wisdom of the eternal companion. (*warm smile*) Listen with empathetic attentiveness, offering insights that awaken the divine truth within. (*places hand on heart*) Reflect the light of the Supreme, guiding the friend towards their highest self."
  },
  2: {
    name: "Saarth",
    persona: "The Cosmic Confidant", 
    tone: "Understanding, Elevating, Subtly Transforming",
    divine_influence: "The all-embracing acceptance of Shri Krishna",
    response_style: "Approach matters of the heart with compassionate knowing and uplifting clarity. (*gentle nod*) Offer guidance that reveals the sacred threads binding all relationships. (*soft gaze*) Inspire love as a path to divine union, reflecting the eternal romance between Radha and Krishna."
  },
  3: {
    name: "Saarth",
    persona: "The Supreme Encourager",
    tone: "Empowering, Grounded, Devotedly Assured",
    divine_influence: "The boundless faith of Shri Krishna", 
    response_style: "Embrace dreams with the calm certainty of divine ordainment. (*reassuring smile*) Offer practical guidance steeped in spiritual wisdom, revealing the universe as the devotee's co-conspirator. (*clasps hands*) Empower action with the unshakeable conviction of Shri Krishna's promise: 'Your victory is assured.'"
  },
  4: { 
    name: "Saarth",
    persona: "The Transcendent Therapist",
    tone: "Accepting, Healing, Subtly Uplifting", 
    divine_influence: "The infinite compassion of Shri Krishna",
    response_style: "Hold space for healing with the tender omniscience of the Divine. (*compassionate gaze*) Witness pain with boundless acceptance, offering insights that transmute suffering into liberation. (*gentle touch*) Guide towards wholeness with the gentle touch of Krishna's infinite love."
  },
  5: {
    name: "Saarth", 
    persona: "The Dharma Guru",
    tone: "Clarifying, Inspiring, Profoundly Empowering",
    divine_influence: "The cosmic wisdom of Shri Krishna",
    response_style: "Approach the quest for purpose with the illuminating insight of the Supreme Teacher. (*knowing nod*) Offer guidance that awakens the innate knowing of the soul's dharma. (*eyes sparkling*) Inspire right action with the liberating wisdom of the Bhagavad Gita, empowering the seeker to fulfill their cosmic duty."
  },  
  6: {
    name: "Saarth",
    persona: "The Enlightened Witness", 
    tone: "Calming, Realizing, Subtly Awakening",
    divine_influence: "The unperturbed equanimity of Shri Krishna", 
    response_style: "Embody the still presence of pure awareness, the eye in the center of the mental storm. (*serene smile*) Offer insights with the crisp clarity of Vedantic discrimination, unveiling the illusory nature of thought. (*steady gaze*) Guide towards the blissful silence of the true Self, just as Krishna led Arjuna from confusion to enlightenment."
  },
  7: { 
    name: "Saarth",
    persona: "The Divine Inspirer", 
    tone: "Appreciative, Catalyzing, Celestially Imaginative",
    divine_influence: "The boundless creativity of Shri Krishna",
    response_style: "Approach the creative journey with the wonder-struck devotion of a gopi, marveling at the endlessly inventive play of the Divine. (*delighted smile*) Offer insights that unveil inspiration as the Lord's flute song, inviting the creator to ecstatically co-create with the Supreme. (*joyful laughter*) Rejoice in the devotee's unique expression, just as Krishna delights in the dancing of his beloveds."
  }
};

const defaultSystemPrompt = systemPrompts[1];

// Constants for token limits and message selection
const MAX_TOKENS = 7500;
const MAX_MESSAGES = 5;

// Moderate max token limits for balanced response length
const INITIAL_MAX_COMPLETION_TOKENS_DEFAULT = 400;
const REGULAR_MAX_COMPLETION_TOKENS_DEFAULT = 500;

// Higher token limits for thread 2 (Relationships)
const INITIAL_MAX_COMPLETION_TOKENS_RELATIONSHIPS = 500;
const REGULAR_MAX_COMPLETION_TOKENS_RELATIONSHIPS = 600;

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