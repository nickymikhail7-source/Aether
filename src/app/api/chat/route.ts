import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { listThreads, getThread } from '@/lib/gmail';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    console.log('=== CHAT API CALLED ===');
    console.log('Timestamp:', new Date().toISOString());

    try {
        // Log environment variables (safe subset)
        console.log('Environment check:');
        console.log('- ANTHROPIC_API_KEY exists:', !!process.env.ANTHROPIC_API_KEY);
        console.log('- ANTHROPIC_API_KEY prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 15) + '...');
        console.log('- DATABASE_URL exists:', !!process.env.DATABASE_URL);

        const session = await getServerSession(authOptions);
        console.log('Session check:');
        console.log('- Session exists:', !!session);
        console.log('- User email:', session?.user?.email);

        if (!session?.user?.email) {
            console.error('❌ No session found');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { message, conversationId, history } = await req.json();
        console.log('Request data:');
        console.log('- Message:', message);
        console.log('- ConversationId:', conversationId);
        console.log('- History length:', history?.length || 0);

        // Get user from database
        console.log('Fetching user from database...');
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            console.error('❌ User not found in database:', session.user.email);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        console.log('✅ User found:', user.id);
        console.log('- Gmail token exists:', !!user.gmailAccessToken);

        // Fetch real Gmail data if user has access token
        let emailContext = 'No emails available yet.';
        let recentThreads: any[] = [];

        if (user.gmailAccessToken) {
            console.log('Fetching Gmail threads...');
            try {
                recentThreads = await listThreads(user.gmailAccessToken, 10, 'focus');
                console.log('✅ Gmail threads fetched:', recentThreads.length);

                // Build email context with real data
                emailContext = `Recent emails (${recentThreads.length} threads):
${recentThreads.map((thread, idx) => `
${idx + 1}. From: ${thread.lastSender}
   Subject: ${thread.subject}
   Snippet: ${thread.snippet}
   Unread: ${thread.unread}
   Messages: ${thread.messageCount}
`).join('\n')}`;
            } catch (error) {
                console.error('❌ Failed to fetch Gmail data:', error);
                emailContext = 'Unable to fetch emails at the moment.';
            }
        } else {
            console.warn('⚠️ No Gmail access token for user');
        }

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
            console.log('[Chat API] Processing message:', message);

            // Handle special init command
            if (message === '__INIT__') {
                const unreadCount = recentThreads.filter(t => t.unread).length;
                const totalCount = recentThreads.length;

                response = {
                    content: `👋 Hi! I'm Aether, your AI email assistant.\n\nYou have **${totalCount} recent emails** (${unreadCount} unread). I can help you summarize your inbox, draft replies, and manage your emails through simple conversation.\n\nWhat would you like to do?`,
                    statsCard: {
                        needsReply: unreadCount,
                        actionItems: recentThreads.filter(t => t.messageCount > 1).length,
                        fyi: totalCount - unreadCount
                    },
                    chips: ["Show urgent emails", "What needs my attention?", "Help me write an email"]
                };

                console.log('[Chat API] Returning INIT response');
            } else {
                console.log('[Chat API] Calling Claude API...');

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
                console.log('[Chat API] Claude response received, length:', aiText.length);

                // Try to parse as JSON
                try {
                    response = JSON.parse(aiText);
                    console.log('[Chat API] Successfully parsed JSON response');
                } catch (parseError) {
                    console.log('[Chat API] Failed to parse JSON, using fallback');
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
                console.log('[Chat API] Creating new conversation');
                // Create new conversation
                const newConversation = await prisma.conversation.create({
                    data: {
                        userId: user.id,
                        title: message.substring(0, 50)
                    }
                });
                dbConversationId = newConversation.id;
            }

            // Save user message (skip for __INIT__)
            if (message !== '__INIT__') {
                await prisma.message.create({
                    data: {
                        conversationId: dbConversationId,
                        role: 'user',
                        content: message
                    }
                });
            }

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

            console.log('[Chat API] Successfully saved to database');

            return NextResponse.json({
                ...response,
                conversationId: dbConversationId
            });

        } catch (error: any) {
            console.error('[Chat API] Error:', error);
            console.error('[Chat API] Error name:', error.name);
            console.error('[Chat API] Error message:', error.message);
            console.error('[Chat API] Error stack:', error.stack);

            return NextResponse.json({
                content: 'Sorry, I encountered an error. Please try again.',
                chips: ["Try again", "Show my inbox"],
                error: error.message // Include for debugging
            });
        }

    } catch (error: any) {
        console.error('[Chat API] Outer error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error.message
            },
            { status: 500 }
        );
    }
}
