import imageCompression from "browser-image-compression";

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

/**
 * Compress an image File before upload. Falls back to the original file on error
 * or for non-image inputs (gifs/svg are returned as-is).
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  if (!file || !file.type.startsWith("image/")) return file;
  // Skip animated/vector formats — compression would break them
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const opts = {
    maxSizeMB: options.maxSizeMB ?? 0.5,
    maxWidthOrHeight: options.maxWidthOrHeight ?? 1280,
    useWebWorker: options.useWebWorker ?? true,
    initialQuality: 0.85,
  };

  try {
    const compressed = await imageCompression(file, opts);
    // If compression somehow made the file bigger, keep original
    if (compressed.size >= file.size) return file;
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("[compressImage] fallback to original:", err);
    return file;
  }
}
