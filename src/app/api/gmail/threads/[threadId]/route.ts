import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getThread } from '@/lib/gmail'

export async function GET(
    request: NextRequest,
    { params }: { params: { threadId: string } }
) {
    try {
        // Get session to access user's tokens
        const session = await getServerSession(authOptions)

        if (!session || !session.accessToken) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        const threadId = params.threadId

        if (!threadId) {
            return NextResponse.json(
                { error: 'Thread ID is required' },
                { status: 400 }
            )
        }

        // Fetch full thread details
        const threadData = await getThread(session.accessToken as string, threadId)

        if (!threadData) {
            return NextResponse.json(
                { error: 'Thread not found' },
                { status: 404 }
            )
        }

        return NextResponse.json(threadData)
    } catch (error: any) {
        console.error('Error in Gmail thread API route:', error)

        return NextResponse.json(
            { error: error.message || 'Failed to fetch thread details' },
            { status: 500 }
        )
    }
}
