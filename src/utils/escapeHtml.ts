/**
 * Enhanced HTML escaping utility to prevent XSS attacks
 */

/**
 * Escapes HTML characters to prevent XSS attacks
 * @param unsafe The string to escape
 * @returns The escaped string safe for HTML content
 */
export function escapeHtml(unsafe: string): string {
    if (typeof unsafe !== 'string') {
        return String(unsafe);
    }
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\//g, "&#x2F;"); // Escape forward slashes
}

/**
 * Escapes HTML attributes to prevent XSS in attribute values
 * @param unsafe The string to escape
 * @returns The escaped string safe for HTML attributes
 */
export function escapeHtmlAttribute(unsafe: string): string {
    if (typeof unsafe !== 'string') {
        return String(unsafe);
    }
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/\s/g, "&#x20;"); // Escape spaces in attributes
}

/**
 * Sanitizes user input by removing potentially dangerous characters
 * @param input The input string to sanitize
 * @param maxLength Maximum length allowed (default: 1000)
 * @returns Sanitized string
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
        return '';
    }
    
    // Remove null bytes and control characters
    let sanitized = input
        .replace(/\0/g, '') // Remove null bytes
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
        .trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
        sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
}

/**
 * Validates and sanitizes task text input
 * @param input The task text input
 * @returns Sanitized task text or empty string if invalid
 */
export function sanitizeTaskInput(input: string): string {
    const sanitized = sanitizeInput(input, 200); // Max 200 chars for tasks
    
    // Check for potentially dangerous patterns
    const dangerousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i, // Event handlers like onclick=
        /data:/i,
        /vbscript:/i
    ];
    
    for (const pattern of dangerousPatterns) {
        if (pattern.test(sanitized)) {
            console.warn('Potentially dangerous input detected and removed:', sanitized);
            return '';
        }
    }
    
    return sanitized;
}

/**
 * Creates safe HTML content by escaping and sanitizing
 * @param content The content to make safe
 * @param options Options for sanitization
 * @returns Safe HTML string
 */
export function createSafeHtml(
    content: string, 
    options: { 
        allowLineBreaks?: boolean; 
        maxLength?: number;
        escapeHtml?: boolean;
    } = {}
): string {
    const { 
        allowLineBreaks = true, 
        maxLength = 1000, 
        escapeHtml: shouldEscape = true 
    } = options;
    
    let safe = sanitizeInput(content, maxLength);
    
    if (shouldEscape) {
        safe = escapeHtml(safe);
    }
    
    if (allowLineBreaks) {
        safe = safe.replace(/\n/g, '<br>');
    }
    
    return safe;
}
