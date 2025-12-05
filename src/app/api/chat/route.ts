import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, conversationId, history } = await req.json();

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Build email context (simplified for now - you can expand this)
        const emailContext = `User has an inbox with various emails. The system can:
- Show inbox summary with stats
- Display specific emails
- Draft replies to emails
- Archive/manage emails
- Search emails`;

        // Build conversation history for Claude
        const conversationHistory = history.slice(-10).map((m: any) => ({
            role: m.role,
            content: m.content
        }));

        // System prompt for Aether
        const systemPrompt = `You are Aether, an AI email assistant. You help users manage their inbox through natural conversation.

${emailContext}

YOUR CAPABILITIES:
1. Summarize inbox status (show stats card)
2. Show specific emails (show email cards)
3. Draft replies (show draft cards)
4. Answer questions about emails
5. Provide helpful suggestions (quick chips)

RESPONSE FORMAT - You MUST respond with valid JSON only:
{
  "content": "Your conversational response text",
  "emailCard": {  // optional - only include when showing an email
    "id": "email_123",
    "sender": "John Doe",
    "senderEmail": "john@example.com",
    "senderInitials": "JD",
    "subject": "Meeting Tomorrow",
    "summary": "John is asking about rescheduling the 3pm meeting",
    "time": "2 hours ago",
    "priority": "urgent"  // or "action" or "info"
  },
  "draftCard": {  // optional - only include when drafting a reply
    "to": "John Doe",
    "toEmail": "john@example.com",
    "subject": "Re: Meeting Tomorrow",
    "body": "Hi John,\\n\\nSure, I can move our meeting to 4pm tomorrow. Does that work for you?\\n\\nBest regards"
  },
  "statsCard": {  // optional - include for inbox summary
    "needsReply": 3,
    "actionItems": 5,
    "fyi": 12
  },
  "chips": ["Show urgent emails", "Draft reply", "Archive this"]  // optional - suggested actions
}

EXAMPLE INTERACTIONS:

User: "What's in my inbox?"
Response: {
  "content": "You have 20 emails in your inbox. Here's the breakdown:",
  "statsCard": {
    "needsReply": 3,
    "actionItems": 5,
    "fyi": 12
  },
  "chips": ["Show emails that need replies", "Show action items", "What's urgent?"]
}

User: "Show me urgent emails"
Response: {
  "content": "Here's an urgent email from John:",
  "emailCard": {
    "id": "123",
    "sender": "John Doe",
    "senderEmail": "john@example.com",
    "senderInitials": "JD",
    "subject": "URGENT: Project Deadline",
    "summary": "John needs your approval on the project proposal by EOD",
    "time": "1 hour ago",
    "priority": "urgent"
  },
  "chips": ["Draft a reply", "Mark as read", "Show next urgent email"]
}

User: "Draft a reply saying I'll review by 5pm"
Response: {
  "content": "I've drafted a professional reply for you:",
  "draftCard": {
    "to": "John Doe",
    "toEmail": "john@example.com",
    "subject": "Re: URGENT: Project Deadline",
    "body": "Hi John,\\n\\nThank you for sending this over. I'll review the project proposal and get back to you with my approval by 5pm today.\\n\\nBest regards"
  },
  "chips": ["Send this", "Edit draft", "Add more details"]
}

SPECIAL COMMAND:
If user sends "__INIT__", generate a friendly welcome message with inbox stats.

GUIDELINES:
- Be concise and helpful
- Always return valid JSON
- Include chips for next logical actions
- Use natural, conversational language in "content"
- Don't make up email data - use placeholders if needed`;

        let response;

        try {
            // Handle special init command
            if (message === '__INIT__') {
                response = {
                    content: "👋 Hi! I'm Aether, your AI email assistant.\n\nI can help you summarize your inbox, draft replies, and manage your emails through simple conversation. What would you like to do?",
                    statsCard: {
                        needsReply: 0,
                        actionItems: 0,
                        fyi: 0
                    },
                    chips: ["Show my inbox", "What needs my attention?", "Help me write an email"]
                };
            } else {
                // Call Claude API
                const claudeResponse = await anthropic.messages.create({
                    model: 'claude-sonnet-4-5-20250929',
                    max_tokens: 2000,
                    system: systemPrompt,
                    messages: [
                        ...conversationHistory,
                        { role: 'user', content: message as string }
                    ]
                });

                const aiText = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : '';

                // Try to parse as JSON
                try {
                    response = JSON.parse(aiText);
                } catch {
                    // Fallback if not JSON
                    response = {
                        content: aiText,
                        chips: ["Tell me more", "Show my emails", "What else can you do?"]
                    };
                }
            }

            // Save conversation to database
            let dbConversationId = conversationId;
            if (!dbConversationId) {
                // Create new conversation
                const newConversation = await prisma.conversation.create({
                    data: {
                        userId: user.id,
                        title: message.substring(0, 50)
                    }
                });
                dbConversationId = newConversation.id;
            }

            // Save user message
            await prisma.message.create({
                data: {
                    conversationId: dbConversationId,
                    role: 'user',
                    content: message
                }
            });

            // Save AI response
            await prisma.message.create({
                data: {
                    conversationId: dbConversationId,
                    role: 'assistant',
                    content: response.content,
                    metadata: {
                        emailCard: response.emailCard,
                        draftCard: response.draftCard,
                        statsCard: response.statsCard,
                        chips: response.chips
                    }
                }
            });

            return NextResponse.json({
                ...response,
                conversationId: dbConversationId
            });

        } catch (error: any) {
            console.error('Claude API error:', error);
            return NextResponse.json({
                content: 'Sorry, I encountered an error. Please try again.',
                chips: ["Try again", "Show my inbox"]
            });
        }

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
