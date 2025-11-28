import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: [
                        'openid',
                        'email',
                        'profile',
                        'https://www.googleapis.com/auth/gmail.readonly',
                        'https://www.googleapis.com/auth/gmail.send',
                        'https://www.googleapis.com/auth/gmail.modify',
                    ].join(' '),
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token
                token.refreshToken = account.refresh_token
                token.expiresAt = account.expires_at
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.accessToken = token.accessToken as string
                session.refreshToken = token.refreshToken as string
                session.expiresAt = token.expiresAt as number
            }
            return session
        },
        async signIn({ user, account }) {
            if (account && user.email) {
                await prisma.user.upsert({
                    where: { email: user.email },
                    update: {
                        name: user.name,
                        image: user.image,
                        gmailAccessToken: account.access_token,
                        gmailRefreshToken: account.refresh_token,
                        gmailTokenExpiry: account.expires_at
                            ? new Date(account.expires_at * 1000)
                            : null,
                    },
                    create: {
                        email: user.email,
                        name: user.name,
                        image: user.image,
                        gmailAccessToken: account.access_token,
                        gmailRefreshToken: account.refresh_token,
                        gmailTokenExpiry: account.expires_at
                            ? new Date(account.expires_at * 1000)
                            : null,
                    },
                })
            }
            return true
        },
    },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
