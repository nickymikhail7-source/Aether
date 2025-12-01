import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio') as File;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Convert to format OpenAI expects
        const audioBuffer = await audioFile.arrayBuffer();
        const audioBlob = new Blob([audioBuffer], { type: audioFile.type });
        const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

        // Transcribe with Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: file,
            model: 'whisper-1',
            response_format: 'text',
        });

        return NextResponse.json({ text: transcription });

    } catch (error: any) {
        console.error('Transcription error:', error);
        return NextResponse.json(
            { error: 'Failed to transcribe audio', details: error.message },
            { status: 500 }
        );
    }
}
