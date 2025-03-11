import { NextRequest, NextResponse } from "next/server";
import { uploadPdf } from "@/lib/s3";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    // Check content type
    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size cannot exceed 10MB" },
        { status: 400 }
      );
    }

    try {
      // Convert file to buffer
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      // Upload to S3
      const key = await uploadPdf(fileBuffer);

      return NextResponse.json({ key });
    } catch (uploadError) {
      console.error("Error in S3 upload:", uploadError);
      return NextResponse.json(
        { error: "S3 upload failed. Please check your S3 configuration." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing upload:", error);
    return NextResponse.json(
      { error: "Failed to upload file. Please try again later." },
      { status: 500 }
    );
  }
}