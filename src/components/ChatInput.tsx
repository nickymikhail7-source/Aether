'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Send } from 'lucide-react';

interface ChatInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [showVoiceInput, setShowVoiceInput] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [message]);

    const handleSend = () => {
        if (message.trim() && !isLoading) {
            onSend(message.trim());
            setMessage('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="px-6 py-4 border-t border-gray-200 bg-white">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-end gap-2 p-3 bg-white border border-gray-300 rounded-xl focus-within:border-gray-400 focus-within:shadow-sm">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message Aether..."
                        rows={1}
                        disabled={isLoading}
                        className="flex-1 resize-none border-0 bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50"
                        style={{ minHeight: '24px', maxHeight: '200px' }}
                    />
                    <div className="flex gap-1">
                        <button
                            onClick={() => setShowVoiceInput(true)}
                            className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition"
                            title="Voice input"
                        >
                            <Mic className="w-[18px] h-[18px]" />
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || isLoading}
                            className="p-2 rounded-md bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            title="Send"
                        >
                            {isLoading ? (
                                <div className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-[18px] h-[18px]" />
                            )}
                        </button>
                    </div>
                </div>
                <div className="text-center mt-2.5 text-xs text-gray-400">
                    Press Enter to send · Shift + Enter for new line
                </div>
            </div>
        </div>
    );
}
