import { createClient } from '@supabase/supabase-js';
import type { Boat } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials in environment variables. Running in local fallback mode.');
}

// Client strictly uses anonymous/public credentials. No service-role key is ever exposed.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to map DB row to legacy Boat type
 */
export const mapBoatFromDB = (data: any): Boat => ({
    id: data.id,
    skipper: data.skipper,
    boatName: data.boat_name,
    sailNumber: data.sail_number,
    results: data.results || [],
    total: 0,
    nett: 0,
    rank: 0
});

/**
 * Checks whether the currently authenticated user is an authorized administrator.
 * In accordance with business rules, being authenticated alone is NOT sufficient.
 * The user must have a verified entry in public.app_admins.
 */
export const checkIsAdmin = async (): Promise<boolean> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return false;

        const { data, error } = await supabase
            .from('app_admins')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (error) {
            // Table may not be created in Supabase yet, return false
            return false;
        }

        return Boolean(data);
    } catch {
        return false;
    }
};

/**
 * Initiates Supabase Magic Link passwordless authentication.
 */
export const signInWithMagicLink = async (email: string) => {
    return await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: window.location.origin
        }
    });
};

/**
 * Signs out the current user.
 */
export const signOutAdmin = async () => {
    return await supabase.auth.signOut();
};
