'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { extractSenderInfo, formatDate } from '@/lib/email-formatter'
import { extractCalendarDetails } from '@/lib/email-utils'
import { EmailContent } from '@/components/EmailContent'
import { Toast } from '@/components/Toast'

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


function ReplyInput({
    thread,
    lastMessage,
    onSent,
    onError
}: {
    thread: ThreadDetail;
    lastMessage: GmailMessage;
    onSent: () => void;
    onError: (msg: string) => void;
}) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [draftLoading, setDraftLoading] = useState(false);

    // Extract recipient from last message
    const getRecipient = () => {
        // If last message is from me, reply to the original sender
        // Otherwise reply to whoever sent the last message
        const from = lastMessage?.from || '';
        const match = from.match(/<([^>]+)>/) || [null, from];
        return match[1] || from;
    };

    const handleDraftWithAI = async () => {
        setDraftLoading(true);
        try {
            const response = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: thread.thread.subject,
                    messages: thread.messages.map((m: any) => ({
                        from: m.from,
                        body: m.body,
                        date: m.date
                    })),
                }),
            });

            const data = await response.json();

            if (data.draft) {
                setMessage(data.draft);
            } else if (data.error) {
                console.error('Draft API returned error:', data.error);
                onError(data.error);
            }
        } catch (error) {
            console.error('Failed to generate draft:', error);
            onError('Failed to generate draft');
        } finally {
            setDraftLoading(false);
        }
    };

    const handleSend = async () => {
        if (!message.trim() || sending) return;

        setSending(true);
        try {
            const response = await fetch('/api/gmail/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: getRecipient(),
                    subject: thread.thread.subject,
                    message: message.replace(/\n/g, '<br>'), // Convert newlines to HTML
                    threadId: thread.thread.id,
                    replyToMessageId: lastMessage?.id,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setMessage('');
                onSent();
            } else {
                console.error('Failed to send:', data.error);
                onError(data.error || 'Failed to send reply');
            }
        } catch (error) {
            console.error('Send error:', error);
            onError('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-6 bg-gradient-to-t from-background via-background to-transparent sticky bottom-0 z-10">
            <div className="glass rounded-2xl p-4 shadow-2xl shadow-black/50 backdrop-blur-xl border-border-bright">
                {/* Recipient indicator */}
                <div className="flex items-center gap-2 mb-3 text-xs text-text-muted">
                    <span>Reply to:</span>
                    <span className="text-text-primary font-medium">{getRecipient()}</span>
                </div>

                {/* Draft with AI button */}
                <button
                    onClick={handleDraftWithAI}
                    disabled={draftLoading}
                    className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-lg bg-surface-hover/50 hover:bg-surface-hover text-text-secondary hover:text-white text-xs transition disabled:opacity-50"
                >
                    {draftLoading ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            <span>Generating...</span>
                        </>
                    ) : (
                        <>
                            <span>✨</span>
                            <span>Draft with AI</span>
                        </>
                    )}
                </button>

                {/* Message Input */}
                <div className="flex gap-3">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your reply..."
                        rows={3}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/50 text-sm"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.metaKey) {
                                handleSend();
                            }
                        }}
                    />

                    {/* Send Button */}
                    <button
                        onClick={handleSend}
                        disabled={!message.trim() || sending}
                        className="self-end px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-purple-600 text-white font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                    >
                        {sending ? (
                            <span className="animate-spin">↻</span>
                        ) : (
                            'Send'
                        )}
                    </button>
                </div>

                {/* Keyboard shortcut hint */}
                <div className="mt-2 text-[10px] text-text-muted text-right">
                    Press ⌘ + Enter to send
                </div>
            </div>
        </div>
    );
}

export default function InboxPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [threads, setThreads] = useState<GmailThread[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null)
    const [loadingThread, setLoadingThread] = useState(false)
    const [aiSummary, setAiSummary] = useState<string | null>(null)
    const [actionItems, setActionItems] = useState<ActionItem[]>([])
    const [loadingAI, setLoadingAI] = useState(false)
    const [selectedCategory, setSelectedCategory] = useState('priority')
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

            const response = await fetch(`/api/gmail/threads?category=${selectedCategory}`)

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch emails')
            }

            const data = await response.json()
            setThreads(data.threads || [])
        } catch (err: unknown) {
            console.error(err)
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

            const response = await fetch(`/api/gmail/threads/${threadId}`)

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to fetch thread')
            }

            const data = await response.json()
            setThreadDetail(data)
        } catch (err: unknown) {
            console.error('Error fetching thread:', err)
        } finally {
            setLoadingThread(false)
        }
    }

    async function refreshThread() {
        if (!selectedThreadId) return

        try {
            const response = await fetch(`/api/gmail/threads/${selectedThreadId}`)
            if (response.ok) {
                const data = await response.json()
                setThreadDetail(data)
                setToast({ message: 'Reply sent successfully!', type: 'success' })
            }
        } catch (error) {
            console.error('Error refreshing thread:', error)
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
                        body: m.body,
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
                            body: m.body,
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



    function toggleActionItem(index: number) {
        setActionItems(items =>
            items.map((item, i) =>
                i === index ? { ...item, completed: !item.completed } : item
            )
        )
    }



    return (
        <div className="flex h-screen bg-background text-text-primary font-sans overflow-hidden selection:bg-accent/30 selection:text-white">
            {/* Sidebar */}
            <div className="w-[280px] flex flex-col border-r border-border bg-surface/50 backdrop-blur-xl">
                {/* Header */}
                <div className="p-6 flex items-center gap-3">
                    <div className="relative group cursor-pointer">
                        <div className="absolute -inset-1 bg-gradient-to-r from-accent via-purple-500 to-pink-500 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                        <div className="relative w-8 h-8 rounded-full bg-black flex items-center justify-center ring-1 ring-white/10">
                            <span className="font-bold text-white text-lg">A</span>
                        </div>
                    </div>
                    <h1 className="text-lg font-bold tracking-tight text-white">Aether</h1>
                </div>

                {/* Views */}
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
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group ${selectedCategory === category.id
                                ? 'bg-surface-elevated text-white shadow-lg shadow-black/20 border-l-2 border-accent'
                                : 'text-text-secondary hover:bg-surface-hover hover:text-white hover:translate-x-1'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={`text-lg transition-transform duration-300 ${selectedCategory === category.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {category.icon}
                                </span>
                                <span>{category.label}</span>
                            </div>
                            {category.id === 'priority' && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${selectedCategory === category.id
                                    ? 'bg-accent text-white'
                                    : 'bg-surface-elevated text-text-muted group-hover:bg-surface-elevated group-hover:text-white'
                                    }`}>
                                    {threads.filter(t => t.unread).length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Thread List */}
                <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar">
                    <div className="space-y-1">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            threads.map((thread, index) => (
                                <div
                                    key={thread.id}
                                    onClick={() => setSelectedThreadId(thread.id)}
                                    className={`group p-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-border-bright ${selectedThreadId === thread.id
                                        ? 'bg-surface-elevated shadow-lg shadow-black/20 ring-1 ring-white/5'
                                        : 'hover:bg-surface-hover/50'
                                        } animate-in fade-in slide-in-from-left-4 duration-500`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {thread.unread && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(99,102,241,0.5)] flex-shrink-0" />
                                            )}
                                            <span className={`text-sm truncate ${thread.unread ? 'font-semibold text-white' : 'text-text-secondary group-hover:text-white/90'
                                                }`}>
                                                {thread.participants[0]}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-text-muted whitespace-nowrap ml-2 font-mono">
                                            {formatDate(thread.lastMessageDate)}
                                        </span>
                                    </div>
                                    <h3 className={`text-sm mb-1 truncate ${thread.unread ? 'text-white font-medium' : 'text-text-secondary'
                                        }`}>
                                        {thread.subject}
                                    </h3>
                                    <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                                        {thread.snippet}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-surface/30 backdrop-blur-3xl relative overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[100px]" />
                </div>

                {selectedThreadId && threadDetail ? (
                    <>
                        {/* Conversation Header */}
                        <div className="sticky top-0 z-10 bg-[#0a0a0a] border-b border-white/5 px-8 py-6">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-2xl font-bold text-white mb-2 leading-tight">
                                        {threadDetail.thread.subject}
                                    </h1>
                                    <div className="flex items-center gap-3 text-sm text-white/50">
                                        <span>{threadDetail.messages.length} message{threadDetail.messages.length > 1 ? 's' : ''}</span>
                                        <span>•</span>
                                        <span>Last reply {formatDate(threadDetail.thread.lastMessageDate)}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={summarizeWithAI}
                                    disabled={loadingAI}
                                    className="group relative px-4 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border hover:border-accent/50 transition-all duration-300 disabled:opacity-50 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                    <div className="flex items-center gap-2 relative z-10">
                                        {loadingAI ? (
                                            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <span className="text-accent">✨</span>
                                        )}
                                        <span className="text-xs font-medium text-white">
                                            {loadingAI ? 'Thinking...' : 'Summarize with AI'}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div ref={messageContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8 relative z-0 custom-scrollbar">
                            {/* AI Summary Card */}
                            {aiSummary && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500 mb-8">
                                    <div className="glass p-6 rounded-2xl border border-accent/20 shadow-[0_0_30px_rgba(99,102,241,0.1)] relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/20 transition-colors duration-500" />
                                        <div className="flex items-center gap-2 mb-3 relative z-10">
                                            <span className="text-lg">✨</span>
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Summary</h3>
                                        </div>
                                        <p className="text-sm text-white/90 leading-relaxed relative z-10">
                                            {aiSummary}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Action Items Card */}
                            {actionItems.length > 0 && (
                                <div className="animate-in fade-in slide-in-from-top-4 duration-500 delay-100 mb-8">
                                    <div className="glass p-6 rounded-2xl border border-amber-500/20 shadow-[0_0_30px_rgba(245,158,11,0.05)] relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                        <div className="flex items-center gap-2 mb-4 relative z-10">
                                            <span className="text-lg">⚡</span>
                                            <h3 className="text-sm font-bold text-amber-200 uppercase tracking-wider">Action Items</h3>
                                        </div>
                                        <div className="space-y-3 relative z-10">
                                            {actionItems.map((item, i) => (
                                                <label key={i} className="flex items-start gap-3 group/item cursor-pointer">
                                                    <div className="relative flex items-center pt-0.5">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.completed}
                                                            onChange={() => toggleActionItem(i)}
                                                            className="peer appearance-none w-4 h-4 rounded border border-white/20 checked:bg-amber-500 checked:border-amber-500 transition-all duration-200 cursor-pointer"
                                                        />
                                                        <div className="absolute inset-0 flex items-center justify-center text-black opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity duration-200">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                const { name, email, initials } = extractSenderInfo(message.from)
                                const isMe = message.from.toLowerCase().includes(session?.user?.email?.toLowerCase() || '')
                                const calendarDetails = extractCalendarDetails(message.subject || '', message.body)

                                return (
                                    <div
                                        key={message.id}
                                        className={`group animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12`}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        {/* Sender Header - Make it prominent */}
                                        <div className="flex items-start gap-4 mb-6 pb-4 border-b border-white/10">
                                            {/* Avatar */}
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 shadow-lg ${isMe
                                                ? 'bg-gradient-to-br from-accent to-purple'
                                                : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                                }`}>
                                                {initials}
                                            </div>

                                            {/* Sender Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="font-semibold text-white text-lg">{name}</span>
                                                    <span className="text-sm text-white/60 bg-white/5 px-2 py-0.5 rounded">
                                                        {email}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-sm text-white/40">{formatDate(message.date)}</span>
                                                    <span className="text-white/20">•</span>
                                                    <span className="text-sm text-white/40">to me</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Message Body - Clean container, no extra borders */}
                                        <div className="pl-16"> {/* Align with avatar */}
                                            {calendarDetails && (
                                                <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/10 max-w-md">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-lg">📅</span>
                                                        <span className="font-semibold text-white">Calendar Invite</span>
                                                    </div>
                                                    <p className="text-white font-medium">{calendarDetails.title}</p>
                                                    {calendarDetails.dateTime && (
                                                        <p className="text-white/60 text-sm mt-1">{calendarDetails.dateTime}</p>
                                                    )}
                                                    {calendarDetails.hasRSVP && (
                                                        <div className="flex gap-2 mt-3">
                                                            <button className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm font-medium hover:bg-green-500/30 transition">
                                                                Accept
                                                            </button>
                                                            <button className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30 transition">
                                                                Decline
                                                            </button>
                                                            <button className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm font-medium hover:bg-yellow-500/30 transition">
                                                                Maybe
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div className="email-content">
                                                <EmailContent
                                                    content={message.body}
                                                    isHtml={message.isHtml}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>

                        {/* Reply Input */}
                        <ReplyInput
                            thread={threadDetail}
                            lastMessage={threadDetail.messages[threadDetail.messages.length - 1]}
                            onSent={refreshThread}
                            onError={(msg) => setToast({ message: msg, type: 'error' })}
                        />
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
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    )
}
