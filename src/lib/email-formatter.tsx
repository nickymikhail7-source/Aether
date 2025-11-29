import React from 'react';

export function formatEmailContent(body: string): React.ReactNode[] {
    if (!body) return [];

    // Clean the content first
    let content = body
        // Fix HTML entities
        .replace(/&#8208;/g, '-')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#8216;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        // Remove excessive whitespace but preserve paragraphs
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n');

    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/);

    return paragraphs.map((para, index) => {
        const trimmed = para.trim();
        if (!trimmed) return null;

        // Check if it's a heading (numbered like "5. The Improvement")
        if (/^\d+\.\s+[A-Z]/.test(trimmed)) {
            return (
                <h3 key={index} className="text-white font-semibold text-lg mt-6 mb-2">
                    {trimmed}
                </h3>
            );
        }

        // Check if it's a URL line
        if (/^https?:\/\/\S+$/.test(trimmed)) {
            return (
                <a
                    key={index}
                    href={trimmed}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-indigo-400 hover:text-indigo-300 underline my-2 break-all"
                >
                    {trimmed.length > 60 ? trimmed.slice(0, 60) + '...' : trimmed}
                </a>
            );
        }

        // Regular paragraph - also convert inline URLs to links
        const withLinks = convertUrlsToLinks(trimmed);

        return (
            <p key={index} className="text-white/80 leading-relaxed mb-4">
                {withLinks}
            </p>
        );
    }).filter(Boolean) as React.ReactNode[];
}

function convertUrlsToLinks(text: string): (string | React.ReactNode)[] {
    const urlRegex = /(https?:\/\/[^\s\[\]<>]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
        if (urlRegex.test(part)) {
            // Reset regex lastIndex
            urlRegex.lastIndex = 0;
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline break-all"
                >
                    [link]
                </a>
            );
        }
        return part;
    });
}

export function extractSenderInfo(from: string): {
    name: string;
    email: string;
    initials: string
} {
    if (!from) return { name: 'Unknown', email: '', initials: 'UN' };

    // Handle "Name <email@example.com>" format
    const match = from.match(/^"?([^"<]+)"?\s*<?([^>]*)>?$/);

    if (match && match[1]) {
        const name = match[1].trim();
        const email = match[2]?.trim() || from;
        const initials = name
            .split(/\s+/)
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        return { name, email, initials };
    }

    // Plain email address
    const email = from.trim();
    const namePart = email.split('@')[0];
    return {
        name: namePart,
        email,
        initials: namePart.slice(0, 2).toUpperCase()
    };
}

export function formatDate(date: string | Date): string {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
}
