'use client';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useEffect } from 'react';

interface VoiceButtonProps {
    onTranscription: (text: string) => void;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    showLabel?: boolean;
}

export function VoiceButton({ onTranscription, size = 'md', className = '', showLabel = false }: VoiceButtonProps) {
    const {
        isRecording,
        isTranscribing,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording,
        error
    } = useVoiceRecorder();

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleClick = async () => {
        if (isTranscribing) return;

        if (isRecording) {
            const text = await stopRecording();
            if (text) {
                onTranscription(text);
            }
        } else {
            await startRecording();
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isRecording) {
                cancelRecording();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isRecording, cancelRecording]);

    const sizeClasses = {
        sm: 'w-9 h-9 text-base',
        md: 'w-11 h-11 text-lg',
        lg: 'w-14 h-14 text-xl',
    };

    return (
        <div className="relative inline-flex items-center gap-2">
            <button
                type="button"
                onClick={handleClick}
                disabled={isTranscribing}
                title={isRecording ? 'Click to stop' : 'Click to record'}
                className={`
          relative flex items-center justify-center rounded-xl transition-all duration-200 gap-2
          ${isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                        : isTranscribing
                            ? 'bg-indigo-500/50 text-white cursor-wait'
                            : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                    }
          ${showLabel ? 'px-4 py-2 w-auto h-auto' : sizeClasses[size]}
          ${className}
        `}
            >
                {isTranscribing ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : isRecording ? (
                    <span>⏹️</span>
                ) : (
                    <span>🎙️</span>
                )}

                {showLabel && (
                    <span className="font-medium">
                        {isRecording ? 'Stop Recording' : isTranscribing ? 'Transcribing...' : 'Voice Command'}
                    </span>
                )}

                {isRecording && !showLabel && (
                    <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-75" />
                )}
            </button>

            {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-sm font-medium">{formatTime(recordingTime)}</span>
                    <button
                        type="button"
                        onClick={cancelRecording}
                        className="ml-1 text-red-400/70 hover:text-red-400 text-xs"
                    >
                        ✕
                    </button>
                </div>
            )}

            {isTranscribing && !showLabel && (
                <span className="text-indigo-400 text-sm">Transcribing...</span>
            )}

            {error && (
                <div className="absolute top-full left-0 mt-2 px-3 py-2 rounded-lg bg-red-500/90 text-white text-xs max-w-[200px] z-50">
                    {error}
                </div>
            )}
        </div>
    );
}
