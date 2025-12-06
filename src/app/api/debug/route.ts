import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    console.log('=== DEBUG ENDPOINT ===');

    // Check environment variables
    const envCheck = {
        NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
        DATABASE_URL: !!process.env.DATABASE_URL,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    };

    console.log('Environment:', envCheck);

    // Check cookies
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map(c => c.name);
    console.log('Cookies present:', cookieNames);

    // Check session
    let sessionInfo = null;
    try {
        const session = await getServerSession(authOptions);
        sessionInfo = session ? {
            exists: true,
            email: session.user?.email,
            hasAccessToken: !!session.accessToken
        } : { exists: false };
    } catch (error) {
        sessionInfo = { error: String(error) };
    }
    console.log('Session:', sessionInfo);

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        environment: envCheck,
        cookies: cookieNames,
        session: sessionInfo,
        recommendation: !envCheck.NEXTAUTH_SECRET
            ? 'Add NEXTAUTH_SECRET to Vercel environment variables'
            : envCheck.NEXTAUTH_URL === 'NOT SET'
                ? 'Add NEXTAUTH_URL=https://aether-inky-sigma.vercel.app to Vercel environment variables'
                : sessionInfo.exists
                    ? 'Session is working!'
                    : 'Session not found - check cookies and try logging out and back in'
    });
}
