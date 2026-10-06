import crypto from "crypto";
import path from "path";
import type { Readable } from "stream";
import { LocalEvidenceStorage } from "./evidenceStorage.local";
import { R2EvidenceStorage } from "./evidenceStorage.r2";

export interface EvidenceStorage {
  upload(input: {
    originalName: string;
    contentType: string;
    data: Buffer;
  }): Promise<string>;
  get(storageKey: string): Promise<Readable | null>;
  delete(storageKey: string): Promise<void>;
}

export const EVIDENCE_STORAGE_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "uploads",
  "evidence"
);

export function createEvidenceStorageKey(originalName: string): string {
  const extension = path
    .extname(originalName)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 20);
  return `${crypto.randomUUID()}${extension}`;
}

let storageInstance: EvidenceStorage | undefined;

export function getEvidenceStorage(): EvidenceStorage {
  if (storageInstance) return storageInstance;

  const storageType = process.env.EVIDENCE_STORAGE || "local";
  if (storageType === "local") {
    const storage = new LocalEvidenceStorage();
    storageInstance = storage;
    return storage;
  }

  if (storageType === "r2") {
    const requiredVariables = [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ];
    const missingVariables = requiredVariables.filter(
      (name) => !process.env[name]
    );

    if (missingVariables.length > 0) {
      throw new Error(
        `R2 evidence storage is missing required configuration: ${missingVariables.join(", ")}`
      );
    }

    const storage = new R2EvidenceStorage({
      accountId: process.env.R2_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME!,
      endpoint:
        process.env.R2_ENDPOINT ||
        `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    });
    storageInstance = storage;
    return storage;
  }

  throw new Error(
    `Unsupported EVIDENCE_STORAGE value "${storageType}". Use "local" or "r2".`
  );
}

export function validateEvidenceStorageConfiguration(): void {
  getEvidenceStorage();
}
