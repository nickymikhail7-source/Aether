'use client';

import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface EmailContentProps {
    content: string;
    isHtml: boolean;
}

export function EmailContent({ content, isHtml }: EmailContentProps) {
    const sanitizedHtml = useMemo(() => {
        if (!isHtml) {
            // Convert plain text to HTML with paragraphs
            const escaped = content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            const withParagraphs = escaped
                .split(/\n\n+/)
                .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
                .join('');

            return withParagraphs;
        }

        // Sanitize HTML to prevent XSS
        const clean = DOMPurify.sanitize(content, {
            ALLOWED_TAGS: [
                'p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'img',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
                'table', 'thead', 'tbody', 'tr', 'td', 'th',
                'div', 'span', 'hr'
            ],
            ALLOWED_ATTR: [
                'href', 'src', 'alt', 'title', 'width', 'height',
                'target', 'rel', 'class', 'style'
            ],
            ALLOW_DATA_ATTR: false,
            ADD_ATTR: ['target'], // Add target="_blank" to links
        });

        // Add target="_blank" to all links
        return clean.replace(/<a /g, '<a target="_blank" rel="noopener noreferrer" ');
    }, [content, isHtml]);

    return (
        <div
            className="email-content prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
    );
}
