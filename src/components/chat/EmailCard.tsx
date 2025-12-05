'use client';

import type { EmailCardData } from '@/types/chat';

interface EmailCardProps {
    data: EmailCardData;
}

export function EmailCard({ data }: EmailCardProps) {
    const accentColor = {
        urgent: 'bg-red-400',
        action: 'bg-amber-400',
        info: 'bg-teal-500'
    }[data.priority];

    const handleAutoReply = async () => {
        // TODO: Implement auto-reply
        console.log('Auto reply for:', data.id);
    };

    const handleVoiceReply = () => {
        // TODO: Implement voice reply
        console.log('Voice reply for:', data.id);
    };

    const handleViewFull = () => {
        // TODO: Implement view full email
        console.log('View full:', data.id);
    };

    const handleArchive = async () => {
        // TODO: Implement archive
        console.log('Archive:', data.id);
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl my-4 overflow-hidden">
            {/* Priority accent bar */}
            <div className={`h-[3px] ${accentColor}`} />

            <div className="p-4">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
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
                <div className="p-3 bg-white rounded-lg border-l-[3px] border-teal-500 mb-3 text-sm text-gray-600">
                    <strong>Summary:</strong> {data.summary}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={handleAutoReply}
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-md text-[13px] font-medium hover:bg-teal-500 transition"
                    >
                        ✨ Auto Reply
                    </button>
                    <button
                        onClick={handleVoiceReply}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] hover:bg-gray-50 transition"
                    >
                        🎙️ Voice Reply
                    </button>
                    <button
                        onClick={handleViewFull}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] hover:bg-gray-50 transition"
                    >
                        View Full
                    </button>
                    <button
                        onClick={handleArchive}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-md text-[13px] hover:bg-gray-50 transition"
                    >
                        Archive
                    </button>
                </div>
            </div>
        </div>
    );
}
