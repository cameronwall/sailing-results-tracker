// Serverless Endpoint: /api/cleanup-staged-evidence (V2.1)
// Unreferenced staged evidence older than 24 hours is automatically cleaned up on the next authenticated admin session.

import { createClient } from '@supabase/supabase-js';
import { cleanupStaleStagedEvidence } from './stagedCleanup';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, error: 'Method Not Allowed' });
    }

    try {
        // 1. Authenticate Caller
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Missing or invalid Authorization header.'
            });
        }

        const token = authHeader.replace('Bearer ', '').trim();
        const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://zkzxxpmsainiawsejkvc.supabase.co';
        const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

        // Create Supabase client scoped to the caller's JWT (no service-role key)
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized: Invalid authentication session.'
            });
        }

        // 2. Authorize Caller (Must be in public.app_admins)
        const { data: adminData, error: adminError } = await supabase
            .from('app_admins')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);

        if (adminError || !adminData || adminData.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: Caller is not an authorized app administrator.'
            });
        }

        // 3. Execute Stale Cleanup (>24h)
        const cleanupResult = await cleanupStaleStagedEvidence(supabase, {
            bucketName: 'race-evidence',
            stagedPrefix: 'staged',
            olderThanMs: 24 * 60 * 60 * 1000 // 24 hours
        });

        return res.status(200).json({
            success: true,
            data: cleanupResult
        });

    } catch (err: any) {
        console.error('Staged cleanup error:', err);
        return res.status(500).json({
            success: false,
            error: `Cleanup failed: ${err.message}`
        });
    }
}
