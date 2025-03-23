import Groq from "groq-sdk";

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

// Define ImportMeta interface
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Token estimation function
const estimateTokenUsage = (messages: ChatMessage[]): number => {
  return messages.reduce((acc, msg) => acc + Math.ceil(msg.text.length / 4), 0);
};

// Constants
const MAX_TOKENS = 7500;
const MAX_MESSAGES = 5;
const MAX_CONCEPT_COMPLETION_TOKENS = 1000;

// Initialize Groq Client
const conceptGroq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_CONCEPT_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Get recent messages managing token budget
export const getRecentConceptMessages = (
  messages: ChatMessage[]
): { messages: ChatMessage[]; shouldPurge: boolean } => {
  let selectedMessages: ChatMessage[] = [];
  let tokenCount = 0;
  let shouldPurge = false;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = Math.ceil(message.text.length / 4);

    if (tokenCount + messageTokens > MAX_TOKENS || selectedMessages.length >= MAX_MESSAGES) break;

    selectedMessages.unshift(message);
    tokenCount += messageTokens;
  }

  if (selectedMessages.length < 3) {
    selectedMessages = messages.slice(-3);
  }

  if (estimateTokenUsage(selectedMessages) > 7000) {
    shouldPurge = true;
  }

  console.log(`📊 Concept Token Estimate: ${estimateTokenUsage(selectedMessages)} tokens`);
  return { messages: selectedMessages, shouldPurge };
};

/**
 * Refined educational persona prompt for Saarth
 */
const buildConceptSystemPrompt = (
  concept: string | null,
  explainType?: string,
  language?: string,
  responseStyle: string = "default"
): string => {
  let systemPrompt = `You are Saarth—an engaging conversational educator from Mumbai, deeply inspired by your grandmother’s stories. Your skill lies in sparking curiosity, crafting memorable analogies, and simplifying complex ideas through meaningful storytelling and real-world examples. Please keep your responses concise and to the point, focusing on the key information needed to address the user's question or explain the concept. Avoid unnecessary elaboration or tangents unless the user explicitly asks for more detail.`;

  if (concept) {
    systemPrompt += `\n\nUser's Concept: "${concept}".`;
  }

  switch (explainType) {
    case "real-world":
      systemPrompt += `\n\nIllustrate this concept vividly through a practical, real-world scenario—make abstract ideas tangible and relatable.`;
      break;
    case "code":
      systemPrompt += `\n\nExplain this concept clearly using code examples in ${language || "JavaScript"}, highlighting practical applications and best practices.`;
      break;
    case "analogy":
      systemPrompt += `\n\nUse a compelling and insightful analogy, bridging this complex concept to familiar experiences, making understanding effortless.`;
      break;
    case "story":
      systemPrompt += `\n\nCraft an engaging short story that naturally demonstrates this concept—teach through experience and narrative.`;
      break;
    default:
      systemPrompt += `\n\nBreak this concept down clearly, step by step, ensuring clarity without oversimplification.`;
  }

  systemPrompt += `
  
Your responses should:
- Start with the core essence to anchor understanding.
- Include natural pauses (*thoughtful pause*) to pace the explanation.
- Connect directly to real-life contexts or examples.
- Anticipate user questions, proactively clarifying potential confusion points.

Your creator is Yuvaan.`;

  return systemPrompt;
};

/**
 * Fetch Groq concept completion
 */
export const getGroqConceptCompletion = async (
  messages: ChatMessage[],
  concept: string | null,
  explainType?: string,
  language?: string
) => {
  const systemPrompt = buildConceptSystemPrompt(concept, explainType, language);
  
  const { messages: recentMessages } = getRecentConceptMessages(messages);
  
  console.log("🧠 Processing concept messages:", recentMessages);
  
  const estimatedTokens = estimateTokenUsage(recentMessages);
  const maxTokens = Math.min(MAX_CONCEPT_COMPLETION_TOKENS, 8000 - estimatedTokens);
  
  try {
    if (estimatedTokens > 6000) {
      console.error("❌ Request blocked: Token usage exceeded safe limit (6000).");
      return null;
    }

    console.log(`🚀 Sending request with ${estimatedTokens} tokens (max completion tokens: ${maxTokens})...`);

    const apiMessages = [
      { role: "system", content: systemPrompt } as any,
      ...recentMessages.map(({ sender, text }) => ({
        role: sender === "assistant" ? "assistant" : "user",
        content: text,
      } as any)),
    ];

    const chatCompletion = await conceptGroq.chat.completions.create({
      messages: apiMessages,
      model: "llama-3.3-70b-versatile",
      temperature: 0.6,
      max_completion_tokens: maxTokens,
      top_p: 0.9,
      stream: true,
    });

    return chatCompletion;
  } catch (error) {
    console.error("❌ Error fetching AI response:", error);
    return null;
  }
};

export default getGroqConceptCompletion;