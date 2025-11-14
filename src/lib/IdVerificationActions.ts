import jsPDF from "jspdf";
import { logoImage } from "./utils";

function emailToS3Prefix(email: string | undefined) {
  if (!email) return "";
  return email
    .toLowerCase()
    .replace(/@/g, "_at_")
    .replace(/\+/g, "_plus_")
    .replace(/\./g, "_dot_")
    .replace(/-/g, "_dash_")
    .replace(/[^a-zA-Z0-9_]/g, "_"); // Same logic as your app
}

export const emailPDF = async (
  userDetails: {
    last_name: string;
    first_name: string;
  },
  doc: Blob | undefined,
  recipientEmail: string | string[],
  emailType?: "third-party" // Add optional email type parameter
) => {
  // Handle both single email string and array of emails
  const emails = Array.isArray(recipientEmail)
    ? recipientEmail
    : [recipientEmail];
  const primaryEmail = emails[0];

  // Await the S3 URL properly
  const s3Url = await saveToS3(
    doc as Blob,
    `${emailToS3Prefix(primaryEmail)}/${userDetails.last_name}_${
      userDetails.first_name
    }_verification_report.pdf`
  );

  return await fetch("/api/send-email/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userDetails,
      pdfUrl: s3Url,
      recipientEmail: emails,
      emailType, // Pass email type to the API
    }),
  });
};

export const sendFailedVerificationNotification = async (userDetails: {
  first_name: string;
  last_name: string;
  email: string;
}) => {
  try {
    const response = await fetch("/api/send-email-for-failed-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userDetails }),
    });

    return response;
  } catch (error) {
    console.error("Error sending failure notification:", error);
    throw error;
  }
};
const extractFields = (data: any) => {
  const result = { last_name: "", first_name: "", date_of_birth: "" };
  if (!data.verificationData) return result;
  for (const item of data.verificationData) {
    if (item.name === "Surname") result.last_name = item.value;
    if (item.name === "Given Names") result.first_name = item.value;
    if (item.name === "Date of Birth") result.date_of_birth = item.value;
  }
  return result;
};

export const generateVerificationReport = async (
  data: any,
  activeToken: string
) => {
  try {
    // Create a new PDF document
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });
    const { last_name, first_name, date_of_birth: dob } = extractFields(data);
    // Document constants
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Define colors
    const primaryColor = [50, 66, 155]; // #32429B in RGB
    const secondaryColor = [0, 123, 255]; // #007BFF in RGB
    const textColor = [51, 51, 51]; // #333333 in RGB
    const lightGrayColor = [153, 153, 153]; // #999999 in RGB
    const successColor = [40, 167, 69]; // #28A745 in RGB
    const dangerColor = [220, 53, 69]; // #DC3545 in RGB
    const totalPages = 3;

    // Define common text styles
    const addPageHeader = (pageNum: number) => {
      doc.setFillColor(248, 249, 250); // #F8F9FA
      doc.rect(0, 0, pageWidth, 15, "F");
      doc.setDrawColor(233, 236, 239); // #E9ECEF
      doc.setLineWidth(0.1);
      doc.line(0, 15, pageWidth, 15);

      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFontSize(9);
      doc.text("ID Verification Report", margin, 10);

      // Add date on the right
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const dateText = `Generated: ${today}`;
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, pageWidth - margin - dateWidth, 10);

      // Add page number
      const pageText = `Page ${pageNum} of ${totalPages}`;
      //const pageWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - margin - pageWidth, pageHeight - 10);
    };

    // Add footer with disclaimer and page number
    const addPageFooter = (pageNum: number) => {
      const footerY = pageHeight - 15;

      doc.setFillColor(248, 249, 250); // #F8F9FA
      doc.rect(0, footerY, pageWidth, 15, "F");
      doc.setDrawColor(233, 236, 239); // #E9ECEF
      doc.setLineWidth(0.1);
      doc.line(0, footerY, pageWidth, footerY);

      doc.setFontSize(8);
      doc.setTextColor(lightGrayColor[0], lightGrayColor[1], lightGrayColor[2]);
      const year = new Date().getFullYear();

      doc.text(
        `© ${year} Rented123. All rights reserved.`,
        margin,
        footerY + 5
      );

      // Add page number
      const pageText = `Page ${pageNum} of ${totalPages}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      doc.text(pageText, pageWidth - margin - pageTextWidth, footerY + 5);
    };

    // Create cover page
    const createCoverPage = () => {
      // Logo
      doc.addImage(logoImage, "PNG", (pageWidth - 40) / 2, 30, 40, 56);

      // Title
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      const title = "ID Verification Report";
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, 110);

      // Subtitle with verification status
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");

      doc.setTextColor(successColor[0], successColor[1], successColor[2]);
      const subtitle = "Verification Passed";
      const subtitleWidth = doc.getTextWidth(subtitle);
      doc.text(subtitle, (pageWidth - subtitleWidth) / 2, 125);

      // Person information
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      const name = `${first_name} ${last_name}`;
      const nameWidth = doc.getTextWidth(name);
      doc.text(name, (pageWidth - nameWidth) / 2, 140);

      if (dob) {
        const dobText = `Date of Birth: ${dob}`;
        const dobWidth = doc.getTextWidth(dobText);
        doc.text(dobText, (pageWidth - dobWidth) / 2, 150);
      }

      // Date of report
      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.setFontSize(10);
      const dateText = `Report generated on ${today}`;
      const dateWidth = doc.getTextWidth(dateText);
      doc.text(dateText, (pageWidth - dateWidth) / 2, 165);

      // Add footer
      addPageFooter(1);
    };

    // Create the data page
    const createDataPage = () => {
      doc.addPage();
      addPageHeader(2);

      let yPosition = 30;

      // Section: Personal Information
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text("Personal Information", margin, yPosition - 5);

      yPosition += 10;

      // Personal data table
      const personalData = [
        { label: "Surname", value: last_name },
        { label: "Given Names", value: first_name },
        { label: "Date of Birth", value: dob },
      ];

      if (data.verificationData) {
        const fieldMap: Record<string, string> = {
          Age: "Age",
          Sex: "Sex/Gender",
          Address: "Physical Address",
          Nationality: "Nationality",
          "Document Number": "Document Number",
          Authority: "Issuing Authority",
          "Date of Issue": "Date of Issue",
          "Date of Expiry": "Date of Expiry",
          "Issuing State Code": "Issuing State Code",
          "Issuing State Name": "Issuing State/Country",
        };

        for (const item of data.verificationData) {
          if (fieldMap[item.name] !== undefined && item.value) {
            personalData.push({
              label: fieldMap[item.name],
              value: item.value,
            });
          }
        }
      }

      // Create a table for personal data
      doc.setFontSize(10);

      const cellPadding = 5;
      const columnWidth = contentWidth / 2 - cellPadding;

      yPosition += 15;
      // Add ID image
      if (data.idImage) {
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text("ID Image:", margin, yPosition);

        yPosition += 10;

        // Calculate image dimensions to fit within margins while maintaining aspect ratio
        const imageWidth = contentWidth * 0.7;
        const imageHeight = 70; // Fixed height or calculate based on aspect ratio

        const imageX = margin + (contentWidth - imageWidth) / 2;

        doc.addImage(
          data.idImage,
          "JPEG",
          imageX,
          yPosition,
          imageWidth,
          imageHeight
        );

        yPosition += imageHeight + 10;
      }

      // Draw the data
      for (let i = 0; i < personalData.length; i++) {
        const isEven = i % 2 === 0;
        if (isEven && yPosition + 25 > pageHeight - 20) {
          addPageFooter(2);
          doc.addPage();
          yPosition = 30;
          addPageHeader(3);
        }

        if (isEven) {
          // Add light background for even rows
          doc.setFillColor(248, 249, 250); // #F8F9FA
          doc.rect(margin, yPosition, contentWidth, 20, "F");
        }

        // Label
        doc.setFont("helvetica", "bold");
        doc.setTextColor(textColor[0], textColor[1], textColor[2]);
        doc.text(personalData[i].label, margin + cellPadding, yPosition + 12);

        // Value
        doc.setFont("helvetica", "normal");
        doc.text(
          personalData[i].value,
          margin + contentWidth / 2 + cellPadding,
          yPosition + 12
        );

        yPosition += 20;
      }

      // Section: Verification Details
      yPosition += 10;
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      //doc.text("Verification Details", margin, yPosition - 5);

      // Add footer
      addPageFooter(3);
    };

    // Generate the full document
    createCoverPage();
    createDataPage();

    // Set document properties
    doc.setProperties({
      title: "ID Verification Result",
      author: "Rented123",
      keywords: `${activeToken} ${last_name} ${dob}`,
    });
    // Save and upload the PDF
    const blob = doc.output("blob");

    return { doc, blob, first_name, last_name };
  } catch (err) {
    console.log(err);
    return { doc: null, s3Url: "", first_name: "", last_name: "" };
  }
};

const saveToS3 = async (PDFfile: Blob, fileName: string) => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(PDFfile);
    reader.onloadend = () => {
      const base64data =
        typeof reader.result === "string" ? reader.result.split(",")[1] : "";
      resolve(base64data);
    };
    reader.onerror = reject;
  });

  const response = await fetch("/api/store-pdf", {
    method: "POST",
    body: JSON.stringify({
      PDFfile: base64,
      fileName,
    }),
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("PDF upload error:", errorData);
    throw new Error("Upload failed");
  }

  const data = await response.json();
  return data.location;
};

export const storePDFAndSendEmail = async (
  userDetails: {
    last_name: string;
    first_name: string;
  },
  doc: Blob | undefined,
  recipientEmail: string | string[],
  emailType?: "third-party"
) => {
  const emails = Array.isArray(recipientEmail)
    ? recipientEmail
    : [recipientEmail];
  const primaryEmail = emails[0];
  const fileName = `${emailToS3Prefix(primaryEmail)}/${userDetails.last_name}_${
    userDetails.first_name
  }_verification_report.pdf`;

  const response = await fetch(
    `https://5x5goeb5g2.execute-api.us-west-2.amazonaws.com/generate-pdf-and-send-email`,
    {
      method: "POST",
      body: JSON.stringify({
        fileName,
        PDFfile: doc as Blob,
        userDetails,
        recipientEmail: emails,
        emailType,
      }),
      headers: { "Content-Type": "application/json" },
    }
  );
  return response.blob();
};
