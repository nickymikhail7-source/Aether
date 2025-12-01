'use client';

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useEffect } from 'react';

interface VoiceButtonProps {
    onTranscription: (text: string) => void;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    className?: string;
}

export function VoiceButton({
    onTranscription,
    size = 'md',
    showLabel = false,
    className = ''
}: VoiceButtonProps) {
    const {
        isRecording,
        isTranscribing,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording,
        error
    } = useVoiceRecorder();

    // Format recording time
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

    // Keyboard shortcut: Escape to cancel
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
            {/* Main Button */}
            <button
                onClick={handleClick}
                disabled={isTranscribing}
                title={isRecording ? 'Click to stop' : 'Click to record'}
                className={`
          relative flex items-center justify-center rounded-xl transition-all duration-200
          ${isRecording
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                        : isTranscribing
                            ? 'bg-indigo-500/50 text-white cursor-wait'
                            : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                    }
          ${sizeClasses[size]}
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

                {/* Recording pulse ring */}
                {isRecording && (
                    <span className="absolute inset-0 rounded-xl border-2 border-red-400 animate-ping opacity-75" />
                )}
            </button>

            {/* Recording indicator */}
            {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-sm font-medium">{formatTime(recordingTime)}</span>
                    <button
                        onClick={cancelRecording}
                        className="ml-1 text-red-400/70 hover:text-red-400 text-xs"
                        title="Cancel (Esc)"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Transcribing indicator */}
            {isTranscribing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30">
                    <span className="text-indigo-400 text-sm">Transcribing...</span>
                </div>
            )}

            {/* Label */}
            {showLabel && !isRecording && !isTranscribing && (
                <span className="text-sm text-white/50">Voice</span>
            )}

            {/* Error tooltip */}
            {error && (
                <div className="absolute top-full left-0 mt-2 px-3 py-2 rounded-lg bg-red-500/90 text-white text-xs max-w-[250px] z-50 shadow-lg">
                    {error}
                </div>
            )}
        </div>
    );
}
