'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [conversations, setConversations] = useState<Array<{
        id: string;
        title: string;
        updatedAt: Date;
    }>>([]);

    const handleNewChat = () => {
        router.push('/chat');
        // Optionally reload or reset chat state
        window.location.reload();
    };

    const handleSelectConversation = (id: string) => {
        router.push(`/chat?id=${id}`);
    };

    const handleNavigate = (view: string) => {
        if (view === 'chat') {
            router.push('/chat');
        } else if (view === 'inbox') {
            router.push('/inbox');
        } else {
            // Other views can be implemented later
            console.log('Navigate to:', view);
        }
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
