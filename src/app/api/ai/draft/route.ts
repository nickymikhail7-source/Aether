import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { generateReplyDraft } from '@/lib/ai'

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session || !session.user?.email) {
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

        const draft = await generateReplyDraft(subject, messages, session.user.email)

        return NextResponse.json({ draft })
    } catch (error: any) {
        console.error('Error in draft API:', error)

        return NextResponse.json(
            { error: error.message || 'Failed to generate draft' },
            { status: 500 }
        )
    }
}
