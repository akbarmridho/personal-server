import { createHash, randomBytes } from "node:crypto";
import axios from "axios";
import { env } from "../../infrastructure/env.js";

const PDF_UPLOAD_PATH = "/pdfs/";

function getMiniserveBaseUrl(): string {
  return env.MINISERVE_SERVICE_URL.replace(/\/+$/, "");
}

function generateRandomPdfFilename(): string {
  const hash = createHash("sha256").update(randomBytes(32)).digest("hex");
  return `${hash}.pdf`;
}

export async function uploadPdfBufferToMiniserve(
  pdfBuffer: Buffer,
): Promise<string> {
  if (pdfBuffer.length === 0) {
    throw new Error("Cannot upload empty PDF buffer");
  }

  const filename = generateRandomPdfFilename();
  const uploadUrl = `${getMiniserveBaseUrl()}/upload?${new URLSearchParams({
    path: PDF_UPLOAD_PATH,
  }).toString()}`;

  const pdfBytes = Uint8Array.from(pdfBuffer);
  const formData = new FormData();
  formData.append("file_to_upload", new Blob([pdfBytes]), filename);

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    const responseText = await uploadResponse.text();
    throw new Error(
      `Failed to upload PDF to Miniserve: HTTP ${uploadResponse.status} ${uploadResponse.statusText} - ${responseText}`,
    );
  }

  return `${getMiniserveBaseUrl()}${PDF_UPLOAD_PATH}${filename}`;
}

export async function uploadPdfUrlToMiniserve(pdfUrl: string): Promise<string> {
  const response = await axios.get<ArrayBuffer>(pdfUrl, {
    responseType: "arraybuffer",
  });

  const pdfBuffer = Buffer.from(response.data);
  return await uploadPdfBufferToMiniserve(pdfBuffer);
}
