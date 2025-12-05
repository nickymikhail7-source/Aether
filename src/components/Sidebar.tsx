'use client';

import { useState } from 'react';
import { MessageSquare, Inbox, AlertCircle, Star, Send, FileText, Plus, MoreVertical } from 'lucide-react';

interface SidebarProps {
    conversations?: Array<{
        id: string;
        title: string;
        updatedAt: Date;
    }>;
    currentConversationId?: string | null;
    emailCounts?: {
        inbox: number;
        needsReply: number;
        drafts: number;
    };
    onNewChat: () => void;
    onSelectConversation: (id: string) => void;
    onNavigate: (view: 'chat' | 'inbox' | 'needs-reply' | 'starred' | 'sent' | 'drafts') => void;
}

export function Sidebar({
    conversations = [],
    currentConversationId,
    emailCounts = { inbox: 0, needsReply: 0, drafts: 0 },
    onNewChat,
    onSelectConversation,
    onNavigate
}: SidebarProps) {
    const [activeView, setActiveView] = useState<string>('chat');

    const handleNavigate = (view: any) => {
        setActiveView(view);
        onNavigate(view);
    };

    // Group conversations by date
    const groupedConversations = conversations.reduce((acc, conv) => {
        const date = new Date(conv.updatedAt);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let group = 'Older';
        if (date.toDateString() === today.toDateString()) {
            group = 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            group = 'Yesterday';
        } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
            group = 'This Week';
        }

        if (!acc[group]) acc[group] = [];
        acc[group].push(conv);
        return acc;
    }, {} as Record<string, typeof conversations>);

    return (
        <aside className="w-[260px] bg-[#171717] flex flex-col flex-shrink-0 h-screen">
            {/* Header */}
            <div className="p-3">
                <button
                    onClick={onNewChat}
                    className="flex items-center gap-2.5 w-full p-3 bg-transparent border border-[#2e2e2e] rounded-lg text-white text-sm hover:bg-[#212121] transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>New chat</span>
                </button>
            </div>

            {/* Quick Access */}
            <div className="px-3 flex-1 overflow-y-auto">
                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                    Quick Access
                </div>

                <div className="space-y-1">
                    <NavItem
                        icon={MessageSquare}
                        label="Chat"
                        isActive={activeView === 'chat'}
                        onClick={() => handleNavigate('chat')}
                    />
                    <NavItem
                        icon={Inbox}
                        label="Inbox"
                        badge={emailCounts.inbox}
                        isActive={activeView === 'inbox'}
                        onClick={() => handleNavigate('inbox')}
                    />
                    <NavItem
                        icon={AlertCircle}
                        label="Needs Reply"
                        badge={emailCounts.needsReply}
                        isActive={activeView === 'needs-reply'}
                        onClick={() => handleNavigate('needs-reply')}
                    />
                    <NavItem
                        icon={Star}
                        label="Starred"
                        isActive={activeView === 'starred'}
                        onClick={() => handleNavigate('starred')}
                    />
                    <NavItem
                        icon={Send}
                        label="Sent"
                        isActive={activeView === 'sent'}
                        onClick={() => handleNavigate('sent')}
                    />
                    <NavItem
                        icon={FileText}
                        label="Drafts"
                        badge={emailCounts.drafts}
                        isActive={activeView === 'drafts'}
                        onClick={() => handleNavigate('drafts')}
                    />
                </div>

                {/* Conversation History */}
                {Object.entries(groupedConversations).map(([group, convos]) => (
                    <div key={group} className="mt-6">
                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                            {group}
                        </div>
                        <div className="space-y-1">
                            {convos.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => onSelectConversation(conv.id)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] w-full text-left truncate transition-colors
                    ${currentConversationId === conv.id
                                            ? 'bg-[#212121] text-white'
                                            : 'text-gray-400 hover:bg-[#212121] hover:text-white'
                                        }`}
                                >
                                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">{conv.title || 'Untitled conversation'}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* User Menu */}
            <div className="p-3 border-t border-[#2e2e2e]">
                <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-[#212121] transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                        U
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm text-white font-medium">User</div>
                    </div>
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        </aside>
    );
}

interface NavItemProps {
    icon: any;
    label: string;
    badge?: number;
    isActive?: boolean;
    onClick: () => void;
}

function NavItem({ icon: Icon, label, badge, isActive, onClick }: NavItemProps) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm w-full transition-colors
        ${isActive
                    ? 'bg-[#212121] text-white'
                    : 'text-gray-300 hover:bg-[#212121] hover:text-white'
                }`}
        >
            <Icon className="w-4 h-4" />
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && badge > 0 && (
                <span className="px-1.5 py-0.5 bg-teal-600 text-white text-xs font-semibold rounded-md">
                    {badge}
                </span>
            )}
        </button>
    );
}
