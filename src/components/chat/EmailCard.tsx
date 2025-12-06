'use client';

import { useState } from 'react';
import type { EmailCardData } from '@/types/chat';

interface EmailCardProps {
    data: EmailCardData;
    onAction?: (action: string, emailId: string, emailData: EmailCardData) => void;
}

export function EmailCard({ data, onAction }: EmailCardProps) {
    const [isLoading, setIsLoading] = useState<string | null>(null);

    // Determine email type based on data
    const isAutomated = data.sender?.toLowerCase().includes('noreply') ||
        data.sender?.toLowerCase().includes('notification') ||
        data.sender?.toLowerCase().includes('alert') ||
        data.sender?.toLowerCase().includes('bank') ||
        data.sender?.toLowerCase().includes('no-reply') ||
        data.senderEmail?.toLowerCase().includes('noreply') ||
        data.senderEmail?.toLowerCase().includes('notifications');

    const accentColor = {
        urgent: 'bg-red-400',
        action: 'bg-amber-400',
        info: 'bg-teal-500'
    }[data.priority] || 'bg-teal-500';

    const priorityIcon = {
        urgent: '🔴',
        action: '🟡',
        info: '📋'
    }[data.priority] || '📋';

    const handleAction = async (action: string) => {
        setIsLoading(action);

        if (onAction) {
            onAction(action, data.id, data);
        }

        setTimeout(() => setIsLoading(null), 1500);
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl my-4 overflow-hidden shadow-sm">
            {/* Priority accent bar */}
            <div className={`h-[3px] ${accentColor}`} />

            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-lg">{priorityIcon}</span>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-sm font-semibold text-blue-700">
                        {data.senderInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{data.sender}</div>
                        <div className="text-[13px] text-gray-500 truncate">{data.subject}</div>
                    </div>
                    <div className="text-xs text-gray-400">{data.time}</div>
                </div>

                {/* Summary */}
                <div className="p-3 bg-white rounded-lg border-l-[3px] border-teal-500 mb-4 text-sm text-gray-600">
                    {data.summary}
                </div>

                {/* Actions - Simplified based on email type */}
                <div className="flex gap-2 flex-wrap">
                    {isAutomated ? (
                        // Automated/FYI emails: just Mark Read and Archive
                        <>
                            <button
                                onClick={() => handleAction('mark-read')}
                                disabled={isLoading !== null}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                {isLoading === 'mark-read' ? '⏳' : '✓'} Mark Read
                            </button>
                            <button
                                onClick={() => handleAction('archive')}
                                disabled={isLoading !== null}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                {isLoading === 'archive' ? '⏳' : '📦'} Archive
                            </button>
                        </>
                    ) : (
                        // Reply-needed emails: Reply, Snooze, Archive
                        <>
                            <button
                                onClick={() => handleAction('reply')}
                                disabled={isLoading !== null}
                                className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-md text-[13px] font-medium hover:bg-teal-500 transition disabled:opacity-50"
                            >
                                {isLoading === 'reply' ? '⏳' : '↩️'} Reply
                            </button>
                            <button
                                onClick={() => handleAction('snooze')}
                                disabled={isLoading !== null}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                {isLoading === 'snooze' ? '⏳' : '⏰'} Snooze
                            </button>
                            <button
                                onClick={() => handleAction('archive')}
                                disabled={isLoading !== null}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                {isLoading === 'archive' ? '⏳' : '📦'} Archive
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
