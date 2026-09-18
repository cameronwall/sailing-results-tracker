// Staged Evidence Automated Cleanup Module (V2.1)
// Invariants:
// 1. Immediate cleanup on extraction failure, explicit Cancel, or failed audit persistence.
// 2. Automated stale cleanup: Unreferenced staged evidence older than 24 hours is automatically cleaned up on the next authenticated admin session.
// 3. Permanent / audited evidence must NEVER be deleted by this cleanup process.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface StaleCleanupResult {
    deletedCount: number;
    deletedPaths: string[];
    skippedReferencedCount: number;
    skippedReferencedPaths: string[];
    errors: string[];
}

export const cleanupStaleStagedEvidence = async (
    supabase: SupabaseClient,
    options: {
        bucketName?: string;
        stagedPrefix?: string;
        olderThanMs?: number;
    } = {}
): Promise<StaleCleanupResult> => {
    const bucket = options.bucketName || 'race-evidence';
    const prefix = options.stagedPrefix || 'staged';
    const maxAgeMs = options.olderThanMs ?? (24 * 60 * 60 * 1000); // 24 hours default
    const now = Date.now();

    const result: StaleCleanupResult = {
        deletedCount: 0,
        deletedPaths: [],
        skippedReferencedCount: 0,
        skippedReferencedPaths: [],
        errors: []
    };

    try {
        // 1. Retrieve list of active referenced storage paths from official_result_sources
        // Permanent / audited evidence MUST NEVER be deleted!
        const { data: auditRows, error: auditErr } = await supabase
            .from('official_result_sources')
            .select('storage_path');

        if (auditErr) {
            result.errors.push(`Failed to query audit references: ${auditErr.message}`);
            return result;
        }

        const referencedPaths = new Set<string>();
        for (const row of auditRows || []) {
            if (row.storage_path) {
                // storage_path may contain comma-separated paths if batch uploaded
                for (const path of row.storage_path.split(',')) {
                    referencedPaths.add(path.trim());
                }
            }
        }

        // Helper to recursively collect files within prefix (handles nested staged/{raceNum}/...)
        const listAllFiles = async (currentPrefix: string): Promise<{ fullPath: string; created_at?: string }[]> => {
            const files: { fullPath: string; created_at?: string }[] = [];
            const { data: entries, error: listErr } = await supabase.storage
                .from(bucket)
                .list(currentPrefix, { limit: 100 });

            if (listErr) {
                result.errors.push(`Failed to list objects in ${bucket}/${currentPrefix}: ${listErr.message}`);
                return files;
            }

            for (const entry of entries || []) {
                const fullPath = `${currentPrefix}/${entry.name}`;
                // Folder items in Supabase storage have no id or null id and empty metadata
                const isFolder = !entry.id && (!entry.metadata || Object.keys(entry.metadata).length === 0);
                if (isFolder) {
                    const nested = await listAllFiles(fullPath);
                    files.push(...nested);
                } else {
                    files.push({ fullPath, created_at: entry.created_at });
                }
            }
            return files;
        };

        // 2. List all objects in staged namespace recursively
        const allStagedFiles = await listAllFiles(prefix);

        if (allStagedFiles.length === 0) {
            return result;
        }

        const pathsToDelete: string[] = [];

        for (const file of allStagedFiles) {
            const fullPath = file.fullPath;

            // INVARIANT: If referenced in official_result_sources, NEVER delete!
            if (referencedPaths.has(fullPath)) {
                result.skippedReferencedCount++;
                result.skippedReferencedPaths.push(fullPath);
                continue;
            }

            // Check age: must be older than 24 hours
            const createdAtMs = file.created_at ? new Date(file.created_at).getTime() : 0;
            const ageMs = now - createdAtMs;

            if (ageMs > maxAgeMs) {
                pathsToDelete.push(fullPath);
            }
        }

        if (pathsToDelete.length > 0) {
            const { error: deleteErr } = await supabase.storage
                .from(bucket)
                .remove(pathsToDelete);

            if (deleteErr) {
                result.errors.push(`Failed to delete stale objects: ${deleteErr.message}`);
            } else {
                result.deletedCount = pathsToDelete.length;
                result.deletedPaths = pathsToDelete;
            }
        }

        return result;

    } catch (err: any) {
        result.errors.push(`Cleanup error: ${err.message}`);
        return result;
    }
};

/**
 * Immediate cleanup helper for specific staged paths (e.g. on Cancel, extraction failure, audit failure)
 */
export const removeStagedEvidencePaths = async (
    supabase: SupabaseClient,
    paths: string[],
    bucket: string = 'race-evidence'
): Promise<{ success: boolean; error?: string }> => {
    if (!paths || paths.length === 0) return { success: true };
    // Safety guard: only allow deleting paths in the staged/ namespace
    const safePaths = paths.filter(p => p.startsWith('staged/') && !p.includes('..'));
    if (safePaths.length === 0) return { success: true };

    try {
        const { error } = await supabase.storage.from(bucket).remove(safePaths);
        if (error) {
            return { success: false, error: error.message };
        }
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
};
