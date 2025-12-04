import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
    try {
        const { intent, tone, existingRecipient } = await request.json();

        const toneGuide: Record<string, string> = {
            professional: 'Professional but warm. Clear and direct. Business appropriate.',
            friendly: 'Casual and warm. Conversational like messaging a colleague.',
            formal: 'Formal and polished. Traditional business letter style.',
        };

        const prompt = `You are an expert email composer. Generate an email based on the user's intent.

USER'S INTENT: "${intent}"

TONE: ${toneGuide[tone] || toneGuide.professional}

${existingRecipient ? `KNOWN RECIPIENT: ${existingRecipient.name} <${existingRecipient.email}>` : 'RECIPIENT: Extract from intent if mentioned, otherwise set to null.'}

Analyze the intent and generate:
1. Recipient (if mentioned: "email Sarah", "send to John", "message the team")
2. A clear, concise subject line
3. A well-structured email body

Return ONLY this JSON structure:
{
  "recipient": {
    "name": "Recipient Name",
    "email": "email@domain.com"
  },
  "subject": "Clear Subject Line",
  "body": "Full email with greeting, body paragraphs, and sign-off"
}

If recipient is unclear, set recipient to null.
If only a name is mentioned (e.g., "Sarah at Sequoia"), create placeholder: sarah@sequoia.com

Guidelines:
- Keep emails concise (80-150 words unless complex topic)
- Match greeting to relationship (Hi/Hello/Dear)
- Include clear call-to-action when relevant
- Professional sign-off (Best, Thanks, Regards)
- Never use placeholder text like [Your Name] - leave signature minimal

Return ONLY valid JSON, no other text.`;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            throw new Error('No valid JSON in response');
        }

        const result = JSON.parse(jsonMatch[0]);
        return NextResponse.json(result);

    } catch (error: any) {
        console.error('Compose error:', error);
        return NextResponse.json(
            { error: 'Failed to generate email', details: error.message },
            { status: 500 }
        );
    }
}
