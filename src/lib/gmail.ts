import { google } from 'googleapis'
import { Session } from 'next-auth'

export interface GmailThread {
    id: string
    subject: string
    snippet: string
    participants: string[]
    lastMessageDate: Date
    unread: boolean
    messageCount: number
}

export interface GmailMessage {
    id: string
    threadId: string
    from: string
    to: string[]
    subject: string
    date: Date
    body: string
    isHtml: boolean
}

/**
 * Creates a Gmail API client using the user's access token
 */
export function createGmailClient(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })

    return google.gmail({ version: 'v1', auth: oauth2Client })
}

/**
 * Fetches recent Gmail threads (conversations)
 */
export async function listThreads(
    accessToken: string,
    maxResults: number = 20,
    category: string = 'focus'
): Promise<GmailThread[]> {
    const gmail = createGmailClient(accessToken)

    // Map categories to Gmail search queries
    const queries: Record<string, string> = {
        focus: 'is:inbox is:unread category:primary',
        people: 'is:inbox category:primary',
        newsletters: 'is:inbox (category:promotions OR category:updates)',
        notifications: 'is:inbox category:updates',
        sent: 'is:sent',
        drafts: 'is:draft',
    }

    const q = queries[category] || queries.focus

    try {
        // Get list of thread IDs
        const response = await gmail.users.threads.list({
            userId: 'me',
            maxResults,
            q,
        })

        if (!response.data.threads) {
            return []
        }

        // Fetch full details for each thread
        const threads = await Promise.all(
            response.data.threads.map(async (thread) => {
                const fullThread = await gmail.users.threads.get({
                    userId: 'me',
                    id: thread.id!,
                    format: 'metadata',
                    metadataHeaders: ['From', 'To', 'Subject', 'Date'],
                })

                return parseThread(fullThread.data)
            })
        )

        return threads.filter((t): t is GmailThread => t !== null)
    } catch (error: any) {
        console.error('Error fetching Gmail threads:', error)
        throw new Error(error.message || 'Failed to fetch Gmail threads')
    }
}

/**
 * Parses a Gmail thread response into our Thread interface
 */
function parseThread(thread: any): GmailThread | null {
    if (!thread.messages || thread.messages.length === 0) {
        return null
    }

    const messages = thread.messages
    const lastMessage = messages[messages.length - 1]
    const firstMessage = messages[0]

    // Extract headers from the first message for subject
    const headers = firstMessage.payload?.headers || []
    const subject = getHeader(headers, 'Subject') || '(No Subject)'

    // Get all unique participants
    const participants = new Set<string>()
    messages.forEach((msg: any) => {
        const msgHeaders = msg.payload?.headers || []
        const from = getHeader(msgHeaders, 'From')
        const to = getHeader(msgHeaders, 'To')

        if (from) participants.add(extractEmail(from))
        if (to) {
            to.split(',').forEach((email) => participants.add(extractEmail(email.trim())))
        }
    })

    // Check if unread
    const unread = lastMessage.labelIds?.includes('UNREAD') || false

    // Get date from last message
    const dateHeader = getHeader(lastMessage.payload?.headers || [], 'Date')
    const lastMessageDate = dateHeader ? new Date(dateHeader) : new Date()

    return {
        id: thread.id,
        subject,
        snippet: thread.snippet || '',
        participants: Array.from(participants),
        lastMessageDate,
        unread,
        messageCount: messages.length,
    }
}

/**
 * Gets a specific thread with full message details
 */
export async function getThread(
    accessToken: string,
    threadId: string
): Promise<{ thread: GmailThread; messages: GmailMessage[] } | null> {
    const gmail = createGmailClient(accessToken)

    try {
        const response = await gmail.users.threads.get({
            userId: 'me',
            id: threadId,
            format: 'full',
        })

        const thread = parseThread(response.data)
        if (!thread) return null

        const messages = response.data.messages?.map((msg) => parseMessage(msg)) || []

        return {
            thread,
            messages: messages.filter((m): m is GmailMessage => m !== null),
        }
    } catch (error) {
        console.error('Error fetching thread:', error)
        return null
    }
}

/**
 * Parses a Gmail message into our Message interface
 */
function parseMessage(message: any): GmailMessage | null {
    if (!message.payload) return null

    const headers = message.payload.headers || []
    const from = getHeader(headers, 'From') || ''
    const to = getHeader(headers, 'To') || ''
    const subject = getHeader(headers, 'Subject') || '(No Subject)'
    const dateStr = getHeader(headers, 'Date') || ''

    // Extract body content
    const { body, isHtml } = extractBody(message.payload)

    return {
        id: message.id,
        threadId: message.threadId,
        from: extractName(from) || extractEmail(from),
        to: to.split(',').map((email) => email.trim()),
        subject,
        date: dateStr ? new Date(dateStr) : new Date(),
        body,
        isHtml,
    }
}

/**
 * Extracts email body from message payload
 */
function extractBody(payload: any): { body: string; isHtml: boolean } {
    let body = ''
    let isHtml = false

    // Check for direct body
    if (payload.body?.data) {
        body = decodeBase64(payload.body.data)
        isHtml = payload.mimeType === 'text/html'
        return { body, isHtml }
    }

    // Check parts for multipart messages
    if (payload.parts) {
        // Prefer text/plain, fallback to text/html
        const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
        const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')

        if (textPart?.body?.data) {
            body = decodeBase64(textPart.body.data)
            isHtml = false
        } else if (htmlPart?.body?.data) {
            body = decodeBase64(htmlPart.body.data)
            isHtml = true
        }
    }

    return { body, isHtml }
}

/**
 * Helper to get header value by name
 */
function getHeader(headers: any[], name: string): string | null {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase())
    return header?.value || null
}

/**
 * Extracts email address from "Name <email@example.com>" format
 */
function extractEmail(emailStr: string): string {
    const match = emailStr.match(/<(.+?)>/)
    return match ? match[1] : emailStr.trim()
}

/**
 * Extracts name from "Name <email@example.com>" format
 */
function extractName(emailStr: string): string | null {
    const match = emailStr.match(/^(.+?)\s*</)
    return match ? match[1].trim().replace(/"/g, '') : null
}

/**
 * Decodes base64url encoded string
 */
function decodeBase64(data: string): string {
    // Replace URL-safe characters
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/')

    // Decode from base64
    return Buffer.from(base64, 'base64').toString('utf-8')
}
