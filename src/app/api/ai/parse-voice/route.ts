import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(request: NextRequest) {
    console.log('=== PARSE VOICE API CALLED ===');

    if (!process.env.ANTHROPIC_API_KEY) {
        console.error('ANTHROPIC_API_KEY not set');
        return NextResponse.json(
            { error: 'API key not configured' },
            { status: 500 }
        );
    }

    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const { transcript, existingTo, existingSubject, existingBody } = await request.json();

        if (!transcript?.trim()) {
            return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
        }

        console.log('Parsing transcript:', transcript.slice(0, 100));

        const prompt = `Parse this voice transcript into email components.

VOICE TRANSCRIPT:
"${transcript}"

EXISTING VALUES (if any):
- To: ${existingTo || 'empty'}
- Subject: ${existingSubject || 'empty'}
- Body: ${existingBody || 'empty'}

TASK:
Extract email components from the transcript. Look for patterns like:
- "send to [email/name]" or "email [person]" → extract recipient
- "about [topic]" or "regarding [topic]" → extract subject
- The actual message content → extract body

RULES:
1. If recipient is mentioned (email or name), extract it
2. If topic/subject is mentioned, create a concise subject line
3. The remaining conversational content is the body
4. If existing values are present, append new content appropriately
5. Don't include meta-instructions in the body (e.g., "send an email to...")
6. Clean up the body to be natural email text
7. Add line breaks for readability

Return ONLY valid JSON (no markdown, no code blocks):
{
  "to": {
    "detected": true/false,
    "email": "email@domain.com or null",
    "name": "Person Name or null"
  },
  "subject": {
    "detected": true/false,
    "text": "Subject line or null"
  },
  "body": {
    "detected": true/false,
    "text": "Email body content"
  }
}

EXAMPLES:

Input: "Send an email to john@company.com about the meeting tomorrow. Hey John, can we reschedule our 3pm meeting to 4pm?"
Output: {"to": {"detected": true, "email": "john@company.com", "name": "John"}, "subject": {"detected": true, "text": "Meeting Tomorrow - Reschedule Request"}, "body": {"detected": true, "text": "Hey John,\\n\\nCan we reschedule our 3pm meeting to 4pm?\\n\\nThanks"}}

Input: "Hey Sarah, hope you're doing well. Just wanted to follow up on our conversation last week."
Output: {"to": {"detected": false, "email": null, "name": "Sarah"}, "subject": {"detected": true, "text": "Following Up"}, "body": {"detected": true, "text": "Hey Sarah,\\n\\nHope you're doing well. Just wanted to follow up on our conversation last week."}}

Input: "about the quarterly report. Please find attached the Q3 numbers."
Output: {"to": {"detected": false, "email": null, "name": null}, "subject": {"detected": true, "text": "Quarterly Report"}, "body": {"detected": true, "text": "Please find attached the Q3 numbers."}}`;

        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '';

        console.log('AI Response:', text);

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.log('No JSON found, using fallback');
            // Fallback: treat entire transcript as body
            return NextResponse.json({
                to: { detected: false, email: null, name: null },
                subject: { detected: false, text: null },
                body: { detected: true, text: transcript }
            });
        }

        const result = JSON.parse(jsonMatch[0]);
        console.log('Parsed successfully:', result);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('=== PARSE VOICE ERROR ===');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);

        return NextResponse.json(
            { error: 'Failed to parse voice input', details: error.message },
            { status: 500 }
        );
    }
}
