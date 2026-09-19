import { describe, expect, it } from "vitest";
import { deriveProjectTitle, PHOTO_LIMITS, validateEvidenceFiles } from "./evidence-workflow";

function fileLike(name: string, type: string, size: number) {
  return { name, type, size };
}

describe("evidence workflow validation", () => {
  it("accepts JPEG, PNG, and WebP images within the session limits", () => {
    const result = validateEvidenceFiles(
      [
        fileLike("front.jpg", "image/jpeg", 1200),
        fileLike("side.png", "image/png", 1400),
        fileLike("rear.webp", "image/webp", 1600)
      ],
      0,
      0
    );

    expect(result.acceptedFiles).toHaveLength(3);
    expect(result.errors).toEqual([]);
  });

  it("rejects invalid files without discarding valid files from the same selection", () => {
    const result = validateEvidenceFiles(
      [
        fileLike("front.jpg", "image/jpeg", 1200),
        fileLike("notes.pdf", "application/pdf", 900)
      ],
      0,
      0
    );

    expect(result.acceptedFiles.map((file) => file.name)).toEqual(["front.jpg"]);
    expect(result.errors).toEqual(["notes.pdf is not a JPEG, PNG, or WebP image."]);
  });

  it("enforces photo count, per-file size, and total-size limits", () => {
    expect(
      validateEvidenceFiles([fileLike("too-many.jpg", "image/jpeg", 1000)], PHOTO_LIMITS.maxPhotos, 0)
        .errors
    ).toContain(`Only ${PHOTO_LIMITS.maxPhotos} source photos can be queued.`);
    expect(
      validateEvidenceFiles(
        [fileLike("too-large.jpg", "image/jpeg", PHOTO_LIMITS.maxFileBytes + 1)],
        0,
        0
      ).errors
    ).toContain("too-large.jpg is larger than 10 MB.");
    expect(
      validateEvidenceFiles(
        [fileLike("too-much-total.jpg", "image/jpeg", 1024)],
        0,
        PHOTO_LIMITS.maxTotalBytes - 512
      ).errors
    ).toContain("Selected photos would exceed the 40 MB session limit.");
  });

  it("derives safe custom project titles from addresses", () => {
    expect(deriveProjectTitle("  123 Main Street,\nBlacksburg VA  ")).toBe(
      "123 Main Street, Blacksburg VA"
    );
    expect(deriveProjectTitle("")).toBe("Untitled field scene");
  });
});
