import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { summarizeThread } from '@/lib/ai'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        const body = await request.json()
        const { subject, messages } = body

        if (!subject || !messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Invalid request - subject and messages array required' },
                { status: 400 }
            )
        }

        const summary = await summarizeThread(subject, messages)

        return NextResponse.json({ summary })
    } catch (error: any) {
        console.error('Error in summarize API:', error)

        return NextResponse.json(
            { error: error.message || 'Failed to generate summary' },
            { status: 500 }
        )
    }
}
