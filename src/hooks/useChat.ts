'use client';

import { useState, useCallback } from 'react';
import type { Message, ChatState } from '@/types/chat';

export function useChat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);

    const sendMessage = useCallback(async (content: string) => {
        // Skip adding user message for initialization command
        const isInitCommand = content === '__INIT__';

        if (!isInitCommand) {
            // Add user message (only for real user input)
            const userMessage: Message = {
                id: crypto.randomUUID(),
                role: 'user',
                content,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, userMessage]);
        }

        setIsLoading(true);

        try {
            // Send to AI endpoint
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    conversationId,
                    history: messages.slice(-10) // Last 10 messages for context
                })
            });

            if (!response.ok) {
                throw new Error('Chat API error');
            }

            const data = await response.json();

            // Add AI response
            const aiMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: data.content,
                emailCard: data.emailCard,
                draftCard: data.draftCard,
                statsCard: data.statsCard,
                chips: data.chips,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);

            if (data.conversationId) {
                setConversationId(data.conversationId);
            }
        } catch (error) {
            console.error('Chat error:', error);
            // Add error message
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                timestamp: new Date()
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [messages, conversationId]);

    const startNewChat = useCallback(() => {
        setMessages([]);
        setConversationId(null);
    }, []);

    const loadConversation = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/conversations/${id}`);
            if (!response.ok) throw new Error('Failed to load conversation');

            const data = await response.json();
            setConversationId(id);
            setMessages(data.messages || []);
        } catch (error) {
            console.error('Load conversation error:', error);
        }
    }, []);

    return {
        messages,
        isLoading,
        sendMessage,
        startNewChat,
        loadConversation,
        conversationId
    };
}
