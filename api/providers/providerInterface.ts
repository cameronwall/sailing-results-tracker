// Provider-Neutral Interface for Official Results Extraction (V2.1)

import type { RawFleetExtractionResult } from '../../src/types/import';

export interface ExtractionInputFile {
    buffer: Uint8Array | any;
    mimeType: string;
    filename: string;
    sizeBytes: number;
}

export interface ResultExtractionProvider {
    readonly providerName: string;
    extractOfficialResults(
        files: ExtractionInputFile[]
    ): Promise<RawFleetExtractionResult>;
}

export const SUPPORTED_MIME_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/heic',
    'application/pdf'
] as const;

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_BATCH_FILES = 3; // Maximum 3 files per extraction batch

export const validateStoragePaths = (
    paths: unknown
): { valid: boolean; error?: string; validatedPaths?: string[] } => {
    if (!Array.isArray(paths) || paths.length === 0) {
        return { valid: false, error: 'Bad Request: At least one storage path must be provided.' };
    }
    if (paths.length > MAX_BATCH_FILES) {
        return { valid: false, error: `Bad Request: Batch limit exceeded. Maximum ${MAX_BATCH_FILES} files allowed.` };
    }
    const validatedPaths: string[] = [];
    for (const p of paths) {
        if (typeof p !== 'string') {
            return { valid: false, error: 'Bad Request: Storage path must be a string.' };
        }
        const trimmed = p.trim();
        // Restrict strictly to staged/ namespace, disallow path traversal
        if (!trimmed.startsWith('staged/') || trimmed.includes('..') || trimmed.includes('\\')) {
            return {
                valid: false,
                error: `Bad Request: Invalid storage path "${p}". All evidence must reside within the "staged/" namespace.`
            };
        }
        validatedPaths.push(trimmed);
    }
    return { valid: true, validatedPaths };
};

export const getMimeTypeFromFilename = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'webp': return 'image/webp';
        case 'heic': return 'image/heic';
        case 'pdf': return 'application/pdf';
        default: return 'application/octet-stream';
    }
};

export const validateInputFile = (
    file: { mimeType: string; sizeBytes: number; filename: string }
): { valid: boolean; error?: string } => {
    if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
        return {
            valid: false,
            error: `File "${file.filename}" exceeds the maximum allowed size of 10MB (${(file.sizeBytes / (1024 * 1024)).toFixed(1)}MB).`
        };
    }

    const normMime = file.mimeType.toLowerCase();
    const isSupported = (SUPPORTED_MIME_TYPES as readonly string[]).includes(normMime);
    if (!isSupported) {
        return {
            valid: false,
            error: `Unsupported file format "${file.mimeType}" for "${file.filename}". Supported formats: PNG, JPEG, WEBP, HEIC, PDF.`
        };
    }

    return { valid: true };
};
