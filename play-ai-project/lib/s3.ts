import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";

const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT || "https://7edd61f3351f4d16685af7f75e63b78d.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || "play-ai";
const publicUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || "https://pub-136d99f684c64492a0588acb1ec07263.r2.dev";

export async function uploadPdf(file: Buffer): Promise<string> {
  const key = `pdfs/${uuidv4()}.pdf`;
  
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: "application/pdf",
    })
  );
  
  return key;
}

export async function getSignedPdfUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  
  // URL expires in 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export function getPublicPdfUrl(key: string): string {
  // Check if the key already contains the public URL to prevent duplication
  if (key.startsWith(publicUrl)) {
    // Extract just the key part from the URL
    const urlParts = key.split('/');
    const keyPart = urlParts.slice(urlParts.indexOf('pdfs')).join('/');
    return `/api/proxy/pdf?key=${encodeURIComponent(keyPart)}`;
  }
  
  // Check if the key already starts with a slash
  const formattedKey = key.startsWith('/') ? key.substring(1) : key;
  
  // Use the proxy API route instead of direct R2 URL
  return `/api/proxy/pdf?key=${encodeURIComponent(formattedKey)}`;
}