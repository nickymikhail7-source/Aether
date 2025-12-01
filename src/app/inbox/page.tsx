'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { EmailCard } from '@/components/EmailCard';
import { EmailPanel } from '@/components/EmailPanel';
import { ComposeModal } from '@/components/ComposeModal';
import { VoiceButton } from '@/components/VoiceButton';

export default function InboxPage() {
    const { data: session, status } = useSession();
    const [threads, setThreads] = useState<any[]>([]);
    const [selectedThread, setSelectedThread] = useState<any>(null);
    const [panelThread, setPanelThread] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'decisions' | 'fyi' | 'gatekeeper'>('decisions');
    const [error, setError] = useState<string | null>(null);
    const [showCompose, setShowCompose] = useState(false);
    const [defaultComposeIntent, setDefaultComposeIntent] = useState('');

    // Fetch threads
    useEffect(() => {
        const fetchThreads = async () => {
            try {
                const response = await fetch('/api/gmail/threads?maxResults=30');
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setThreads(data.threads || []);
            } catch (err) {
                setError('Failed to load emails');
            } finally {
                setLoading(false);
            }
        };

        if (session?.accessToken) {
            fetchThreads();
        }
    }, [session]);

    // Mock categorization (will be replaced by AI analysis)
    const categorizeThreads = () => {
        // For now, split roughly - later this will use actual AI analysis
        const decisions = threads.slice(0, Math.ceil(threads.length * 0.3));
        const fyi = threads.slice(Math.ceil(threads.length * 0.3));
        return { decisions, fyi, gatekeeper: [] };
    };

    const { decisions, fyi, gatekeeper } = categorizeThreads();
    const activeThreads = activeView === 'decisions' ? decisions : activeView === 'fyi' ? fyi : gatekeeper;

    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Welcome to Aether</h1>
                    <p className="text-white/60 mb-6">The email client that respects your attention</p>
                    <button
                        onClick={() => signIn('google')}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-medium hover:opacity-90 transition"
                    >
                        Sign in with Google
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white flex">

            {/* Sidebar */}
            <aside className="w-72 border-r border-white/5 flex flex-col">

                {/* Logo */}
                <div className="p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            A
                        </div>
                        <span className="text-xl font-semibold">Aether</span>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3">
                    <div className="text-xs text-white/30 uppercase tracking-wider px-3 py-2">
                        Views
                    </div>

                    {/* Decisions */}
                    <button
                        onClick={() => setActiveView('decisions')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeView === 'decisions'
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <span className="text-lg">⚡</span>
                        <span className="flex-1 text-left font-medium">Decisions</span>
                        {decisions.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400">
                                {decisions.length}
                            </span>
                        )}
                    </button>

                    {/* FYI */}
                    <button
                        onClick={() => setActiveView('fyi')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeView === 'fyi'
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <span className="text-lg">📄</span>
                        <span className="flex-1 text-left font-medium">FYI</span>
                        {fyi.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-white/10 text-white/60">
                                {fyi.length}
                            </span>
                        )}
                    </button>

                    {/* Gatekeeper */}
                    <button
                        onClick={() => setActiveView('gatekeeper')}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeView === 'gatekeeper'
                            ? 'bg-white/10 text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <span className="text-lg">🛡️</span>
                        <span className="flex-1 text-left font-medium">Gatekeeper</span>
                        {gatekeeper.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                                {gatekeeper.length}
                            </span>
                        )}
                    </button>

                    <div className="h-px bg-white/5 my-3" />

                    {/* Other views */}
                    {['Sent', 'Drafts', 'Archive'].map((view) => (
                        <button
                            key={view}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-white/40 hover:bg-white/5 hover:text-white/60 transition-all"
                        >
                            <span className="text-lg">
                                {view === 'Sent' ? '➤' : view === 'Drafts' ? '📝' : '📁'}
                            </span>
                            <span className="font-medium">{view}</span>
                        </button>
                    ))}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                            {session.user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                                {session.user?.name}
                            </div>
                            <div className="text-xs text-white/40 truncate">
                                {session.user?.email}
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col bg-[#080808]">

                {/* Header */}
                <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            {activeView === 'decisions' && <span>⚡</span>}
                            {activeView === 'fyi' && <span>📄</span>}
                            {activeView === 'gatekeeper' && <span>🛡️</span>}
                            {activeView === 'decisions' ? 'Decisions' : activeView === 'fyi' ? 'FYI' : 'Gatekeeper'}
                        </h1>
                        <p className="text-sm text-white/50 mt-1">
                            {activeView === 'decisions' && `${decisions.length} emails need your attention`}
                            {activeView === 'fyi' && `${fyi.length} emails for your information`}
                            {activeView === 'gatekeeper' && `${gatekeeper.length} emails from unknown senders`}
                        </p>
                    </div>

                    <VoiceButton
                        onTranscription={(text) => {
                            const lowerText = text.toLowerCase();
                            if (
                                lowerText.includes('email') ||
                                lowerText.includes('send') ||
                                lowerText.includes('compose') ||
                                lowerText.includes('write') ||
                                lowerText.includes('message')
                            ) {
                                setDefaultComposeIntent(text);
                                setShowCompose(true);
                            }
                        }}
                        size="md"
                        showLabel
                        className="px-5 py-2.5"
                    />
                </header>

                {/* Email List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        {loading ? (
                            // Loading skeletons
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="bg-[#111] rounded-2xl p-6 mb-4 animate-pulse">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 rounded-xl bg-white/10" />
                                        <div className="flex-1">
                                            <div className="h-5 w-48 bg-white/10 rounded mb-2" />
                                            <div className="h-4 w-32 bg-white/5 rounded" />
                                        </div>
                                    </div>
                                    <div className="h-20 bg-white/5 rounded-xl" />
                                </div>
                            ))
                        ) : activeThreads.length === 0 ? (
                            // Empty state
                            <div className="text-center py-20">
                                <div className="text-6xl mb-4">
                                    {activeView === 'decisions' ? '🎉' : activeView === 'fyi' ? '📭' : '🛡️'}
                                </div>
                                <h3 className="text-xl font-semibold text-white mb-2">
                                    {activeView === 'decisions' ? 'All caught up!' : 'Nothing here'}
                                </h3>
                                <p className="text-white/50">
                                    {activeView === 'decisions' && 'No decisions needed right now.'}
                                    {activeView === 'fyi' && 'No FYI emails at the moment.'}
                                    {activeView === 'gatekeeper' && 'No unknown senders waiting.'}
                                </p>
                            </div>
                        ) : (
                            // Email cards
                            activeThreads.map((thread) => (
                                <EmailCard
                                    key={thread.id}
                                    thread={thread}
                                    message={thread.messages?.[thread.messages.length - 1] || thread}
                                    onOpenPanel={() => setPanelThread(thread)}
                                    trustScore={Math.floor(Math.random() * 5) + 1}
                                />
                            ))
                        )}
                    </div>
                </div>
            </main>

            <EmailPanel
                thread={panelThread}
                isOpen={!!panelThread}
                onClose={() => setPanelThread(null)}
            />

            {/* Floating Compose Button */}
            <button
                onClick={() => setShowCompose(true)}
                className="fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 flex items-center justify-center hover:scale-105 hover:shadow-indigo-500/40 transition-all z-30"
                title="Compose new email"
            >
                <span className="text-2xl">✏️</span>
            </button>

            {/* Compose Modal */}
            <ComposeModal
                isOpen={showCompose}
                onClose={() => {
                    setShowCompose(false);
                    setDefaultComposeIntent('');
                }}
                defaultIntent={defaultComposeIntent}
            />
        </div>
    );
}
