/**
 * Learning Sessions Persistence Layer
 * Session-based content storage for Mr. Mojo Rising
 */

import { supabase } from '../lib/supabase';

export type SessionContentType =
    | 'french'
    | 'food'
    | 'analytics'
    | 'physics'
    | 'exercise'
    | 'guitar'
    | 'poetry'
    | 'coffee'
    | 'tennis'
    | 'history'
    | 'geopolitics'
    | 'hood';

export interface LearningSession {
    id: string;
    user_id: string;
    content_type: SessionContentType;
    content: Record<string, unknown>;
    title?: string;
    created_at: string;
    updated_at: string;
}

export interface SessionSummary {
    id: string;
    content_type: SessionContentType;
    title?: string;
    created_at: string;
}

/**
 * Create a new learning session
 */
export async function createSession(
    userId: string,
    contentType: SessionContentType,
    content: Record<string, unknown>,
    title?: string
): Promise<LearningSession | null> {
    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .insert({
                user_id: userId,
                content_type: contentType,
                content: content,
                title: title
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating session:', error);
            return null;
        }

        return data as LearningSession;
    } catch (error) {
        console.error('Error creating session:', error);
        return null;
    }
}

/**
 * Get a specific session by ID
 */
export async function getSession(
    userId: string,
    sessionId: string
): Promise<LearningSession | null> {
    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('id', sessionId)
            .maybeSingle();

        if (error) {
            console.error('Error getting session:', error);
            return null;
        }

        return data as LearningSession | null;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

/**
 * Get the most recent session for a content type
 */
export async function getLatestSession(
    userId: string,
    contentType: SessionContentType
): Promise<LearningSession | null> {
    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .select('*')
            .eq('user_id', userId)
            .eq('content_type', contentType)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error getting latest session:', error);
            return null;
        }

        if (!data) {
            return null;
        }

        return data as LearningSession;
    } catch (error) {
        console.error('Error getting latest session:', error);
        return null;
    }
}

/**
 * Get all sessions for a content type (paginated)
 */
export async function getSessionsByType(
    userId: string,
    contentType: SessionContentType,
    limit: number = 20,
    offset: number = 0
): Promise<SessionSummary[]> {
    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .select('id, content_type, title, created_at')
            .eq('user_id', userId)
            .eq('content_type', contentType)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error getting sessions by type:', error);
            return [];
        }

        return (data || []) as SessionSummary[];
    } catch (error) {
        console.error('Error getting sessions by type:', error);
        return [];
    }
}

/**
 * Get recent sessions across all content types (for timeline view)
 */
export async function getRecentSessions(
    userId: string,
    limit: number = 20,
    offset: number = 0
): Promise<SessionSummary[]> {
    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .select('id, content_type, title, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error getting recent sessions:', error);
            return [];
        }

        return (data || []) as SessionSummary[];
    } catch (error) {
        console.error('Error getting recent sessions:', error);
        return [];
    }
}

/**
 * Get session counts grouped by content type
 */
export async function getSessionCounts(
    userId: string
): Promise<Record<SessionContentType, number>> {
    try {
        const { data, error } = await supabase
            .from('learning_sessions')
            .select('content_type')
            .eq('user_id', userId);

        if (error) {
            console.error('Error getting session counts:', error);
            return {} as Record<SessionContentType, number>;
        }

        // Count sessions by type
        const counts: Record<string, number> = {};
        for (const session of data || []) {
            const type = session.content_type;
            counts[type] = (counts[type] || 0) + 1;
        }

        return counts as Record<SessionContentType, number>;
    } catch (error) {
        console.error('Error getting session counts:', error);
        return {} as Record<SessionContentType, number>;
    }
}

/**
 * Delete a session
 */
export async function deleteSession(
    userId: string,
    sessionId: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('learning_sessions')
            .delete()
            .eq('user_id', userId)
            .eq('id', sessionId);

        if (error) {
            console.error('Error deleting session:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error deleting session:', error);
        return false;
    }
}

/**
 * Update session title
 */
export async function updateSessionTitle(
    userId: string,
    sessionId: string,
    title: string
): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('learning_sessions')
            .update({ title })
            .eq('user_id', userId)
            .eq('id', sessionId);

        if (error) {
            console.error('Error updating session title:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error updating session title:', error);
        return false;
    }
}

/**
 * Topic metadata for UI display
 */
export const TOPIC_METADATA: Record<SessionContentType, {
    label: string;
    icon: string;
    description: string;
}> = {
    french: {
        label: 'French',
        icon: '🇫🇷',
        description: 'Learn French sounds and vocabulary'
    },
    food: {
        label: 'Food',
        icon: '🍽️',
        description: 'Daily meal planning and nutrition'
    },
    analytics: {
        label: 'Analytics',
        icon: '📊',
        description: 'SQL, DAX, and data engineering'
    },
    physics: {
        label: 'Physics',
        icon: '🔧',
        description: 'Transportation and mechanics'
    },
    exercise: {
        label: 'Exercise',
        icon: '💪',
        description: 'Workout plans and fitness'
    },
    guitar: {
        label: 'Guitar',
        icon: '🎸',
        description: 'Learn classic rock songs'
    },
    poetry: {
        label: 'Poetry',
        icon: '📜',
        description: 'Discover beautiful poetry'
    },
    coffee: {
        label: 'Coffee',
        icon: '☕',
        description: 'Coffee industry insights'
    },
    tennis: {
        label: 'Tennis',
        icon: '🎾',
        description: 'Tennis news and updates'
    },
    history: {
        label: 'History',
        icon: '📚',
        description: 'Historical documentaries'
    },
    geopolitics: {
        label: 'World Order',
        icon: '🌍',
        description: 'Geopolitical news and analysis'
    },
    hood: {
        label: 'Curious',
        icon: '🔍',
        description: 'Explore curious topics'
    }
};

/**
 * Get all available topics
 */
export function getAllTopics(): SessionContentType[] {
    return Object.keys(TOPIC_METADATA) as SessionContentType[];
}
