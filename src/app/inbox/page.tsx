'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface GmailThread {
    id: string
    subject: string
    snippet: string
    participants: string[]
    lastMessageDate: string
    unread: boolean
    messageCount: number
}

interface GmailMessage {
    id: string
    threadId: string
    from: string
    to: string[]
    subject: string
    date: string
    body: string
    isHtml: boolean
}

interface ThreadDetail {
    thread: GmailThread
    messages: GmailMessage[]
}

interface ActionItem {
    task: string
    dueDate?: string
    completed: boolean
}

export default function InboxPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [threads, setThreads] = useState<GmailThread[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null)
    const [loadingThread, setLoadingThread] = useState(false)
    const [aiSummary, setAiSummary] = useState<string | null>(null)
    const [actionItems, setActionItems] = useState<ActionItem[]>([])
    const [loadingAI, setLoadingAI] = useState(false)
    const [loadingDraft, setLoadingDraft] = useState(false)
    const [replyText, setReplyText] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messageContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (status === 'unauthenticated' || session?.error === "RefreshAccessTokenError") {
            if (session?.error === "RefreshAccessTokenError") {
                signIn('google')
            } else {
                router.push('/')
            }
            return
        }

        if (status === 'authenticated') {
            fetchThreads()
        }
    }, [status, router])

    useEffect(() => {
        if (selectedThreadId) {
            fetchThreadDetail(selectedThreadId)
        }
    }, [selectedThreadId])

    useEffect(() => {
        // Scroll to bottom when thread loads
        if (threadDetail) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [threadDetail])

    // Scroll to top when AI summary is generated
    useEffect(() => {
        if (aiSummary && messageContainerRef.current) {
            messageContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }, [aiSummary])

    async function fetchThreads() {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch('/api/gmail/threads')

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch emails')
            }

            const data = await response.json()
            setThreads(data.threads || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function fetchThreadDetail(threadId: string) {
        try {
            setLoadingThread(true)
            setThreadDetail(null)
            setAiSummary(null)
            setActionItems([])
            setReplyText('')

            const response = await fetch(`/api/gmail/threads/${threadId}`)

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch thread')
            }

            const data = await response.json()
            setThreadDetail(data)
        } catch (err: any) {
            console.error('Error fetching thread:', err)
        } finally {
            setLoadingThread(false)
        }
    }

    async function summarizeWithAI() {
        if (!threadDetail) return

        try {
            setLoadingAI(true)
            const response = await fetch('/api/ai/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: threadDetail.thread.subject,
                    messages: threadDetail.messages.map(m => ({
                        from: m.from,
                        body: m.isHtml ? stripHtml(m.body) : m.body,
                        date: m.date,
                    })),
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setAiSummary(data.summary)

                // Also fetch action items
                const actionsResponse = await fetch('/api/ai/actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        subject: threadDetail.thread.subject,
                        messages: threadDetail.messages.map(m => ({
                            from: m.from,
                            body: m.isHtml ? stripHtml(m.body) : m.body,
                            date: m.date,
                        })),
                    }),
                })

                if (actionsResponse.ok) {
                    const actionsData = await actionsResponse.json()
                    setActionItems(actionsData.actionItems || [])
                }
            }
        } catch (error) {
            console.error('Error summarizing:', error)
        } finally {
            setLoadingAI(false)
        }
    }

    async function generateDraft() {
        if (!threadDetail) return

        try {
            setLoadingDraft(true)
            const response = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: threadDetail.thread.subject,
                    messages: threadDetail.messages.map(m => ({
                        from: m.from,
                        body: m.isHtml ? stripHtml(m.body) : m.body,
                        date: m.date,
                    })),
                }),
            })

            if (response.ok) {
                const data = await response.json()
                setReplyText(data.draft)
            }
        } catch (error) {
            console.error('Error generating draft:', error)
        } finally {
            setLoadingDraft(false)
        }
    }

    function toggleActionItem(index: number) {
        setActionItems(items =>
            items.map((item, i) =>
                i === index ? { ...item, completed: !item.completed } : item
            )
        )
    }

    function formatDate(dateStr: string): string {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Just now'
        if (diffMins < 60) return `${diffMins}m ago`
        if (diffHours < 24) return `${diffHours}h ago`
        if (diffDays < 7) return `${diffDays}d ago`

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    function formatMessageDate(dateStr: string): string {
        const date = new Date(dateStr)
        const now = new Date()
        const isToday = date.toDateString() === now.toDateString()

        if (isToday) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        })
    }

    function getInitials(email: string): string {
        const name = email.split('@')[0]
        return name.substring(0, 2).toUpperCase()
    }

    function getPrimaryParticipant(participants: string[]): string {
        const others = participants.filter(p => p !== session?.user?.email)
        return others[0] || participants[0] || 'Unknown'
    }

    function isMyMessage(from: string): boolean {
        return from.toLowerCase().includes(session?.user?.email?.toLowerCase() || '')
    }

    function stripHtml(html: string): string {
        // Basic HTML stripping for preview (production would use DOMPurify)
        return html
            .replace(/<style[^>]*>.*?<\/style>/gi, '')
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim()
    }

    const priorityThreads = threads.filter(t => t.unread).slice(0, 5)
    const recentThreads = threads.filter(t => !t.unread).slice(0, 15)

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-text-secondary">Loading...</div>
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <div className="w-[300px] bg-surface border-r border-border flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-border">
                    <Link href="/" className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center">
                            <span className="text-white text-lg font-bold">A</span>
                        </div>
                        <span className="text-text-primary font-semibold text-lg">Aether</span>
                    </Link>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-4 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="flex items-start space-x-3 p-3">
                                        <div className="w-10 h-10 bg-surface-hover rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-surface-hover rounded w-3/4" />
                                            <div className="h-3 bg-surface-hover rounded w-full" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-4">
                            <div className="bg-red/10 border border-red/20 rounded-lg p-4">
                                <p className="text-red text-sm font-medium">Error loading emails</p>
                                <p className="text-red/70 text-xs mt-1">{error}</p>
                                <button
                                    onClick={fetchThreads}
                                    className="mt-3 text-xs text-accent hover:underline"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-text-muted text-sm">No emails found</p>
                        </div>
                    ) : (
                        <>
                            {priorityThreads.length > 0 && (
                                <div className="mt-4">
                                    <div className="px-4 py-2">
                                        <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                            Priority
                                        </h2>
                                    </div>
                                    <div className="space-y-0.5">
                                        {priorityThreads.map((thread) => (
                                            <button
                                                key={thread.id}
                                                onClick={() => setSelectedThreadId(thread.id)}
                                                className={`w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors ${selectedThreadId === thread.id ? 'bg-surface-hover' : ''
                                                    }`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-accent text-xs font-medium">
                                                            {getInitials(getPrimaryParticipant(thread.participants))}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-text-primary text-sm font-medium truncate">
                                                                {getPrimaryParticipant(thread.participants).split('@')[0]}
                                                            </span>
                                                            <span className="text-text-muted text-xs flex-shrink-0 ml-2">
                                                                {formatDate(thread.lastMessageDate)}
                                                            </span>
                                                        </div>
                                                        <p className="text-text-primary text-sm font-medium truncate mb-0.5">
                                                            {thread.subject}
                                                        </p>
                                                        <p className="text-text-secondary text-xs truncate">
                                                            {thread.snippet}
                                                        </p>
                                                    </div>
                                                    {thread.unread && (
                                                        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {recentThreads.length > 0 && (
                                <div className="mt-6">
                                    <div className="px-4 py-2">
                                        <h2 className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
                                            Recent
                                        </h2>
                                    </div>
                                    <div className="space-y-0.5">
                                        {recentThreads.map((thread) => (
                                            <button
                                                key={thread.id}
                                                onClick={() => setSelectedThreadId(thread.id)}
                                                className={`w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors ${selectedThreadId === thread.id ? 'bg-surface-hover' : ''
                                                    }`}
                                            >
                                                <div className="flex items-start space-x-3">
                                                    <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-text-muted text-xs font-medium">
                                                            {getInitials(getPrimaryParticipant(thread.participants))}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-text-secondary text-sm truncate">
                                                                {getPrimaryParticipant(thread.participants).split('@')[0]}
                                                            </span>
                                                            <span className="text-text-muted text-xs flex-shrink-0 ml-2">
                                                                {formatDate(thread.lastMessageDate)}
                                                            </span>
                                                        </div>
                                                        <p className="text-text-secondary text-sm truncate mb-0.5">
                                                            {thread.subject}
                                                        </p>
                                                        <p className="text-text-muted text-xs truncate">
                                                            {thread.snippet}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {selectedThreadId && threadDetail ? (
                    <>
                        {/* Conversation Header */}
                        <div className="border-b border-border bg-surface p-6">
                            <div className="flex items-start justify-between mb-2">
                                <h1 className="text-text-primary text-2xl font-bold">
                                    {threadDetail.thread.subject}
                                </h1>
                                <button
                                    onClick={summarizeWithAI}
                                    disabled={loadingAI}
                                    className="px-4 py-2 bg-purple hover:bg-purple/90 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-2"
                                >
                                    {loadingAI ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Analyzing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            <span>Summarize with AI</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-text-secondary">
                                <span>{threadDetail.thread.participants.length} participants</span>
                                <span>•</span>
                                <span>{threadDetail.messages.length} messages</span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* AI Summary Card */}
                            {aiSummary && (
                                <div className="bg-purple/10 border border-purple/20 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <h3 className="text-purple font-semibold">AI Summary</h3>
                                    </div>
                                    <p className="text-text-primary text-sm leading-relaxed">
                                        {aiSummary}
                                    </p>
                                </div>
                            )}

                            {/* Action Items Card */}
                            {actionItems.length > 0 && (
                                <div className="bg-amber/10 border border-amber/20 rounded-xl p-4 space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        <h3 className="text-amber font-semibold">Action Items</h3>
                                    </div>
                                    <div className="space-y-2">
                                        {actionItems.map((item, index) => (
                                            <label key={index} className="flex items-start space-x-3 cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={item.completed}
                                                    onChange={() => toggleActionItem(index)}
                                                    className="mt-0.5 w-4 h-4 rounded border-amber/40 text-amber focus:ring-amber focus:ring-offset-0"
                                                />
                                                <div className="flex-1">
                                                    <p className={`text-sm ${item.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                                                        {item.task}
                                                    </p>
                                                    {item.dueDate && (
                                                        <p className="text-xs text-amber/70 mt-0.5">
                                                            Due: {item.dueDate}
                                                        </p>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {threadDetail.messages.map((message, index) => {
                                const isMe = isMyMessage(message.from)

                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`flex items-start space-x-3 max-w-2xl ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                            {/* Avatar */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isMe ? 'bg-accent/20' : 'bg-border'
                                                }`}>
                                                <span className={`text-xs font-medium ${isMe ? 'text-accent' : 'text-text-muted'
                                                    }`}>
                                                    {getInitials(message.from)}
                                                </span>
                                            </div>

                                            {/* Message Bubble */}
                                            <div>
                                                <div className={`flex items-center space-x-2 mb-1 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                                    <span className="text-text-primary text-sm font-medium">
                                                        {message.from}
                                                    </span>
                                                    <span className="text-text-muted text-xs">
                                                        {formatMessageDate(message.date)}
                                                    </span>
                                                </div>

                                                <div className={`rounded-2xl px-4 py-3 ${isMe
                                                    ? 'bg-accent text-white'
                                                    : 'bg-surface border border-border text-text-primary'
                                                    }`}>
                                                    <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                                                        {message.isHtml ? stripHtml(message.body) : message.body}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply Input */}
                        <div className="border-t border-border bg-surface p-4">
                            <div className="flex items-start space-x-3 mb-3">
                                <button
                                    onClick={generateDraft}
                                    disabled={loadingDraft}
                                    className="px-4 py-2 bg-surface-hover hover:bg-border text-text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center space-x-2 border border-border"
                                >
                                    {loadingDraft ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-text-muted/30 border-t-text-muted rounded-full animate-spin" />
                                            <span>Generating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            <span>Draft with AI</span>
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="flex items-end space-x-3">
                                <div className="flex-1 bg-background border border-border rounded-2xl px-4 py-3 focus-within:border-accent transition-colors">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        placeholder="Type a message..."
                                        className="w-full bg-transparent text-text-primary placeholder-text-muted outline-none text-sm"
                                    />
                                </div>

                                <button
                                    className="w-10 h-10 rounded-full bg-accent hover:bg-blue-600 flex items-center justify-center transition-colors flex-shrink-0"
                                    title="Voice input"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                    </svg>
                                </button>

                                <button
                                    className="px-6 py-2.5 bg-accent hover:bg-blue-600 text-white rounded-full font-medium text-sm transition-colors flex-shrink-0"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </>
                ) : selectedThreadId && loadingThread ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-border border-t-accent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-text-secondary text-sm">Loading conversation...</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center px-6">
                            <div className="w-16 h-16 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                                <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h2 className="text-text-primary text-xl font-semibold mb-2">
                                Select a conversation
                            </h2>
                            <p className="text-text-secondary text-sm max-w-sm">
                                Choose a conversation from the sidebar to view your email thread
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
