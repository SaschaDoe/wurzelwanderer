/**
 * IndexedDB-basierter Speicher für alle App-Daten.
 * Ersetzt localStorage um Quota-Probleme zu vermeiden.
 */

const DB_NAME = 'wurzelwanderer';
const DB_VERSION = 1;
const DATA_STORE = 'data';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;

	dbPromise = new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			console.error('[IndexedDB] Fehler beim Öffnen der Datenbank:', request.error);
			reject(request.error);
		};

		request.onsuccess = () => {
			resolve(request.result);
		};

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(DATA_STORE)) {
				db.createObjectStore(DATA_STORE, { keyPath: 'key' });
				console.log('[IndexedDB] Data Store erstellt');
			}
		};
	});

	return dbPromise;
}

interface StoredData {
	key: string;
	value: unknown;
	updatedAt: string;
}

/**
 * Speichert einen Wert in IndexedDB
 * Serialisiert über JSON um DataCloneError zu vermeiden
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
	try {
		const db = await getDB();

		// Serialize through JSON to ensure clean data (no functions, circular refs, etc.)
		const serializedValue = JSON.parse(JSON.stringify(value));

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(DATA_STORE, 'readwrite');
			const store = transaction.objectStore(DATA_STORE);

			const data: StoredData = {
				key,
				value: serializedValue,
				updatedAt: new Date().toISOString()
			};

			const request = store.put(data);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				console.error(`[IndexedDB] Fehler beim Speichern von "${key}":`, request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error(`[IndexedDB] Fehler beim Speichern von "${key}":`, error);
		throw error;
	}
}

/**
 * Lädt einen Wert aus IndexedDB
 */
export async function getItem<T>(key: string): Promise<T | null> {
	try {
		const db = await getDB();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(DATA_STORE, 'readonly');
			const store = transaction.objectStore(DATA_STORE);
			const request = store.get(key);

			request.onsuccess = () => {
				const result = request.result as StoredData | undefined;
				resolve((result?.value as T) ?? null);
			};

			request.onerror = () => {
				console.error(`[IndexedDB] Fehler beim Laden von "${key}":`, request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error(`[IndexedDB] Fehler beim Laden von "${key}":`, error);
		return null;
	}
}

/**
 * Löscht einen Wert aus IndexedDB
 */
export async function removeItem(key: string): Promise<void> {
	try {
		const db = await getDB();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(DATA_STORE, 'readwrite');
			const store = transaction.objectStore(DATA_STORE);
			const request = store.delete(key);

			request.onsuccess = () => {
				resolve();
			};

			request.onerror = () => {
				console.error(`[IndexedDB] Fehler beim Löschen von "${key}":`, request.error);
				reject(request.error);
			};
		});
	} catch (error) {
		console.error(`[IndexedDB] Fehler beim Löschen von "${key}":`, error);
		throw error;
	}
}

/**
 * Lädt alle Keys aus IndexedDB
 */
export async function getAllKeys(): Promise<string[]> {
	try {
		const db = await getDB();

		return new Promise((resolve, reject) => {
			const transaction = db.transaction(DATA_STORE, 'readonly');
			const store = transaction.objectStore(DATA_STORE);
			const request = store.getAllKeys();

			request.onsuccess = () => {
				resolve(request.result as string[]);
			};

			request.onerror = () => {
				reject(request.error);
			};
		});
	} catch (error) {
		console.error('[IndexedDB] Fehler beim Laden der Keys:', error);
		return [];
	}
}

/**
 * Gibt die ungefähre Größe des Speichers zurück
 */
export async function getStorageInfo(): Promise<{ count: number; sizeKB: number }> {
	try {
		const db = await getDB();

		return new Promise((resolve) => {
			const transaction = db.transaction(DATA_STORE, 'readonly');
			const store = transaction.objectStore(DATA_STORE);
			const request = store.openCursor();
			let count = 0;
			let totalSize = 0;

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					count++;
					totalSize += JSON.stringify(cursor.value).length;
					cursor.continue();
				} else {
					resolve({
						count,
						sizeKB: Math.round(totalSize / 1024)
					});
				}
			};

			request.onerror = () => {
				resolve({ count: 0, sizeKB: 0 });
			};
		});
	} catch (error) {
		return { count: 0, sizeKB: 0 };
	}
}

/**
 * Migration: Kopiert Daten von localStorage nach IndexedDB
 */
export async function migrateFromLocalStorage(keys: string[]): Promise<void> {
	for (const key of keys) {
		try {
			const value = localStorage.getItem(key);
			if (value !== null) {
				// Prüfen ob bereits in IndexedDB
				const existing = await getItem(key);
				if (existing === null) {
					// Versuche als JSON zu parsen
					try {
						const parsed = JSON.parse(value);
						await setItem(key, parsed);
						console.log(`[IndexedDB] Migriert: ${key}`);
					} catch {
						// String-Wert direkt speichern
						await setItem(key, value);
						console.log(`[IndexedDB] Migriert (string): ${key}`);
					}
				}
			}
		} catch (error) {
			console.warn(`[IndexedDB] Migration fehlgeschlagen für ${key}:`, error);
		}
	}
}

/**
 * Löscht localStorage nach erfolgreicher Migration
 */
export function clearLocalStorage(keys: string[]): void {
	for (const key of keys) {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.warn(`[IndexedDB] Konnte ${key} nicht aus localStorage löschen:`, error);
		}
	}
}
