import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { emailContent, subject, from, to, date } = await request.json();

    if (!emailContent && !subject) {
      return NextResponse.json({
        intent: 'fyi_informational',
        summary: subject || 'No content to analyze',
        keyPoints: [],
        action: { required: false, type: 'none', description: '' },
      });
    }

    const prompt = `Analyze this email and extract key information. Be concise.

FROM: ${from}
SUBJECT: ${subject}
DATE: ${date}
CONTENT: ${emailContent?.slice(0, 3000) || 'No content'}

Return ONLY valid JSON:
{
  "intent": "meeting_request" | "payment_required" | "action_required" | "reply_needed" | "fyi_informational" | "promotional" | "transactional" | "personal",
  "summary": "2-3 sentence summary",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "action": {
    "required": true/false,
    "type": "respond" | "schedule" | "pay" | "review" | "none",
    "description": "what action is needed",
    "options": ["Accept", "Decline"] // optional
  },
  "deadline": {
    "exists": true/false,
    "description": "by Friday" or null,
    "isUrgent": true/false
  }
}`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('AI Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze email' },
      { status: 500 }
    );
  }
}
