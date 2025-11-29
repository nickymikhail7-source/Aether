import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { summarizeThread } from '@/lib/ai'

export async function POST(request: NextRequest) {
    console.log('=== SUMMARIZE API CALLED ===')
    try {
        const session = await getServerSession(authOptions)
        console.log('Session:', session ? 'exists' : 'null')

        if (!session) {
            console.log('No session, returning 401')
            return NextResponse.json(
                { error: 'Unauthorized - Please sign in' },
                { status: 401 }
            )
        }

        const body = await request.json()
        console.log('Request body:', { subject: body.subject, messageCount: body.messages?.length })
        const { subject, messages } = body

        if (!subject || !messages || !Array.isArray(messages)) {
            console.log('Invalid request body, returning 400')
            return NextResponse.json(
                { error: 'Invalid request - subject and messages array required' },
                { status: 400 }
            )
        }

        console.log('Calling summarizeThread...')
        const summary = await summarizeThread(subject, messages)
        console.log('Summary generated successfully')

        return NextResponse.json({ summary })
    } catch (error: any) {
        console.error('!!! ERROR in summarize API !!!')
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
        console.error('Full error:', error)

        return NextResponse.json(
            { error: error.message || 'Failed to generate summary' },
            { status: 500 }
        )
    }
}
