import multer from "multer";
import type { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import {
  ensureEvidenceStorageDir,
  EVIDENCE_STORAGE_DIR_PATH,
} from "../lib/evidenceStorage";

ensureEvidenceStorageDir();

// Sensible document/image formats for an AML investigation file — no
// executables or scripts. Extend this list if a genuine new document
// type is needed; never widen it to "anything".
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

export const MAX_EVIDENCE_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, EVIDENCE_STORAGE_DIR_PATH);
  },
  filename: (_req, file, callback) => {
    // Random on-disk name — never trust/reuse the client-supplied
    // filename as a path component. The real original filename is kept
    // separately in CaseEvidence.fileName for display/download.
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

export const evidenceUpload = multer({
  storage,
  limits: { fileSize: MAX_EVIDENCE_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }
    callback(null, true);
  },
});

// No global Express error-handling middleware exists in this project,
// so multer's errors (thrown via its own callback mechanism, before any
// controller runs) are handled right here to keep API responses
// consistent JSON rather than Express's default HTML error page.
export function handleEvidenceUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  evidenceUpload.single("file")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        error: `File exceeds the maximum allowed size of ${
          MAX_EVIDENCE_FILE_SIZE_BYTES / (1024 * 1024)
        }MB`,
      });
      return;
    }

    if (error instanceof Error && error.message === "UNSUPPORTED_FILE_TYPE") {
      res.status(400).json({
        error:
          "Unsupported file type. Allowed: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX, CSV, TXT",
      });
      return;
    }

    console.error("Evidence upload error:", error);
    res.status(400).json({ error: "Failed to process the uploaded file" });
  });
}
