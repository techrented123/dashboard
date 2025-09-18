import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a phone number to E.164 format (+16045551234)
 * Handles various input formats like:
 * - 6045551234 -> +16045551234
 * - 604-555-1234 -> +16045551234
 * - (604) 555-1234 -> +16045551234
 * - +1 604 555 1234 -> +16045551234
 * - 16045551234 -> +16045551234
 */
export function formatPhoneToE164(phoneNumber: string): string {
  if (!phoneNumber || phoneNumber.trim() === "") {
    return "";
  }

  // Remove all non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, "");

  // If empty after removing non-digits, return empty string
  if (digitsOnly === "") {
    return "";
  }

  // Handle different cases
  if (digitsOnly.length === 10) {
    // Assume North American number without country code (6045551234)
    return `+1${digitsOnly}`;
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith("1")) {
    // Already has country code (16045551234)
    return `+${digitsOnly}`;
  } else if (digitsOnly.length > 11) {
    // International number, assume it already has country code
    return `+${digitsOnly}`;
  } else {
    // For other cases, assume it's a North American number and add +1
    return `+1${digitsOnly}`;
  }
}
