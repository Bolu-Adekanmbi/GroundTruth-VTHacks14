import type { EvidencePhoto } from "../../../shared/scene-schema";

const MAX_EDGE_PX = 1280;
const MAX_DATA_URL_LENGTH = 2_000_000;

export async function prepareVisionImages(evidence: EvidencePhoto[]) {
  const uploads = evidence.filter((photo) => photo.origin === "user-upload").slice(0, 3);
  if (uploads.length === 0) {
    throw new Error("Vision suggestions are available for uploaded photos only.");
  }

  return Promise.all(uploads.map((photo) => prepareVisionImage(photo.uri)));
}

async function prepareVisionImage(uri: string) {
  const blob = await fetch(uri).then((response) => {
    if (!response.ok) throw new Error("A selected photo could not be read.");
    return response.blob();
  });
  const imageUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(imageUrl);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.76);
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error("A selected photo is still too large after preparation. Choose a smaller image.");
    }
    return { dataUrl };
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A selected photo could not be decoded."));
    image.src = src;
  });
}
