// Serverless API Endpoint: /api/extract-race-results (V2.1)

import { createClient } from '@supabase/supabase-js';
import {
    getExtractionProvider,
    validateInputFile,
    validateStoragePaths,
    getMimeTypeFromFilename,
    type ExtractionInputFile
} from './providers';

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

        // Create Supabase client scoped to the caller's JWT (no service-role key needed or used)
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

        // 3. Parse & Validate Incoming Storage References
        // Invariant: Extraction endpoint accepts storage references, never Base64 image payloads!
        if (req.body?.files || req.body?.dataBase64) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request: Base64 payloads are disabled. Pass storage references via { storagePaths: string[] }.'
            });
        }

        const { storagePaths } = req.body || {};
        const pathValidation = validateStoragePaths(storagePaths);
        if (!pathValidation.valid || !pathValidation.validatedPaths) {
            return res.status(400).json({
                success: false,
                error: pathValidation.error
            });
        }

        // 4. Download & Revalidate Staged Files under Authenticated Admin Context
        const parsedFiles: ExtractionInputFile[] = [];
        for (const storagePath of pathValidation.validatedPaths) {
            const { data: fileBlob, error: downloadError } = await supabase.storage
                .from('race-evidence')
                .download(storagePath);

            if (downloadError || !fileBlob) {
                return res.status(404).json({
                    success: false,
                    error: `Storage reference not found or inaccessible: "${storagePath}". (${downloadError?.message || 'Download error'})`
                });
            }

            const filename = storagePath.split('/').pop() || 'sheet.png';
            const buffer = Buffer.from(await fileBlob.arrayBuffer());
            const mimeType = fileBlob.type || getMimeTypeFromFilename(filename);

            const fileValidation = validateInputFile({
                mimeType,
                sizeBytes: buffer.length,
                filename
            });

            if (!fileValidation.valid) {
                return res.status(400).json({
                    success: false,
                    error: fileValidation.error
                });
            }

            parsedFiles.push({
                buffer,
                mimeType,
                filename,
                sizeBytes: buffer.length
            });
        }

        // 5. Delegate to Configured Provider via Adapter
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
