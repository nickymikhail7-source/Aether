import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { JWT } from "next-auth/jwt"

async function refreshAccessToken(token: JWT) {
    try {
        const url =
            "https://oauth2.googleapis.com/token?" +
            new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken as string,
            })

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            method: "POST",
        })

        const refreshedTokens = await response.json()

        if (!response.ok) {
            throw refreshedTokens
        }

        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
            refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
        }
    } catch (error) {
        console.log("Error refreshing access token", error)
        return {
            ...token,
            error: "RefreshAccessTokenError",
        }
    }
}

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
        async jwt({ token, account, user }) {
            // Initial sign in - store user info AND tokens
            if (account && user) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    expiresAt: account.expires_at,
                    refreshToken: account.refresh_token,
                    email: user.email,
                    name: user.name,
                    picture: user.image,
                }
            }

            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.expiresAt as number) * 1000) {
                return token
            }

            // Access token has expired, try to update it
            return refreshAccessToken(token)
        },
        async session({ session, token }) {
            // Pass user info from token to session
            if (session.user) {
                session.user.email = token.email as string
                session.user.name = token.name as string
                session.user.image = token.picture as string
            }
            session.accessToken = token.accessToken as string
            session.refreshToken = token.refreshToken as string
            session.expiresAt = token.expiresAt as number
            session.error = token.error
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
