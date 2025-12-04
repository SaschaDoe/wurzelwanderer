/**
 * Centralized IndexedDB storage management for Wurzelwanderer.
 * Provides type-safe storage operations and consistent key naming.
 * Uses IndexedDB for unlimited storage (vs ~5MB localStorage limit).
 */

import { browser } from '$app/environment';
import * as idb from '$lib/services/indexedDBStorage';

/**
 * All storage keys used in the application.
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
	API_KEY: 'wurzelwanderer-gemini-api-key',
	/** Saved regions containing locations */
	REGIONEN: 'wurzelwanderer-regionen',
	/** Currently active region ID */
	AKTIVE_REGION: 'wurzelwanderer-aktive-region',
	/** Saved picture books (Bildbände) */
	BILDBAENDE: 'wurzelwanderer-bildbaende',
	/** Generated characters in the Bildband wizard */
	WIZARD_CHARAKTERE: 'wurzelwanderer-wizard-charaktere',
	/** Migration marker */
	MIGRATED: 'wurzelwanderer-migrated-to-idb'
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// Keys to migrate from localStorage
const KEYS_TO_MIGRATE = [
	STORAGE_KEYS.CURRENT_BEKANNTER,
	STORAGE_KEYS.ORTE,
	STORAGE_KEYS.HELD,
	STORAGE_KEYS.API_KEY,
	STORAGE_KEYS.REGIONEN,
	STORAGE_KEYS.AKTIVE_REGION
];

let migrationPromise: Promise<void> | null = null;

/**
 * Ensures localStorage data is migrated to IndexedDB.
 * Only runs once per session.
 */
async function ensureMigration(): Promise<void> {
	if (!browser) return;
	if (migrationPromise) return migrationPromise;

	migrationPromise = (async () => {
		try {
			// Check if already migrated
			const migrated = await idb.getItem<boolean>(STORAGE_KEYS.MIGRATED);
			if (migrated) return;

			console.log('[Storage] Starte Migration von localStorage zu IndexedDB...');
			await idb.migrateFromLocalStorage(KEYS_TO_MIGRATE);
			await idb.setItem(STORAGE_KEYS.MIGRATED, true);

			// Clear localStorage after successful migration
			idb.clearLocalStorage(KEYS_TO_MIGRATE);
			console.log('[Storage] Migration abgeschlossen');
		} catch (error) {
			console.error('[Storage] Migration fehlgeschlagen:', error);
		}
	})();

	return migrationPromise;
}

/**
 * Retrieves and parses a value from IndexedDB.
 * Returns null if the key doesn't exist or not in browser.
 *
 * @example
 * const orte = await getStoredItem<GespeicherterOrt[]>(STORAGE_KEYS.ORTE);
 */
export async function getStoredItem<T>(key: StorageKey): Promise<T | null> {
	if (!browser) return null;

	try {
		await ensureMigration();
		return await idb.getItem<T>(key);
	} catch (e) {
		console.error(`Fehler beim Laden von "${key}":`, e);
		return null;
	}
}

/**
 * Stores a value in IndexedDB.
 * Silently fails if not in browser context.
 *
 * @example
 * await setStoredItem(STORAGE_KEYS.HELD, heroData);
 */
export async function setStoredItem<T>(key: StorageKey, value: T): Promise<void> {
	if (!browser) return;

	try {
		await ensureMigration();
		await idb.setItem(key, value);
	} catch (e) {
		console.error(`Fehler beim Speichern von "${key}":`, e);
	}
}

/**
 * Removes an item from IndexedDB.
 *
 * @example
 * await removeStoredItem(STORAGE_KEYS.HELD);
 */
export async function removeStoredItem(key: StorageKey): Promise<void> {
	if (!browser) return;

	try {
		await ensureMigration();
		await idb.removeItem(key);
	} catch (e) {
		console.error(`Fehler beim Löschen von "${key}":`, e);
	}
}

/**
 * Retrieves a string value from IndexedDB.
 * Useful for simple string values like API keys.
 *
 * @example
 * const apiKey = await getStoredString(STORAGE_KEYS.API_KEY);
 */
export async function getStoredString(key: StorageKey): Promise<string | null> {
	if (!browser) return null;

	try {
		await ensureMigration();
		return await idb.getItem<string>(key);
	} catch (e) {
		console.error(`Fehler beim Laden von "${key}":`, e);
		return null;
	}
}

/**
 * Stores a string value in IndexedDB.
 *
 * @example
 * await setStoredString(STORAGE_KEYS.API_KEY, 'my-api-key');
 */
export async function setStoredString(key: StorageKey, value: string): Promise<void> {
	if (!browser) return;

	try {
		await ensureMigration();
		await idb.setItem(key, value);
	} catch (e) {
		console.error(`Fehler beim Speichern von "${key}":`, e);
	}
}

/**
 * Gets storage usage info
 */
export async function getStorageInfo(): Promise<{ count: number; sizeKB: number }> {
	if (!browser) return { count: 0, sizeKB: 0 };
	return idb.getStorageInfo();
}
