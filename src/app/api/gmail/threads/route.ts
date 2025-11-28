import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { listThreads } from '@/lib/gmail'

export async function GET(request: NextRequest) {
    try {
        // Get session to access user's tokens
        const session = await getServerSession(authOptions)

        if (!session || !session.accessToken) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        // Fetch Gmail threads
        const threads = await listThreads(session.accessToken as string, 20)

        return NextResponse.json({ threads })
    } catch (error: any) {
        console.error('Error in Gmail API route:', error)

        return NextResponse.json(
            { error: error.message || 'Failed to fetch Gmail threads' },
            { status: 500 }
        )
    }
}
