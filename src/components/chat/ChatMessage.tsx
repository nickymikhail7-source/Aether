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

    // Try to parse content if it looks like JSON (fallback for when API returns JSON in content)
    let displayContent = message.content;
    let emailCard = message.emailCard;
    let draftCard = message.draftCard;
    let statsCard = message.statsCard;
    let chips = message.chips;

    // Check if content is JSON (starts with ``` or {)
    if (message.content && !isUser) {
        const content = message.content.trim();
        if (content.startsWith('```json') || content.startsWith('{')) {
            try {
                const jsonStr = content
                    .replace(/```json\n?/g, '')
                    .replace(/```\n?/g, '')
                    .trim();
                const parsed = JSON.parse(jsonStr);

                // Extract fields from parsed JSON
                displayContent = parsed.content || '';
                emailCard = parsed.emailCard || emailCard;
                draftCard = parsed.draftCard || draftCard;
                statsCard = parsed.statsCard || statsCard;
                chips = parsed.chips || chips;
            } catch (e) {
                // Not valid JSON, use as-is
                console.log('Failed to parse message JSON:', e);
            }
        }
    }

    return (
        <div className="mb-6 animate-fadeInUp">
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

                    {/* Text content - render markdown-like formatting */}
                    {displayContent && (
                        <div className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                            {displayContent.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                                i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                            )}
                        </div>
                    )}

                    {/* Stats Card */}
                    {statsCard && (
                        <div className="my-4">
                            <StatsCard data={statsCard} onClickStat={() => { }} />
                        </div>
                    )}

                    {/* Email Card */}
                    {emailCard && (
                        <div className="my-4">
                            <EmailCard data={emailCard} />
                        </div>
                    )}

                    {/* Draft Card */}
                    {draftCard && (
                        <div className="my-4">
                            <DraftCard data={draftCard} />
                        </div>
                    )}

                    {/* Quick Chips */}
                    {chips && chips.length > 0 && (
                        <div className="mt-4">
                            <QuickChips chips={chips} onSelect={onSendChip || (() => { })} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
