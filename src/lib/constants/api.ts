/**
 * API-related constants for the Wurzelwanderer application.
 * Centralizes configuration to avoid magic numbers and strings.
 */

/** Base URL for the Google Gemini API */
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Request timeout in milliseconds (90 seconds) */
export const REQUEST_TIMEOUT_MS = 90_000;

/**
 * Image generation models to try in order of preference.
 * Falls back to next model if the first one fails.
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */
export const IMAGE_MODELS = [
	'gemini-3-pro-image-preview', // "Nano Banana Pro" - state-of-the-art
	'gemini-2.5-flash-image' // Fast "Nano Banana" - stable fallback
] as const;

/** Type for available image models */
export type ImageModel = (typeof IMAGE_MODELS)[number];
