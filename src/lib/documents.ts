import { fetchAuthSession } from "aws-amplify/auth";

/**
 * Fetches the list of documents for the currently authenticated user.
 * @returns {Promise<Array>} - An array of document objects from DynamoDB.
 */
export async function fetchDocuments() {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();

  const res = await fetch(
    `${import.meta.env.VITE_DOCS_API_BASE_URL || "/api"}/documents`, // GET from the /documents path
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    console.error("API Error (fetchDocuments):", errorText);
    throw new Error("Failed to fetch documents");
  }

  return res.json();
}

/** Fetches a presigned URL for viewing/downloading a specific document.*/
export async function getDocumentUrl(docId: string, forDownload = false) {
  // 1. Get the current user's session token for authorization (same as before)
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  // 2. Construct the full API URL (same as before)
  const apiUrl = `${
    import.meta.env.VITE_DOCS_API_BASE_URL || "/api"
  }/documents/${docId}`;

  // 3. Make an authenticated POST request to the endpoint
  const res = await fetch(apiUrl, {
    method: "POST", // CHANGED: from GET to POST to allow a request body
    headers: {
      // ADDED: Content-Type header is required for a JSON body
      "Content-Type": "application/json",
      // The Authorization header is the same
      Authorization: `Bearer ${token}`,
    },
    // ADDED: The body of the request, sending the download flag
    body: JSON.stringify({ download: forDownload }),
  });

  // 4. Handle the response (same as before)
  if (!res.ok) {
    const errorText = await res.text();
    console.error("API Error (getDocumentUrl):", errorText);
    throw new Error("Failed to get document URL");
  }

  // 5. Return the JSON payload (same as before)
  return res.json();
}

export async function getPresignedUrl(params: {
  filename: string;
  mime: string;
  // UI selection:
  selectValue: string; // <-- send this (bucket or bucket/prefix)
  source?: string; // <-- send the human-readable source name
  // optional lease metadata:
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
}): Promise<{ uploadUrl: string; docId: string; key: string }> {
  // If your API has NO authorizer, token may be unused, but harmless to send
  const session = await fetchAuthSession().catch(() => null);
  const token = session?.tokens?.idToken?.toString();
  const res = await fetch(
    "https://ruhqb5iww2.execute-api.us-west-2.amazonaws.com/prod/",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/**
 * Deletes a specific document for the authenticated user.
 * @param {string} docId - The ID of the document to delete.
 * @returns {Promise<boolean>} - True if successful.
 */
export async function deleteDocument(docId: string) {
  // 1. Get the current user's session token for authorization
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();

  // 2. Construct the full API URL for the specific document
  const apiUrl = `${
    import.meta.env.VITE_DOCS_API_BASE_URL || "/api"
  }/documents/${docId}`;

  // 3. Make an authenticated DELETE request
  const res = await fetch(apiUrl, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // 4. Handle the response
  if (!res.ok) {
    const errorText = await res.text();
    console.error("API Error (deleteDocument):", errorText);
    throw new Error("Failed to delete document");
  }

  // A successful DELETE often returns a 204 No Content response,
  // so we don't need to parse a JSON body.
  return true;
}
