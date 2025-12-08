/**
 * World Generator Service
 * Generates procedural worlds using Simplex Noise for:
 * - Elevation (land vs water)
 * - Temperature (poles cold, equator warm)
 * - Humidity (affects biome type)
 */

import { createNoise2D } from 'simplex-noise';
import type { HexPosition } from '$lib/data/hexmap';

// ============================================================================
// TYPES
// ============================================================================

export type BiomeType =
	| 'OCEAN'
	| 'COAST'
	| 'ICE'
	| 'TUNDRA'
	| 'TAIGA'
	| 'DESERT'
	| 'RED_DESERT'
	| 'SAVANNA'
	| 'JUNGLE'
	| 'PLAINS'
	| 'FOREST'
	| 'DENSE_FOREST'
	| 'SWAMP';

export interface WorldHex {
	position: HexPosition;
	elevation: number;      // 0-1, values below waterLevel = water
	temperature: number;    // 0-1 (0 = freezing, 1 = tropical)
	humidity: number;       // 0-1 (0 = arid, 1 = humid)
	biome: BiomeType;
	isWater: boolean;
}

export interface WorldConfig {
	width: number;
	height: number;
	seed: number;
	waterLevel: number;     // Threshold for water (e.g., 0.38)
	noiseScale: number;     // Scale for terrain noise
}

export interface GeneratedWorld {
	config: WorldConfig;
	hexes: Map<string, WorldHex>;  // Key: "q,r"
	bounds: {
		minQ: number;
		maxQ: number;
		minR: number;
		maxR: number;
	};
}

// ============================================================================
// BIOME COLORS (for map display)
// ============================================================================

export const BIOME_COLORS: Record<BiomeType, string> = {
	OCEAN: '#2B5A8A',
	COAST: '#5B8DB8',
	ICE: '#E8F0F5',
	TUNDRA: '#B8C4A8',
	TAIGA: '#4A6B4A',
	DESERT: '#E8D5A8',
	RED_DESERT: '#C4806B',
	SAVANNA: '#C9B86B',
	JUNGLE: '#2D5A2D',
	PLAINS: '#90B060',
	FOREST: '#5A8A4A',
	DENSE_FOREST: '#3A6A3A',
	SWAMP: '#6A7A5A'
};

export const BIOME_NAMES: Record<BiomeType, string> = {
	OCEAN: 'Ozean',
	COAST: 'Küste',
	ICE: 'Ewiges Eis',
	TUNDRA: 'Tundra',
	TAIGA: 'Taiga',
	DESERT: 'Wüste',
	RED_DESERT: 'Rote Steinwüste',
	SAVANNA: 'Savanne',
	JUNGLE: 'Dschungel',
	PLAINS: 'Grasland',
	FOREST: 'Wald',
	DENSE_FOREST: 'Dichter Wald',
	SWAMP: 'Sumpf'
};

// Biome descriptions for image generation prompts
export const BIOME_PROMPT_DESCRIPTIONS: Record<BiomeType, string> = {
	OCEAN: 'Deep ocean water, dark blue waves, no land visible',
	COAST: 'Shallow coastal waters, sandy beaches, small islands',
	ICE: 'Frozen ice sheets, glaciers, snow-covered terrain, polar landscape',
	TUNDRA: 'Frozen tundra, permafrost, sparse low vegetation, grey-blue cold tones, lichens and moss',
	TAIGA: 'Snowy coniferous forest, pine and spruce trees with snow, cold northern woodland',
	DESERT: 'Sandy desert with rolling dunes, sparse rocks, dry earth tones, occasional cacti',
	RED_DESERT: 'Red rock desert, sandstone formations, rust-colored terrain, canyon-like features',
	SAVANNA: 'Dry grassland savanna, scattered acacia-like trees, golden grass, warm tones',
	JUNGLE: 'Dense tropical rainforest, lush green vegetation, vines, exotic plants, humid atmosphere',
	PLAINS: 'Rolling green meadows, gentle hills, wildflowers, pastoral countryside',
	FOREST: 'Temperate deciduous forest, oak and beech trees, dappled sunlight, forest floor',
	DENSE_FOREST: 'Thick ancient forest, towering trees, dense canopy, mysterious atmosphere',
	SWAMP: 'Murky swampland, standing water, willow trees, reeds, misty atmosphere'
};

// ============================================================================
// SEEDED RANDOM
// ============================================================================

function seededRandom(seed: number): () => number {
	return function() {
		seed = (seed * 1103515245 + 12345) & 0x7fffffff;
		return seed / 0x7fffffff;
	};
}

// ============================================================================
// WORLD GENERATION
// ============================================================================

const DEFAULT_CONFIG: WorldConfig = {
	width: 30,
	height: 20,
	seed: Date.now(),
	waterLevel: 0.45,  // Higher = more water
	noiseScale: 0.08
};

/**
 * Generate hex positions for an offset coordinate grid
 */
function generateHexGrid(width: number, height: number): HexPosition[] {
	const positions: HexPosition[] = [];

	// Use offset coordinates, then convert to axial
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			// Offset to axial conversion (odd-r layout)
			const q = col - Math.floor(row / 2);
			const r = row;
			positions.push({ q, r });
		}
	}

	return positions;
}

/**
 * Calculate temperature based on vertical position
 * Top and bottom are cold (poles), middle is warm (equator)
 */
function calculateBaseTemperature(r: number, height: number): number {
	// Normalize r to 0-1 range
	const normalizedR = r / (height - 1);

	// Create a curve where 0 and 1 are cold, 0.5 is warm
	// Using cosine for smooth transition
	const distanceFromEquator = Math.abs(normalizedR - 0.5) * 2; // 0 at equator, 1 at poles

	// Invert so equator is hot (1) and poles are cold (0)
	return 1 - Math.pow(distanceFromEquator, 1.5);
}

/**
 * Determine biome based on elevation, temperature, and humidity
 */
function determineBiome(
	elevation: number,
	temperature: number,
	humidity: number,
	waterLevel: number
): BiomeType {
	// Water check
	if (elevation < waterLevel) {
		// Check if it's frozen water (ice)
		if (temperature < 0.15) {
			return 'ICE';
		}
		// Deep vs shallow water
		if (elevation < waterLevel - 0.1) {
			return 'OCEAN';
		}
		return 'COAST';
	}

	// Land biomes based on temperature and humidity

	// Very cold (polar)
	if (temperature < 0.2) {
		if (humidity < 0.4) {
			return 'TUNDRA';
		}
		return 'TAIGA';
	}

	// Cold (subarctic)
	if (temperature < 0.35) {
		if (humidity < 0.3) {
			return 'TUNDRA';
		}
		return 'TAIGA';
	}

	// Hot (tropical/desert)
	if (temperature > 0.75) {
		if (humidity < 0.2) {
			return 'DESERT';
		}
		if (humidity < 0.35) {
			return 'RED_DESERT';
		}
		if (humidity < 0.5) {
			return 'SAVANNA';
		}
		return 'JUNGLE';
	}

	// Warm (subtropical)
	if (temperature > 0.6) {
		if (humidity < 0.25) {
			return 'DESERT';
		}
		if (humidity < 0.4) {
			return 'SAVANNA';
		}
		if (humidity > 0.8) {
			return 'JUNGLE';
		}
		return 'FOREST';
	}

	// Temperate
	if (humidity > 0.85) {
		return 'SWAMP';
	}
	if (humidity > 0.65) {
		return 'DENSE_FOREST';
	}
	if (humidity > 0.4) {
		return 'FOREST';
	}

	return 'PLAINS';
}

/**
 * Generate a complete world with noise-based terrain
 */
export function generateWorld(config: Partial<WorldConfig> = {}): GeneratedWorld {
	const fullConfig: WorldConfig = { ...DEFAULT_CONFIG, ...config };
	const { width, height, seed, waterLevel, noiseScale } = fullConfig;

	console.log(`[WorldGen] Generating world ${width}x${height} with seed ${seed}`);

	// Create noise functions with seed
	const random = seededRandom(seed);
	const elevationNoise = createNoise2D(() => random());
	const humidityNoise = createNoise2D(() => random());
	const temperatureNoise = createNoise2D(() => random());

	// Generate hex grid
	const positions = generateHexGrid(width, height);
	const hexes = new Map<string, WorldHex>();

	// Track bounds
	let minQ = Infinity, maxQ = -Infinity;
	let minR = Infinity, maxR = -Infinity;

	// Generate each hex
	for (const position of positions) {
		const { q, r } = position;
		const key = `${q},${r}`;

		// Update bounds
		minQ = Math.min(minQ, q);
		maxQ = Math.max(maxQ, q);
		minR = Math.min(minR, r);
		maxR = Math.max(maxR, r);

		// Multi-octave noise for more interesting terrain
		const elevation = generateMultiOctaveNoise(elevationNoise, q, r, noiseScale, 4);

		// Base temperature from latitude + noise variation
		const baseTemp = calculateBaseTemperature(r, height);
		const tempNoise = (temperatureNoise(q * noiseScale * 0.5, r * noiseScale * 0.5) + 1) / 2;
		const temperature = Math.max(0, Math.min(1, baseTemp * 0.8 + tempNoise * 0.2));

		// Humidity with some influence from water proximity (will be refined later)
		const baseHumidity = (humidityNoise(q * noiseScale, r * noiseScale) + 1) / 2;
		const humidity = baseHumidity;

		// Determine biome
		const isWater = elevation < waterLevel;
		const biome = determineBiome(elevation, temperature, humidity, waterLevel);

		hexes.set(key, {
			position,
			elevation,
			temperature,
			humidity,
			biome,
			isWater
		});
	}

	// Second pass: increase humidity near water
	for (const [key, hex] of hexes) {
		if (!hex.isWater) {
			const nearWater = isNearWater(hex.position, hexes, 2);
			if (nearWater) {
				hex.humidity = Math.min(1, hex.humidity + 0.15);
				// Recalculate biome with updated humidity
				hex.biome = determineBiome(hex.elevation, hex.temperature, hex.humidity, waterLevel);
			}
		}
	}

	console.log(`[WorldGen] Generated ${hexes.size} hexes`);

	// Log biome distribution
	const biomeCounts = new Map<BiomeType, number>();
	for (const hex of hexes.values()) {
		biomeCounts.set(hex.biome, (biomeCounts.get(hex.biome) || 0) + 1);
	}
	console.log('[WorldGen] Biome distribution:', Object.fromEntries(biomeCounts));

	return {
		config: fullConfig,
		hexes,
		bounds: { minQ, maxQ, minR, maxR }
	};
}

/**
 * Generate multi-octave noise for more natural terrain
 */
function generateMultiOctaveNoise(
	noise2D: ReturnType<typeof createNoise2D>,
	x: number,
	y: number,
	scale: number,
	octaves: number
): number {
	let value = 0;
	let amplitude = 1;
	let frequency = scale;
	let maxValue = 0;

	for (let i = 0; i < octaves; i++) {
		value += (noise2D(x * frequency, y * frequency) + 1) / 2 * amplitude;
		maxValue += amplitude;
		amplitude *= 0.5;
		frequency *= 2;
	}

	return value / maxValue;
}

/**
 * Check if a hex is near water within a certain distance
 */
function isNearWater(position: HexPosition, hexes: Map<string, WorldHex>, distance: number): boolean {
	const { q, r } = position;

	for (let dq = -distance; dq <= distance; dq++) {
		for (let dr = -distance; dr <= distance; dr++) {
			if (dq === 0 && dr === 0) continue;

			const neighbor = hexes.get(`${q + dq},${r + dr}`);
			if (neighbor?.isWater) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Get a hex from world by position
 */
export function getWorldHex(world: GeneratedWorld, q: number, r: number): WorldHex | undefined {
	return world.hexes.get(`${q},${r}`);
}

/**
 * Biomes that are NOT valid for starting positions
 * (water, ice, and extreme environments)
 */
const INVALID_START_BIOMES: BiomeType[] = ['OCEAN', 'COAST', 'ICE', 'TUNDRA'];

/**
 * Preferred biomes for starting (temperate, habitable)
 */
const PREFERRED_START_BIOMES: BiomeType[] = ['PLAINS', 'FOREST', 'DENSE_FOREST', 'SAVANNA'];

/**
 * Find valid starting positions (land hexes, preferably not at edges)
 */
export function findValidStartPositions(world: GeneratedWorld): HexPosition[] {
	const validPositions: HexPosition[] = [];
	const fallbackPositions: HexPosition[] = [];
	const { minQ, maxQ, minR, maxR } = world.bounds;

	// Add some margin from edges
	const marginQ = Math.floor((maxQ - minQ) * 0.15);
	const marginR = Math.floor((maxR - minR) * 0.15);

	for (const hex of world.hexes.values()) {
		// Skip invalid biomes (water, ice, etc.)
		if (INVALID_START_BIOMES.includes(hex.biome)) continue;

		const { q, r } = hex.position;

		// Check if within safe margin from edges
		const withinMargin = q >= minQ + marginQ && q <= maxQ - marginQ &&
		                     r >= minR + marginR && r <= maxR - marginR;

		// Prefer temperate biomes within margin
		if (PREFERRED_START_BIOMES.includes(hex.biome) && withinMargin) {
			validPositions.push(hex.position);
		} else if (!INVALID_START_BIOMES.includes(hex.biome)) {
			// Fallback: any non-invalid biome
			fallbackPositions.push(hex.position);
		}
	}

	// Return preferred positions, or fallback if none found
	return validPositions.length > 0 ? validPositions : fallbackPositions;
}

/**
 * Generate a random seed
 */
export function generateSeed(): number {
	return Math.floor(Math.random() * 2147483647);
}
