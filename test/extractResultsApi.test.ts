import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/extract-race-results';
import { validateInputFile, MAX_FILE_SIZE_BYTES } from '../api/providers/providerInterface';
import { MockVisionAdapter } from '../api/providers/mockVisionAdapter';

// Mock supabase client
vi.mock('@supabase/supabase-js', () => {
    return {
        createClient: vi.fn(() => ({
            auth: {
                getUser: vi.fn(async (token: string) => {
                    if (token === 'valid_admin_token') {
                        return { data: { user: { id: 'admin_user_id', email: 'admin@myc.local' } }, error: null };
                    }
                    if (token === 'valid_non_admin_token') {
                        return { data: { user: { id: 'regular_user_id', email: 'sailor@myc.local' } }, error: null };
                    }
                    return { data: { user: null }, error: { message: 'Invalid token' } };
                })
            },
            from: vi.fn((table: string) => ({
                select: vi.fn(() => ({
                    eq: vi.fn((col: string, val: string) => ({
                        limit: vi.fn(async () => {
                            if (table === 'app_admins' && val === 'admin_user_id') {
                                return { data: [{ id: 'admin_row_id' }], error: null };
                            }
                            return { data: [], error: null };
                        })
                    }))
                }))
            }))
        }))
    };
});

describe('Extraction API Security & Input Normalization (Phase 2)', () => {

    const createMockReqRes = (options: {
        method?: string;
        headers?: Record<string, string>;
        body?: any;
    }) => {
        const req = {
            method: options.method || 'POST',
            headers: options.headers || {},
            body: options.body || {}
        };
        const res = {
            statusCode: 200,
            headers: {} as Record<string, string>,
            jsonData: null as any,
            setHeader: function (key: string, val: string) {
                this.headers[key] = val;
                return this;
            },
            status: function (code: number) {
                this.statusCode = code;
                return this;
            },
            json: function (data: any) {
                this.jsonData = data;
                return this;
            }
        };
        return { req, res };
    };

    it('rejects non-POST HTTP methods with 405 Method Not Allowed', async () => {
        const { req, res } = createMockReqRes({ method: 'GET' });
        await handler(req, res);
        expect(res.statusCode).toBe(405);
        expect(res.jsonData.error).toBe('Method Not Allowed');
    });

    it('rejects requests without Authorization header with 401 Unauthorized', async () => {
        const { req, res } = createMockReqRes({ headers: {} });
        await handler(req, res);
        expect(res.statusCode).toBe(401);
        expect(res.jsonData.error).toContain('Unauthorized');
    });

    it('rejects requests with invalid token with 401 Unauthorized', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer invalid_garbage_token' }
        });
        await handler(req, res);
        expect(res.statusCode).toBe(401);
        expect(res.jsonData.error).toContain('Invalid authentication session');
    });

    it('rejects authenticated non-admin users with 403 Forbidden', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_non_admin_token' }
        });
        await handler(req, res);
        expect(res.statusCode).toBe(403);
        expect(res.jsonData.error).toContain('Forbidden');
    });

    it('validates file size - rejects files > 10MB', () => {
        const oversized = validateInputFile({
            mimeType: 'image/png',
            sizeBytes: MAX_FILE_SIZE_BYTES + 1024,
            filename: 'huge_sheet.png'
        });
        expect(oversized.valid).toBe(false);
        expect(oversized.error).toContain('exceeds the maximum allowed size of 10MB');
    });

    it('validates MIME type - rejects unsupported formats (e.g. text/csv, image/gif)', () => {
        const invalidFormat = validateInputFile({
            mimeType: 'text/csv',
            sizeBytes: 1024,
            filename: 'results.csv'
        });
        expect(invalidFormat.valid).toBe(false);
        expect(invalidFormat.error).toContain('Unsupported file format "text/csv"');

        const validPng = validateInputFile({
            mimeType: 'image/png',
            sizeBytes: 50000,
            filename: 'results.png'
        });
        expect(validPng.valid).toBe(true);
    });

    it('permits authorized app_admin with valid image payload and returns structured extraction', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: {
                files: [
                    {
                        filename: 'race6_official.png',
                        mimeType: 'image/png',
                        dataBase64: Buffer.from('fake-image-bytes').toString('base64')
                    }
                ]
            }
        });

        await handler(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.jsonData.success).toBe(true);
        expect(res.jsonData.provider).toBeDefined();
        expect(res.jsonData.data.entries.length).toBeGreaterThan(0);
        expect(res.jsonData.data.entries[0].rawSailNumber).toBe('214582');
    });

    it('verifies MockVisionAdapter handles multiple files and preserves notes', async () => {
        const adapter = new MockVisionAdapter();
        const res = await adapter.extractOfficialResults([
            { filename: 'sheet1.png', mimeType: 'image/png', buffer: Buffer.from('1'), sizeBytes: 1 },
            { filename: 'sheet2.png', mimeType: 'image/png', buffer: Buffer.from('2'), sizeBytes: 1 }
        ]);
        expect(res.confidenceRating).toBe('HIGH');
        expect(res.entries.length).toBe(8);
        expect(res.parsingNotes).toContain('Processed 2 file(s) via MockVisionAdapter.');
    });
});
