import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { ChatMessage } from '../../../types/chat';
import { getMessages, saveMessage, updateLikeStatus, decryptMessage } from '../../../utils/firebaseDb';
import { getOpenAIChatCompletion, getRecentMessages } from '../../../utils/getOpenAIChatCompletion';
import { isCreator } from '../../../utils/firebaseAuth';
import { trackMessage } from '../../../utils/analytics';

const normalizeText = (text: string): string => text.toLowerCase().trim().replace(/[^\w\s]/gi, "");

const getHardcodedResponse = (userMessage: string): string | null => {
  const rawResponses: { [key: string]: string } = {
    "i had this interesting dream last night...": "Dreams are like your mind’s own little movie—full of quirky twists and cool surprises! What was the most fun part of your dream?",
    "i could use some advice about...": "I'm all ears, buddy. Lay it on me—let's figure it out together.",
    "i've been feeling uncertain about...": "Sometimes a little uncertainty is just life’s way of keeping things interesting. What’s on your mind? I’m here to help clear the fog.",
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
  Object.keys(rawResponses).forEach(key => { normalizedResponses[normalizeText(key)] = rawResponses[key]; });
  return normalizedResponses[normalizeText(userMessage)] ?? null;
};

export const useChat = (activeChatId: number, user: User | null) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    
    useEffect(() => {
        if (!user) {
            setMessages([]);
            return;
        }
        setIsLoading(true);
        getMessages(user.uid, activeChatId)
            .then(loadedMessages => {
                setMessages(loadedMessages.map((msg: any) => ({ ...msg, threadID: activeChatId })) as ChatMessage[]);
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [activeChatId, user]);

    const createMessage = (text: string, sender: "user" | "assistant"): ChatMessage => ({
        id: crypto.randomUUID(), text, sender, timestamp: new Date().toISOString(),
        likeStatus: null, encrypted: sender === "user", threadID: activeChatId,
    });

    const sendUserMessage = useCallback(async (text: string) => {
        if (!text.trim() || !user) return;

        setIsGenerating(true);
        const userMessage = createMessage(text, "user");
        
        setMessages(prev => [...prev, userMessage]);
        await saveMessage(text, "user", null, activeChatId);

        const currentMessageHistory = [...messages, userMessage];

        const hardcodedResponse = getHardcodedResponse(text);
        if (hardcodedResponse) {
            setTimeout(async () => {
                const aiMessage = createMessage(hardcodedResponse, "assistant");
                await saveMessage(hardcodedResponse, "assistant", null, activeChatId);
                setMessages(prev => [...prev, aiMessage]);
                setIsGenerating(false);
            }, 1500);
            return;
        }

        try {
            const contextMessages = currentMessageHistory.map(msg => ({...msg, text: msg.encrypted ? decryptMessage(msg.text, true) : msg.text}));
            const recentMessagesResult = getRecentMessages(contextMessages);
            const chatCompletionStream = await getOpenAIChatCompletion(recentMessagesResult.messages, activeChatId);
            
            if (!chatCompletionStream) { 
                setIsGenerating(false); 
                return; 
            }

            let streamedMessage = "";
            for await (const chunk of chatCompletionStream) {
                streamedMessage += chunk.choices?.[0]?.delta?.content || "";
            }

            const aiMessage = createMessage(streamedMessage, "assistant");
            await saveMessage(streamedMessage, "assistant", null, activeChatId);
            if (user) trackMessage(user.uid, activeChatId, streamedMessage);
            
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Error generating AI response:", error);
        } finally {
            setIsGenerating(false);
        }
    }, [user, activeChatId, messages]);

    const likeDislikeMessage = useCallback(async (messageId: string, action: "like" | "dislike") => {
        const currentMessage = messages.find(msg => msg.id === messageId);
        const currentStatus = currentMessage?.likeStatus;
        const newStatus = currentStatus === action ? null : action;
    
        setMessages(prev => prev.map(msg => (msg.id === messageId ? { ...msg, likeStatus: newStatus } : msg)));
        
        try {
            await updateLikeStatus(messageId, newStatus);
        } catch (e) {
            console.error("Failed to update like status:", e);
            setMessages(prev => prev.map(msg => (msg.id === messageId ? { ...msg, likeStatus: currentStatus } : msg)));
        }
    }, [messages]);

    return { messages, isLoading, isGenerating, sendUserMessage, likeDislikeMessage };
};