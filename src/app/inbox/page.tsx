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
    const [selectedCategory, setSelectedCategory] = useState('priority')
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
    }, [status, router, selectedCategory])

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

            setError(null)

            const response = await fetch(`/api/gmail/threads?category=${selectedCategory}`)

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

    function cleanEmailContent(body: string): string {
        return body
            // Remove quoted reply lines (starting with >)
            .replace(/^>.*$/gm, '')
            // Remove multiple blank lines
            .replace(/\n{3,}/g, '\n\n')
            // Convert HTML entities
            .replace(/&#8208;/g, '-')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            // Remove raw URLs in angle brackets
            .replace(/<https?:\/\/[^>]+>/g, '')
            // Trim whitespace
            .trim();
    }

    function isCalendarInvite(subject: string, body: string): boolean {
        return body.includes('calendar.google.com/calendar/event') ||
            (body.includes('Yes') && body.includes('No') && body.includes('Maybe') && body.includes('invitation'));
    }

    function extractEventDetails(subject: string, body: string) {
        // Simple extraction logic
        const title = subject.replace(/^Invitation: /, '').replace(/^Updated invitation: /, '');
        // Try to find date/time patterns if possible, otherwise generic
        const dateMatch = body.match(/When: (.*?)\n/);
        const locationMatch = body.match(/Where: (.*?)\n/);

        return {
            title,
            time: dateMatch ? dateMatch[1] : 'Check details',
            location: locationMatch ? locationMatch[1] : 'Online / See details'
        };
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
                <div className="p-6">
                    <Link href="/" className="flex items-center space-x-3 group">
                        <div className="relative w-8 h-8 flex items-center justify-center">
                            <div className="absolute inset-0 bg-accent rounded-lg opacity-20 group-hover:opacity-40 blur-lg transition-opacity duration-500" />
                            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/20">
                                <span className="text-white text-lg font-bold">A</span>
                            </div>
                        </div>
                        <span className="text-text-primary font-semibold text-lg tracking-tight">Aether</span>
                    </Link>
                </div>

                {/* Views / Categories */}
                <div className="px-3 space-y-1 mb-6">
                    <div className="px-3 mb-2">
                        <h2 className="text-text-muted text-[10px] font-bold uppercase tracking-widest opacity-60">
                            Views
                        </h2>
                    </div>
                    {[
                        { id: 'gatekeeper', label: 'Gatekeeper', icon: '🛡️' },
                        { id: 'priority', label: 'Priority', icon: '⚡' },
                        { id: 'people', label: 'People', icon: '👤' },
                        { id: 'newsletters', label: 'Newsletters', icon: '📰' },
                        { id: 'notifications', label: 'Notifications', icon: '🔔' },
                        { id: 'sent', label: 'Sent', icon: '➤' },
                        { id: 'drafts', label: 'Drafts', icon: '📝' },
                    ].map((category) => (
                        <button
                            key={category.id}
                            onClick={() => {
                                setSelectedCategory(category.id)
                                setSelectedThreadId(null)
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-between group relative overflow-hidden ${selectedCategory === category.id
                                ? 'bg-surface-hover text-text-primary shadow-lg shadow-black/20'
                                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary hover:scale-[1.02]'
                                }`}
                        >
                            {selectedCategory === category.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-accent to-purple" />
                            )}
                            <div className="flex items-center space-x-3 z-10">
                                <span className={`w-5 text-center transition-transform duration-300 ${selectedCategory === category.id ? 'scale-110' : 'group-hover:scale-110'}`}>{category.icon}</span>
                                <span>{category.label}</span>
                            </div>
                            {category.id === 'priority' && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono z-10 ${selectedCategory === 'priority'
                                    ? 'bg-gradient-to-r from-accent to-purple text-white shadow-md shadow-accent/20'
                                    : 'bg-surface-elevated text-text-muted group-hover:text-text-secondary'
                                    }`}>
                                    {threads.filter(t => t.unread).length || ''}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                    {loading ? (
                        <div className="px-2 space-y-3 mt-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="animate-pulse flex items-start space-x-3 p-2">
                                    <div className="w-8 h-8 bg-surface-hover rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-surface-hover rounded w-3/4" />
                                        <div className="h-2 bg-surface-hover rounded w-full" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-4">
                            <div className="bg-red/10 border border-red/20 rounded-lg p-4 backdrop-blur-sm">
                                <p className="text-red text-sm font-medium">Error loading emails</p>
                                <p className="text-red/70 text-xs mt-1">{error}</p>
                                <button
                                    onClick={fetchThreads}
                                    className="mt-3 text-xs text-accent hover:text-white transition-colors"
                                >
                                    Try again
                                </button>
                            </div>
                        </div>
                    ) : threads.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-text-muted text-sm">No emails found</p>
                        </div>
                    ) : (
                        threads.map((thread, index) => (
                            <button
                                key={thread.id}
                                onClick={() => setSelectedThreadId(thread.id)}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 group relative animate-in fade-in slide-in-from-bottom-2 ${selectedThreadId === thread.id
                                    ? 'bg-surface-elevated shadow-lg shadow-black/20'
                                    : 'hover:bg-surface-hover/50 hover:backdrop-blur-sm'
                                    }`}
                            >
                                {selectedThreadId === thread.id && (
                                    <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-gradient-to-b from-accent to-purple" />
                                )}
                                <div className="flex items-start space-x-3">
                                    <div className={`relative w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform duration-300 ${selectedThreadId === thread.id ? 'scale-110' : 'group-hover:scale-105'
                                        } ${thread.unread ? 'bg-gradient-to-br from-accent to-purple p-[1px]' : 'bg-surface-hover'}`}>
                                        <div className={`w-full h-full rounded-full flex items-center justify-center ${thread.unread ? 'bg-surface' : ''}`}>
                                            <span className={`text-[10px] font-bold ${thread.unread ? 'text-white' : 'text-text-muted'}`}>
                                                {getInitials(getPrimaryParticipant(thread.participants))}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-sm truncate transition-colors ${thread.unread ? 'text-white font-medium' : 'text-text-secondary'
                                                }`}>
                                                {getPrimaryParticipant(thread.participants).split('@')[0]}
                                            </span>
                                            <span className="text-text-muted text-[10px] font-mono flex-shrink-0 ml-2 opacity-60">
                                                {formatDate(thread.lastMessageDate)}
                                            </span>
                                        </div>
                                        <p className={`text-sm truncate mb-0.5 ${thread.unread ? 'text-text-primary' : 'text-text-secondary'}`}>
                                            {thread.subject}
                                        </p>
                                        <p className="text-text-muted text-xs truncate opacity-60 group-hover:opacity-80 transition-opacity">
                                            {thread.snippet}
                                        </p>
                                    </div>
                                    {thread.unread && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-accent to-purple shadow-lg shadow-accent/50" />
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
                {selectedThreadId && threadDetail ? (
                    <>
                        {/* Conversation Header */}
                        <div className="border-b border-border bg-surface/50 backdrop-blur-xl p-6 sticky top-0 z-10">
                            <div className="flex items-start justify-between mb-4">
                                <h1 className="text-text-primary text-2xl font-bold tracking-tight leading-tight max-w-2xl">
                                    {threadDetail.thread.subject}
                                </h1>
                                <button
                                    onClick={summarizeWithAI}
                                    disabled={loadingAI}
                                    className="group relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-accent to-purple opacity-10 group-hover:opacity-20 transition-opacity" />
                                    <div className="absolute inset-0 border border-accent/20 rounded-lg group-hover:border-accent/40 transition-colors" />
                                    <div className="relative flex items-center space-x-2 text-accent group-hover:text-white transition-colors">
                                        {loadingAI ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                <span>Analyzing...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-lg">✨</span>
                                                <span>Summarize with AI</span>
                                            </>
                                        )}
                                    </div>
                                </button>
                            </div>
                            <div className="flex items-center space-x-4 text-xs font-mono text-text-secondary">
                                <div className="flex -space-x-2">
                                    {threadDetail.thread.participants.slice(0, 3).map((p, i) => (
                                        <div key={i} className="w-6 h-6 rounded-full bg-surface border border-surface flex items-center justify-center text-[8px] font-bold text-text-muted">
                                            {getInitials(p)}
                                        </div>
                                    ))}
                                    {threadDetail.thread.participants.length > 3 && (
                                        <div className="w-6 h-6 rounded-full bg-surface-elevated border border-surface flex items-center justify-center text-[8px] font-bold text-text-muted">
                                            +{threadDetail.thread.participants.length - 3}
                                        </div>
                                    )}
                                </div>
                                <span>{threadDetail.messages.length} messages</span>
                                <span className="w-1 h-1 rounded-full bg-border-bright" />
                                <span>Last reply {formatDate(threadDetail.thread.lastMessageDate)}</span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth">
                            {/* AI Summary Card */}
                            {aiSummary && (
                                <div className="glass rounded-2xl p-6 relative overflow-hidden group animate-in fade-in zoom-in-95 duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-purple/5 opacity-50" />
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
                                    <div className="relative space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-lg shadow-accent/20">
                                                <span className="text-white text-sm">✨</span>
                                            </div>
                                            <h3 className="text-text-primary font-semibold tracking-tight">AI Summary</h3>
                                        </div>
                                        <p className="text-text-secondary text-sm leading-relaxed font-light">
                                            {aiSummary}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Action Items Card */}
                            {actionItems.length > 0 && (
                                <div className="glass rounded-2xl p-6 relative overflow-hidden group animate-in fade-in zoom-in-95 duration-500 delay-100">
                                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-50" />
                                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
                                    <div className="relative space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                                <span className="text-white text-sm">⚡</span>
                                            </div>
                                            <h3 className="text-text-primary font-semibold tracking-tight">Action Items</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {actionItems.map((item, index) => (
                                                <label key={index} className="flex items-start space-x-3 cursor-pointer group/item">
                                                    <div className="relative mt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.completed}
                                                            onChange={() => toggleActionItem(index)}
                                                            className="peer sr-only"
                                                        />
                                                        <div className="w-5 h-5 rounded border border-border bg-surface-hover peer-checked:bg-gradient-to-br peer-checked:from-amber-500 peer-checked:to-orange-500 peer-checked:border-transparent transition-all duration-200 flex items-center justify-center">
                                                            <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className={`text-sm transition-all duration-200 ${item.completed ? 'line-through text-text-muted' : 'text-text-primary group-hover/item:text-white'}`}>
                                                            {item.task}
                                                        </p>
                                                        {item.dueDate && (
                                                            <p className="text-xs text-amber-500/70 mt-1 font-mono">
                                                                Due: {item.dueDate}
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {threadDetail.messages.map((message, index) => {
                                const isMe = isMyMessage(message.from)
                                const senderName = message.from.split('<')[0].trim().replace(/"/g, '')
                                const senderEmail = message.from.match(/<([^>]+)>/)?.[1] || message.from
                                const senderInitials = getInitials(senderName)
                                const cleanedBody = message.isHtml ? stripHtml(message.body) : message.body
                                const finalBody = cleanEmailContent(cleanedBody)
                                const isInvite = isCalendarInvite(message.subject, cleanedBody)
                                const eventDetails = isInvite ? extractEventDetails(message.subject, cleanedBody) : null

                                return (
                                    <div
                                        key={message.id}
                                        className={`group animate-in fade-in slide-in-from-bottom-4 duration-500`}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <div className={`message max-w-3xl mx-auto ${isMe ? 'ml-auto' : ''}`}>
                                            {/* Message Header */}
                                            <div className={`flex items-center gap-3 mb-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-lg ${isMe
                                                    ? 'bg-gradient-to-br from-accent to-purple'
                                                    : 'bg-surface-elevated border border-border'
                                                    }`}>
                                                    {senderInitials}
                                                </div>
                                                <div className={`flex-1 ${isMe ? 'text-right' : ''}`}>
                                                    <div className={`flex items-center gap-2 ${isMe ? 'justify-end' : ''}`}>
                                                        <span className="font-semibold text-white">{senderName}</span>
                                                        {senderEmail && senderEmail !== senderName && (
                                                            <span className="text-sm text-text-secondary font-mono opacity-80">{senderEmail}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-white/40 font-medium">{formatMessageDate(message.date)}</span>
                                                </div>
                                            </div>

                                            {/* Message Body */}
                                            <div className={`pl-13 text-white/80 leading-relaxed ${isMe ? 'pr-13 pl-0 text-right' : 'pl-13'}`}>
                                                {isInvite && eventDetails ? (
                                                    <div className="glass rounded-xl p-5 mb-4 border-l-4 border-l-accent max-w-md">
                                                        <div className="flex items-center gap-3 mb-3">
                                                            <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center text-xl">
                                                                📅
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-white">{eventDetails.title}</h3>
                                                                <p className="text-xs text-white/50">Calendar Invitation</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2 mb-4 text-sm">
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-white/40 w-12">When:</span>
                                                                <span className="text-white/90">{eventDetails.time}</span>
                                                            </div>
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-white/40 w-12">Where:</span>
                                                                <span className="text-white/90">{eventDetails.location}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button className="px-3 py-1.5 rounded-md bg-accent/20 text-accent hover:bg-accent/30 text-xs font-medium transition-colors">Accept</button>
                                                            <button className="px-3 py-1.5 rounded-md bg-white/5 text-white/70 hover:bg-white/10 text-xs font-medium transition-colors">Maybe</button>
                                                            <button className="px-3 py-1.5 rounded-md bg-white/5 text-white/70 hover:bg-white/10 text-xs font-medium transition-colors">Decline</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`rounded-2xl px-5 py-3.5 shadow-sm inline-block text-left ${isMe
                                                        ? 'bg-gradient-to-br from-accent/10 to-purple/10 border border-accent/20 text-white rounded-tr-sm'
                                                        : 'bg-surface-elevated border border-border text-text-primary rounded-tl-sm'
                                                        }`}>
                                                        <div className="whitespace-pre-wrap break-words font-light">
                                                            {finalBody.split(/(\s+)/).map((part, i) => {
                                                                if (part.match(/^https?:\/\//)) {
                                                                    return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">{part}</a>
                                                                }
                                                                return part
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>

                        {/* Reply Input */}
                        <div className="p-6 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0 z-10">
                            <div className="glass rounded-2xl p-2 shadow-2xl shadow-black/50 backdrop-blur-xl border-border-bright">
                                <div className="flex items-start space-x-2 mb-2 px-2 pt-2">
                                    <button
                                        onClick={generateDraft}
                                        disabled={loadingDraft}
                                        className="group flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-hover/50 hover:bg-surface-hover transition-all duration-200 disabled:opacity-50"
                                    >
                                        {loadingDraft ? (
                                            <div className="w-3 h-3 border-2 border-text-secondary border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-sm">✨</span>
                                        )}
                                        <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
                                            {loadingDraft ? 'Drafting...' : 'Draft with AI'}
                                        </span>
                                    </button>
                                </div>
                                <div className="flex items-end space-x-2">
                                    <div className="flex-1 bg-transparent px-4 py-2">
                                        <input
                                            type="text"
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Type a message..."
                                            className="w-full bg-transparent text-text-primary placeholder-text-muted outline-none text-sm font-light"
                                        />
                                    </div>

                                    <button
                                        className="w-8 h-8 rounded-full bg-surface-hover hover:bg-surface-elevated flex items-center justify-center transition-colors flex-shrink-0 group"
                                        title="Voice input"
                                    >
                                        <svg className="w-4 h-4 text-text-secondary group-hover:text-text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                        </svg>
                                    </button>

                                    <button
                                        className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple flex items-center justify-center transition-transform hover:scale-105 active:scale-95 flex-shrink-0 shadow-lg shadow-accent/20"
                                    >
                                        <svg className="w-4 h-4 text-white ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </div>
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
