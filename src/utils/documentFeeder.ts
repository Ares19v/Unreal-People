import mammoth from 'mammoth';

/**
 * Read and extract text from a local file (txt, docx, pdf).
 * TXT and DOCX are handled client-side.
 * PDF is proxied to the server-side /api/parse_pdf route for real extraction.
 */
export const readLocalFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  return new Promise((resolve, reject) => {
    if (extension === "txt") {
      // Plain text — read directly in browser
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) return reject("EMPTY_FILE");
        resolve(content);
      };
      reader.onerror = () => reject("FILE_READ_ERROR");
      reader.readAsText(file);

    } else if (extension === "docx") {
      // DOCX — extract raw text via mammoth (client-side)
      const reader = new FileReader();
      reader.onload = async (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) return reject("EMPTY_FILE");
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (err) {
          reject("DOCX_PARSING_ERROR");
        }
      };
      reader.onerror = () => reject("FILE_READ_ERROR");
      reader.readAsArrayBuffer(file);

    } else if (extension === "pdf") {
      // PDF — proxy to server-side API route for real text extraction
      // The browser cannot reliably parse PDFs with encrypted fonts or complex layouts
      const formData = new FormData();
      formData.append("file", file);

      fetch("/api/parse_pdf", {
        method: "POST",
        body: formData
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            return reject(`PDF_API_ERROR: ${data.error || "Unknown"}`);
          }
          if (data.status === "EMPTY" || !data.text) {
            return reject("PDF_NO_TEXT: The PDF appears to be image-only or scanned. No extractable text found.");
          }
          resolve(data.text);
        })
        .catch((err) => reject(`PDF_FETCH_FAILED: ${err}`));

    } else {
      reject(`UNSUPPORTED_FORMAT: .${extension} files are not supported. Use .txt, .docx, or .pdf`);
    }
  });
};
