import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "NO_FILE_PROVIDED" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "pdf") {
      return NextResponse.json({ error: "ONLY_PDF_SUPPORTED" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // pdf-parse: import from lib path to avoid Next.js test file conflict
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);

    if (!data.text || data.text.trim().length === 0) {
      return NextResponse.json({
        status: "EMPTY",
        text: "",
        pages: data.numpages,
        message: "PDF appears to be image-only or empty. No text could be extracted."
      });
    }

    return NextResponse.json({
      status: "SUCCESS",
      text: data.text.trim(),
      pages: data.numpages,
      info: data.info
    });

  } catch (error) {
    console.error("PDF_PARSE_ERROR:", error);
    return NextResponse.json({ error: "PDF_PARSE_FAILED", detail: String(error) }, { status: 500 });
  }
}
