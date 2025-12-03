import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { originalEmail, subject, from } = await request.json();

        const prompt = `Generate an appropriate reply to this email.

FROM: ${from}
SUBJECT: ${subject}
EMAIL CONTENT:
${originalEmail?.slice(0, 3000) || 'No content'}

INSTRUCTIONS:
1. Analyze the email type (job application, meeting request, update, question, etc.)
2. Generate a professional, helpful reply
3. Keep it concise (50-100 words for simple acknowledgments, more if needed)
4. Match the appropriate tone (formal for business, friendly for colleagues)
5. Include greeting and sign-off
6. If no response is needed (like a no-reply notification), generate a brief acknowledgment

IMPORTANT:
- Don't include [Your Name] placeholder - end with just "Best," or "Thanks,"
- Be genuine and helpful, not robotic
- If it's an automated notification, keep the reply very brief

Return ONLY the email reply body text, nothing else.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const reply = response.content[0].type === 'text' ? response.content[0].text : '';

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error('Auto-reply error:', error);
        return NextResponse.json(
            { error: 'Failed to generate reply' },
            { status: 500 }
        );
    }
}
