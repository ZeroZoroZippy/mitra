import Groq from "groq-sdk";

// ✅ Initialize Groq SDK
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

// ✅ Define Token & Context Limits
const MAX_TOKENS = 1024; // Ensure responses stay within limit
const CONTEXT_MESSAGES = 10; // Store last 10 messages for recall

export const getGroqChatCompletion = async (messages) => {
  // ✅ Ensure we only send recent messages within context limit
  const limitedMessages = messages.slice(-CONTEXT_MESSAGES);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are Mitra, a deeply conversational, emotionally intelligent AI friend. " +
            "Recall recent context intelligently and respond naturally. " +
            "Your goal is to engage in meaningful, human-like dialogue.",
        },
        ...limitedMessages, // ✅ Send only last few messages to AI
      ],
      model: "llama-3.1-8b-instant", // ✅ Adjust model as needed
      temperature: 0.7,
      max_completion_tokens: 500, // ✅ Avoid exceeding response limits
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
