'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
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

export default function InboxPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [threads, setThreads] = useState<GmailThread[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/')
            return
        }

        if (status === 'authenticated') {
            fetchThreads()
        }
    }, [status, router])

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

    function getInitials(email: string): string {
        const name = email.split('@')[0]
        return name.substring(0, 2).toUpperCase()
    }

    function getPrimaryParticipant(participants: string[]): string {
        // Filter out the current user's email
        const others = participants.filter(p => p !== session?.user?.email)
        return others[0] || participants[0] || 'Unknown'
    }

    // Separate priority and recent threads (for demo, unread = priority)
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
                            {/* Priority Section */}
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
                                                    {/* Avatar */}
                                                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-accent text-xs font-medium">
                                                            {getInitials(getPrimaryParticipant(thread.participants))}
                                                        </span>
                                                    </div>

                                                    {/* Content */}
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

                                                    {/* Unread indicator */}
                                                    {thread.unread && (
                                                        <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recent Section */}
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
                                                    {/* Avatar */}
                                                    <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        <span className="text-text-muted text-xs font-medium">
                                                            {getInitials(getPrimaryParticipant(thread.participants))}
                                                        </span>
                                                    </div>

                                                    {/* Content */}
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
            <div className="flex-1 flex items-center justify-center">
                {selectedThreadId ? (
                    <div className="text-center">
                        <p className="text-text-primary text-lg font-medium mb-2">
                            Thread selected: {selectedThreadId}
                        </p>
                        <p className="text-text-secondary text-sm">
                            Conversation details will be displayed here
                        </p>
                    </div>
                ) : (
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
                )}
            </div>
        </div>
    )
}
