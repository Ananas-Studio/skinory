import {
  BlobServiceClient,
  ContainerClient,
} from "@azure/storage-blob";
import { env } from "../config/env.js";

const CONTAINER_NAME = "product-images";

let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (!containerClient) {
    if (!env.azureStorageConnectionString) {
      throw new Error("AZURE_STORAGE_CONNECTION_STRING is not configured");
    }
    const blobService = BlobServiceClient.fromConnectionString(
      env.azureStorageConnectionString,
    );
    containerClient = blobService.getContainerClient(CONTAINER_NAME);
  }
  return containerClient;
}

/**
 * Ensure the product-images container exists (idempotent).
 * Call once at startup or lazily on first upload.
 */
export async function ensureContainer(): Promise<void> {
  const client = getContainerClient();
  await client.createIfNotExists({ access: "blob" });
}

/**
 * Build a blob path: {brandSlug}/{productSlug}.{ext}
 */
function buildBlobName(
  brandSlug: string | null,
  productSlug: string,
  extension: string,
): string {
  const brand = brandSlug || "unknown-brand";
  return `${brand}/${productSlug}.${extension}`;
}

/**
 * Upload a product image buffer to Azure Blob Storage.
 * Returns the public URL of the uploaded blob.
 */
export async function uploadProductImage(
  imageBuffer: Buffer,
  brandSlug: string | null,
  productSlug: string,
  contentType: string,
  extension: string,
): Promise<string> {
  const client = getContainerClient();
  const blobName = buildBlobName(brandSlug, productSlug, extension);
  const blockBlob = client.getBlockBlobClient(blobName);

  await blockBlob.uploadData(imageBuffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlob.url;
}

/**
 * Check whether Azure Blob Storage is configured and available.
 */
export function isAzureStorageConfigured(): boolean {
  return !!env.azureStorageConnectionString;
}
