export const PHOTO_LIMITS = {
  maxPhotos: 8,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 40 * 1024 * 1024
} as const;

export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type AcceptedPhotoType = (typeof ACCEPTED_PHOTO_TYPES)[number];

export interface EvidenceFileLike {
  name: string;
  size: number;
  type: string;
}

export interface EvidenceValidationResult<TFile extends EvidenceFileLike> {
  acceptedFiles: TFile[];
  errors: string[];
}

export function validateEvidenceFiles<TFile extends EvidenceFileLike>(
  files: TFile[],
  existingPhotoCount: number,
  existingTotalBytes: number
): EvidenceValidationResult<TFile> {
  const acceptedFiles: TFile[] = [];
  const errors: string[] = [];
  let projectedTotalBytes = existingTotalBytes;

  files.forEach((file) => {
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type as AcceptedPhotoType)) {
      errors.push(`${file.name || "Selected file"} is not a JPEG, PNG, or WebP image.`);
      return;
    }

    if (file.size > PHOTO_LIMITS.maxFileBytes) {
      errors.push(`${file.name || "Selected file"} is larger than 10 MB.`);
      return;
    }

    if (existingPhotoCount + acceptedFiles.length >= PHOTO_LIMITS.maxPhotos) {
      errors.push(`Only ${PHOTO_LIMITS.maxPhotos} source photos can be queued.`);
      return;
    }

    if (projectedTotalBytes + file.size > PHOTO_LIMITS.maxTotalBytes) {
      errors.push("Selected photos would exceed the 40 MB session limit.");
      return;
    }

    acceptedFiles.push(file);
    projectedTotalBytes += file.size;
  });

  return { acceptedFiles, errors };
}

export function deriveProjectTitle(address: string) {
  const normalized = Array.from(address)
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Untitled field scene";
  }

  return normalized.slice(0, 80);
}
