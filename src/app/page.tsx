'use client'

import { useSession, signIn } from 'next-auth/react'
import Link from 'next/link'

export default function Home() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold text-text-primary">
            Your attention, protected.
          </h1>
          <p className="text-lg text-text-secondary">
            Email reimagined for the AI age.
          </p>
        </div>

        {/* CTAs */}
        <div className="pt-4">
          {!session ? (
            <button
              onClick={() => signIn('google')}
              className="px-8 py-3 bg-accent hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Connect Gmail
            </button>
          ) : (
            <div className="space-y-6">
              {/* User Info */}
              <div className="space-y-2">
                <p className="text-text-primary font-medium">
                  Welcome, {session.user?.name}
                </p>
                <p className="text-text-secondary text-sm">
                  {session.user?.email}
                </p>
              </div>

              {/* Inbox Button */}
              <Link
                href="/inbox"
                className="inline-block px-8 py-3 bg-green hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                Open Inbox →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
