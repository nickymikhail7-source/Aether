import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { originalEmail, subject, from, replyContext, mode } = await request.json();

        let systemPrompt = `You are an expert email writer. Write professional, concise, and friendly emails.`;

        let userPrompt = '';

        if (mode === 'quick') {
            userPrompt = `Write a professional email reply based on these key points the user wants to communicate:

ORIGINAL EMAIL FROM: ${from}
SUBJECT: ${subject}
ORIGINAL CONTENT: ${originalEmail?.slice(0, 2000) || 'No content'}

${replyContext}

Write a complete, polished email that:
1. Addresses all the user's points naturally
2. Maintains a professional but friendly tone
3. Is concise (under 150 words unless necessary)
4. Includes an appropriate greeting and sign-off

Return ONLY the email body text, no subject line.`;
        } else if (mode === 'full') {
            userPrompt = `Polish and improve this email draft while keeping the user's intent:

ORIGINAL EMAIL FROM: ${from}
SUBJECT: ${subject}

${replyContext}

Improve grammar, tone, and clarity. Keep it concise. Return ONLY the improved email body.`;
        } else {
            // AI decides
            userPrompt = `Write a professional reply to this email:

FROM: ${from}
SUBJECT: ${subject}
CONTENT: ${originalEmail?.slice(0, 2000) || 'No content'}

Write a helpful, professional reply that:
1. Acknowledges what they wrote
2. Provides a relevant response
3. Is concise (under 100 words for simple emails, more if needed)
4. Has appropriate greeting and sign-off

Return ONLY the email body text.`;
        }

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
        });

        const draft = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({ draft });
    } catch (error: any) {
        console.error('Draft generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate draft', draft: '' },
            { status: 500 }
        );
    }
}
