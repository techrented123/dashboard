/** Verifies the metadata of a PDF file to ensure it's a valid, Rented123-generated document. */
import { PDFDocument } from "pdf-lib";
export const verifyPDF = async (
  file: File,
  expectedTitles: string[],
  keywordsLength: number
) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);

    const title = pdf.getTitle() || "";
    const author = pdf.getAuthor() || "";
    const keywords = (pdf.getKeywords() || "").split(" ").filter(Boolean); // filter(Boolean) removes empty strings

    // 1. Check if the title is one of the expected titles
    if (!expectedTitles.includes(title)) {
      return {
        isValid: false,
        message: `Invalid document. Please upload a valid Rented123 issued PDF file`,
      };
    }

    // 2. Check if the author is "Rented123"
    if (author !== "Rented123") {
      return {
        isValid: false,
        message:
          "Invalid document. Please upload a valid Rented123 issued PDF file",
      };
    }

    // 3. Check for the exact number of keywords
    if (keywords.length !== keywordsLength) {
      return {
        isValid: false,
        message: `Invalid document. Please upload a valid Rented123 issued PDF file`,
      };
    }

    // If all checks pass, the document is valid
    return { isValid: true, message: "Valid Document" };
  } catch (error) {
    console.error("Error verifying PDF:", error);
    return {
      isValid: false,
      message: "Could not read this PDF file. It may be corrupted.",
    };
  }
};
