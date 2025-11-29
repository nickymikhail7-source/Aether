import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface ActionItem {
    task: string
    dueDate?: string
    completed: boolean
}

/**
 * Summarizes an email thread using Claude AI
 */
export async function summarizeThread(
    subject: string,
    messages: Array<{ from: string; body: string; date: string }>
): Promise<string> {
    try {
        const threadContext = messages
            .map((msg) => `From: ${msg.from}\nDate: ${msg.date}\n${msg.body}`)
            .join('\n\n---\n\n')

        const prompt = `You are an AI assistant helping to summarize email threads. 

Subject: ${subject}

Thread:
${threadContext}

Provide a concise 2-3 sentence summary of this email thread. Focus on the main topic, key points, and current status. Be clear and actionable.`

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 200,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        })

        const textContent = message.content.find((block) => block.type === 'text')
        return textContent && 'text' in textContent ? textContent.text : 'Unable to generate summary'
    } catch (error: any) {
        console.error('Error summarizing thread:', error)
        console.error('Error message:', error.message)
        console.error('Error status:', error.status)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error // Throw the original error, not a generic one
    }
}

/**
 * Extracts action items from an email thread using Claude AI
 */
export async function extractActionItems(
    subject: string,
    messages: Array<{ from: string; body: string; date: string }>
): Promise<ActionItem[]> {
    try {
        const threadContext = messages
            .map((msg) => `From: ${msg.from}\nDate: ${msg.date}\n${msg.body}`)
            .join('\n\n---\n\n')

        const prompt = `You are an AI assistant helping to extract action items from email threads.

Subject: ${subject}

Thread:
${threadContext}

Extract all action items, tasks, or to-dos mentioned in this email thread. For each item, identify:
1. The task description
2. Any mentioned due date or deadline (if present)

Return ONLY a JSON array in this exact format, with no additional text:
[
  {"task": "Task description", "dueDate": "YYYY-MM-DD or descriptive date"},
  {"task": "Another task", "dueDate": null}
]

If no action items are found, return an empty array: []`

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 500,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        })

        const textContent = message.content.find((block) => block.type === 'text')
        const responseText = textContent && 'text' in textContent ? textContent.text : '[]'

        // Parse JSON response
        try {
            const items = JSON.parse(responseText)
            return items.map((item: any) => ({
                task: item.task,
                dueDate: item.dueDate || undefined,
                completed: false,
            }))
        } catch (parseError) {
            console.error('Error parsing action items JSON:', parseError)
            return []
        }
    } catch (error) {
        console.error('Error extracting action items:', error)
        throw new Error('Failed to extract action items')
    }
}

/**
 * Generates a smart reply draft using Claude AI
 */
export async function generateReplyDraft(
    subject: string,
    messages: Array<{ from: string; body: string; date: string }>,
    userEmail: string
): Promise<string> {
    try {
        const threadContext = messages
            .map((msg) => `From: ${msg.from}\nDate: ${msg.date}\n${msg.body}`)
            .join('\n\n---\n\n')

        const lastMessage = messages[messages.length - 1]

        const prompt = `You are an AI assistant helping to draft email replies.

Your email: ${userEmail}
Subject: ${subject}

Email thread:
${threadContext}

Generate a professional, contextual reply to the most recent message from ${lastMessage.from}. The reply should:
- Be concise and friendly
- Address the main points from their message
- Be appropriate for a professional email
- NOT include "Subject:" line or email signature
- Be ready to send as-is

Generate only the email body text, nothing else.`

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 400,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        })

        const textContent = message.content.find((block) => block.type === 'text')
        return textContent && 'text' in textContent ? textContent.text : 'Unable to generate draft'
    } catch (error) {
        console.error('Error generating reply draft:', error)
        throw new Error('Failed to generate reply draft')
    }
}
