import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { listThreads } from '@/lib/gmail';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
    console.log('=== WELCOME API CALLED ===');

    try {
        // Check cookies
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('__Secure-next-auth.session-token');
        console.log('Session cookie exists:', !!sessionCookie);

        // Try getToken first (more reliable for API routes)
        const token = await getToken({
            req,
            secret: process.env.NEXTAUTH_SECRET
        });
        console.log('Token exists:', !!token, 'Email:', token?.email);

        // Fallback to getServerSession
        const session = await getServerSession(authOptions);
        console.log('Session exists:', !!session, 'Email:', session?.user?.email);

        // Use token first, then session
        const userEmail = (token?.email as string) || session?.user?.email;

        if (!userEmail) {
            console.error('❌ No auth found');
            return NextResponse.json({
                error: 'Unauthorized',
                debug: {
                    tokenExists: !!token,
                    sessionExists: !!session,
                    cookieExists: !!sessionCookie
                }
            }, { status: 401 });
        }

        console.log('✅ User authenticated:', userEmail);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: userEmail }
        });

        if (!user) {
            console.error('❌ User not found:', userEmail);
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Fetch real Gmail data if user has access token
        let recentThreads: any[] = [];

        if (user.gmailAccessToken) {
            try {
                recentThreads = await listThreads(user.gmailAccessToken, 10, 'focus');
                console.log('✅ Fetched', recentThreads.length, 'threads');
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
