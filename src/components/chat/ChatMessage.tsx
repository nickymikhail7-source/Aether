'use client';

import type { Message } from '@/types/chat';
import { EmailCard } from './EmailCard';
import { DraftCard } from './DraftCard';
import { StatsCard } from './StatsCard';
import { QuickChips } from './QuickChips';

interface ChatMessageProps {
    message: Message;
    onSendChip?: (chip: string) => void;
}

export function ChatMessage({ message, onSendChip }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className="mb-6">
            <div className="flex gap-4">
                {/* Avatar */}
                <div className={`w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-sm font-semibold
          ${isUser ? 'bg-gray-800 text-white' : 'bg-teal-600 text-white'}`}>
                    {isUser ? 'U' : '✨'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                        {isUser ? 'You' : 'Aether'}
                    </div>

                    {/* Text content */}
                    <div className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                        {message.content}
                    </div>

                    {/* Email Card */}
                    {message.emailCard && (
                        <EmailCard data={message.emailCard} />
                    )}

                    {/* Draft Card */}
                    {message.draftCard && (
                        <DraftCard data={message.draftCard} />
                    )}

                    {/* Stats Card */}
                    {message.statsCard && (
                        <StatsCard data={message.statsCard} onClickStat={() => { }} />
                    )}

                    {/* Quick Chips */}
                    {message.chips && message.chips.length > 0 && (
                        <QuickChips chips={message.chips} onSelect={onSendChip || (() => { })} />
                    )}
                </div>
            </div>
        </div>
    );
}
