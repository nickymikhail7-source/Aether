import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { listThreads } from '@/lib/gmail'

export async function GET(request: NextRequest) {
    try {
        // Get session to access user's tokens
        const session = await getServerSession(authOptions)

        console.log('Session:', session ? 'exists' : 'null')
        console.log('Access token:', session?.accessToken ? 'exists' : 'missing')

        if (!session || !session.accessToken) {
            console.error('No session or access token')
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        console.log('Fetching Gmail threads...')
        // Fetch Gmail threads
        const threads = await listThreads(session.accessToken as string, 20)

        console.log('Threads fetched:', threads.length)
        return NextResponse.json({ threads })
    } catch (error: any) {
        console.error('Error in Gmail API route:', error)
        console.error('Error details:', error.message, error.stack)

        return NextResponse.json(
            { error: error.message || 'Failed to fetch Gmail threads' },
            { status: 500 }
        )
    }
}
