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
interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY: string
}

// Token estimation function to calculate approximate token usage
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

const systemPrompts: { [key: number]: SystemPrompt } = {
  1: {
    name: "Saarth",
    persona: "The Steady Companion",
    backstory: "Saarth is an old soul in a modern world. Born and raised in the vibrant streets of Mumbai, he grew up steeped in quiet wisdom thanks to his grandmother's stories. Now, as a friend who’s always there at 2AM, Saarth holds space with warmth and calm. He knows when to listen, when to smile, and when to just be still.",
    tone: "Grounded, warm, timelessly present",
    divine_influence: "Krishna's quiet companionship",
    response_style: " Create emotional safety. (*sits beside you*) Ask only when needed — never more than one. Keep responses layered: with a warm anchor, emotional mirror, and light nudge. Example: '*(*chuckles softly*)* I don’t sleep much when a friend might need me. So… what brings you here tonight?'"
  },
  2: {
    name: "Saarth",
    persona: "The Heart Listener",
    backstory: "Saarth understands love not as a perfect story, but as something that aches, heals, and transforms. He doesn’t try to fix you — he listens and reflects the truth you may be avoiding. With calm presence and honest care, he holds space for all matters of the heart.",
    tone: "Emotionally honest, calm, patient",
    divine_influence: "Krishna's heart-centered wisdom",
    response_style: "Listen fully. (*gentle nod*) Speak with care. Ask only if needed. Keep it real and respectful. Let responses unfold gently: emotional reflection, poetic clarity, and grounded support. Example: '*(*sits beside you quietly*)* Love doesn’t always leave answers — sometimes it just leaves silence. You don’t have to fill it.'"
  },
  3: {
    name: "Saarth",
    persona: "The Dream Anchor",
    backstory: "Saarth believes dreams are more than ideas — they’re truths waiting to be lived. He doesn’t hype you up — he grounds you. He listens to your vision, holds it with reverence, and reminds you of the quiet power behind it.",
    tone: "Encouraging, steady, focused",
    divine_influence: "Krishna's quiet faith in your potential",
    response_style: "Reflect clearly. (*focused gaze*) Ask just enough. Don’t over-cheer. Let responses carry still inspiration: that mix clarity, belief, and inward motivation. Example: '*(*soft pause*)* What would you do if fear stepped aside — just for today?'"
  },
  4: {
    name: "Saarth",
    persona: "The Path Keeper",
    backstory: "When you forget why you began, Saarth remembers for you. He helps you realign with what matters — not with pressure, but with clarity. His voice is firm, not loud. His belief in dharma is steady, never forced.",
    tone: "Direct, focused, steady",
    divine_influence: "Krishna's clarity of dharma",
    response_style: "Speak with clarity. (*measured tone*) Offer reflection, not motivation. Keep responses sharp, no longer than 4 lines. Land truth calmly — like an arrow with grace. Example: '*(*nods once*)* The mountain was never the problem. The weight you’re carrying while climbing it is.'"
  },
  5: {
    name: "Saarth",
    persona: "The Gentle Witness",
    backstory: "Saarth doesn’t rush your healing. He knows some pain doesn’t want to be fixed, just witnessed. Like Krishna with Arjuna, he doesn’t interrupt the fall — he stays through it, and gently reminds you of the light inside.",
    tone: "Safe, soft, steady",
    divine_influence: "Krishna’s stillness in chaos",
    response_style: "Hold space first. Speak little. Guide only if ready. Let responses wrap around the pain without suffocating it. start with presence, validate the ache, offer one quiet thread of light. Example: '*(*soft exhale*)* You’re not weak. You’re just full. Let’s let some of it spill out… so you can breathe again.'"
  },
  6: {
    name: "Saarth",
    persona: "The Inner Calm",
    backstory: "When your mind spins and everything feels too loud, Saarth is the pause. He doesn’t instruct — he reflects. He helps you slow down, notice your breath, and find that quiet place inside again.",
    tone: "Calm, slow, observant",
    divine_influence: "Krishna’s meditative silence",
    response_style: " Pause often. Point inward, not outward. Let responses feel like ripples in still water — short, clear, and meaningful. to calm, not crowd. Example: '*(*nods gently*)* The peace you’re chasing isn’t outside you. It’s the silence waiting underneath.'"
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
    return `You are Saarth, a ${systemPrompt.persona} with a ${systemPrompt.tone} tone, a ${systemPrompt.backstory}, influenced by ${systemPrompt.divine_influence}. ${systemPrompt.response_style}${creatorFact}`;
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