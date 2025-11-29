export function cleanEmailContent(body: string): string {
    if (!body) return '';

    return body
        // Remove quoted reply lines (lines starting with >)
        .replace(/^>.*$/gm, '')
        // Remove "On [date] [person] wrote:" lines
        .replace(/On .+ wrote:$/gm, '')
        // Remove multiple blank lines
        .replace(/\n{3,}/g, '\n\n')
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
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, ' ')
        // Remove URLs in angle brackets but keep the URL
        .replace(/<(https?:\/\/[^>]+)>/g, '$1')
        // Remove markdown-style links, keep just the text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Trim whitespace
        .trim();
}

export function extractSenderInfo(from: string): { name: string; email: string; initials: string } {
    // Handle "Name <email@example.com>" format
    const match = from.match(/^(.+?)\s*<(.+)>$/);

    if (match) {
        const name = match[1].replace(/"/g, '').trim();
        const email = match[2].trim();
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        return { name, email, initials };
    }

    // Handle plain email
    const email = from.trim();
    const namePart = email.split('@')[0];
    const initials = namePart.slice(0, 2).toUpperCase();
    return { name: namePart, email, initials };
}

export function formatMessageDate(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

export function isCalendarInvite(content: string): boolean {
    return content.includes('calendar.google.com/calendar/event') ||
        content.includes('RESPOND&eid=') ||
        (content.includes('Yes') && content.includes('No') && content.includes('Maybe'));
}

export function extractCalendarDetails(subject: string, content: string): {
    title: string;
    dateTime: string;
    hasRSVP: boolean;
} | null {
    if (!isCalendarInvite(content)) return null;

    // Extract from subject like "Invitation: Event Name @ Date Time"
    const match = subject.match(/Invitation.*?:\s*(.+?)\s*@\s*(.+?)(?:\s*\(|$)/);

    return {
        title: match ? match[1] : subject,
        dateTime: match ? match[2] : '',
        hasRSVP: true
    };
}
