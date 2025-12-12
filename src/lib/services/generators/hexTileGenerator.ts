/**
 * Hex tile image generation for the map.
 * Generates top-down map tiles that can be tiled together seamlessly.
 */

import { generateImage } from '$lib/services/ai';
import { HEX_TILE_MAP_STYLE } from './prompts';
import { BIOME_TERRAIN_PROMPTS } from './prompts/biomePrompts';
import type { HexOrtInfo, NeighborHexInfo } from './types';

/**
 * Crop the edge strip from a neighbor image that borders our hex.
 * Used to provide context for seamless tile generation.
 *
 * For pointy-top hexagons with CSS clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)
 * When neighbor is to our N, we need THEIR S edge (bottom center).
 * When neighbor is to our NE, we need THEIR SW edge (bottom-left quadrant).
 * etc.
 */
async function cropNeighborEdge(
	imageDataUrl: string,
	neighborDirection: 'N' | 'NE' | 'SE' | 'S' | 'SW' | 'NW'
): Promise<string> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => {
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				reject(new Error('Could not get canvas context'));
				return;
			}

			const w = img.width;
			const h = img.height;

			// Edge depth as fraction of image dimension
			const edgeDepth = 0.25;
			const edgeWidth = 0.5;

			let sx = 0, sy = 0, sw = w, sh = h;

			// Crop the edge of the neighbor that TOUCHES our center hex.
			// Based on hexToPixel positioning:
			// - N (0,-1):   x=-39, y=-68  → neighbor is upper-left, crop their BOTTOM-RIGHT
			// - NE (1,-1):  x=+39, y=-68  → neighbor is upper-right, crop their BOTTOM-LEFT
			// - SE (1,0):   x=+78, y=0    → neighbor is right, crop their LEFT-MIDDLE
			// - S (0,1):    x=+39, y=+68  → neighbor is lower-right, crop their TOP-LEFT
			// - SW (-1,1):  x=-39, y=+68  → neighbor is lower-left, crop their TOP-RIGHT
			// - NW (-1,0):  x=-78, y=0    → neighbor is left, crop their RIGHT-MIDDLE
			switch (neighborDirection) {
				case 'N':
					// Neighbor is upper-left, crop their BOTTOM-RIGHT corner
					sx = w * 0.5;
					sy = h * 0.5;
					sw = w * 0.5;
					sh = h * 0.5;
					break;
				case 'NE':
					// Neighbor is upper-right, crop their BOTTOM-LEFT corner
					sx = 0;
					sy = h * 0.5;
					sw = w * 0.5;
					sh = h * 0.5;
					break;
				case 'SE':
					// Neighbor is right, crop their LEFT-MIDDLE edge
					sx = 0;
					sy = h * 0.25;
					sw = w * 0.5;
					sh = h * 0.5;
					break;
				case 'S':
					// Neighbor is lower-right, crop their TOP-LEFT corner
					sx = 0;
					sy = 0;
					sw = w * 0.5;
					sh = h * 0.5;
					break;
				case 'SW':
					// Neighbor is lower-left, crop their TOP-RIGHT corner
					sx = w * 0.5;
					sy = 0;
					sw = w * 0.5;
					sh = h * 0.5;
					break;
				case 'NW':
					// Neighbor is left, crop their RIGHT-MIDDLE edge
					sx = w * 0.5;
					sy = h * 0.25;
					sw = w * 0.5;
					sh = h * 0.5;
					break;
			}

			canvas.width = sw;
			canvas.height = sh;
			ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

			resolve(canvas.toDataURL('image/png'));
		};
		img.onerror = () => reject(new Error('Failed to load image for cropping'));
		img.src = imageDataUrl;
	});
}

/**
 * Prepare reference images from neighbors for the AI.
 */
async function prepareNeighborReferences(
	neighbors: NeighborHexInfo[]
): Promise<Array<{ data: string; label: string }>> {
	const references: Array<{ data: string; label: string }> = [];

	for (const neighbor of neighbors) {
		try {
			const croppedEdge = await cropNeighborEdge(neighbor.imageData, neighbor.direction);
			references.push({
				data: croppedEdge,
				label: `${neighbor.direction} edge from "${neighbor.ortName || 'neighbor'}"`
			});
			console.log(`[HexTile] 📐 Edge-Crop für ${neighbor.direction} erstellt`);
		} catch (error) {
			console.warn(`[HexTile] ⚠️ Edge-Crop fehlgeschlagen für ${neighbor.direction}`);
			// Use full image as fallback
			references.push({
				data: neighbor.imageData,
				label: `${neighbor.direction} neighbor "${neighbor.ortName || 'unknown'}"`
			});
		}
	}

	return references;
}

/**
 * Generates a hex tile image in a top-down fantasy map style.
 * The image is designed to be displayed as a hexagonal tile on a map grid.
 */
export async function generateHexTileImage(ort: HexOrtInfo): Promise<string | null> {
	const hasNeighbors = ort.neighbors && ort.neighbors.length > 0;
	console.log(`[HexTile] 🗺️ Generiere Hex-Tile für: ${ort.name}${hasNeighbors ? ` (mit ${ort.neighbors!.length} Nachbarn)` : ''}`);

	// Build naturelle descriptions
	const naturelleDescriptions = ort.naturelle.map(n => {
		if (n.metaphorisch) {
			return n.beschreibung;
		}
		return n.name;
	});

	const hauptNaturellData = ort.naturelle.find(n => n.name === ort.hauptNaturell);
	const hauptNaturellText = hauptNaturellData?.metaphorisch
		? hauptNaturellData.beschreibung
		: ort.hauptNaturell;

	// Build region context
	let regionText = '';
	if (ort.region) {
		const features: string[] = [];
		for (const geo of ort.region.geographisch) {
			features.push(geo.promptText);
		}
		for (const flora of ort.region.faunaFlora) {
			features.push(flora.promptText);
		}
		if (ort.region.architektur) {
			features.push(ort.region.architektur.promptText);
		}
		if (features.length > 0) {
			regionText = `\nRegion features: ${features.slice(0, 3).join(', ')}.`;
		}
	}

	const customDescText = ort.customDescription?.trim()
		? `\nCustom visual description: ${ort.customDescription.trim()}`
		: '';

	// Build neighbor context
	let neighborContextText = '';
	if (hasNeighbors) {
		const directionNames: Record<string, string> = {
			'N': 'NORTH edge (top)',
			'NE': 'NORTHEAST edge (top-right)',
			'SE': 'SOUTHEAST edge (bottom-right)',
			'S': 'SOUTH edge (bottom)',
			'SW': 'SOUTHWEST edge (bottom-left)',
			'NW': 'NORTHWEST edge (top-left)'
		};

		const neighborDescriptions = ort.neighbors!.map(n => {
			return `- ${directionNames[n.direction]}: "${n.ortName || 'unknown terrain'}"`;
		}).join('\n');

		neighborContextText = `

NEIGHBOR REFERENCE (for edge-matching ONLY - do NOT include these tiles in your output!):
${neighborDescriptions}

⚠️ These neighbor images are ONLY for color/terrain matching at edges. Generate ONE NEW tile that blends with them.
Match the terrain COLOR and TYPE at each edge - continue grass with same green, water with same blue, etc.`;
	}

	const edgeAdvice = hasNeighbors ? '' : `

Keep tile edges simple with neutral terrain (grass, earth, sand) in muted tones for future blending.`;

	// Build biome description
	let biomeText = '';
	if (ort.biome && BIOME_TERRAIN_PROMPTS[ort.biome]) {
		biomeText = `

🌍 BASE BIOME (IMPORTANT - determines overall terrain type):
${BIOME_TERRAIN_PROMPTS[ort.biome]}
The location features below should be integrated INTO this biome landscape.`;
	}

	const prompt = `${HEX_TILE_MAP_STYLE}
${biomeText}

TERRAIN: ${hauptNaturellText}
Features: ${naturelleDescriptions.join(', ')}${regionText}${customDescText}${neighborContextText}${edgeAdvice}

⚠️ ABSOLUTELY NO white borders, margins, or empty space around the edges!
⚠️ NO rivers, streams, roads, or paths (they don't connect between tiles)
Small self-contained ponds or lakes in the CENTER are OK, but NO flowing water.

🚫🚫🚫 CRITICAL: DO NOT write ANY text, labels, or names in the image! The terrain/location names above are ONLY for your understanding - render them as VISUAL terrain, NOT as text! 🚫🚫🚫

Remember: Fill the ENTIRE rectangular image with terrain - NO white borders! The image will be cropped to hex shape by CSS later.`;

	// Prepare reference images if we have neighbors
	let referenceImages: Array<{ data: string; label: string }> | undefined;
	if (hasNeighbors) {
		referenceImages = await prepareNeighborReferences(ort.neighbors!);
	}

	const result = await generateImage(prompt, {
		aspectRatio: '3:4',
		referenceImages
	});

	if (result.success && result.imageData) {
		console.log(`[HexTile] 🎉 Hex-Tile erfolgreich generiert`);
		return result.imageData;
	}

	console.error(`[HexTile] 💥 Bildgenerierung fehlgeschlagen: ${result.error}`);
	throw new Error(`API Error: ${result.error}`);
}
