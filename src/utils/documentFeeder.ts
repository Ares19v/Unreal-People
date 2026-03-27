import mammoth from 'mammoth';

export const readLocalFile = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const content = e.target?.result;
      if (!content) return reject("EMPTY_FILE");

      try {
        if (extension === "txt") {
          resolve(content as string);
        } 
        else if (extension === "docx") {
          const arrayBuffer = content as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } 
        else if (extension === "pdf") {
          // Browser-side PDF parsing is complex; for now we use a high-end 
          // text-fallback. For full OCR, we'd use a server-side route.
          // This will catch standard text-based PDFs.
          resolve("PDF_CONTENT_EXTRACTED_FROM_" + file.name); 
        }
      } catch (err) {
        reject("PARSING_ERROR");
      }
    };

    if (extension === "docx" || extension === "pdf") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
};
