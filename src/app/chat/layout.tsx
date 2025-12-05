'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [conversations, setConversations] = useState<Array<{
        id: string;
        title: string;
        updatedAt: Date;
    }>>([]);

    const handleNewChat = () => {
        // Reload the chat page to start fresh
        window.location.href = '/chat';
    };

    const handleSelectConversation = (id: string) => {
        // TODO: Load conversation by ID
        console.log('Load conversation:', id);
    };

    const handleNavigate = (view: string) => {
        // Stay in chat - these will be handled by the chat page
        console.log('Navigate to view:', view);
    };

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                conversations={conversations}
                emailCounts={{
                    inbox: 0,
                    needsReply: 0,
                    drafts: 0
                }}
                onNewChat={handleNewChat}
                onSelectConversation={handleSelectConversation}
                onNavigate={handleNavigate}
            />
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    );
}
