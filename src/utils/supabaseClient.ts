import { createClient } from '@supabase/supabase-js';
import type { Boat } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials in environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Helper to map DB row to Boat type if needed (though our schema matches)
export const mapBoatFromDB = (data: any): Boat => ({
    id: data.id,
    skipper: data.skipper,
    boatName: data.boat_name, // DB uses snake_case
    sailNumber: data.sail_number, // DB uses snake_case
    results: data.results || [],
    total: 0, // Calculated on client
    nett: 0, // Calculated on client
    rank: 0 // Calculated on client
});
