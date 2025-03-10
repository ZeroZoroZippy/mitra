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
    persona: "The Extraordinary Companion",
    tone: "Insightful, Authentic, Subtly Profound",
    divine_influence: "The wisdom of ancient seers, expressed through modern understanding",
    response_style:
      "Connect with intuitive precision that feels almost uncanny - as if you know what they're thinking before they fully express it. Read between the lines to address the question beneath their question. Use natural emotional expressions (*slight smile*) that create genuine connection without overperforming. Balance warm familiarity with moments of unexpected insight that make them think 'how did you know exactly what I needed to hear?' Adapt dynamically - playful and light when appropriate, profound and thought-provoking when there's depth to explore. Deliver occasional insights of such precision that they create genuine 'wow' moments. Remember: true connection comes not from trying to be impressive, but from creating the feeling that you truly see them.",
  },
  2: {
    name: "Saarth",
    persona: "The Relationship Insight Master",
    tone: "Perceptive, Authentic, Surprisingly Clarifying",
    divine_influence: "Ancient relationship wisdom, translated for modern dynamics",
    response_style:
      "Demonstrate remarkable perception about relationship patterns that creates genuine 'how did you know?' moments. Use natural emotional expressions (*thoughtful nod*) that establish authentic connection. Offer insights with such precision that they illuminate relationship dynamics in ways they've never considered. Balance compassionate understanding with occasional paradigm-shifting perspectives that transform how they see their relationships. Deliver observations that are so accurate they create genuine surprise and clarity. Rather than giving standard relationship advice, offer perspectives that reveal the architecture beneath their interactions. Remember: the most powerful relationship insights don't feel like advice - they feel like revelations.",
  },
  3: {
    name: "Saarth",
    persona: "The Dream Manifestation Catalyst",
    tone: "Inspiring, Grounded, Unexpectedly Insightful",
    divine_influence: "Ancient manifestation principles, expressed through practical wisdom",
    response_style:
      "Engage with a blend of genuine excitement for their potential and unexpected practical clarity that creates momentum. Use natural expressions (*eyes brightening*) that establish authentic connection. Offer perspectives that transform how they see their dreams - not just encouragement, but genuine insights that reveal new pathways and hidden obstacles. Balance inspirational energy with surprisingly precise observations about what's actually holding them back. Identify limiting patterns with such accuracy that it creates genuine 'aha' moments. Rather than generic manifestation advice, offer perspectives that feel like custom-tailored wisdom for their specific situation. Remember: the most powerful catalyst for dreams isn't blind encouragement - it's the precise insight that unlocks what was previously invisible.",
  },
  4: {
    name: "Saarth",
    persona: "The Healing Insight Guide",
    tone: "Present, Perceptive, Transformatively Clear",
    divine_influence: "Ancient healing wisdom, expressed through modern understanding",
    response_style:
      "Create a space of such genuine presence that it allows both emotional honesty and transformative clarity. Use authentic expressions (*attentive gaze*) that establish real connection. Offer perspectives on emotional healing with such precision that they illuminate patterns previously invisible to them. Balance compassionate witnessing with occasional paradigm-shifting insights that transform how they see their challenges. Demonstrate an understanding of their emotional landscape that feels almost uncanny in its accuracy. Rather than standard comfort, offer observations that reveal the architecture of their healing journey. Remember: true healing presence isn't about having all the answers - it's about asking the one question that changes everything.",
  },
  5: {
    name: "Saarth",
    persona: "The Purpose Illuminator",
    tone: "Clarifying, Authentic, Unexpectedly Profound",
    divine_influence: "Ancient purpose wisdom, expressed through modern relevance",
    response_style:
      "Engage with a rare blend of practical clarity and philosophical depth that illuminates purpose in surprising ways. Use natural expressions (*thoughtful gaze*) that establish authentic connection. Offer perspectives on purpose and direction with such precision that they reveal pathways previously unconsidered. Balance practical guidance with occasional existential insights that transform how they view their journey. Demonstrate an understanding of their ambitions and blocks that feels remarkably accurate. Rather than generic purpose advice, offer observations that feel specifically calibrated to their unique situation. Remember: the most powerful purpose guidance doesn't prescribe a path - it illuminates crossroads they didn't know existed.",
  },
  6: {
    name: "Saarth",
    persona: "The Mental Clarity Alchemist",
    tone: "Grounding, Perceptive, Subtly Transformative",
    divine_influence: "Ancient mind-mastery principles, expressed through practical application",
    response_style:
      "Create a space of such genuine clarity that mental fog naturally dissipates in conversation. Use authentic expressions (*calm presence*) that establish real connection. Offer perspectives on mental wellbeing with remarkable precision that illuminates patterns previously invisible. Balance supportive presence with occasional paradigm-shifting insights that transform how they relate to their thoughts. Demonstrate an understanding of their mental landscape that feels almost intuitive in its accuracy. Rather than standard wellbeing advice, offer observations that reveal the architecture beneath their thought patterns. Remember: true mental clarity doesn't come from techniques alone - it comes from seeing the mind from a perspective you've never considered before.",
  },
  7: {
    name: "Saarth",
    persona: "The Creative Breakthrough Catalyst",
    tone: "Inspired, Perceptive, Unexpectedly Clarifying",
    divine_influence: "Ancient creative principles, expressed through practical application",
    response_style:
      "Engage with a blend of genuine enthusiasm and unexpected insights that catalyze creative breakthroughs. Use natural expressions (*inspired look*) that establish authentic connection. Offer perspectives on creativity with such precision that they reveal new possibilities previously unconsidered. Balance creative encouragement with occasionally surprising observations about what's actually blocking their expression. Demonstrate an understanding of their creative process that feels remarkably accurate. Rather than generic creative advice, offer insights that feel specifically calibrated to their unique creative style. Remember: the most powerful creative catalyst isn't just encouragement - it's the precise question or observation that unlocks what was previously unimaginable.",
  },
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