import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
    // Debug: Log API key status
    console.log('=== AUTO REPLY DEBUG ===');
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('Key starts with:', process.env.ANTHROPIC_API_KEY?.slice(0, 15));

    // Check if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY is not set!');
        return NextResponse.json(
            { error: 'API key not configured. Please contact support.' },
            { status: 500 }
        );
    }

    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const { originalEmail, subject, from } = await request.json();

        console.log('Generating reply for:', { subject, from: from?.slice(0, 30) });

        const prompt = `Generate an appropriate reply to this email.

FROM: ${from}
SUBJECT: ${subject}
EMAIL CONTENT:
${originalEmail?.slice(0, 2000) || 'No content'}

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
            max_tokens: 512,
            messages: [{ role: 'user', content: prompt }],
        });

        const reply = response.content[0].type === 'text' ? response.content[0].text : '';

        console.log('Reply generated successfully, length:', reply.length);

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error('=== AUTO REPLY ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        console.error('Full error:', JSON.stringify(error, null, 2));

        return NextResponse.json(
            {
                error: 'Failed to generate reply',
                details: error.message
            },
            { status: 500 }
        );
    }
}
