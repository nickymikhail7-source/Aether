'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { MessageSquare, Inbox, AlertCircle, Star, Send, FileText, Plus, MoreVertical, LogOut } from 'lucide-react';

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
    onSendCommand?: (command: string) => void;
}

export function Sidebar({
    conversations = [],
    currentConversationId,
    emailCounts = { inbox: 0, needsReply: 0, drafts: 0 },
    onNewChat,
    onSelectConversation,
    onNavigate,
    onSendCommand
}: SidebarProps) {
    const [activeView, setActiveView] = useState<string>('chat');

    // Map views to chat commands
    const viewCommands: Record<string, string> = {
        'inbox': 'Show my inbox',
        'needs-reply': 'What needs my reply?',
        'starred': 'Show starred emails',
        'sent': 'Show sent emails',
        'drafts': 'Show my drafts'
    };

    const handleNavigate = (view: any) => {
        setActiveView(view);

        // If we have a send command handler and view has a command, send it
        if (onSendCommand && viewCommands[view]) {
            onSendCommand(viewCommands[view]);
        } else {
            onNavigate(view);
        }
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
                        label="Urgent"
                        badge={emailCounts.needsReply}
                        isActive={activeView === 'needs-reply'}
                        onClick={() => handleNavigate('needs-reply')}
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
                <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                        U
                    </div>
                    <div className="flex-1 text-left">
                        <div className="text-sm text-white font-medium">User</div>
                    </div>
                </div>
                <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="flex items-center gap-2 w-full px-3 py-2 mt-1 rounded-lg text-red-400 hover:bg-[#212121] hover:text-red-300 transition-colors text-sm"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Log out</span>
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
