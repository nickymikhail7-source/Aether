import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
    // Debug logging
    console.log('=== POLISH API DEBUG ===');
    console.log('ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('Key starts with:', process.env.ANTHROPIC_API_KEY?.slice(0, 15));

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY is not set!');
        return NextResponse.json(
            { error: 'API key not configured. Please check your environment variables.' },
            { status: 500 }
        );
    }

    try {
        const { rawMessage, recipientName, senderName, isReply } = await request.json();

        console.log('Polish request:', {
            messageLength: rawMessage?.length,
            recipientName,
            isReply
        });

        if (!rawMessage || rawMessage.trim().length === 0) {
            return NextResponse.json(
                { error: 'Message cannot be empty' },
                { status: 400 }
            );
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const prompt = `You are an expert email editor. Polish this draft email to be professional, clear, and effective.

DRAFT: "${rawMessage}"
RECIPIENT: ${recipientName || 'Unknown'}
CONTEXT: ${isReply ? 'Reply to an email' : 'New email'}

INSTRUCTIONS:
1. Fix grammar and spelling
2. Improve flow and clarity
3. Make it sound professional but natural (not overly formal or robotic)
4. Keep the original intent and key information
5. Add proper greeting (Hi/Hello [Name]) if missing
6. Add appropriate sign-off (Best regards, Thanks, etc.) if missing
7. Use proper paragraph breaks for readability
8. Don't use placeholders like [Your Name] - omit signature line

Return ONLY the polished email body text with proper formatting.`;

        console.log('Sending request to Anthropic...');

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const body = response.content[0].type === 'text' ? response.content[0].text : '';

        console.log('Polish successful! Length:', body.length);

        return NextResponse.json({ body });

    } catch (error: any) {
        console.error('=== POLISH ERROR ===');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        console.error('Full error:', JSON.stringify(error, null, 2));

        return NextResponse.json(
            {
                error: 'Failed to polish message',
                details: error.message
            },
            { status: 500 }
        );
    }
}
