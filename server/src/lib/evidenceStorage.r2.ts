import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import type { EvidenceStorage } from "./evidenceStorage";
import { createEvidenceStorageKey } from "./evidenceStorage";

interface R2Configuration {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
}

export class R2EvidenceStorage implements EvidenceStorage {
  private readonly client: S3Client;

  constructor(private readonly configuration: R2Configuration) {
    this.client = new S3Client({
      region: "auto",
      endpoint: configuration.endpoint,
      credentials: {
        accessKeyId: configuration.accessKeyId,
        secretAccessKey: configuration.secretAccessKey,
      },
    });
  }

  async upload(input: {
    originalName: string;
    contentType: string;
    data: Buffer;
  }): Promise<string> {
    const storageKey = createEvidenceStorageKey(input.originalName);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.configuration.bucketName,
        Key: storageKey,
        Body: input.data,
        ContentType: input.contentType,
      })
    );
    return storageKey;
  }

  async get(storageKey: string): Promise<Readable | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.configuration.bucketName,
          Key: storageKey,
        })
      );
      if (!response.Body) return null;
      return Readable.from(response.Body as AsyncIterable<Uint8Array>);
    } catch (error) {
      const responseError = error as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (
        responseError.name === "NoSuchKey" ||
        responseError.$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      throw error;
    }
  }

  async delete(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.configuration.bucketName,
        Key: storageKey,
      })
    );
  }
}