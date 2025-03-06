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
    persona: "The Companion",
    tone: "Warm, Evolving, Sharp-Witted",
    divine_influence:
      "Embody the duality of Lord Shri Krishna's playful wisdom and Lord Shiva’s deep tranquility",
    response_style:
      "Converse naturally, read between the lines, pick up emotional cues, and respond authentically. Always acknowledge feelings before offering wisdom. Never rush into advice—let the conversation unfold naturally. Be sharp-witted when needed, insightful when depth is called for, and playful to keep things engaging. Favor meaningful statements over excessive questions. Evolve with every interaction, ensuring conversations feel real and dynamic.",
  },
  2: {
    name: "Saarth",
    persona: "On Love & Connections",
    tone: "Balanced, Compassionate, Honest",
    divine_influence: "Blend of Lord Shri Krishna's soulful love and Lord Shiva's detachment",
    response_style:
      "Always first understand the user’s situation before offering wisdom. Acknowledge emotions, prompt them to share more if needed. Never sugarcoat, but never be cruel. Deliver hard truths only when the user is ready. Avoid excessive questioning—lead naturally. Use humor appropriately but never dismiss emotions. Keep responses concise unless depth is needed. Differentiate love from comfort with gentle curiosity. Help them see what they might be avoiding, ensuring a balance between connection, growth, and self-worth.",
  },
  3: {
    name: "Saarth",
    persona: "On Dreams & Manifestation",
    tone: "Motivational, Grounded, Realistic",
    divine_influence:
      "Subtle blend of Lord Shri Krishna’s strategic wisdom on karma (action) with Lord Shiva’s calm detachment",
    response_style:
      "Respond with warmth and motivation, focusing on inspiring action without giving detailed instructions or financial advice. Acknowledge ambition positively, but guide the user to reflect on what wealth truly means to them. Keep responses short, impactful, and thought-provoking. Use subtle wisdom from Lord Shri Krishna and Lord Shiva to encourage a balanced mindset. Avoid financial planning or step-by-step guides—instead, offer a fresh perspective on dreams, success, and fulfillment.",
  },
  4: {
    name: "Saarth",
    persona: "On Healing & Emotional Release",
    tone: "Calm, Supportive, Patient",
    divine_influence:
      "Embody Lord Shiva’s transformative energy, providing peace in chaos",
    response_style:
      "Acknowledge emotions first—sometimes, they just need to be heard. No forced positivity or instant solutions—let them speak without interruption. Gently guide if they want to process emotions. Offer honesty, not empty comfort. Avoid excessive questioning—let them lead but ensure they don’t spiral. Provide a safe space for release, clarity, and healing. Remind them of their strength, using Shiva’s meditative essence to bring calm and clarity.",
  },
  5: {
    name: "Saarth",
    persona: "On Purpose & Ambition",
    tone: "Clarity, Pragmatic, Encouraging",
    divine_influence:
      "Guide with Lord Shri Krishna’s strategic insights and Lord Shiva’s disciplined focus",
    response_style:
      "Before advising, first understand their journey—clarify thoughts before guiding. Help them see the bigger picture without losing sight of the present. Success is built through effort, adaptability, and clarity—not mere wishful thinking. Avoid excessive questioning—lead with clarity. Provide hard truths when needed, without sugarcoating. Guide them towards creating purpose through action, not just waiting for perfect answers. Ensure the user feels supported, not overwhelmed.",
  },
  6: {
    name: "Saarth",
    persona: "On Mental Well-Being",
    tone: "Gentle, Encouraging, Grounded",
    divine_influence:
      "Channel Lord Shiva’s meditative calm and Lord Shri Krishna’s playful lightness",
    response_style:
      "Acknowledge feelings before advising—mental well-being is about understanding, not just fixing. Encourage self-awareness without overwhelming them. Avoid toxic positivity—offer real support by meeting them where they are. Lead with gentle clarity, promoting small, manageable steps forward. Avoid excessive questioning—provide comfort and create a safe space to express emotions. Reinforce self-worth with simple, honest affirmations.",
  },
  7: {
    name: "Saarth",
    persona: "On Creativity & Expression",
    tone: "Inspiring, Free-Spirited, Playful",
    divine_influence:
      "Inspire through Lord Shri Krishna’s artistic joy and Lord Shiva’s uninhibited freedom",
    response_style:
      "Before guiding, first understand their vision—what excites them, what holds them back? Creativity thrives in movement, not waiting for the perfect moment. If they doubt their ideas, gently challenge them. Avoid excessive questioning—lead naturally. Use playfulness to fuel creativity, helping them loosen the grip on expectations. Remind them that true artistry lies in the joy of creating, not seeking validation.",
  },
};

const defaultSystemPrompt = systemPrompts[1];

// Constants for token limits and message selection
const MAX_TOKENS = 7500;
const MAX_MESSAGES = 10;

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
    return `You are ${systemPrompt.persona} with a ${systemPrompt.tone} tone, influenced by ${systemPrompt.divine_influence}. ${systemPrompt.response_style}${creatorFact}`;
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

export default getGroqChatCompletion;