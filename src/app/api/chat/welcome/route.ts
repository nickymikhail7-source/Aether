import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { listThreads } from '@/lib/gmail';

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Fetch real Gmail data if user has access token
        let recentThreads: any[] = [];

        if (user.gmailAccessToken) {
            try {
                recentThreads = await listThreads(user.gmailAccessToken, 10, 'focus');
            } catch (error) {
                console.error('[Welcome API] Failed to fetch Gmail data:', error);
            }
        }

        const unreadCount = recentThreads.filter(t => t.unread).length;
        const totalCount = recentThreads.length;

        return NextResponse.json({
            content: `👋 Hi! I'm Aether, your AI email assistant.\n\nYou have **${totalCount} recent emails** (${unreadCount} unread). I can help you summarize your inbox, draft replies, and manage your emails through simple conversation.\n\nWhat would you like to do?`,
            statsCard: {
                needsReply: unreadCount,
                actionItems: recentThreads.filter(t => t.messageCount > 1).length,
                fyi: totalCount - unreadCount
            },
            chips: ["Show urgent emails", "What needs my attention?", "Help me write an email"]
        });

    } catch (error) {
        console.error('[Welcome API] Error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
