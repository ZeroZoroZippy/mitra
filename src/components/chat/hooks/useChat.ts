import { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { ChatMessage } from '../../../types/chat';
import { getMessages, saveMessage, updateLikeStatus, decryptMessage, getChatMessages, saveChatMessage, updateChatTitle, Chat } from '../../../utils/firebaseDb';
import { getOpenAIChatCompletion, getRecentMessages, generateChatTitle } from '../../../utils/getOpenAIChatCompletion';
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

export const useChat = (
    activeChatId: number,
    user: User | null,
    activeChat: Chat | null,
    onUpdateChatTitle?: (chatId: string, newTitle: string) => void
) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const titleGeneratedRef = useRef(false);

    useEffect(() => {
        if (!user || !activeChat) {
            setMessages([]);
            return;
        }
        setIsLoading(true);
        titleGeneratedRef.current = false;

        // Load messages from the specific chat
        getChatMessages(user.uid, activeChat.id, activeChatId)
            .then(loadedMessages => {
                setMessages(loadedMessages.map((msg: any) => ({ ...msg, threadID: activeChatId })) as ChatMessage[]);

                // Check if title generation should have happened
                if (loadedMessages.length >= 2 && activeChat.title === "New Chat") {
                    titleGeneratedRef.current = false;
                } else if (loadedMessages.length >= 2) {
                    titleGeneratedRef.current = true;
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [activeChatId, user, activeChat]);

    const createMessage = (text: string, sender: "user" | "assistant"): ChatMessage => ({
        id: crypto.randomUUID(), text, sender, timestamp: new Date().toISOString(),
        likeStatus: null, encrypted: sender === "user", threadID: activeChatId,
    });

    const sendUserMessage = useCallback(async (text: string) => {
        if (!text.trim() || !user || !activeChat) return;

        setIsGenerating(true);
        const userMessage = createMessage(text, "user");
        const isFirstUserMessage = messages.filter(m => m.sender === "user").length === 0;

        setMessages(prev => [...prev, userMessage]);

        // Save to chat-specific collection
        await saveChatMessage(activeChat.id, text, "user", null, activeChatId);

        const currentMessageHistory = [...messages, userMessage];

        const hardcodedResponse = getHardcodedResponse(text);
        if (hardcodedResponse) {
            setTimeout(async () => {
                const aiMessage = createMessage(hardcodedResponse, "assistant");
                await saveChatMessage(activeChat.id, hardcodedResponse, "assistant", null, activeChatId);
                setMessages(prev => [...prev, aiMessage]);
                setIsGenerating(false);

                // Generate title after first exchange
                if (isFirstUserMessage && !titleGeneratedRef.current && activeChat.title === "New Chat") {
                    titleGeneratedRef.current = true;
                    const newTitle = await generateChatTitle(text);
                    await updateChatTitle(user.uid, activeChat.id, newTitle);
                    if (onUpdateChatTitle) {
                        onUpdateChatTitle(activeChat.id, newTitle);
                    }
                }
            }, 1500);
            return;
        }

        try {
            const contextMessages = currentMessageHistory.map(msg => ({...msg, text: msg.encrypted ? decryptMessage(msg.text, true) : msg.text}));
            const recentMessages = getRecentMessages(contextMessages);
            const chatCompletionStream = await getOpenAIChatCompletion(recentMessages, activeChatId);

            if (!chatCompletionStream) {
                setIsGenerating(false);
                return;
            }

            // Create a placeholder AI message that will be updated during streaming
            const tempMessageId = crypto.randomUUID();
            const placeholderMessage = createMessage("", "assistant");
            placeholderMessage.id = tempMessageId;

            // Add the placeholder to state immediately
            setMessages(prev => [...prev, placeholderMessage]);

            let streamedMessage = "";
            for await (const chunk of chatCompletionStream) {
                const content = chunk.choices?.[0]?.delta?.content || "";
                streamedMessage += content;

                // Update the message in real-time as content streams in
                setMessages(prev => prev.map(msg =>
                    msg.id === tempMessageId
                        ? { ...msg, text: streamedMessage }
                        : msg
                ));
            }

            // Save the complete message to Firestore
            await saveChatMessage(activeChat.id, streamedMessage, "assistant", null, activeChatId);
            if (user) trackMessage(user.uid, activeChatId, streamedMessage);

            // Generate title after first exchange
            if (isFirstUserMessage && !titleGeneratedRef.current && activeChat.title === "New Chat") {
                titleGeneratedRef.current = true;
                const newTitle = await generateChatTitle(text);
                await updateChatTitle(user.uid, activeChat.id, newTitle);
                if (onUpdateChatTitle) {
                    onUpdateChatTitle(activeChat.id, newTitle);
                }
            }

        } catch (error) {
            console.error("Error generating AI response:", error);
        } finally {
            setIsGenerating(false);
        }
    }, [user, activeChatId, messages, activeChat, onUpdateChatTitle]);

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