/**
 * Hexmap data structures for the Wurzelwanderer tabletop RPG.
 * A Hexmap displays Orte (locations) as hexagonal tiles on a grid.
 */

import type { GespeicherteRegion } from './regionen';
import type { BiomeType, GeneratedWorld } from '$lib/services/worldGenerator';
import { findValidStartPositions } from '$lib/services/worldGenerator';

/**
 * Position eines Hex-Feldes im Grid.
 * Verwendet Axial-Koordinaten (q, r) für Hexagon-Grids.
 */
export interface HexPosition {
	q: number; // Column (horizontal)
	r: number; // Row (diagonal)
}

/**
 * Ein gespeichertes Hex-Bild mit Zeitstempel.
 */
export interface HexBildHistoryEntry {
	bild: string;           // Base64 image data
	erstelltAm: string;     // ISO timestamp
}

/**
 * Ein einzelnes Hex-Feld das einen Ort repräsentiert.
 */
export interface HexOrt {
	id: string;
	ortId: string; // Referenz auf den gespeicherten Ort
	position: HexPosition;
	hexBild?: string; // Aktuell angezeigtes Bild (base64)
	hexBildHistory?: HexBildHistoryEntry[]; // Alle generierten Bilder
	aufgedeckt: boolean; // Ob das Hex "aufgeklappt"/sichtbar ist
	erstelltAm: string;

	// World generation data (optional for backwards compatibility)
	biome?: BiomeType;       // Biom-Typ basierend auf Temperatur/Feuchtigkeit
	elevation?: number;      // 0-1, unter waterLevel = Wasser
	temperature?: number;    // 0-1 (0 = eisig, 1 = tropisch)
	humidity?: number;       // 0-1 (0 = trocken, 1 = feucht)
	isWater?: boolean;       // true wenn Wasser-Hex
}

/**
 * Eine gespeicherte Hexmap für eine Region.
 */
export interface GespeicherteHexmap {
	id: string;
	name: string;
	regionId?: string; // Optional: verknüpfte Region
	hexe: HexOrt[];
	erstelltAm: string;
	zuletzGeaendert: string;

	// World generation config (optional for backwards compatibility)
	worldSeed?: number;      // Seed für reproduzierbare Welten
	worldWidth?: number;     // Breite der generierten Welt
	worldHeight?: number;    // Höhe der generierten Welt
	isGeneratedWorld?: boolean; // true wenn mit Weltgenerator erstellt
	startHexPosition?: HexPosition; // Start-Position für Zentrierung
}

/**
 * Konvertiert Axial-Koordinaten (q, r) zu Pixel-Koordinaten.
 * Pointy-top Hexagons (Spitze oben).
 */
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
	const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
	const y = size * ((3 / 2) * r);
	return { x, y };
}

/**
 * Konvertiert Pixel-Koordinaten zurück zu Axial-Koordinaten.
 */
export function pixelToHex(x: number, y: number, size: number): HexPosition {
	const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
	const r = ((2 / 3) * y) / size;
	return { q: Math.round(q), r: Math.round(r) };
}

export type HexDirection = 'N' | 'NE' | 'SE' | 'S' | 'SW' | 'NW';

export interface HexNeighborWithDirection {
	position: HexPosition;
	direction: HexDirection;
}

/**
 * Generiert die Nachbar-Positionen eines Hex-Feldes.
 */
export function getHexNeighbors(pos: HexPosition): HexPosition[] {
	const directions = [
		{ q: 1, r: 0 },   // SE
		{ q: 1, r: -1 },  // NE
		{ q: 0, r: -1 },  // N
		{ q: -1, r: 0 },  // NW
		{ q: -1, r: 1 },  // SW
		{ q: 0, r: 1 }    // S
	];
	return directions.map(d => ({ q: pos.q + d.q, r: pos.r + d.r }));
}

/**
 * Gibt Nachbarn mit ihren Richtungen zurück (für Hex-Bild-Generierung mit Kontext).
 * Pointy-top hex layout mit N/S oben/unten.
 */
export function getHexNeighborsWithDirections(pos: HexPosition): HexNeighborWithDirection[] {
	const directions: Array<{ q: number; r: number; dir: HexDirection }> = [
		{ q: 0, r: -1, dir: 'N' },    // Nord (oben)
		{ q: 1, r: -1, dir: 'NE' },   // Nordost
		{ q: 1, r: 0, dir: 'SE' },    // Südost
		{ q: 0, r: 1, dir: 'S' },     // Süd (unten)
		{ q: -1, r: 1, dir: 'SW' },   // Südwest
		{ q: -1, r: 0, dir: 'NW' }    // Nordwest
	];
	return directions.map(d => ({
		position: { q: pos.q + d.q, r: pos.r + d.r },
		direction: d.dir
	}));
}

/**
 * Berechnet die Distanz zwischen zwei Hex-Feldern.
 */
export function hexDistance(a: HexPosition, b: HexPosition): number {
	return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/**
 * Generiert eine neue leere Hexmap.
 */
export function generiereLeereHexmap(name: string, regionId?: string): GespeicherteHexmap {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		name,
		regionId,
		hexe: [],
		erstelltAm: now,
		zuletzGeaendert: now
	};
}

/**
 * Findet die nächste freie Position für ein neues Hex.
 * Startet in der Mitte und spiralt nach außen.
 */
export function findeFreiePosition(existingHexe: HexOrt[]): HexPosition {
	const occupied = new Set(existingHexe.map(h => `${h.position.q},${h.position.r}`));

	// Start at center
	if (!occupied.has('0,0')) {
		return { q: 0, r: 0 };
	}

	// Spiral outward
	let ring = 1;
	while (ring < 100) { // Safety limit
		// Start at top-right of ring
		let q = ring;
		let r = 0;

		// Walk around the ring in 6 directions
		const directions = [
			{ dq: -1, dr: 1 },  // Down-left
			{ dq: -1, dr: 0 },  // Left
			{ dq: 0, dr: -1 },  // Up-left
			{ dq: 1, dr: -1 },  // Up-right
			{ dq: 1, dr: 0 },   // Right
			{ dq: 0, dr: 1 }    // Down-right
		];

		for (const dir of directions) {
			for (let i = 0; i < ring; i++) {
				if (!occupied.has(`${q},${r}`)) {
					return { q, r };
				}
				q += dir.dq;
				r += dir.dr;
			}
		}

		ring++;
	}

	// Fallback - should never reach here
	return { q: ring, r: 0 };
}

/**
 * Fügt einen Ort als Hex zur Hexmap hinzu.
 */
export function addOrtZuHexmap(
	hexmap: GespeicherteHexmap,
	ortId: string,
	position?: HexPosition
): GespeicherteHexmap {
	const pos = position ?? findeFreiePosition(hexmap.hexe);

	const neuesHex: HexOrt = {
		id: crypto.randomUUID(),
		ortId,
		position: pos,
		aufgedeckt: false,
		erstelltAm: new Date().toISOString()
	};

	return {
		...hexmap,
		hexe: [...hexmap.hexe, neuesHex],
		zuletzGeaendert: new Date().toISOString()
	};
}

/**
 * Entfernt ein Hex aus der Hexmap.
 */
export function removeHexFromHexmap(hexmap: GespeicherteHexmap, hexId: string): GespeicherteHexmap {
	return {
		...hexmap,
		hexe: hexmap.hexe.filter(h => h.id !== hexId),
		zuletzGeaendert: new Date().toISOString()
	};
}

/**
 * Aktualisiert ein Hex in der Hexmap.
 */
export function updateHexInHexmap(
	hexmap: GespeicherteHexmap,
	hexId: string,
	updates: Partial<HexOrt>
): GespeicherteHexmap {
	return {
		...hexmap,
		hexe: hexmap.hexe.map(h => h.id === hexId ? { ...h, ...updates } : h),
		zuletzGeaendert: new Date().toISOString()
	};
}

/**
 * Erstellt eine Hexmap aus einer generierten Welt.
 * Alle Hexes werden mit Biom-Daten erstellt, aber ohne ortId (noch kein Ort zugewiesen).
 * Ein Start-Hex wird automatisch aufgedeckt.
 */
export function createHexmapFromWorld(
	world: GeneratedWorld,
	name: string
): GespeicherteHexmap {
	const now = new Date().toISOString();

	// Find a valid starting position (land hex, not ice)
	const validStarts = findValidStartPositions(world);
	const startPosition = validStarts.length > 0
		? validStarts[Math.floor(Math.random() * validStarts.length)]
		: { q: 0, r: 0 };
	const startKey = `${startPosition.q},${startPosition.r}`;

	const hexe: HexOrt[] = [];
	for (const [key, worldHex] of world.hexes) {
		hexe.push({
			id: crypto.randomUUID(),
			ortId: '', // Kein Ort zugewiesen
			position: worldHex.position,
			aufgedeckt: key === startKey, // Start-Hex aufgedeckt
			erstelltAm: now,
			// World data
			biome: worldHex.biome,
			elevation: worldHex.elevation,
			temperature: worldHex.temperature,
			humidity: worldHex.humidity,
			isWater: worldHex.isWater
		});
	}

	return {
		id: crypto.randomUUID(),
		name,
		hexe,
		erstelltAm: now,
		zuletzGeaendert: now,
		// World config
		worldSeed: world.config.seed,
		worldWidth: world.config.width,
		worldHeight: world.config.height,
		isGeneratedWorld: true,
		startHexPosition: startPosition // Store starting position for centering
	};
}
