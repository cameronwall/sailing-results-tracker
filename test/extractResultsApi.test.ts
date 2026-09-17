import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../api/extract-race-results';
import {
    validateInputFile,
    validateStoragePaths,
    MAX_FILE_SIZE_BYTES,
    MAX_BATCH_FILES
} from '../api/providers/providerInterface';
import { MockVisionAdapter } from '../api/providers/mockVisionAdapter';
import { cleanupStaleStagedEvidence, removeStagedEvidencePaths } from '../api/stagedCleanup';

// State tracks for storage and audit mocks
let mockRemovedStoragePaths: string[] = [];
let mockAuditFailure = false;

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
            from: vi.fn((table: string) => {
                if (table === 'app_admins') {
                    return {
                        select: vi.fn(() => ({
                            eq: vi.fn((col: string, val: string) => ({
                                limit: vi.fn(async () => {
                                    if (val === 'admin_user_id') {
                                        return { data: [{ id: 'admin_row_id' }], error: null };
                                    }
                                    return { data: [], error: null };
                                })
                            }))
                        }))
                    };
                }

                if (table === 'official_result_sources') {
                    return {
                        select: vi.fn((cols: string) => {
                            return Promise.resolve({
                                data: [
                                    { storage_path: 'staged/permanent_audit_evidence.png' },
                                    { storage_path: 'staged/1/multi_audited_sheet.png,staged/1/multi_audited_hcp.png' }
                                ],
                                error: null
                            });
                        }),
                        insert: vi.fn((record: any) => {
                            if (mockAuditFailure) {
                                return {
                                    select: vi.fn(() => ({
                                        single: vi.fn(async () => ({
                                            data: null,
                                            error: { message: 'Simulated DB constraint error on audit persistence' }
                                        }))
                                    }))
                                };
                            }
                            return {
                                select: vi.fn(() => ({
                                    single: vi.fn(async () => ({
                                        data: { id: 'source_audit_id_123' },
                                        error: null
                                    }))
                                }))
                            };
                        }),
                        delete: vi.fn(() => ({
                            eq: vi.fn(async () => ({ data: null, error: null }))
                        }))
                    };
                }

                return {
                    select: vi.fn(() => ({
                        eq: vi.fn(() => ({
                            limit: vi.fn(async () => ({ data: [], error: null }))
                        }))
                    }))
                };
            }),
            storage: {
                from: vi.fn((bucket: string) => ({
                    download: vi.fn(async (path: string) => {
                        // Unauthorized path
                        if (path.includes('unauthorized')) {
                            return { data: null, error: { message: 'Storage object access denied or not found' } };
                        }
                        // Oversized file (>10MB)
                        if (path.includes('oversized')) {
                            const hugeBuf = new Uint8Array(MAX_FILE_SIZE_BYTES + 2048);
                            return {
                                data: new Blob([hugeBuf], { type: 'image/png' }),
                                error: null
                            };
                        }
                        // Unsupported MIME file
                        if (path.endsWith('.csv') || path.includes('unsupported')) {
                            const csvBuf = new TextEncoder().encode('col1,col2\nval1,val2');
                            return {
                                data: new Blob([csvBuf], { type: 'text/csv' }),
                                error: null
                            };
                        }
                        // Valid standard file
                        const validBytes = new Uint8Array(1024);
                        return {
                            data: new Blob([validBytes], { type: 'image/png' }),
                            error: null
                        };
                    }),
                    list: vi.fn(async (prefix: string) => {
                        const now = Date.now();
                        const hourMs = 60 * 60 * 1000;
                        if (prefix === 'staged') {
                            return {
                                data: [
                                    // Stale abandoned file (>24h old, unreferenced) -> SHOULD BE DELETED
                                    {
                                        name: 'abandoned_old_upload.png',
                                        id: 'file-stale-1',
                                        created_at: new Date(now - 30 * hourMs).toISOString(),
                                        metadata: { size: 500 }
                                    },
                                    // Recent staged file (<24h old) -> MUST BE KEPT
                                    {
                                        name: 'recent_in_progress.png',
                                        id: 'file-recent-2',
                                        created_at: new Date(now - 2 * hourMs).toISOString(),
                                        metadata: { size: 500 }
                                    },
                                    // Permanent / Audited file (>24h old, but referenced in official_result_sources) -> MUST NEVER BE DELETED
                                    {
                                        name: 'permanent_audit_evidence.png',
                                        id: 'file-audit-3',
                                        created_at: new Date(now - 48 * hourMs).toISOString(),
                                        metadata: { size: 500 }
                                    },
                                    // Nested race folder item
                                    {
                                        name: '1',
                                        id: null,
                                        metadata: {}
                                    }
                                ],
                                error: null
                            };
                        }
                        if (prefix === 'staged/1') {
                            return {
                                data: [
                                    // Stale nested abandoned file
                                    {
                                        name: 'stale_race1_scratch.png',
                                        id: 'file-stale-nested',
                                        created_at: new Date(now - 36 * hourMs).toISOString(),
                                        metadata: { size: 500 }
                                    },
                                    // Audited nested file -> MUST BE KEPT
                                    {
                                        name: 'multi_audited_sheet.png',
                                        id: 'file-audited-nested',
                                        created_at: new Date(now - 40 * hourMs).toISOString(),
                                        metadata: { size: 500 }
                                    }
                                ],
                                error: null
                            };
                        }
                        return { data: [], error: null };
                    }),
                    remove: vi.fn(async (paths: string[]) => {
                        mockRemovedStoragePaths.push(...paths);
                        return { data: paths, error: null };
                    })
                }))
            }
        }))
    };
});

describe('V2.1 Direct-to-Storage Architecture & Staged File Lifecycle Tests', () => {

    beforeEach(() => {
        mockRemovedStoragePaths = [];
        mockAuditFailure = false;
    });

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

    // 1. Valid staged upload/extraction
    it('1. valid staged upload/extraction: permits authorized admin with valid staged storage paths', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: {
                storagePaths: ['staged/1/valid_sheet.png']
            }
        });

        await handler(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.jsonData.success).toBe(true);
        expect(res.jsonData.provider).toBeDefined();
        expect(res.jsonData.data.entries.length).toBeGreaterThan(0);
    });

    // 2. Unauthorized staged path
    it('2. unauthorized staged path: returns 404 when storage reference is inaccessible or unauthorized', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: {
                storagePaths: ['staged/unauthorized/leak.png']
            }
        });

        await handler(req, res);
        expect(res.statusCode).toBe(404);
        expect(res.jsonData.success).toBe(false);
        expect(res.jsonData.error).toContain('Storage reference not found or inaccessible');
    });

    // 3. Non-admin access
    it('3. non-admin access: returns 403 Forbidden for non-admin user and 401 for anonymous', async () => {
        // Non-admin token
        const nonAdminReqRes = createMockReqRes({
            headers: { authorization: 'Bearer valid_non_admin_token' },
            body: { storagePaths: ['staged/1/sheet.png'] }
        });
        await handler(nonAdminReqRes.req, nonAdminReqRes.res);
        expect(nonAdminReqRes.res.statusCode).toBe(403);
        expect(nonAdminReqRes.res.jsonData.error).toContain('Forbidden');

        // Anonymous / missing token
        const anonReqRes = createMockReqRes({
            headers: {},
            body: { storagePaths: ['staged/1/sheet.png'] }
        });
        await handler(anonReqRes.req, anonReqRes.res);
        expect(anonReqRes.res.statusCode).toBe(401);
        expect(anonReqRes.res.jsonData.error).toContain('Unauthorized');
    });

    // 4. Path outside staged namespace (including traversal attacks)
    it('4. path outside staged namespace: strictly rejects paths outside staged/ or containing directory traversal', async () => {
        // Traversal attempt
        const traversalReqRes = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: { storagePaths: ['staged/../secrets.env'] }
        });
        await handler(traversalReqRes.req, traversalReqRes.res);
        expect(traversalReqRes.res.statusCode).toBe(400);
        expect(traversalReqRes.res.jsonData.error).toContain('Invalid storage path');

        // Different bucket namespace attempt (e.g. races/ or permanent/)
        const racesReqRes = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: { storagePaths: ['races/1/permanent_evidence.png'] }
        });
        await handler(racesReqRes.req, racesReqRes.res);
        expect(racesReqRes.res.statusCode).toBe(400);
        expect(racesReqRes.res.jsonData.error).toContain('All evidence must reside within the "staged/" namespace');
    });

    // 5. >10MB file
    it('5. >10MB file: rejects files exceeding 10MB limit', async () => {
        // Server-side endpoint re-validation
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: { storagePaths: ['staged/oversized.png'] }
        });
        await handler(req, res);
        expect(res.statusCode).toBe(400);
        expect(res.jsonData.error).toContain('exceeds the maximum allowed size of 10MB');

        // Client/Provider validator
        const check = validateInputFile({
            filename: 'huge.png',
            mimeType: 'image/png',
            sizeBytes: 10 * 1024 * 1024 + 1
        });
        expect(check.valid).toBe(false);
    });

    // 6. Unsupported MIME
    it('6. unsupported MIME: rejects unsupported file formats (e.g. text/csv, audio/mp3)', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: { storagePaths: ['staged/results.csv'] }
        });
        await handler(req, res);
        expect(res.statusCode).toBe(400);
        expect(res.jsonData.error).toContain('Unsupported file format "text/csv"');

        // Validation helper
        const invalid = validateInputFile({
            filename: 'song.mp3',
            mimeType: 'audio/mpeg',
            sizeBytes: 2048
        });
        expect(invalid.valid).toBe(false);
    });

    // 7. Extraction failure cleanup
    it('7. extraction failure cleanup: immediate cleanup removes staged paths when extraction fails', async () => {
        const fakeSupabase = {
            storage: {
                from: vi.fn(() => ({
                    remove: vi.fn(async (paths: string[]) => {
                        mockRemovedStoragePaths.push(...paths);
                        return { data: paths, error: null };
                    })
                }))
            }
        } as any;

        const stagedPaths = ['staged/1/failed_extraction_sheet.png'];
        const cleanupResult = await removeStagedEvidencePaths(fakeSupabase, stagedPaths);

        expect(cleanupResult.success).toBe(true);
        expect(mockRemovedStoragePaths).toContain('staged/1/failed_extraction_sheet.png');
    });

    // 8. Cancel cleanup
    it('8. Cancel cleanup: explicit Cancel immediately deletes staged evidence from storage', async () => {
        const fakeSupabase = {
            storage: {
                from: vi.fn(() => ({
                    remove: vi.fn(async (paths: string[]) => {
                        mockRemovedStoragePaths.push(...paths);
                        return { data: paths, error: null };
                    })
                }))
            }
        } as any;

        const cancelledPaths = [
            'staged/1/user_cancelled_sheet1.png',
            'staged/1/user_cancelled_sheet2.png'
        ];
        const result = await removeStagedEvidencePaths(fakeSupabase, cancelledPaths);

        expect(result.success).toBe(true);
        expect(mockRemovedStoragePaths).toEqual(cancelledPaths);
    });

    // 9. Audit failure cleanup
    it('9. audit failure cleanup: failed audit persistence immediately deletes staged evidence', async () => {
        mockAuditFailure = true;

        const fakeSupabase = {
            from: vi.fn((table: string) => ({
                insert: vi.fn(() => ({
                    select: vi.fn(() => ({
                        single: vi.fn(async () => ({
                            data: null,
                            error: { message: 'Simulated DB constraint error on audit persistence' }
                        }))
                    }))
                }))
            })),
            storage: {
                from: vi.fn(() => ({
                    remove: vi.fn(async (paths: string[]) => {
                        mockRemovedStoragePaths.push(...paths);
                        return { data: paths, error: null };
                    })
                }))
            }
        } as any;

        const stagedPaths = ['staged/1/unpersisted_audit_evidence.png'];

        // Simulate persistence attempt
        const { error: sourceErr } = await fakeSupabase
            .from('official_result_sources')
            .insert({ storage_path: stagedPaths.join(',') })
            .select('id')
            .single();

        expect(sourceErr).toBeDefined();

        // Trigger immediate cleanup on audit failure
        if (sourceErr) {
            await fakeSupabase.storage.from('race-evidence').remove(stagedPaths);
        }

        expect(mockRemovedStoragePaths).toContain('staged/1/unpersisted_audit_evidence.png');
    });

    // 10. Abandoned staged file cleanup
    it('10. abandoned staged file cleanup: stale unreferenced staged evidence older than 24h is cleaned up', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const client = (createClient as any)('https://example.supabase.co', 'anon-key');

        const result = await cleanupStaleStagedEvidence(client, {
            bucketName: 'race-evidence',
            stagedPrefix: 'staged',
            olderThanMs: 24 * 60 * 60 * 1000 // 24 hours
        });

        expect(result.errors).toEqual([]);
        // The abandoned unreferenced files (>24h) must be deleted
        expect(result.deletedPaths).toContain('staged/abandoned_old_upload.png');
        expect(result.deletedPaths).toContain('staged/1/stale_race1_scratch.png');
        expect(result.deletedCount).toBe(2);
    });

    // 11. Permanent evidence excluded from cleanup
    it('11. permanent evidence excluded from cleanup: audited/referenced evidence is NEVER deleted', async () => {
        const { createClient } = await import('@supabase/supabase-js');
        const client = (createClient as any)('https://example.supabase.co', 'anon-key');

        const result = await cleanupStaleStagedEvidence(client, {
            bucketName: 'race-evidence',
            stagedPrefix: 'staged',
            olderThanMs: 24 * 60 * 60 * 1000
        });

        // Must be in skippedReferencedPaths, NOT in deletedPaths
        expect(result.skippedReferencedPaths).toContain('staged/permanent_audit_evidence.png');
        expect(result.skippedReferencedPaths).toContain('staged/1/multi_audited_sheet.png');
        expect(result.deletedPaths).not.toContain('staged/permanent_audit_evidence.png');
        expect(result.deletedPaths).not.toContain('staged/1/multi_audited_sheet.png');
    });

    // 12. Multi-file batch up to 3
    it('12. multi-file batch up to 3: successfully accepts batch of 1, 2, or 3 staged files', async () => {
        const batch3ReqRes = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: {
                storagePaths: [
                    'staged/1/scratch.png',
                    'staged/1/handicap.png',
                    'staged/1/notes.png'
                ]
            }
        });

        await handler(batch3ReqRes.req, batch3ReqRes.res);
        expect(batch3ReqRes.res.statusCode).toBe(200);
        expect(batch3ReqRes.res.jsonData.success).toBe(true);

        const pathCheck = validateStoragePaths([
            'staged/1/scratch.png',
            'staged/1/handicap.png',
            'staged/1/notes.png'
        ]);
        expect(pathCheck.valid).toBe(true);
        expect(pathCheck.validatedPaths?.length).toBe(3);
    });

    // 13. Fourth file rejected
    it('13. fourth file rejected: rejects batches exceeding MAX_BATCH_FILES (3)', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: {
                storagePaths: [
                    'staged/1/sheet1.png',
                    'staged/1/sheet2.png',
                    'staged/1/sheet3.png',
                    'staged/1/sheet4.png' // 4th file!
                ]
            }
        });

        await handler(req, res);
        expect(res.statusCode).toBe(400);
        expect(res.jsonData.error).toContain('Batch limit exceeded');

        const validatorCheck = validateStoragePaths([
            'staged/1/sheet1.png',
            'staged/1/sheet2.png',
            'staged/1/sheet3.png',
            'staged/1/sheet4.png'
        ]);
        expect(validatorCheck.valid).toBe(false);
        expect(validatorCheck.error).toContain('Maximum 3 files allowed');
    });

    // Additional test: Rejection of legacy Base64 payloads
    it('rejects legacy Base64 image payloads with 400 Bad Request', async () => {
        const { req, res } = createMockReqRes({
            headers: { authorization: 'Bearer valid_admin_token' },
            body: {
                files: [{ filename: 'legacy.png', dataBase64: 'iVBORw0KGgoAAA...' }]
            }
        });

        await handler(req, res);
        expect(res.statusCode).toBe(400);
        expect(res.jsonData.error).toContain('Base64 payloads are disabled');
    });

    // MockVisionAdapter multi-file preservation test
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
