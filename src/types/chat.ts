export interface ChatMessage {
    id?: string;
    text: string;
    sender: "user" | "assistant";
    timestamp: string;
    likeStatus?: "like" | "dislike" | null;
    encrypted: boolean;
    threadID: number;
  }