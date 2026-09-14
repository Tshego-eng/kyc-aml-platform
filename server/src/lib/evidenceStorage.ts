import fs from "fs";
import path from "path";

/**
 * Evidence files are stored on local disk under Server/uploads/evidence/,
 * served only through the authenticated download endpoint (never via
 * express.static), so access always goes through the same RBAC check as
 * the rest of the case. This directory is gitignored — see root
 * .gitignore. If this project moves to a cloud deployment later, this
 * module is the only place that needs to change (swap the
 * read/write/delete functions for an object-storage SDK call) — nothing
 * else in the codebase should need to know where files physically live.
 */
const EVIDENCE_STORAGE_DIR = path.resolve(
  process.cwd(),
  "uploads",
  "evidence"
);

export function ensureEvidenceStorageDir(): void {
  fs.mkdirSync(EVIDENCE_STORAGE_DIR, { recursive: true });
}

export function evidenceStoragePath(storageKey: string): string {
  return path.join(EVIDENCE_STORAGE_DIR, storageKey);
}

export function deleteEvidenceFile(storageKey: string): void {
  const filePath = evidenceStoragePath(storageKey);
  fs.rm(filePath, { force: true }, (error) => {
    if (error) {
      console.error(`Failed to delete evidence file ${storageKey}:`, error);
    }
  });
}

export const EVIDENCE_STORAGE_DIR_PATH = EVIDENCE_STORAGE_DIR;
