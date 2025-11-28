import Link from 'next/link'

export default function InboxPage() {
    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center">
                        <span className="text-white text-xl font-bold">A</span>
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary">
                        Welcome to Aether
                    </h1>
                </div>

                {/* Content */}
                <div className="bg-surface rounded-xl p-8 border border-border">
                    <p className="text-text-secondary text-lg">
                        Your inbox is loading...
                    </p>
                </div>

                {/* Back Link */}
                <Link
                    href="/"
                    className="inline-block text-accent hover:text-blue-400 transition-colors"
                >
                    ← Back to home
                </Link>
            </div>
        </div>
    )
}
