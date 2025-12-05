'use client';

import { useEffect, useRef } from 'react';
import { Search, Settings } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/ChatInput';

export default function ChatPage() {
    const { messages, sendMessage, isLoading } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Send initial welcome message on mount
    useEffect(() => {
        if (messages.length === 0) {
            sendMessage('__INIT__');
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChipClick = (chip: string) => {
        sendMessage(chip);
    };

    return (
        <div className="flex-1 flex flex-col h-screen bg-white">
            {/* Header */}
            <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">Aether</span>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        Inbox Assistant
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition">
                        <Search className="w-4 h-4" />
                    </button>
                    <button className="p-2 rounded-md hover:bg-gray-100 text-gray-600 transition">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-6">
                    {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                                    <span className="text-2xl">✨</span>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                    Welcome to Aether
                                </h2>
                                <p className="text-gray-600 text-sm">
                                    Your AI-powered email assistant. Ask me anything about your inbox.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    onSendChip={handleChipClick}
                                />
                            ))}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>
            </div>

            {/* Input */}
            <ChatInput onSend={sendMessage} isLoading={isLoading} />
        </div>
    );
}
