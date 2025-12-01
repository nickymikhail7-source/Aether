import { google, gmail_v1 } from 'googleapis'
import { Session } from 'next-auth'

export interface GmailThread {
    id: string
    subject: string
    snippet: string
    participants: string[]
    lastMessageDate: Date
    unread: boolean
    messageCount: number
    lastSender: string
}

// ... (inside parseThread)



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
        priority: 'is:inbox is:unread category:primary',
        gatekeeper: 'is:inbox is:unread -category:primary -category:promotions -category:updates',
        people: 'is:inbox category:primary',
        newsletters: 'is:inbox (category:promotions OR category:updates)',
        notifications: 'is:inbox category:updates',
        sent: 'is:sent',
        drafts: 'is:draft',
        all: 'is:inbox',
    }

    const q = queries[category] || queries.priority

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

    // Get last sender
    const lastSender = getHeader(lastMessage.payload?.headers || [], 'From') || ''

    return {
        id: thread.id,
        subject,
        snippet: thread.snippet || '',
        participants: Array.from(participants),
        lastMessageDate,
        unread,
        messageCount: messages.length,
        lastSender,
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
        from: from, // Return full string so frontend can parse name and email
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
    // Check for HTML part first
    if (payload.parts) {
        // Look for text/html part
        const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
            return {
                body: decodeBase64(htmlPart.body.data),
                isHtml: true
            };
        }

        // Fall back to text/plain
        const textPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
        if (textPart?.body?.data) {
            return {
                body: decodeBase64(textPart.body.data),
                isHtml: false
            };
        }

        // Check nested parts (for multipart/alternative)
        for (const part of payload.parts) {
            if (part.parts) {
                const nested = extractBody(part);
                if (nested.body) return nested;
            }
        }
    }

    // Direct body
    if (payload.body?.data) {
        return {
            body: decodeBase64(payload.body.data),
            isHtml: payload.mimeType === 'text/html'
        };
    }

    return { body: '', isHtml: false };
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

/**
 * Sends an email using the Gmail API
 */
export async function sendEmail(
    client: gmail_v1.Gmail,
    options: {
        to: string;
        subject: string;
        body: string;
        threadId?: string;
        inReplyTo?: string;
        references?: string;
    }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const { to, subject, body, threadId, inReplyTo, references } = options;

        // Build email headers
        const headers = [
            `To: ${to}`,
            `Subject: ${subject}`,
            `Content-Type: text/html; charset=utf-8`,
            `MIME-Version: 1.0`,
        ];

        // Add reply headers if replying to a thread
        if (inReplyTo) {
            headers.push(`In-Reply-To: ${inReplyTo}`);
        }
        if (references) {
            headers.push(`References: ${references}`);
        }

        // Build the email
        const email = [
            ...headers,
            '',
            body
        ].join('\r\n');

        // Encode to base64url
        const encodedEmail = Buffer.from(email)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Send via Gmail API
        const response = await client.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedEmail,
                threadId: threadId, // Keep in same thread
            },
        });

        return {
            success: true,
            messageId: response.data.id || undefined,
        };
    } catch (error: any) {
        console.error('Error sending email:', error);
        return {
            success: false,
            error: error.message || 'Failed to send email',
        };
    }
}

/**
 * Helper to get message headers for reply
 */
export async function getMessageHeaders(
    client: gmail_v1.Gmail,
    messageId: string
): Promise<{ messageId: string; subject: string; from: string } | null> {
    try {
        const response = await client.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'metadata',
            metadataHeaders: ['Message-ID', 'Subject', 'From'],
        });

        const headers = response.data.payload?.headers || [];

        return {
            messageId: headers.find(h => h.name === 'Message-ID')?.value || '',
            subject: headers.find(h => h.name === 'Subject')?.value || '',
            from: headers.find(h => h.name === 'From')?.value || '',
        };
    } catch (error) {
        console.error('Error getting message headers:', error);
        return null;
    }
}
