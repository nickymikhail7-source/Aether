import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { originalEmail, subject, from, replyContext, mode } = await request.json();



        let userPrompt = '';

        if (mode === 'intent') {
            userPrompt = `Write a professional email reply based on this intent:

REPLYING TO: ${from}
SUBJECT: ${subject}
ORIGINAL EMAIL: ${originalEmail?.slice(0, 2000) || 'No content'}

USER'S INTENT:
${replyContext}

Write a complete, polished email that naturally incorporates the user's intent. Keep it professional but friendly, and under 150 words. Return ONLY the email body, no subject line.`;
        } else if (mode === 'full') {
            userPrompt = `Improve this email draft while keeping the user's intent:

REPLYING TO: ${from}
SUBJECT: ${subject}

USER'S DRAFT:
${replyContext}

Improve grammar, clarity, and tone. Keep it concise. Return ONLY the improved email body.`;
        } else {
            // Auto mode (or 'ai')
            userPrompt = `Write a professional reply to this email:

FROM: ${from}
SUBJECT: ${subject}
CONTENT: ${originalEmail?.slice(0, 2000) || 'No content'}

Write a helpful, appropriate reply. Keep it concise (under 100 words for simple emails). Return ONLY the email body.`;
        }

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
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
