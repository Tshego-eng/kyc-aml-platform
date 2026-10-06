import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import type { Readable } from "stream";
import {
  createEvidenceStorageKey,
  EVIDENCE_STORAGE_DIR,
  type EvidenceStorage,
} from "./evidenceStorage";

export class LocalEvidenceStorage implements EvidenceStorage {
  async upload(input: {
    originalName: string;
    contentType: string;
    data: Buffer;
  }): Promise<string> {
    await fs.mkdir(EVIDENCE_STORAGE_DIR, { recursive: true });
    const storageKey = createEvidenceStorageKey(input.originalName);
    await fs.writeFile(path.join(EVIDENCE_STORAGE_DIR, storageKey), input.data, {
      flag: "wx",
    });
    return storageKey;
  }

  async get(storageKey: string): Promise<Readable | null> {
    const filePath = this.resolvePath(storageKey);
    try {
      await fs.access(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
    return createReadStream(filePath);
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(this.resolvePath(storageKey), { force: true });
  }

  private resolvePath(storageKey: string): string {
    if (!storageKey || path.basename(storageKey) !== storageKey) {
      throw new Error("Invalid evidence storage key");
    }
    return path.join(EVIDENCE_STORAGE_DIR, storageKey);
  }
}