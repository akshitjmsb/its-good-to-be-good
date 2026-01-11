/**
 * Time utilities for Co Create
 * Provides canonical time handling for consistent date operations
 */

// Global variable for testing time zones
export let testTimeOverride: Date | null = null;

/**
 * Gets the current date and hour based on a canonical timezone ('America/New_York')
 * to ensure the app's state is consistent for all users, regardless of their location.
 * @returns An object with the canonical Date object and the hour (0-23).
 */
export function getCanonicalTime(): { now: Date, hour: number } {
    const canonicalTimeZone = 'America/New_York';

    // Use test override if set (for testing)
    const baseDate = testTimeOverride || new Date();

    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hourCycle: 'h23',
        timeZone: canonicalTimeZone,
    });

    const parts = formatter.formatToParts(baseDate);
    const partMap: { [key: string]: string } = {};
    for (const part of parts) {
        if (part.type !== 'literal') {
            partMap[part.type] = part.value;
        }
    }

    const year = parseInt(partMap.year);
    const month = parseInt(partMap.month);
    const day = parseInt(partMap.day);
    const hour = parseInt(partMap.hour);
    const minute = parseInt(partMap.minute);
    const second = parseInt(partMap.second);

    const canonicalNow = new Date(year, month - 1, day, hour, minute, second);

    return { now: canonicalNow, hour: hour };
}

/**
 * Gets today's date key in YYYY-MM-DD format
 */
export function getTodayKey(): string {
    const { now } = getCanonicalTime();
    return now.toISOString().split('T')[0];
}

/**
 * Gets the active content date (current day for content purposes)
 */
export function getActiveContentDate(): Date {
    const { now } = getCanonicalTime();
    return new Date(now);
}
