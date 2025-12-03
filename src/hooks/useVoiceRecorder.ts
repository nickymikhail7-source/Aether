'use client';

import { useState, useRef, useCallback } from 'react';

interface UseVoiceRecorderReturn {
    isRecording: boolean;
    isTranscribing: boolean;
    recordingTime: number;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<string | null>;
    cancelRecording: () => void;
    error: string | null;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setRecordingTime(0);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });

            streamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start(100);
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                setError('Microphone access denied');
            } else if (err.name === 'NotFoundError') {
                setError('No microphone found');
            } else {
                setError('Failed to start recording');
            }
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<string | null> => {
        return new Promise((resolve) => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }

            if (!mediaRecorderRef.current || !isRecording) {
                setIsRecording(false);
                resolve(null);
                return;
            }

            mediaRecorderRef.current.onstop = async () => {
                setIsRecording(false);
                setIsTranscribing(true);

                try {
                    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
                    const audioBlob = new Blob(chunksRef.current, { type: mimeType });

                    if (audioBlob.size < 1000) {
                        setError('Recording too short');
                        resolve(null);
                        return;
                    }

                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');

                    const response = await fetch('/api/ai/transcribe', {
                        method: 'POST',
                        body: formData,
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.text?.trim()) {
                            resolve(data.text.trim());
                        } else {
                            setError('Could not understand audio');
                            resolve(null);
                        }
                    } else {
                        setError('Transcription failed');
                        resolve(null);
                    }
                } catch (err) {
                    setError('Failed to process audio');
                    resolve(null);
                } finally {
                    setIsTranscribing(false);
                    streamRef.current?.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorderRef.current.stop();
        });
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setRecordingTime(0);
        chunksRef.current = [];
    }, [isRecording]);

    return {
        isRecording,
        isTranscribing,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording,
        error,
    };
}
