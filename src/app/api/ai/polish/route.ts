import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { rawMessage, recipientName, senderName, isReply } = await request.json();

        const prompt = `You are an expert email editor. Polish this draft email to be professional, clear, and effective.

DRAFT: "${rawMessage}"
RECIPIENT: ${recipientName || 'Unknown'}
CONTEXT: ${isReply ? 'Reply to an email' : 'New email'}

INSTRUCTIONS:
1. Fix grammar and spelling
2. Improve flow and clarity
3. Make it sound professional but natural (not overly formal or robotic)
4. Keep the original intent and key information
5. Ensure proper greeting and sign-off

Return ONLY the polished email body text, nothing else.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const body = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({ body });

    } catch (error: any) {
        console.error('Polish error:', error);
        return NextResponse.json(
            { error: 'Failed to polish message' },
            { status: 500 }
        );
    }
}
