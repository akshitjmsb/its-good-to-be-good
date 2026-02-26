import { supabase } from '../lib/supabase';

export type ContentType = 
    | 'food-plan' 
    | 'analytics' 
    | 'transportation-physics' 
    | 'exercise-plan' 
    | 'weekly-exercise' 
    | 'archive'
    | 'classic-rock-500';

/**
 * Get cached content from Supabase
 */
export async function getCachedContent(
    userId: string,
    contentType: ContentType,
    dateKey: string
): Promise<any | null> {
    try {
        const { data, error } = await supabase
            .from('content_cache')
            .select('content')
            .eq('user_id', userId)
            .eq('content_type', contentType)
            .eq('date_key', dateKey)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            console.error('Error getting cached content:', error);
            return null;
        }

        return data?.content || null;
    } catch (error) {
        console.error('Error getting cached content:', error);
        return null;
    }
}

/**
 * Save content to Supabase cache
 */
export async function saveCachedContent(
    userId: string,
    contentType: ContentType,
    dateKey: string,
    content: any
): Promise<void> {
    try {
        const { error } = await supabase
            .from('content_cache')
            .upsert({
                user_id: userId,
                content_type: contentType,
                date_key: dateKey,
                content: content,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'user_id,content_type,date_key'
            });

        if (error) {
            console.error('Error saving cached content:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error saving cached content:', error);
        throw error;
    }
}

/**
 * Get cached food plan (stored as text, not JSON)
 */
export async function getCachedFoodPlan(
    userId: string,
    dateKey: string
): Promise<string | null> {
    try {
        const cached = await getCachedContent(userId, 'food-plan', dateKey);
        if (cached && typeof cached === 'string') {
            return cached;
        }
        if (cached && typeof cached === 'object' && 'plan' in cached) {
            return cached.plan as string;
        }
        return null;
    } catch (error) {
        console.error('Error getting cached food plan:', error);
        return null;
    }
}

/**
 * Save food plan to cache
 */
export async function saveFoodPlan(
    userId: string,
    dateKey: string,
    plan: string
): Promise<void> {
    try {
        // Store food plan as string in content JSONB
        await saveCachedContent(userId, 'food-plan', dateKey, plan);
    } catch (error) {
        console.error('Error saving food plan:', error);
        throw error;
    }
}

/**
 * Check if a generation flag exists
 */
export async function hasGenerationFlag(
    userId: string,
    flagType: 'auto-generation-attempted' | 'night-generation' | 'archived',
    dateKey: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('generation_flags')
            .select('id')
            .eq('user_id', userId)
            .eq('flag_type', flagType)
            .eq('date_key', dateKey)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return false;
            }
            console.error('Error checking generation flag:', error);
            return false;
        }

        return data !== null;
    } catch (error) {
        console.error('Error checking generation flag:', error);
        return false;
    }
}

/**
 * Set a generation flag
 */
export async function setGenerationFlag(
    userId: string,
    flagType: 'auto-generation-attempted' | 'night-generation' | 'archived',
    dateKey: string
): Promise<void> {
    try {
        const { error } = await supabase
            .from('generation_flags')
            .upsert({
                user_id: userId,
                flag_type: flagType,
                date_key: dateKey
            }, {
                onConflict: 'user_id,flag_type,date_key'
            });

        if (error) {
            console.error('Error setting generation flag:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error setting generation flag:', error);
        throw error;
    }
}
