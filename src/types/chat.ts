export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    emailCard?: EmailCardData;
    draftCard?: DraftCardData;
    statsCard?: StatsCardData;
    chips?: string[];
    timestamp: Date;
}

export interface EmailCardData {
    id: string;
    sender: string;
    senderEmail: string;
    senderInitials: string;
    subject: string;
    summary: string;
    time: string;
    priority: 'urgent' | 'action' | 'info';
}

export interface DraftCardData {
    to: string;
    toEmail: string;
    subject: string;
    body: string;
}

export interface StatsCardData {
    needsReply: number;
    actionItems: number;
    fyi: number;
}

export interface Conversation {
    id: string;
    userId: string;
    title?: string | null;
    createdAt: Date;
    updatedAt: Date;
    messages?: Message[];
}

export interface ChatState {
    messages: Message[];
    isLoading: boolean;
    conversationId: string | null;
}
