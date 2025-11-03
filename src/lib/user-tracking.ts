/**
 * User tracking utilities for signup form progress tracking
 * Tracks user activity in DynamoDB UserTracking table
 */

const API_ENDPOINT =
  "https://gouym8f9ye.execute-api.us-west-2.amazonaws.com/prod/user-tracking";

export interface TrackingSession {
  sessionId: string;
  email: string;
  name?: string;
  fullName?: string;
  createdAt: string;
  lastActivity: string;
  step?: string;
  address?: string;
  city?: string;
  phone?: string;
  ip?: string;
  location?: string;
  property?: string;
  source?: string;
}

/**
 * Generates a unique session ID or retrieves existing one from sessionStorage
 */
export function getOrCreateSessionId(): string {
  const stored = sessionStorage.getItem("userTrackingSessionId");
  if (stored) {
    return stored;
  }

  // Generate new session ID
  const sessionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem("userTrackingSessionId", sessionId);
  return sessionId;
}

/**
 * Gets the current session ID from sessionStorage
 */
export function getSessionId(): string | null {
  return sessionStorage.getItem("userTrackingSessionId");
}

/**
 * Creates a new tracking session in DynamoDB
 */
export async function createTrackingSession(
  data: Omit<TrackingSession, "sessionId" | "createdAt" | "lastActivity">
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const sessionId = getOrCreateSessionId();
    const now = new Date().toISOString();

    const payload: TrackingSession = {
      sessionId,
      email: data.email,
      name: data.name || data.email,
      createdAt: now,
      lastActivity: now,
      step: data.step || "step2",
      address: data.address,
      source: "silver membership sign up",
    };

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to create tracking session:", errorText);
      return { success: false, error: errorText };
    }

    return { success: true, sessionId };
  } catch (error) {
    console.error("Error creating tracking session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Updates the lastActivity timestamp for the current session
 */
export async function updateTrackingActivity(
  sessionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = sessionId || getSessionId();
    if (!id) {
      return { success: false, error: "No session ID available" };
    }

    const payload = {
      sessionId: id,
      lastActivity: new Date().toISOString(),
    };

    const response = await fetch(`${API_ENDPOINT}/activity`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to update tracking activity:", errorText);
      return { success: false, error: errorText };
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating tracking activity:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Updates the step field for the current session
 */
export async function updateTrackingStep(
  step: string,
  sessionId?: string,
  additionalData?: Partial<TrackingSession>
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = sessionId || getSessionId();
    if (!id) {
      console.error("[updateTrackingStep] No session ID available");
      return { success: false, error: "No session ID available" };
    }

    const payload = {
      sessionId: id,
      step,
      lastActivity: new Date().toISOString(),
      ...(additionalData || {}),
    };

    console.log(
      "[updateTrackingStep] Sending PUT request to /step:",
      JSON.stringify(payload, null, 2)
    );

    const response = await fetch(`${API_ENDPOINT}/step`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    console.log(
      "[updateTrackingStep] Response status:",
      response.status,
      response.statusText
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[updateTrackingStep] Failed to update tracking step:",
        errorText
      );
      return { success: false, error: errorText };
    }

    const responseData = await response.json();
    console.log("[updateTrackingStep] Success response:", responseData);
    return { success: true };
  } catch (error) {
    console.error("[updateTrackingStep] Error updating tracking step:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Deletes the tracking session from DynamoDB (when registration completes)
 */
export async function deleteTrackingSession(
  sessionId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const id = sessionId || getSessionId();
    if (!id) {
      return { success: false, error: "No session ID available" };
    }

    const response = await fetch(`${API_ENDPOINT}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to delete tracking session:", errorText);
      return { success: false, error: errorText };
    }

    // Clear session ID from storage
    sessionStorage.removeItem("userTrackingSessionId");
    localStorage.removeItem("userTrackingSessionId");

    return { success: true };
  } catch (error) {
    console.error("Error deleting tracking session:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Debounce helper for activity tracking
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
