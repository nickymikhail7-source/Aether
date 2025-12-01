'use client';

import { useState, useEffect } from 'react';

interface EmailAnalysis {
    intent: string;
    summary: string;
    keyPoints: string[];
    action: {
        required: boolean;
        type: string;
        description: string;
        options?: string[];
    };
    deadline?: {
        exists: boolean;
        description?: string;
        isUrgent: boolean;
    };
}

interface EmailCardProps {
    thread: any;
    message: any;
    onOpenPanel: () => void;
    trustScore?: number;
}

const intentConfig: Record<string, { icon: string; label: string; bgColor: string; textColor: string }> = {
    meeting_request: { icon: '📅', label: 'Meeting', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400' },
    payment_required: { icon: '💰', label: 'Payment', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400' },
    action_required: { icon: '⚡', label: 'Action', bgColor: 'bg-orange-500/10', textColor: 'text-orange-400' },
    reply_needed: { icon: '💬', label: 'Reply', bgColor: 'bg-yellow-500/10', textColor: 'text-yellow-400' },
    fyi_informational: { icon: '📄', label: 'FYI', bgColor: 'bg-slate-500/10', textColor: 'text-slate-400' },
    promotional: { icon: '🛒', label: 'Promo', bgColor: 'bg-pink-500/10', textColor: 'text-pink-400' },
    transactional: { icon: '🧾', label: 'Receipt', bgColor: 'bg-gray-500/10', textColor: 'text-gray-400' },
    personal: { icon: '👤', label: 'Personal', bgColor: 'bg-green-500/10', textColor: 'text-green-400' },
};

export function EmailCard({ thread, message, onOpenPanel, trustScore = 3 }: EmailCardProps) {
    const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
    const [loading, setLoading] = useState(true);

    // Helper to extract sender from all possible locations in Gmail API response
    const extractSenderFromThread = (thread: any, message: any): { name: string; email: string; initials: string } => {
        // Try multiple sources for the "from" field
        let fromString = '';

        // Source 1: Direct message.from
        if (message?.from && message.from.trim()) {
            fromString = message.from;
        }
        // Source 2: Thread's first message payload headers
        else if (thread?.messages?.[0]?.payload?.headers) {
            const headers = thread.messages[0].payload.headers;
            const fromHeader = headers.find((h: any) => h.name?.toLowerCase() === 'from');
            if (fromHeader?.value) {
                fromString = fromHeader.value;
            }
        }
        // Source 3: Message payload headers
        else if (message?.payload?.headers) {
            const headers = message.payload.headers;
            const fromHeader = headers.find((h: any) => h.name?.toLowerCase() === 'from');
            if (fromHeader?.value) {
                fromString = fromHeader.value;
            }
        }
        // Source 4: Thread-level from
        else if (thread?.from) {
            fromString = thread.from;
        }
        // Source 5: Any message in thread
        else if (thread?.messages) {
            for (const msg of thread.messages) {
                if (msg?.from) {
                    fromString = msg.from;
                    break;
                }
                if (msg?.payload?.headers) {
                    const fromHeader = msg.payload.headers.find((h: any) => h.name?.toLowerCase() === 'from');
                    if (fromHeader?.value) {
                        fromString = fromHeader.value;
                        break;
                    }
                }
            }
        }

        // If still empty, return unknown
        if (!fromString || !fromString.trim()) {
            return { name: 'Unknown Sender', email: '', initials: 'US' };
        }

        // Parse the from string
        const fullMatch = fromString.match(/^"?([^"<]+)"?\s*<([^>]+)>$/);
        if (fullMatch) {
            const name = fullMatch[1].trim();
            const email = fullMatch[2].trim();
            const words = name.split(/\s+/).filter((w: string) => w.length > 0);
            const initials = words.length >= 2
                ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
                : name.substring(0, 2).toUpperCase();
            return { name, email, initials };
        }

        // Just email format
        const emailMatch = fromString.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
            const email = emailMatch[1];
            const namePart = email.split('@')[0]
                .replace(/[._-]/g, ' ')
                .split(' ')
                .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            return {
                name: namePart,
                email,
                initials: namePart.substring(0, 2).toUpperCase()
            };
        }

        // Fallback
        const cleanFrom = fromString.trim();
        return {
            name: cleanFrom.length > 40 ? cleanFrom.substring(0, 40) + '...' : cleanFrom,
            email: cleanFrom,
            initials: cleanFrom.substring(0, 2).toUpperCase(),
        };
    };

    const formatTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            const diff = Date.now() - d.getTime();
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            if (hours < 1) return 'Just now';
            if (hours < 24) return `${hours}h ago`;
            if (days < 7) return `${days}d ago`;
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    useEffect(() => {
        const analyze = async () => {
            try {
                const res = await fetch('/api/ai/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        emailContent: message?.body || message?.snippet || thread?.snippet || '',
                        subject: thread?.subject || '',
                        from: message?.from || '',
                        date: message?.date || '',
                    }),
                });
                if (res.ok) setAnalysis(await res.json());
            } catch (e) {
                console.error('Analysis failed:', e);
            } finally {
                setLoading(false);
            }
        };
        analyze();
    }, [thread?.id]);

    const sender = extractSenderFromThread(thread, message);
    const intent = intentConfig[analysis?.intent || 'fyi_informational'];

    if (loading) {
        return (
            <div className="bg-[#111] rounded-2xl p-6 mb-4 animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-white/10" />
                    <div className="flex-1">
                        <div className="h-5 w-48 bg-white/10 rounded mb-2" />
                        <div className="h-4 w-32 bg-white/5 rounded" />
                    </div>
                </div>
                <div className="h-20 bg-white/5 rounded-xl mb-4" />
                <div className="h-16 bg-white/5 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="bg-[#111] rounded-2xl p-6 mb-4 border border-white/5 hover:border-white/10 transition-all duration-300">

            {/* HEADER */}
            <div className="flex items-start gap-4 mb-5">
                <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
                        {sender.initials}
                    </div>
                    {!thread?.read && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-[#111]" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white text-lg truncate">{sender.name}</h3>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${intent.bgColor} ${intent.textColor}`}>
                            <span>{intent.icon}</span>
                            <span>{intent.label}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-white/50">
                        {sender.email && <span className="truncate">{sender.email}</span>}
                        {sender.email && <span>•</span>}
                        <span>{formatTime(message?.date)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i <= trustScore ? 'bg-indigo-400' : 'bg-white/10'}`} />
                    ))}
                </div>
            </div>

            {/* AI SUMMARY */}
            <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <span className="text-xs">✨</span>
                    </div>
                    <span className="text-sm font-medium text-white/70">AI Summary</span>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
                    <p className="text-white/90 leading-relaxed">
                        {analysis?.summary || thread?.subject || 'Analyzing...'}
                    </p>
                </div>
            </div>

            {/* KEY INSIGHTS */}
            {analysis?.keyPoints && analysis.keyPoints.length > 0 && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <span className="text-xs">💡</span>
                        </div>
                        <span className="text-sm font-medium text-white/70">Key Insights</span>
                    </div>
                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                        <ul className="space-y-2">
                            {analysis.keyPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-3 text-white/80">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* ACTION BAR */}
            {(analysis?.action?.required || analysis?.deadline?.exists) && (
                <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
                    {analysis?.action?.required && (
                        <div className="flex items-center gap-2">
                            <span className="text-orange-400 text-lg">⚡</span>
                            <span className="text-orange-300 font-medium">{analysis.action.description || 'Action required'}</span>
                        </div>
                    )}
                    {analysis?.deadline?.exists && (
                        <div className={`ml-auto px-3 py-1.5 rounded-lg text-sm font-medium ${analysis.deadline.isUrgent ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                            ⏰ {analysis.deadline.description}
                        </div>
                    )}
                </div>
            )}

            {/* ACTION BUTTONS - SIMPLIFIED */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <button className="px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/15 text-white/70 transition-all flex items-center gap-2">
                        📁 Archive
                    </button>
                    <button className="px-4 py-2 rounded-xl text-sm font-medium bg-white/10 hover:bg-white/15 text-white/70 transition-all flex items-center gap-2">
                        ⏰ Snooze
                    </button>
                </div>

                {/* SINGLE "Reply" button that opens panel */}
                <button
                    onClick={onOpenPanel}
                    className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                    <span>Reply</span>
                    <span>→</span>
                </button>
            </div>
        </div>
    );
}
