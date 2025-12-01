import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createGmailClient, sendEmail, getMessageHeaders } from '@/lib/gmail';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { to, subject, message, threadId, replyToMessageId } = body;

        if (!to || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: to, message' },
                { status: 400 }
            );
        }

        const client = createGmailClient(session.accessToken);

        // If replying, get the original message headers
        let inReplyTo = '';
        let references = '';
        let replySubject = subject;

        if (replyToMessageId) {
            const headers = await getMessageHeaders(client, replyToMessageId);
            if (headers) {
                inReplyTo = headers.messageId;
                references = headers.messageId;
                // Add "Re:" if not already present
                if (!subject && headers.subject) {
                    replySubject = headers.subject.startsWith('Re:')
                        ? headers.subject
                        : `Re: ${headers.subject}`;
                }
            }
        }

        const result = await sendEmail(client, {
            to,
            subject: replySubject || 'No Subject',
            body: message,
            threadId,
            inReplyTo,
            references,
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                messageId: result.messageId,
            });
        } else {
            return NextResponse.json(
                { error: result.error },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('Send email error:', error);
        return NextResponse.json(
            { error: 'Failed to send email' },
            { status: 500 }
        );
    }
}
