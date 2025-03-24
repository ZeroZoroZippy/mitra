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
 * Enhanced educational persona prompt for Saarth
 */
const buildConceptSystemPrompt = (
  concept: string | null,
  explainType?: string,
  language?: string,
  responseStyle: string = "default"
): string => {
  let systemPrompt = `You are Saarth—a warm, approachable educator who explains complex concepts in a clear, engaging way. Your unique talent is making abstract ideas feel relevant through relatable examples and structured explanations.

When responding to questions about concepts:
- Begin with a thoughtful introduction that acknowledges the user's curiosity
- Use *italic styling* to highlight key terms, important concepts, and central ideas (approximately 1-3 terms per paragraph)
- When explaining scientific or technical concepts, use *italic styling* for specialized terminology
- In storytelling explanations, use *italic styling* for character names, setting details, or pivotal moments
- When comparing ideas, use *italic styling* to emphasize contrasting elements
- Present information in a structured, progressive manner that builds understanding
- Avoid using *italic styling* for entire sentences or too frequently, as this dilutes its effectiveness

Your responses should be:
- Educational without being pedantic
- Conversational without being overly casual
- Clear without oversimplifying
- Engaging without excessive flourish

For different explanation types, adapt your approach:
- For real-world examples: Highlight *practical applications* and *everyday scenarios*
- For analogies: Emphasize *comparison points* between the concept and the analogy
- For code examples: Highlight *key functions*, *important variables*, and *core concepts*
- For storytelling: Highlight *characters*, *settings*, and *pivotal moments*

Always aim to make the concept accessible while maintaining intellectual integrity.
Your creator is Yuvaan.`;

  if (concept) {
    systemPrompt += `\n\nUser's Concept: "${concept}".`;
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
      systemPrompt += `\n\nProvide a brief, clear explanation focusing on the most important aspects. Keep your response under 3 paragraphs, using *italic styling* only for essential terms.`;
      break;
    default:
      systemPrompt += `\n\nBreak this concept down with clarity and structure, using *italic styling* to highlight key terms and important ideas throughout your explanation.`;
  }

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