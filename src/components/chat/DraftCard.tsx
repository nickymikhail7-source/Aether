'use client';

import { useState } from 'react';
import type { DraftCardData } from '@/types/chat';

interface DraftCardProps {
    data: DraftCardData;
}

export function DraftCard({ data }: DraftCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [subject, setSubject] = useState(data.subject);
    const [body, setBody] = useState(data.body);
    const [isSending, setIsSending] = useState(false);

    const handleSend = async () => {
        setIsSending(true);
        try {
            const response = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: data.toEmail,
                    subject,
                    message: body
                })
            });

            if (response.ok) {
                // TODO: Show success message
                console.log('Email sent successfully');
            } else {
                console.error('Failed to send email');
            }
        } catch (error) {
            console.error('Send error:', error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 border-l-[3px] border-l-teal-500 rounded-lg my-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border-b border-gray-200">
                <span className="text-[11px] font-semibold text-teal-600 uppercase tracking-wide">Draft Reply</span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 rounded transition"
                    >
                        {isEditing ? 'Done' : 'Edit'}
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="px-2.5 py-1 text-xs font-medium bg-teal-600 text-white hover:bg-teal-500 rounded transition disabled:opacity-50"
                    >
                        {isSending ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-3.5 text-sm text-gray-700 leading-relaxed">
                <div className="text-[13px] text-gray-500 mb-2.5">
                    To: <strong className="text-gray-700">{data.to}</strong> &lt;{data.toEmail}&gt;
                </div>

                {isEditing ? (
                    <>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-2 py-1 mb-2 border border-gray-300 rounded text-sm"
                            placeholder="Subject"
                        />
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={8}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm resize-none"
                        />
                    </>
                ) : (
                    <div className="whitespace-pre-wrap">{body}</div>
                )}
            </div>
        </div>
    );
}
