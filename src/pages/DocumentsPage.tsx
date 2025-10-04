import { useState } from "react";
import { useEffect } from "react";
import ProtectedRoute from "../components/ProtectedRoute";
import AppLayout from "../components/AppLayout";
import Card from "../components/Card";
import { FileText, Download, Eye, AlertCircle, Trash2 } from "lucide-react";
import { Skeleton } from "../components/Skeleton";
import { getPresignedUrl, getDocumentUrl } from "../lib/documents";
import { useDocuments, useDeleteDocument } from "../lib/hooks/useDocuments";
import { verifyPDF } from "../lib/upload";
import ConfirmationDialog from "../components/ConfirmationDialogBox";
import { Toast } from "../components/ui/toast";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

import { fetchUserAttributes } from "aws-amplify/auth";

type BucketSelectValue =
  | "rent-reporting-csv/proof-of-rent-payment"
  | "tenants-lease-agreements"
  | "equifax-credit-check-reports"
  | "verified-id-reports"
  | "other-user-uploads";

const DOCUMENT_TYPES = [
  {
    value: "tenants-lease-agreements",
    label: "Lease Agreement",
    needsLeaseMeta: true, // Flag to fetch user details
  },
  {
    value: "equifax-credit-check-reports",
    label: "Credit Report",
    needsVerification: true,
    verificationParams: {
      expectedTitles: ["Basic Credit Report", "Full Credit Report"],
      keywordsLength: 2,
    },
  },
  {
    value: "verified-id-reports",
    label: "ID Verification",
    needsVerification: true,
    verificationParams: {
      expectedTitles: ["ID Verification Result"],
      keywordsLength: 3,
    },
  },
  {
    value: "other-user-uploads/background-check", // The new type with a folder/prefix
    label: "Background Check",
    needsVerification: false,
    verificationParams: {
      expectedTitles: ["Rented123_AI_Background_Check"],
      keywordsLength: 1,
    },
  },
  {
    value: "rent-reporting-csv/proof-of-rent-payment",
    label: "Rent Receipt",
  },
  {
    value: "other-user-uploads",
    label: "Other",
  },
];

function formatSource(source = "") {
  // Replaces underscores or hyphens with spaces and capitalizes words
  return source.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// Simple source detection - use the source from backend if available
function detectDocumentSource(doc: any): string {
  // Use the source from the backend if it's properly set
  if (doc.source && doc.source.trim()) {
    return doc.source;
  }

  // Fallback to "Other" if no source is provided
  return "Other";
}

// Color mapping for document source types
const getSourceTypeColor = (source: string) => {
  const normalizedSource = source.toLowerCase().replace(/[_-]/g, " ");

  if (
    normalizedSource.includes("rent receipt") ||
    normalizedSource.includes("proof of rent")
  ) {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
  if (normalizedSource.includes("lease agreement")) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (normalizedSource.includes("credit report")) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }
  if (normalizedSource.includes("id verification")) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  }
  if (normalizedSource.includes("background check")) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
  if (normalizedSource.includes("other")) {
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
  }

  // Default color for unknown types
  return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
};
/* function parseBucketAndPrefix(value: string): {
  bucket: string;
  prefix?: string;
} {
  const [bucket, ...rest] = value.split("/");
  const prefix = rest.length ? rest.join("/") : undefined;
  return { bucket, prefix };
}
function toSelectValue(bucket: string, prefix?: string) {
  return prefix ? `${bucket}/${prefix}` : bucket;
} */

export default function DocumentsPage() {
  const { data: documents = [], isLoading, error } = useDocuments();
  const deleteDocumentMutation = useDeleteDocument();
  const queryClient = useQueryClient();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [bucketValue, setBucketValue] = useState(DOCUMENT_TYPES[0].value); // Default to the first item

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState<{
    isVisible: boolean;
    type: "success" | "error";
    message: string;
  }>({
    isVisible: false,
    type: "success",
    message: "",
  });

  // Toast helper functions
  const showToast = (type: "success" | "error", message: string) => {
    setToast({
      isVisible: true,
      type,
      message,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  // Limit documents to 20 for display
  const displayDocuments = documents.slice(0, 20);

  // Calculate stats from documents data
  const totalSize = documents.reduce(
    (total, doc) => total + (doc.size || 0),
    0
  );

  // Sort documents by creation date (most recent first) and get the latest
  const sortedDocuments = [...documents].sort(
    (a, b) =>
      new Date(b.createdAt || (b.uploadedAt as string)).getTime() -
      new Date(a.createdAt || (a.uploadedAt as string)).getTime()
  );
  const lastUpload = sortedDocuments.length > 0 ? sortedDocuments[0] : null;

  // Find the most recent lease agreement
  const leaseAgreements = documents.filter(
    (doc) =>
      doc.source === "Lease Agreement" ||
      (doc.source && doc.source.toLowerCase().includes("lease"))
  );
  const sortedLeaseAgreements = [...leaseAgreements].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const mostRecentLeaseAgreement =
    sortedLeaseAgreements.length > 0 ? sortedLeaseAgreements[0] : null;

  // Check if a document is the most recent lease agreement
  const isMostRecentLeaseAgreement = (doc: any) => {
    return (
      mostRecentLeaseAgreement && doc.docId === mostRecentLeaseAgreement.docId
    );
  };

  // Debug log for document sizes
  console.log(
    "Documents with sizes:",
    documents.map((doc) => ({
      filename: doc.filename,
      size: doc.size,
      source: doc.source,
      docId: doc.docId,
      createdAt: doc.createdAt,
    }))
  );
  console.log(
    "Sorted documents (most recent first):",
    sortedDocuments.map((doc) => ({
      filename: doc.filename,
      createdAt: doc.createdAt,
    }))
  );
  console.log(
    "Last upload:",
    lastUpload
      ? { filename: lastUpload.filename, createdAt: lastUpload.createdAt }
      : null
  );
  console.log("Total calculated size:", totalSize, "bytes");

  // Storage limit constants
  const STORAGE_LIMIT = 100 * 1024 * 1024; // 100MB in bytes
  const MAX_DOCUMENTS = 20; // Maximum number of documents allowed

  // Check if upload should be disabled
  const isUploadDisabled =
    totalSize >= STORAGE_LIMIT || documents.length >= MAX_DOCUMENTS;

  // Calculate document type counts
  const getDocumentTypeCounts = () => {
    const counts: { [key: string]: number } = {};

    documents.forEach((doc) => {
      if (doc.source) {
        const normalizedSource = doc.source.toLowerCase().replace(/[_-]/g, " ");
        let typeKey = "";

        if (
          normalizedSource.includes("rent receipt") ||
          normalizedSource.includes("proof of rent")
        ) {
          typeKey = "Rent Receipts";
        } else if (normalizedSource.includes("lease agreement")) {
          typeKey = "Lease Agreements";
        } else if (normalizedSource.includes("credit report")) {
          typeKey = "Credit Reports";
        } else if (normalizedSource.includes("id verification")) {
          typeKey = "ID Verification";
        } else if (normalizedSource.includes("background check")) {
          typeKey = "Background Check";
        } else {
          typeKey = "Other";
        }

        counts[typeKey] = (counts[typeKey] || 0) + 1;
      }
    });

    return counts;
  };

  const documentTypeCounts = getDocumentTypeCounts();

  // Check for existing document types to prevent duplicates
  const existingSources = documents
    .map((doc) => detectDocumentSource(doc))
    .filter(Boolean);
  const hasIdVerification = existingSources.some((source) =>
    source?.toLowerCase().includes("id verification")
  );
  const hasBackgroundCheck = existingSources.some((source) =>
    source?.toLowerCase().includes("background check")
  );

  // Check if a document type is disabled based on existing documents
  const isDocumentTypeDisabled = (typeLabel: string) => {
    if (typeLabel === "ID Verification" && hasIdVerification) return true;
    if (typeLabel === "Background Check" && hasBackgroundCheck) return true;
    // Lease Agreement can always be replaced, so never disable it
    return false;
  };

  // State for delete confirmation dialog
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePreview = async (docId: string) => {
    try {
      setIsPreviewLoading(true);
      setIsPreviewOpen(true);
      setPreviewUrl(null); // Clear previous URL
      console.log("Getting preview URL for docId:", docId);

      // Regular document from DynamoDB
      const { url } = await getDocumentUrl(docId);
      console.log("Got preview URL:", url);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Failed to get preview URL", err);
      showToast("error", "Failed to load document preview. Please try again.");
      setIsPreviewOpen(false);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleDeleteClick = (doc: any) => {
    setDocumentToDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDocumentMutation.mutateAsync(documentToDelete.docId);
      showToast("success", "Document deleted successfully.");
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      console.error("Failed to delete file", err);
      showToast("error", "Failed to delete document. Please try again.");
    } finally {
      setIsDeleting(false);
      setFile(null);
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      // 1. Get the special download URL from the API (this part is correct)
      const { url } = await getDocumentUrl(doc.docId, true);

      // 2. Create a temporary, invisible link element
      const link = document.createElement("a");
      link.href = url;

      // 3. Set the desired filename for the download
      link.setAttribute("download", doc.filename);

      // 4. Append the link to the page, click it, and then remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to get download URL", err);
      // Optionally, set an error message to display to the user
    }
  };

  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => {
        setMsg(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [msg]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!file) return showToast("error", "Please choose a file.");
    if (isUploadDisabled) {
      if (documents.length >= MAX_DOCUMENTS) {
        return showToast(
          "error",
          `Document limit reached (${MAX_DOCUMENTS} max). Cannot upload more documents.`
        );
      }
      return showToast(
        "error",
        "Storage limit reached. Cannot upload more documents."
      );
    }

    // Check if selected document type is disabled
    const selectedType = DOCUMENT_TYPES.find(
      (type) => type.value === bucketValue
    );
    console.log({ selectedType });
    if (selectedType && isDocumentTypeDisabled(selectedType.label)) {
      return showToast(
        "error",
        "This document type has already been uploaded. Please choose a different type."
      );
    }

    // Handle lease agreement replacement
    if (selectedType?.label === "Lease Agreement") {
      const hasExistingLease = documents.some(
        (doc) => doc.source === "Lease Agreement"
      );
      if (hasExistingLease) {
        // Show confirmation for replacement
        const confirmed = window.confirm(
          "You already have a lease agreement uploaded. This will replace your existing lease agreement. Continue?"
        );
        if (!confirmed) {
          setIsUploading(false);
          return;
        }
      }
    }

    setIsUploading(true);

    try {
      // 1. Find the full configuration for the selected document type
      if (!selectedType) {
        throw new Error("Invalid document type selected.");
      }

      // 2. Conditionally run PDF verification if required
      if (selectedType.needsVerification) {
        const verificationResult = await verifyPDF(
          file,
          selectedType.verificationParams.expectedTitles,
          selectedType.verificationParams.keywordsLength
        );
        if (!verificationResult.isValid) {
          showToast("error", verificationResult.message);
          setIsUploading(false);
          return;
        }
      }

      // 3. Conditionally fetch user attributes for lease metadata if required
      let leaseMeta = {};
      if (selectedType.needsLeaseMeta) {
        const userAttributes = await fetchUserAttributes();
        leaseMeta = {
          firstName: userAttributes.given_name,
          lastName: userAttributes.family_name,
          phone: userAttributes.phone_number,
          email: userAttributes.email,
        };
      }

      // 4. Call the API with the correct parameters derived from our config
      const { uploadUrl } = await getPresignedUrl({
        filename: file.name,
        mime: file.type || "application/octet-stream",
        selectValue: selectedType.value, // Send the full value, e.g., "bucket/prefix"
        source: selectedType.label, // Send the human-readable source name
        ...leaseMeta,
      });
      // 5. Upload to S3 and update UI
      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!put.ok) throw new Error(`S3 upload failed (${put.status})`);

      // Success: Show toast, clear fields, and invalidate cache
      showToast("success", "File uploaded successfully!");
      setFile(null);
      setBucketValue(DOCUMENT_TYPES[0].value); // Reset to first option

      // Invalidate and refetch documents
      queryClient.invalidateQueries({ queryKey: ["documents"] });

      // If this was a lease agreement replacement, also invalidate user attributes
      if (selectedType?.label === "Lease Agreement") {
        // Force a page refresh to get updated Cognito attributes
        window.location.reload();
      }
    } catch (err: any) {
      showToast("error", err?.message || "Upload failed. Please try again.");
      setFile(null); // Clear file input on error
    } finally {
      setIsUploading(false);
    }
  }

  // Helper function to render the document list based on the current state
  const renderDocumentList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl border dark:border-slate-600"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex justify-center items-center p-8 text-red-500">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>Error loading documents</span>
        </div>
      );
    }
    if (documents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium mb-2">
            No Documents Uploaded Yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md">
            Upload your documents to get started with rent reporting and
            verification.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-3 max-h-96 overflow-y-auto w-full">
        {displayDocuments.map((doc: any) => (
          <div
            key={doc.docId}
            className="flex items-center p-3 rounded-xl border dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors w-full min-w-0"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm dark:text-slate-200 truncate">
                  {doc.filename}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {new Date(
                    doc.createdAt || doc.uploadedAt
                  ).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Source type chip - centered */}
            <div className="flex justify-center flex-1">
              {(() => {
                const detectedSource = detectDocumentSource(doc);
                return (
                  detectedSource &&
                  detectedSource.trim() && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getSourceTypeColor(
                        detectedSource
                      )}`}
                    >
                      {formatSource(detectedSource)}
                    </span>
                  )
                );
              })()}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                onClick={() => handlePreview(doc.docId)}
              >
                <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              <button
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                onClick={() => handleDownload(doc)}
              >
                <Download className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>
              {doc.source !== "ID Verification" &&
              doc.source !== "Background Check" &&
              doc.source !== "Lease Agreement" &&
              !isMostRecentLeaseAgreement(doc) ? (
                <button
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                  onClick={() => handleDeleteClick(doc)}
                >
                  <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                </button>
              ) : (
                <button
                  className="p-1.5 cursor-not-allowed opacity-50 relative group"
                  disabled
                  title={
                    doc.source === "ID Verification"
                      ? undefined
                      : doc.source === "Lease Agreement"
                      ? "Upload a new one to replace"
                      : isMostRecentLeaseAgreement(doc)
                      ? "Upload a new one first"
                      : "Cannot delete this document type"
                  }
                >
                  <Trash2 className="w-4 h-4 text-slate-400" />
                  {/* Tooltip - only show for lease agreements, not ID Verification */}
                  {doc.source !== "ID Verification" && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[99999] pointer-events-none">
                      {doc.source === "Lease Agreement"
                        ? "Upload a new one first"
                        : isMostRecentLeaseAgreement(doc)
                        ? "Upload a new one first"
                        : "Cannot delete this document type"}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                    </div>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <Toast
          isVisible={toast.isVisible}
          type={toast.type}
          message={toast.message}
          onClose={hideToast}
        />
        <ConfirmationDialog
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDocumentToDelete(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Document"
          message={`Are you sure you want to delete "${documentToDelete?.filename}"? This action cannot be undone.`}
          confirmButtonText="Delete"
          cancelButtonText="Cancel"
          isLoading={isDeleting}
        />
        <div className="space-y-8 px-4 sm:px-6 lg:px-8 max-w-full overflow-hidden">
          <div>
            <h1 className="text-2xl font-bold text-brand dark:text-primary-300 mb-2">
              Documents
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Manage your uploaded documents and files
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card title="Total Documents">
              <div className="text-2xl font-bold dark:text-white">
                {documents.length}/{MAX_DOCUMENTS}
              </div>
              {documents.length >= MAX_DOCUMENTS && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Document limit reached
                </p>
              )}
            </Card>
            <Card title="Document Types">
              <div className="flex flex-wrap gap-2 max-w-full">
                {Object.keys(documentTypeCounts).length > 0 ? (
                  Object.entries(documentTypeCounts).map(([type, count]) => (
                    <span
                      key={type}
                      className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getSourceTypeColor(
                        type
                      )}`}
                    >
                      {type} ({count})
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No documents uploaded yet
                  </p>
                )}
              </div>
            </Card>
            <Card title="Last Upload">
              {lastUpload ? (
                <>
                  <div className="text-sm font-semibold dark:text-white truncate">
                    {lastUpload.filename}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    {new Date(lastUpload.createdAt).toLocaleDateString()} •{" "}
                    {formatSource(lastUpload.source)}
                  </div>
                </>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No uploads yet
                </div>
              )}
            </Card>
          </div>

          <Card title="Your Documents">
            <div className="space-y-3">
              {renderDocumentList()}

              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-6xl w-[90vw] h-[90vh] p-0 flex flex-col">
                  <DialogHeader className="p-4 border-b bg-gray-50 flex-shrink-0 dark:text-black">
                    <DialogTitle className="text-lg font-semibold text-gray-800 dark:text-black">
                      Document Preview
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 p-4 bg-gray-100 min-h-0">
                    <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden relative">
                      {isPreviewLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">
                              Loading document preview...
                            </p>
                          </div>
                        </div>
                      ) : previewUrl ? (
                        <iframe
                          src={previewUrl}
                          className="w-full h-full border-0"
                          title="Document Preview"
                          style={{
                            minHeight: "600px",
                            height: "100%",
                            width: "100%",
                          }}
                          onLoad={() => {
                            console.log("Iframe loaded successfully");
                          }}
                          onError={() => {
                            console.error("Iframe failed to load");
                            showToast(
                              "error",
                              "Failed to load document preview."
                            );
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>

          <Card title="Upload New Document">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="text-sm block mb-1 dark:text-slate-300">
                  Document type
                </label>
                <select
                  className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 outline-none focus:ring-2 focus:ring-secondary-300 transition-all bg-white dark:bg-slate-700 dark:text-white"
                  value={bucketValue}
                  onChange={(e) =>
                    setBucketValue(e.target.value as BucketSelectValue)
                  }
                >
                  {DOCUMENT_TYPES.map((docType) => (
                    <option
                      key={docType.value}
                      value={docType.value}
                      disabled={isDocumentTypeDisabled(docType.label)}
                      className={
                        isDocumentTypeDisabled(docType.label)
                          ? "text-gray-400 bg-gray-100"
                          : ""
                      }
                    >
                      {docType.label}{" "}
                      {isDocumentTypeDisabled(docType.label)
                        ? "(Already uploaded)"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm block mb-1 dark:text-slate-300">
                  File
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="w-full rounded-xl border dark:border-slate-600 px-3 py-2 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary-800 dark:file:bg-primary-900/30 dark:file:text-primary-300 bg-white dark:bg-slate-700 dark:text-white"
                />
              </div>

              {msg && (
                <p
                  className={`text-sm ${
                    msg.includes("failed") ||
                    msg.includes("error") ||
                    msg.includes("Invalid")
                      ? "text-red-600 dark:text-red-400"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {msg}
                </p>
              )}

              <button
                type="submit"
                disabled={isUploading || !file || isUploadDisabled}
                className="bg-secondary text-white px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {isUploading
                  ? "Uploading..."
                  : isUploadDisabled
                  ? documents.length >= MAX_DOCUMENTS
                    ? "Limit Reached"
                    : "Storage Full"
                  : "Upload Document"}
              </button>
            </form>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
