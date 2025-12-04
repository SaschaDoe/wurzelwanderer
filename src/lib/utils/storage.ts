/**
 * Centralized localStorage management for Wurzelwanderer.
 * Provides type-safe storage operations and consistent key naming.
 */

import { browser } from '$app/environment';

/**
 * All localStorage keys used in the application.
 * Centralized here to prevent typos and enable easy refactoring.
 */
export const STORAGE_KEYS = {
	/** Currently displayed Bekannter on the /bekannte page */
	CURRENT_BEKANNTER: 'wurzelwanderer-aktueller-bekannter',
	/** Saved locations on the /naturelle page */
	ORTE: 'wurzelwanderer-orte',
	/** User's saved hero character */
	HELD: 'wurzelwanderer-held',
	/** Gemini API key for image generation */
	API_KEY: 'wurzelwanderer-gemini-api-key'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Retrieves and parses a JSON value from localStorage.
 * Returns null if the key doesn't exist, parsing fails, or not in browser.
 *
 * @example
 * const orte = getStoredItem<GespeicherterOrt[]>(STORAGE_KEYS.ORTE);
 */
export function getStoredItem<T>(key: StorageKey): T | null {
	if (!browser) return null;

	try {
		const saved = localStorage.getItem(key);
		if (saved) {
			return JSON.parse(saved) as T;
		}
	} catch (e) {
		console.error(`Fehler beim Laden von "${key}":`, e);
	}

	return null;
}

/**
 * Stores a JSON value in localStorage.
 * Silently fails if not in browser context.
 *
 * @example
 * setStoredItem(STORAGE_KEYS.HELD, heroData);
 */
export function setStoredItem<T>(key: StorageKey, value: T): void {
	if (!browser) return;

	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.error(`Fehler beim Speichern von "${key}":`, e);
	}
}

/**
 * Removes an item from localStorage.
 *
 * @example
 * removeStoredItem(STORAGE_KEYS.HELD);
 */
export function removeStoredItem(key: StorageKey): void {
	if (!browser) return;
	localStorage.removeItem(key);
}

/**
 * Retrieves a raw string value from localStorage (not JSON parsed).
 * Useful for simple string values like API keys.
 *
 * @example
 * const apiKey = getStoredString(STORAGE_KEYS.API_KEY);
 */
export function getStoredString(key: StorageKey): string | null {
	if (!browser) return null;
	return localStorage.getItem(key);
}

/**
 * Stores a raw string value in localStorage (not JSON stringified).
 *
 * @example
 * setStoredString(STORAGE_KEYS.API_KEY, 'my-api-key');
 */
export function setStoredString(key: StorageKey, value: string): void {
	if (!browser) return;
	localStorage.setItem(key, value);
}
