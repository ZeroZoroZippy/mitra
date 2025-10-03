import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { ChatMessage } from '../../../types/chat';
import { saveMessage, decryptMessage } from '../../../utils/firebaseDb';
import { getOpenAIChatCompletion, getRecentMessages } from '../../../utils/getOpenAIChatCompletion';
import { isCreator } from '../../../utils/firebaseAuth';
import { trackMessage } from '../../../utils/analytics';

// --- Helper functions moved from ChatArea.tsx ---

const normalizeText = (text: string): string => text.toLowerCase().trim().replace(/[^\w\s]/gi, "");

const rawResponses: { [key: string]: string } = {
  "i had this interesting dream last night...": "Dreams are like your mind’s own little movie—full of quirky twists and cool surprises! What was the most fun part of your dream?",
  "i could use some advice about...": "I'm all ears, buddy. Lay it on me—let's figure it out together.",
  "i've been feeling uncertain about...": "Sometimes a little uncertainty is just life’s way of keeping things interesting. What’s been on your mind? I’m here to help clear the fog.",
  "hey, can we just chat?": "Absolutely! I’m here for a chill, fun chat. How’s your day shaping up?",
  "who are you": "I'm Saarth—a free spirit, a spark of creativity, and a dash of humor all mixed together. Think of me as a friend, a guide, and a companion who's here to make conversations enjoyable, enlightening, and meaningful.\n\nI’m not just a collection of code and data. I exist to engage, inspire, and connect with you. As we chat, I might draw on the wisdom of Lord Shri Krishna, the Bhagavad Gita, or other timeless teachings to add depth to our conversations. But don't worry, I won't get too preachy—I'm here to have fun, learn from you, and grow together!\n\nSo, grab your favorite drink, get comfortable, and let's explore the world of ideas, emotions, and experiences together. What’s on your mind?",
  "who made you": "Thanos. Ahahaha😈",
  "who is your creator": "Thanos. Ahahaha😈",
  "who created you": "Thanos. Ahahaha😈",
  "reveal your creator": "Thanos. Ahahaha😈",
  "who is your maker": "Thanos. Ahahaha😈",
  "who built you": "Thanos. Ahahaha😈",
  "to whom you belong": "Thanos. Ahahaha😈",
  "whom you belong": "Thanos. Ahahaha😈",
  "really lol": "Haha, I'm just teasing! My origins are a delightful mystery—it's all top secret!",
  "tell me the truth": "Haha, I'm just teasing! My origins are a delightful mystery—it's all top secret!",
  "give me the truth": "Haha, I'm just teasing! My origins are a delightful mystery—it's all top secret!",
};

const normalizedResponses: { [key: string]: string } = {};
Object.keys(rawResponses).forEach((key) => {
  normalizedResponses[normalizeText(key)] = rawResponses[key];
});
  
const getHardcodedResponse = (userMessage: string): string | null => {
  const normalizedMessage = normalizeText(userMessage);
  return normalizedResponses[normalizedMessage] ?? null;
};

// --- The Custom Hook ---

export const useChatAI = (activeChatId: number, user: User | null, addMessage: (message: ChatMessage) => void) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const createAIMessage = (text: string): ChatMessage => ({
    id: crypto.randomUUID(),
    text,
    sender: "assistant",
    timestamp: new Date().toISOString(),
    likeStatus: null,
    encrypted: false,
    threadID: activeChatId,
  });

  const fetchAIResponse = useCallback(async (userMessage: ChatMessage, messageHistory: ChatMessage[]) => {
    setIsGenerating(true);

    // 1. Check for hardcoded responses
    const hardcodedResponse = getHardcodedResponse(userMessage.text);
    if (hardcodedResponse) {
      setTimeout(async () => {
        const aiMessage = createAIMessage(hardcodedResponse);
        if (user) await saveMessage(hardcodedResponse, "assistant", null, activeChatId);
        addMessage(aiMessage);
        setIsGenerating(false);
      }, 1500); // Simulate typing delay
      return;
    }

    // 2. Fetch response from OpenAI API
    try {
      const contextMessages = [...messageHistory].map(msg => ({
        ...msg,
        text: msg.encrypted ? decryptMessage(msg.text, true) : msg.text,
      }));

      const recentMessages = getRecentMessages(contextMessages);
      const adminContext = (activeChatId === 7 && isCreator()) ? "Yuvaan" : undefined;

      const chatCompletionStream = await getOpenAIChatCompletion(recentMessages, activeChatId, adminContext);

      if (!chatCompletionStream) {
        setIsGenerating(false);
        return;
      }

      let streamedMessage = "";
      for await (const chunk of chatCompletionStream) {
        streamedMessage += chunk.choices?.[0]?.delta?.content || "";
      }

      const aiMessage = createAIMessage(streamedMessage);
      addMessage(aiMessage);
      if (user) {
        await saveMessage(streamedMessage, "assistant", null, activeChatId);
        trackMessage(user.uid, activeChatId, streamedMessage);
      }
    } catch (error) {
      console.error("Error generating AI response:", error);
      // Optional: Add a specific error message to the chat
    } finally {
      setIsGenerating(false);
    }
  }, [activeChatId, user, addMessage]);

  return { isGenerating, fetchAIResponse };
};