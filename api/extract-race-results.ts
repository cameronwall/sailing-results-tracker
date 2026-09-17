// Serverless API Endpoint: /api/extract-race-results (V2.1)

import { createClient } from '@supabase/supabase-js';
import { getExtractionProvider, validateInputFile, type ExtractionInputFile } from './providers';

export interface ExtractResultsApiResponse {
    success: boolean;
    provider: string;
    data?: any;
    error?: string;
}

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

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
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

        // 3. Parse & Validate Incoming Files
        // Supports base64 JSON payload: { files: [{ dataBase64, mimeType, filename }] }
        const { files } = req.body || {};
        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request: At least one race sheet file must be provided.'
            });
        }

        const parsedFiles: ExtractionInputFile[] = [];
        for (const file of files) {
            if (!file.dataBase64 || !file.mimeType || !file.filename) {
                return res.status(400).json({
                    success: false,
                    error: 'Bad Request: Each file requires dataBase64, mimeType, and filename.'
                });
            }

            const buffer = Buffer.from(file.dataBase64, 'base64');
            const validation = validateInputFile({
                mimeType: file.mimeType,
                sizeBytes: buffer.length,
                filename: file.filename
            });

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }

            parsedFiles.push({
                buffer,
                mimeType: file.mimeType,
                filename: file.filename,
                sizeBytes: buffer.length
            });
        }

        // 4. Delegate to Configured Provider via Adapter
        const provider = getExtractionProvider();
        const extractionResult = await provider.extractOfficialResults(parsedFiles);

        return res.status(200).json({
            success: true,
            provider: provider.providerName,
            data: extractionResult
        });

    } catch (err: any) {
        console.error('Extraction handler error:', err);
        return res.status(500).json({
            success: false,
            error: `Extraction failed: ${err.message}`
        });
    }
}
