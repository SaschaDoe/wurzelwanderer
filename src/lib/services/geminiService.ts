import { STORAGE_KEYS, getStoredString, setStoredString, removeStoredItem } from '$lib/utils/storage';
import { GEMINI_API_BASE, REQUEST_TIMEOUT_MS, IMAGE_MODELS, TEXT_MODEL, RATE_LIMIT_RETRY_DELAY_MS } from '$lib/constants/api';
import { selectOrtDetails, type SelectionContext } from '$lib/data/ortDetails';
import { generateImage as generateOpenAIImage, generateText as generateOpenAIText, hasOpenAIKey } from './openaiService';
import type { BiomeType } from './worldGenerator';

// Biome prompt descriptions for hex tile generation
const BIOME_TERRAIN_PROMPTS: Record<BiomeType, string> = {
	OCEAN: 'Deep ocean water, dark blue waves, no land visible',
	COAST: 'Shallow coastal waters, sandy beaches, small rocky outcrops',
	ICE: 'Frozen ice sheets, glaciers, snow-covered terrain, polar landscape with white and pale blue',
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

// Cached API key for synchronous access
let cachedApiKey: string | null = null;
let apiKeyLoaded = false;

// Get API key from environment or IndexedDB
export async function getApiKey(): Promise<string | null> {
	// First check environment variable (for dev)
	const envKey = import.meta.env.VITE_GEMINI_API_KEY;
	if (envKey && envKey !== 'your_api_key_here') {
		return envKey;
	}

	// Return cached if already loaded
	if (apiKeyLoaded) {
		return cachedApiKey;
	}

	// Load from IndexedDB
	cachedApiKey = await getStoredString(STORAGE_KEYS.API_KEY);
	apiKeyLoaded = true;
	return cachedApiKey;
}

// Synchronous check - uses cached value
export function hasApiKey(): boolean {
	// Check env first
	const envKey = import.meta.env.VITE_GEMINI_API_KEY;
	if (envKey && envKey !== 'your_api_key_here') {
		return true;
	}
	return !!cachedApiKey;
}

// Initialize API key cache (call on app start)
export async function initApiKey(): Promise<void> {
	await getApiKey();
}

export async function setApiKey(key: string): Promise<void> {
	await setStoredString(STORAGE_KEYS.API_KEY, key);
	cachedApiKey = key;
	apiKeyLoaded = true;
}

export async function clearApiKey(): Promise<void> {
	await removeStoredItem(STORAGE_KEYS.API_KEY);
	cachedApiKey = null;
	apiKeyLoaded = true;
}

// Debug: Liste alle verfügbaren Models
export async function listAvailableModels(): Promise<void> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		console.error('[Gemini] Kein API Key für Model-Liste');
		return;
	}

	console.log('[Gemini] 📋 Lade verfügbare Models...');

	try {
		const response = await fetch(`${GEMINI_API_BASE}/models?key=${apiKey}`);
		const data = await response.json();

		if (!response.ok) {
			console.error('[Gemini] Fehler beim Laden der Models:', data.error?.message);
			return;
		}

		console.log('[Gemini] Verfügbare Models:');
		const imageModels: string[] = [];

		for (const model of data.models || []) {
			const methods = model.supportedGenerationMethods || [];
			const name = model.name?.replace('models/', '') || model.name;
			const supportsImage = methods.includes('generateContent');

			if (name.includes('image') || name.includes('imagen') || name.includes('vision')) {
				imageModels.push(name);
				console.log(`  🖼️ ${name} - ${model.displayName || ''}`);
			}
		}

		console.log('[Gemini] Image-relevante Models:', imageModels);
		console.log('[Gemini] Alle Models:', data.models?.map((m: any) => m.name?.replace('models/', '')));
	} catch (error) {
		console.error('[Gemini] Fehler:', error);
	}
}

// Region context for image generation
export interface RegionBesonderheitInfo {
	name: string;
	promptText: string;
}

export interface RegionInfo {
	name: string;
	geographisch: RegionBesonderheitInfo[];
	faunaFlora: RegionBesonderheitInfo[];
	architektur?: RegionBesonderheitInfo;
}

// Ort context for Bekannter image generation
export interface OrtContext {
	name: string;
	naturelleNames: string[];
	szenenBeschreibung?: string; // Die generierte Szenen-Beschreibung des Ortes
}

export interface BekannterInfo {
	name: string;
	tier: string;
	berufe: string[];
	merkmalName: string;
	merkmalBeschreibung: string;
	kategorie: string;
	geschlecht: string;
	// Optional context for background
	ortContext?: OrtContext;
	regionContext?: RegionInfo;
}

async function tryGenerateWithModel(
	model: string,
	prompt: string,
	apiKey: string
): Promise<{ success: boolean; imageData?: string; error?: string; isRateLimit?: boolean }> {
	const startTime = Date.now();
	console.log(`[Gemini] ⏳ Versuche Bildgenerierung mit Model: ${model}`);
	console.log(`[Gemini] Request gestartet um: ${new Date().toLocaleTimeString()}`);

	// Create abort controller for timeout
	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		console.warn(`[Gemini] ⚠️ Timeout nach ${REQUEST_TIMEOUT_MS / 1000} Sekunden!`);
		controller.abort();
	}, REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(
			`${GEMINI_API_BASE}/models/${model}:generateContent`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey
				},
				body: JSON.stringify({
					contents: [
						{
							role: 'user',
							parts: [{ text: prompt }]
						}
					],
					generationConfig: {
						responseModalities: ['TEXT', 'IMAGE']
					}
				}),
				signal: controller.signal
			}
		);

		clearTimeout(timeoutId);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`[Gemini] Response nach ${elapsed}s - Status: ${response.status} ${response.statusText}`);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.error?.message || response.statusText;
			const isRateLimit = response.status === 429;
			console.warn(`[Gemini] ❌ Model ${model} fehlgeschlagen: ${errorMessage}${isRateLimit ? ' (Rate Limit)' : ''}`);
			return { success: false, error: errorMessage, isRateLimit };
		}

		console.log(`[Gemini] ✅ Response OK, parse JSON...`);
		const data = await response.json();
		console.log(`[Gemini] JSON geparst, suche nach Bild...`);
		console.log(`[Gemini] Candidates:`, data.candidates?.length || 0);

		// Extract image from response
		const candidates = data.candidates || [];
		for (const candidate of candidates) {
			const parts = candidate.content?.parts || [];
			console.log(`[Gemini] Parts in Candidate:`, parts.length);
			for (const part of parts) {
				if (part.inlineData) {
					const mimeType = part.inlineData.mimeType || 'image/png';
					const dataLength = part.inlineData.data?.length || 0;
					console.log(`[Gemini] 🖼️ Bild gefunden! MimeType: ${mimeType}, Größe: ${(dataLength / 1024).toFixed(1)} KB`);
					return {
						success: true,
						imageData: `data:${mimeType};base64,${part.inlineData.data}`
					};
				}
				if (part.text) {
					console.log(`[Gemini] 📝 Text in Response: ${part.text.substring(0, 100)}...`);
				}
			}
		}

		console.warn(`[Gemini] ⚠️ Kein Bild in der Response gefunden`);
		console.log(`[Gemini] Vollständige Response:`, JSON.stringify(data).substring(0, 500));
		return { success: false, error: 'Kein Bild in der Response' };
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof Error && error.name === 'AbortError') {
			console.error(`[Gemini] ⏱️ Request Timeout nach ${REQUEST_TIMEOUT_MS / 1000}s`);
			return { success: false, error: `Timeout nach ${REQUEST_TIMEOUT_MS / 1000} Sekunden` };
		}

		const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
		console.error(`[Gemini] ❌ Fehler bei Model ${model}:`, errorMsg);
		return { success: false, error: errorMsg };
	}
}

/**
 * Wrapper that retries on rate limit (429) errors after a delay.
 */
async function tryGenerateWithRetry(
	model: string,
	prompt: string,
	apiKey: string
): Promise<{ success: boolean; imageData?: string; error?: string }> {
	let result = await tryGenerateWithModel(model, prompt, apiKey);

	// Retry once after delay if rate limited
	if (!result.success && result.isRateLimit) {
		console.log(`[Gemini] ⏳ Rate Limit - warte ${RATE_LIMIT_RETRY_DELAY_MS / 1000}s...`);
		await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
		console.log(`[Gemini] 🔄 Retry nach Rate Limit...`);
		result = await tryGenerateWithModel(model, prompt, apiKey);
	}

	return result;
}

/**
 * Generate 3 diverse quotes (Zitate) for a character using the text API.
 * Generates all quotes at once to ensure they are from different situations.
 */
export async function generateCharakterZitate(
	name: string,
	tier: string,
	geschlecht: string,
	berufe: string[],
	merkmalName: string,
	merkmalBeschreibung: string
): Promise<{ success: boolean; zitate?: string[]; error?: string }> {
	const apiKey = await getApiKey();
	if (!apiKey) return { success: false, error: 'Kein API Key' };

	const geschlechtText = geschlecht === 'weiblich' ? 'weibliche' : 'männlicher';
	const berufeText = berufe.join(', ');

	const prompt = `Du bist ${name}, ein ${geschlechtText} ${tier} in einem deutschen Märchen.
Dein Beruf: ${berufeText}
Deine Persönlichkeit: ${merkmalName} - ${merkmalBeschreibung}

Erstelle genau 3 verschiedene Zitate, die dieser Charakter in unterschiedlichen Situationen sagen würde:
1. Ein weiser oder nachdenklicher Spruch (z.B. über das Leben, die Natur, oder Freundschaft)
2. Ein Ausruf in einer aufregenden oder gefährlichen Situation (z.B. Abenteuer, Überraschung)
3. Ein herzlicher Satz an einen Freund oder Gefährten (z.B. Ermutigung, Trost, Begrüßung)

Jedes Zitat sollte:
- 1-2 Sätze lang sein
- Märchenhaft und kindgerecht klingen
- Die Persönlichkeit des Charakters widerspiegeln

Antworte im Format:
ZITAT1: [erstes Zitat]
ZITAT2: [zweites Zitat]
ZITAT3: [drittes Zitat]

Keine Anführungszeichen, keine weiteren Erklärungen.`;

	console.log(`[Gemini] Generiere 3 Zitate für ${name}...`);
	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (result.success && result.text) {
		// Parse the 3 quotes from the response
		const lines = result.text.trim().split('\n');
		const zitate: string[] = [];

		for (const line of lines) {
			const match = line.match(/^ZITAT\d:\s*(.+)$/i);
			if (match && match[1]) {
				const zitat = match[1].trim().replace(/^["„"]|[""]$/g, '');
				if (zitat) {
					zitate.push(zitat);
				}
			}
		}

		if (zitate.length >= 3) {
			console.log(`[Gemini] 3 Zitate generiert für ${name}`);
			return { success: true, zitate: zitate.slice(0, 3) };
		} else if (zitate.length > 0) {
			console.log(`[Gemini] Nur ${zitate.length} Zitate gefunden, verwende diese`);
			return { success: true, zitate };
		}

		// Fallback: try to split by newlines if format wasn't followed
		const fallbackZitate = result.text
			.split('\n')
			.map(l => l.replace(/^\d+[\.\)]\s*/, '').replace(/^["„"]|[""]$/g, '').trim())
			.filter(l => l.length > 10 && l.length < 200);

		if (fallbackZitate.length >= 1) {
			console.log(`[Gemini] Fallback: ${fallbackZitate.length} Zitate extrahiert`);
			return { success: true, zitate: fallbackZitate.slice(0, 3) };
		}

		return { success: false, error: 'Zitate konnten nicht aus der Antwort extrahiert werden' };
	}

	return { success: false, error: result.error || 'Zitate konnten nicht generiert werden' };
}

export async function generateBekannterImage(bekannter: BekannterInfo): Promise<string | null> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 🎨 Starte Bildgenerierung für: ${bekannter.name} (${bekannter.tier})`);
	console.log(`[Gemini] Verfügbare Models:`, IMAGE_MODELS);

	// Build background context from region and ort
	let backgroundContext = 'Soft, natural background with gentle colors.';

	// Prioritize the scene description if available (best match for the location's generated image)
	if (bekannter.ortContext?.szenenBeschreibung) {
		// Use the scene description directly - it matches what was used for the location image
		backgroundContext = `Background setting: ${bekannter.ortContext.szenenBeschreibung}. The character is placed in this exact scene.`;
		console.log(`[Gemini] 🎭 Verwende Ort-Szene als Hintergrund: ${bekannter.ortContext.name}`);
	} else if (bekannter.regionContext || bekannter.ortContext) {
		const contextParts: string[] = [];

		// Add ort name first if available
		if (bekannter.ortContext?.name) {
			contextParts.push(`location called "${bekannter.ortContext.name}"`);
		}

		// Add region features (up to 3)
		if (bekannter.regionContext) {
			const regionFeatures: string[] = [];
			for (const geo of bekannter.regionContext.geographisch.slice(0, 2)) {
				regionFeatures.push(geo.promptText);
			}
			for (const flora of bekannter.regionContext.faunaFlora.slice(0, 1)) {
				regionFeatures.push(flora.promptText);
			}
			if (bekannter.regionContext.architektur) {
				regionFeatures.push(bekannter.regionContext.architektur.promptText);
			}
			if (regionFeatures.length > 0) {
				contextParts.push(...regionFeatures.slice(0, 3));
			}
		}

		// Add ort naturelle (up to 2) with more descriptive text
		if (bekannter.ortContext && bekannter.ortContext.naturelleNames.length > 0) {
			const naturelleText = bekannter.ortContext.naturelleNames.slice(0, 2).join(' and ');
			contextParts.push(`scene featuring ${naturelleText}`);
		}

		if (contextParts.length > 0) {
			backgroundContext = `Background: ${contextParts.slice(0, 4).join(', ')}. Fairy-tale atmosphere, soft natural lighting.`;
		}
	}

	// Build the prompt for Fritz Baumgarten style
	const prompt = `Create a colorful hand-drawn illustration in the style of Fritz Baumgarten (German children's book illustration, fairy-tale like, warm, detailed, watercolor-style). Do NOT include any text, labels, titles, or words in the image.

The image shows: ${bekannter.name}, ${bekannter.geschlecht === 'weiblich' ? 'a female' : 'a male'} ${bekannter.tier}.
Profession: ${bekannter.berufe.join(', ')}
Character trait: ${bekannter.merkmalName} - ${bekannter.merkmalBeschreibung}

The animal creature stands upright like a human, wears appropriate clothing for their profession, and has a friendly, expressive face.
${backgroundContext}

Style: Fairy-tale German children's book illustration like Fritz Baumgarten.
Portrait orientation, vertical format, focus on the character.`;

	let lastError = '';

	// Try each model in order
	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] 🔄 Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		const result = await tryGenerateWithRetry(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] 🎉 Erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] ➡️ Fallback zum nächsten Model...`);
		}
	}

	// Try OpenAI as final fallback
	if (hasOpenAIKey()) {
		console.log(`[Gemini] 🔄 Alle Gemini Models fehlgeschlagen. Versuche OpenAI...`);
		const openaiResult = await generateOpenAIImage(prompt);
		if (openaiResult.success && openaiResult.imageData) {
			console.log(`[OpenAI] 🎉 Erfolgreich mit OpenAI Fallback`);
			return openaiResult.imageData;
		}
		lastError = openaiResult.error || lastError;
	}

	// All providers failed
	console.error(`[Gemini] 💥 Alle Provider fehlgeschlagen. Letzter Fehler: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
}

export interface HummelInfo {
	name: string;
	aussehen: string;
	persoenlichkeit: string;
}

export async function generateHummelImage(hummel: HummelInfo): Promise<string | null> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 🐝 Starte Bildgenerierung für Hummel: ${hummel.name}`);

	// Build the prompt for Fritz Baumgarten style bumblebee
	const prompt = `Create a colorful hand-drawn illustration in the style of Fritz Baumgarten (German children's book illustration, fairy-tale like, warm, detailed, watercolor-style). Do NOT include any text, labels, titles, or words in the image.

The image shows: A magical fairy-tale bumblebee named "${hummel.name}".
Appearance: ${hummel.aussehen}
Personality: ${hummel.persoenlichkeit}

The bumblebee is adorable and round with fuzzy fur, tiny translucent wings, and an expressive, friendly face with big eyes. It's a cute, anthropomorphic bumblebee character suitable for a children's book.

Background: Soft floral environment with flowers, petals, or honeycomb elements.

Style: Fairy-tale German children's book illustration like Fritz Baumgarten. Warm, cozy, whimsical.
Square format, focus on the bumblebee character.`;

	let lastError = '';

	// Try each model in order
	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] 🔄 Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		const result = await tryGenerateWithRetry(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] 🎉 Erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] ➡️ Fallback zum nächsten Model...`);
		}
	}

	// Try OpenAI as final fallback
	if (hasOpenAIKey()) {
		console.log(`[Gemini] 🔄 Alle Gemini Models fehlgeschlagen. Versuche OpenAI...`);
		const openaiResult = await generateOpenAIImage(prompt);
		if (openaiResult.success && openaiResult.imageData) {
			console.log(`[OpenAI] 🎉 Erfolgreich mit OpenAI Fallback`);
			return openaiResult.imageData;
		}
		lastError = openaiResult.error || lastError;
	}

	// All providers failed
	console.error(`[Gemini] 💥 Alle Provider fehlgeschlagen. Letzter Fehler: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
}

interface NaturellInfo {
	name: string;
	beschreibung: string;
	metaphorisch?: boolean;
	stimmung?: string[];
}

interface OrtInfo {
	name: string;
	hauptNaturell: string;
	naturelle: NaturellInfo[];
	ortBeschreibung?: string; // Interpretation/Bedeutung des Ortes
	anmerkungen?: string; // Visuelle Details für das Bild
	region?: RegionInfo;
}

export interface SceneGenerationResult {
	sceneDescription: string;
	promptForImage: string;
	suggestedName: string; // Neuer, passender Ort-Name basierend auf der Szene
}

async function generateTextWithModel(
	prompt: string,
	apiKey: string
): Promise<{ success: boolean; text?: string; error?: string; isRateLimit?: boolean }> {
	const startTime = Date.now();
	console.log(`[Gemini] 📝 Starte Textgenerierung mit Model: ${TEXT_MODEL}`);

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		console.warn(`[Gemini] ⚠️ Text-Timeout nach ${REQUEST_TIMEOUT_MS / 1000} Sekunden!`);
		controller.abort();
	}, REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(
			`${GEMINI_API_BASE}/models/${TEXT_MODEL}:generateContent`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey
				},
				body: JSON.stringify({
					contents: [
						{
							role: 'user',
							parts: [{ text: prompt }]
						}
					],
					generationConfig: {
						temperature: 0.9,
						maxOutputTokens: 8192
					}
				}),
				signal: controller.signal
			}
		);

		clearTimeout(timeoutId);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`[Gemini] Response nach ${elapsed}s - Status: ${response.status}`);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.error?.message || response.statusText;
			const isRateLimit = response.status === 429;
			console.warn(`[Gemini] ❌ Textgenerierung fehlgeschlagen: ${errorMessage}${isRateLimit ? ' (Rate Limit)' : ''}`);
			console.log(`[Gemini] 📋 Vollständige Error-Response:`, JSON.stringify(errorData, null, 2));
			return { success: false, error: errorMessage, isRateLimit };
		}

		const data = await response.json();
		console.log(`[Gemini] 📋 Vollständige Response:`, JSON.stringify(data, null, 2));

		const candidates = data.candidates || [];
		console.log(`[Gemini] Candidates gefunden: ${candidates.length}`);

		for (const candidate of candidates) {
			console.log(`[Gemini] Candidate finishReason: ${candidate.finishReason}`);
			const parts = candidate.content?.parts || [];
			console.log(`[Gemini] Parts in Candidate: ${parts.length}`);
			for (const part of parts) {
				if (part.text) {
					console.log(`[Gemini] ✅ Text erhalten (vollständig):`);
					console.log(part.text);
					return { success: true, text: part.text };
				}
			}
		}

		// Check for blocked content
		if (data.promptFeedback?.blockReason) {
			const blockReason = data.promptFeedback.blockReason;
			console.error(`[Gemini] ⛔ Prompt wurde blockiert: ${blockReason}`);
			return { success: false, error: `Prompt blockiert: ${blockReason}` };
		}

		console.warn(`[Gemini] ⚠️ Kein Text in der Response gefunden`);
		return { success: false, error: 'Kein Text in der Response' };
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof Error && error.name === 'AbortError') {
			return { success: false, error: `Timeout nach ${REQUEST_TIMEOUT_MS / 1000} Sekunden` };
		}

		const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
		console.error(`[Gemini] ❌ Fehler bei Textgenerierung:`, errorMsg);
		return { success: false, error: errorMsg };
	}
}

/**
 * Wrapper for text generation with retry on rate limit and OpenAI fallback.
 */
async function generateTextWithRetryAndFallback(
	prompt: string,
	apiKey: string
): Promise<{ success: boolean; text?: string; error?: string }> {
	console.log(`[Text] 🚀 generateTextWithRetryAndFallback gestartet`);

	// Try Gemini first
	let result = await generateTextWithModel(prompt, apiKey);
	console.log(`[Text] Gemini Ergebnis: success=${result.success}, isRateLimit=${result.isRateLimit}`);

	// Retry once after delay if rate limited
	if (!result.success && result.isRateLimit) {
		console.log(`[Gemini] ⏳ Rate Limit (Text) - warte ${RATE_LIMIT_RETRY_DELAY_MS / 1000}s...`);
		await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
		console.log(`[Gemini] 🔄 Retry nach Rate Limit...`);
		result = await generateTextWithModel(prompt, apiKey);
		console.log(`[Text] Gemini Retry Ergebnis: success=${result.success}, isRateLimit=${result.isRateLimit}`);
	}

	if (result.success) {
		return result;
	}

	// Try OpenAI as fallback
	const hasOpenAI = hasOpenAIKey();
	console.log(`[Text] Gemini fehlgeschlagen. OpenAI Key vorhanden: ${hasOpenAI}`);

	if (hasOpenAI) {
		console.log(`[OpenAI] 🔄 Versuche OpenAI GPT-5.1 als Fallback...`);
		const openaiResult = await generateOpenAIText(prompt);
		console.log(`[OpenAI] Ergebnis: success=${openaiResult.success}`);
		if (openaiResult.success && openaiResult.text) {
			console.log(`[OpenAI] 🎉 Text erfolgreich mit OpenAI generiert`);
			return { success: true, text: openaiResult.text };
		}
		console.log(`[OpenAI] ❌ Auch fehlgeschlagen: ${openaiResult.error}`);
		return { success: false, error: openaiResult.error || result.error };
	} else {
		console.log(`[Text] ⚠️ Kein OpenAI Key konfiguriert - kein Fallback möglich`);
	}

	return result;
}

// ==========================================
// Ort-Beschreibung Generation (Interpretation)
// ==========================================

export interface OrtBeschreibungInput {
	name: string;
	naturelle: Array<{
		name: string;
		beschreibung: string;
		metaphorisch?: boolean;
	}>;
	region?: RegionInfo;
	beschreibungsAnmerkungen?: string; // Optionale Nutzer-Anmerkungen für die Beschreibung
}

export interface OrtBeschreibungResult {
	beschreibung: string;
	suggestedName: string;
}

export async function generateOrtBeschreibung(ort: OrtBeschreibungInput): Promise<OrtBeschreibungResult> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 📝 Generiere Orts-Beschreibung für: ${ort.name}`);

	// Build naturelle context and count metaphorical ones
	const metaphorischCount = ort.naturelle.filter(n => n.metaphorisch).length;
	const allMetaphorisch = metaphorischCount === ort.naturelle.length && metaphorischCount > 0;
	const mostlyMetaphorisch = metaphorischCount >= ort.naturelle.length * 0.6;

	const naturelleList = ort.naturelle.map(n => {
		if (n.metaphorisch) {
			return `- ${n.name} [METAPHORISCH]: ${n.beschreibung}`;
		}
		return `- ${n.name}: ${n.beschreibung}`;
	}).join('\n');

	let regionContext = '';
	if (ort.region) {
		regionContext = `\nREGION: ${ort.region.name}`;
	}

	// User annotations for the description
	let anmerkungenContext = '';
	if (ort.beschreibungsAnmerkungen && ort.beschreibungsAnmerkungen.trim()) {
		anmerkungenContext = `

NUTZER-ANMERKUNGEN (bitte einarbeiten und ausschmücken):
${ort.beschreibungsAnmerkungen.trim()}

WICHTIG: Die obigen Anmerkungen vom Nutzer sollen in die Beschreibung einfließen! Erwähne alle genannten Details, aber schreibe sie poetischer und märchenhafter. Erfinde passende Zusatzdetails die gut dazu passen.`;
	}

	// Special instructions for highly metaphorical places
	let metaphorInstructions = '';
	if (allMetaphorisch) {
		metaphorInstructions = `
WICHTIG - ALLE NATURELLE SIND METAPHORISCH!
Da alle Aspekte metaphorisch sind, musst du KREATIV sein und dir überlegen:
- Was für ein KONKRETER Ort könnte das in dieser Märchenwelt sein?
- Denke an ungewöhnliche Orte: Ein Traum-Salon, eine Erinnerungs-Taverne, ein Wunsch-Brunnen, eine Geschichten-Werkstatt, ein Gefühls-Garten...
- Kombiniere die Metaphern zu etwas Greifbarem das Tierwesen besuchen könnten
- Beispiel: "Universität + Markt + Fata Morgana" könnte ein Ort sein, wo alte Geschichtenerzähler gegen Träume und Hoffnungen ihre Weisheiten tauschen - vielleicht eine mystische Lichtung wo der Nebel selbst die Erinnerungen bewahrt`;
	} else if (mostlyMetaphorisch) {
		metaphorInstructions = `
HINWEIS: Die meisten Naturelle sind metaphorisch. Überlege dir einen konkreten Ort der diese abstrakten Konzepte verkörpert - nicht nur beschreiben WAS die Metaphern bedeuten, sondern WO man das erleben könnte.`;
	}

	const prompt = `Du beschreibst einen Ort in einem Märchen-Rollenspiel mit anthropomorphen Tierwesen (wie bei Beatrix Potter oder Fritz Baumgarten).

AKTUELLER ORTSNAME: "${ort.name}"

NATURELLE (Aspekte des Ortes):
${naturelleList}${regionContext}${anmerkungenContext}${metaphorInstructions}

AUFGABE:
1. Schlage einen passenden, atmosphärischen Namen für diesen Ort vor
2. Schreibe eine kurze, atmosphärische Beschreibung (2-3 Sätze) die erklärt:
   - Was ist dieser Ort KONKRET? (Ein echter Ort den Tierwesen besuchen können!)
   - Wie manifestieren sich die metaphorischen Aspekte hier?
   - Welche Stimmung herrscht?

WICHTIG: Beschreibe einen KONKRETEN ORT, nicht nur abstrakte Konzepte!
Statt "hier ist Hoffnung" → "In der alten Laterne am Wegrand brennt ein Licht das nie erlischt"

STIL: Märchenhaft, gemütlich, poetisch aber GREIFBAR. Keine Aufzählung.

BEISPIEL für [Universität metaphorisch, Markt metaphorisch, Fata Morgana metaphorisch]:
NAME: Die Nebellaterne
BESCHREIBUNG: In einer Senke zwischen den Hügeln steht eine uralte Laterne, deren Licht niemals erlischt. Hier versammeln sich die Geschichtenträger des Waldes, um Erinnerungen gegen Träume zu tauschen - wer genau hinhört, kann im flackernden Schein die Stimmen längst vergessener Weiser hören. Doch Vorsicht: Manch einer hat hier seine liebste Erinnerung gegen eine Illusion eingetauscht.

Antworte GENAU in diesem Format:
NAME: [Ortsname]
BESCHREIBUNG: [Beschreibungstext]`;

	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (!result.success || !result.text) {
		throw new Error(result.error || 'Beschreibung konnte nicht generiert werden');
	}

	const text = result.text.trim();

	// Parse response
	const nameMatch = text.match(/NAME:\s*(.+?)(?:\n|BESCHREIBUNG:)/s);
	const beschreibungMatch = text.match(/BESCHREIBUNG:\s*(.+)/s);

	const suggestedName = nameMatch ? nameMatch[1].trim() : ort.name;
	const beschreibung = beschreibungMatch ? beschreibungMatch[1].trim() : text;

	console.log(`[Gemini] ✅ Orts-Beschreibung generiert: Name="${suggestedName}", Beschreibung=${beschreibung.substring(0, 80)}...`);

	return { beschreibung, suggestedName };
}

export async function generateSceneDescription(ort: OrtInfo): Promise<SceneGenerationResult> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 🎭 Generiere Szenen-Beschreibung für: ${ort.name}`);
	console.log(`[Gemini] 📦 Ort-Daten:`, JSON.stringify(ort, null, 2));

	// Build naturelle context with tags
	const naturelleContext = ort.naturelle.map(n => {
		const tags: string[] = [];
		if (n.name === ort.hauptNaturell) tags.push('HAUPT');
		if (n.metaphorisch) tags.push('METAPHORISCH');
		const tagStr = tags.length > 0 ? ` [${tags.join(', ')}]` : '';
		const stimmungStr = n.stimmung && n.stimmung.length > 0
			? `\n   Atmosphäre: ${n.stimmung.slice(0, 3).join(', ')}`
			: '';
		return `- ${n.name}${tagStr}: ${n.beschreibung}${stimmungStr}`;
	}).join('\n');

	// Build region context
	let regionContext = '';
	if (ort.region) {
		const features: string[] = [];
		for (const geo of ort.region.geographisch) {
			features.push(`${geo.name}: ${geo.promptText}`);
		}
		for (const flora of ort.region.faunaFlora) {
			features.push(`${flora.name}: ${flora.promptText}`);
		}
		if (ort.region.architektur) {
			features.push(`Architektur: ${ort.region.architektur.promptText}`);
		}
		if (features.length > 0) {
			regionContext = `\n\nREGION "${ort.region.name}":\n${features.join('\n')}`;
		}
	}

	// Ort-Beschreibung (Interpretation) context
	const ortBeschreibungContext = ort.ortBeschreibung
		? `\n\nBESCHREIBUNG DES ORTES (Was dieser Ort wirklich ist):\n${ort.ortBeschreibung}`
		: '';

	// Anmerkungen (visual details) context
	const anmerkungenContext = ort.anmerkungen
		? `\n\nVISUELLE DETAILS/STIL FÜR DAS BILD:\n${ort.anmerkungen}`
		: '';

	// Check if there are metaphorical naturelle and build specific guidance
	const metaphorischeNaturelle = ort.naturelle.filter(n => n.metaphorisch);
	let metaphorischHinweis = '';

	if (metaphorischeNaturelle.length > 0) {
		const metaphorischBeispiele: Record<string, string> = {
			'Gasthaus': 'Gemütlichkeit, Wärme, Willkommen (z.B. ein warmer Platz am Feuer, gemütliche Ecke - KEIN echtes Gasthaus-Gebäude!)',
			'Höhle': 'Geborgenheit, Rückzug, Geheimnisse (z.B. ein geschützter Winkel, ein überdachter Bereich - KEINE echte Höhle!)',
			'Feld': 'Weite, Freiheit, Offenheit (z.B. eine Aussicht, offener Himmel - KEIN Getreidefeld!)',
			'Turm': 'Überblick, Wachsamkeit, Erhabenheit (z.B. ein erhöhter Punkt, Aussichtsplatz - KEIN echtes Turmgebäude!)',
			'Brücke': 'Verbindung, Übergang, Treffpunkt (z.B. Schwelle zwischen Bereichen - KEINE echte Brücke!)',
			'Wildnis': 'Ungezähmt, wild wuchernd, chaotisch (z.B. üppige Pflanzen, Efeu - nicht unbedingt echter Wald!)',
			'Ödland': 'Verlassenheit, Stille, Leere (z.B. verlassene Ecken, verwelkte Pflanzen)',
			'Garten': 'Pflege, Wachstum, Kultivierung (z.B. gepflegte Ecken, blühende Details)',
			'Fluss': 'Fluss des Lebens, Bewegung, Veränderung (z.B. fließende Elemente, Dynamik)',
			'Berg': 'Herausforderung, Beständigkeit, Größe (z.B. imposante Elemente, Erhabenheit)',
			'See': 'Ruhe, Tiefe, Spiegelung (z.B. stille Wasserflächen, reflektierende Oberflächen)',
			'Wald': 'Geheimnis, Schutz, Verborgenheit (z.B. schattige Bereiche, dichte Vegetation)',
			'Dorf': 'Gemeinschaft, Heimat, Zusammengehörigkeit (z.B. gesellige Atmosphäre)',
			'Markt': 'Austausch, Vielfalt, Lebendigkeit (z.B. buntes Treiben, verschiedene Waren)',
			'Tempel': 'Spiritualität, Ehrfurcht, Heiligkeit (z.B. besondere Atmosphäre, Ruhe)',
			'Ruine': 'Vergänglichkeit, Geschichte, Melancholie (z.B. Spuren der Zeit, Moos und Efeu)'
		};

		const relevanteBeispiele = metaphorischeNaturelle
			.map(n => {
				const beispiel = metaphorischBeispiele[n.name];
				if (beispiel) {
					return `   - "${n.name}" METAPHORISCH = ${beispiel}`;
				}
				return `   - "${n.name}" METAPHORISCH = Zeige die ESSENZ und STIMMUNG, NICHT das wörtliche Objekt!`;
			})
			.join('\n');

		metaphorischHinweis = `
2. METAPHORISCH-Naturelle: SEHR WICHTIG für diesen Ort!
   Die folgenden Naturelle sind METAPHORISCH gemeint - zeige ihre ESSENZ/STIMMUNG, NICHT das wörtliche Objekt:
${relevanteBeispiele}
`;
	}

	const prompt = `Du bist ein kreativer Szenen-Designer für ein Märchen-Rollenspiel mit anthropomorphen Tierwesen (wie bei Beatrix Potter, Fritz Baumgarten - Mäuse, Hasen, Füchse, Igel, Vögel etc. die aufrecht gehen und Kleidung tragen).

AUFGABE: Beschreibe eine konkrete, bildhafte Szene für einen Ort namens "${ort.name}".

NATURELLE (Orts-Aspekte):
${naturelleContext}${regionContext}${ortBeschreibungContext}${anmerkungenContext}

WICHTIGE REGELN:

1. HAUPT-Naturell: Das ist das dominante Thema der Szene
${metaphorischHinweis}
3. BEWOHNTE ORTE: Entscheide selbst ob dies ein Ort ist, wo Fabelwesen leben/arbeiten würden:
   - Bei Gasthäusern, Werkstätten, Märkten, Dörfern, Herbergen, Läden: JA, zeige 1-3 anthropomorphe Tierwesen (Mäuse, Hasen, Igel, Dachse etc.) bei ihrer Tätigkeit
   - Bei reiner Wildnis, unbewohnten Ruinen, abgelegenen Naturorten: NEIN, nur Landschaft und kleine echte Tiere

4. ALLE Naturelle müssen in der Szene erkennbar sein${metaphorischeNaturelle.length > 0 ? ' (bei metaphorischen durch ihre Essenz/Stimmung)' : ''}

5. Integriere die Region-Features natürlich in die Szene

ANTWORTFORMAT (genau so!):
NAME: [Ein passender deutscher Ort-Name, der zur Szene passt - besonders wichtig wenn Naturelle metaphorisch sind!]
SZENE: [2-3 Sätze auf ENGLISCH die die visuelle Szene beschreiben]

Beispiele für gute Namen:
- Bei metaphorischem "Gasthaus" + Wald: "Die Gemütliche Lichtung" oder "Fuchsbaus Rastplatz"
- Bei metaphorischer "Höhle" + See: "Die Stille Bucht" oder "Moosiges Versteck"
- Bei wörtlichem Gasthaus: "Zur Goldenen Eichel" oder "Igels Schänke"

Wenn Fabelwesen vorkommen, beschreibe sie kurz (z.B. "a kindly hedgehog innkeeper", "a mouse family by the fire").`;

	console.log(`[Gemini] 📝 Gesendeter Prompt:`);
	console.log(prompt);

	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (!result.success || !result.text) {
		throw new Error(result.error || 'Szenen-Generierung fehlgeschlagen');
	}

	const responseText = result.text.trim();

	// Parse NAME and SZENE from response
	let suggestedName = ort.name; // Fallback to original name
	let sceneDescription = responseText;

	const nameMatch = responseText.match(/NAME:\s*(.+?)(?:\n|SZENE:|$)/i);
	const szeneMatch = responseText.match(/SZENE:\s*(.+)/is);

	if (nameMatch && nameMatch[1]) {
		suggestedName = nameMatch[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
	}

	if (szeneMatch && szeneMatch[1]) {
		sceneDescription = szeneMatch[1].trim();
	} else if (nameMatch) {
		// If we found NAME but no SZENE marker, take everything after NAME line
		sceneDescription = responseText.replace(/NAME:\s*.+?\n/i, '').trim();
	}

	console.log(`[Gemini] 🏷️ Vorgeschlagener Name: ${suggestedName}`);
	console.log(`[Gemini] 🎭 Szene: ${sceneDescription.substring(0, 100)}...`);

	// Build the final image prompt with the new name
	const promptForImage = `Create a colorful hand-drawn illustration in the style of Fritz Baumgarten and Beatrix Potter (German/English children's book illustration, fairy-tale like, warm, detailed, watercolor-style). Do NOT include any text, labels, titles, or words in the image.

The scene: ${sceneDescription}

This is a magical place called "${suggestedName}" in a world of anthropomorphic animals.

IMPORTANT: If the scene description mentions anthropomorphic animals (innkeepers, travelers, families etc.), include them as cute, clothed animal characters (mice, hedgehogs, rabbits, badgers, foxes etc.) going about their activities. They should be small and integrated naturally into the scene, not the main focus.

Also include small natural creatures like butterflies, dragonflies, bees, frogs, birds where appropriate.

Style: Fairy-tale German children's book illustration like Fritz Baumgarten.
Wide panoramic landscape orientation, horizontal format.
Warm, inviting colors with soft lighting.`;

	return {
		sceneDescription,
		promptForImage,
		suggestedName
	};
}

export async function generateImageFromPrompt(prompt: string, ortName: string): Promise<string | null> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 🖼️ Generiere Bild für: ${ortName}`);
	console.log(`[Gemini] Prompt: ${prompt.substring(0, 150)}...`);

	let lastError = '';

	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] 🔄 Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		const result = await tryGenerateWithRetry(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] 🎉 Erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] ➡️ Fallback zum nächsten Model...`);
		}
	}

	// Try OpenAI as final fallback
	if (hasOpenAIKey()) {
		console.log(`[Gemini] 🔄 Alle Gemini Models fehlgeschlagen. Versuche OpenAI...`);
		const openaiResult = await generateOpenAIImage(prompt);
		if (openaiResult.success && openaiResult.imageData) {
			console.log(`[OpenAI] 🎉 Erfolgreich mit OpenAI Fallback`);
			return openaiResult.imageData;
		}
		lastError = openaiResult.error || lastError;
	}

	// All providers failed
	console.error(`[Gemini] 💥 Alle Provider fehlgeschlagen. Letzter Fehler: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
}

// ==========================================
// Ort Details Generation (Gerüchte, Aktivitäten, Entdeckungen)
// ==========================================

export interface OrtDetailsInput {
	name: string;
	naturelle: Array<{
		name: string;
		beschreibung: string;
		metaphorisch?: boolean;
		stimmung?: string[];
	}>;
	bekannte: Array<{
		name: string;
		tier: string;
		berufe: string[];
	}>;
	ortBeschreibung?: string; // Interpretation/Bedeutung des Ortes
	region?: RegionInfo;
	erlaubeMagisch?: boolean;
	erlaubeTrauma?: boolean;
}

export interface OrtDetailsResult {
	geruechte: string[];
	aktivitaeten: string[];
	entdeckungen: string[];
}

export async function generateOrtDetails(ort: OrtDetailsInput): Promise<OrtDetailsResult> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 📜 Generiere Details für: ${ort.name}`);

	// Step 1: Select random entries from pre-defined tables
	const selectionContext: SelectionContext = {
		naturelleNames: ort.naturelle.filter(n => !n.metaphorisch).map(n => n.name),
		bekannteNames: ort.bekannte.map(b => b.name),
		erlaubeMagisch: ort.erlaubeMagisch ?? true,
		erlaubeTrauma: ort.erlaubeTrauma ?? true,
	};

	const tableSelection = selectOrtDetails(selectionContext, 3);
	console.log(`[Gemini] 🎲 Tabellen-Auswahl:`, tableSelection);

	// Step 2: Build context for AI refinement
	const naturelleContext = ort.naturelle.map(n => {
		const tags = n.metaphorisch ? ' [METAPHORISCH]' : '';
		return `- ${n.name}${tags}: ${n.beschreibung}`;
	}).join('\n');

	const bekannteContext = ort.bekannte.map(b =>
		`- ${b.name} (${b.tier}): ${b.berufe.join(', ')}`
	).join('\n');

	let regionContext = '';
	if (ort.region) {
		regionContext = `\nREGION: ${ort.region.name}`;
	}

	let ortBeschreibungContext = '';
	if (ort.ortBeschreibung) {
		ortBeschreibungContext = `\nWAS DIESER ORT IST: ${ort.ortBeschreibung}`;
	}

	// Step 3: Send to AI for refinement
	const prompt = `AUFGABE: Passe diese VORGEGEBENEN Texte an den Ort "${ort.name}" an. SCHREIBE NICHT NEU - nur kleine Anpassungen!

ORT: ${ort.name}
NATURELLE: ${ort.naturelle.map(n => n.name + (n.metaphorisch ? ' [metaphorisch]' : '')).join(', ')}
BEWOHNER: ${ort.bekannte.map(b => b.name).join(', ')}${regionContext ? `\nREGION: ${ort.region?.name}` : ''}${ortBeschreibungContext}

=== DIESE TEXTE ANPASSEN (nicht ersetzen!) ===

GERÜCHTE:
${tableSelection.geruechte.map((g, i) => `${i + 1}. ${g}`).join('\n')}

AKTIVITÄTEN:
${tableSelection.aktivitaeten.map((a, i) => `${i + 1}. ${a}`).join('\n')}

ENTDECKUNGEN:
${tableSelection.entdeckungen.map((e, i) => `${i + 1}. ${e}`).join('\n')}

=== REGELN ===
- BEHALTE die Grundaussage jedes Textes bei!
- Ändere nur Formulierungen damit sie besser zum Ort passen
- KEINE neuen Personen erfinden - nur die genannten Bewohner oder "man sagt", "Reisende" etc.
- Wenn ein Text nicht zum Ort passt, passe ihn an (z.B. "Wasser" → "Turm" wenn kein Wasser vorhanden)
- Kurz halten (1-2 Sätze)

ANTWORT (gleiche Nummerierung!):
GERÜCHTE:
1. [angepasst]
2. [angepasst]
3. [angepasst]

AKTIVITÄTEN:
1. [angepasst]
2. [angepasst]
3. [angepasst]

ENTDECKUNGEN:
1. [angepasst]
2. [angepasst]
3. [angepasst]`;

	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (!result.success || !result.text) {
		// Fallback: Return table selection without AI refinement
		console.warn(`[Gemini] ⚠️ AI-Verfeinerung fehlgeschlagen, nutze Tabellen-Auswahl direkt`);
		return tableSelection;
	}

	// Parse response
	const text = result.text;
	const geruechte: string[] = [];
	const aktivitaeten: string[] = [];
	const entdeckungen: string[] = [];

	const geruechteMatch = text.match(/GERÜCHTE:\s*([\s\S]*?)(?=AKTIVITÄTEN:|$)/i);
	const aktivitaetenMatch = text.match(/AKTIVITÄTEN:\s*([\s\S]*?)(?=ENTDECKUNGEN:|$)/i);
	const entdeckungenMatch = text.match(/ENTDECKUNGEN:\s*([\s\S]*?)$/i);

	const parseItems = (match: RegExpMatchArray | null): string[] => {
		if (!match || !match[1]) return [];
		return match[1]
			.split('\n')
			.map(line => line.replace(/^[-•*\d.)\s]+/, '').trim()) // Handle bullets AND numbers
			.filter(line => line.length > 0);
	};

	geruechte.push(...parseItems(geruechteMatch));
	aktivitaeten.push(...parseItems(aktivitaetenMatch));
	entdeckungen.push(...parseItems(entdeckungenMatch));

	// Fallback to table selection if parsing failed
	if (geruechte.length === 0) geruechte.push(...tableSelection.geruechte);
	if (aktivitaeten.length === 0) aktivitaeten.push(...tableSelection.aktivitaeten);
	if (entdeckungen.length === 0) entdeckungen.push(...tableSelection.entdeckungen);

	console.log(`[Gemini] ✅ Details verfeinert: ${geruechte.length} Gerüchte, ${aktivitaeten.length} Aktivitäten, ${entdeckungen.length} Entdeckungen`);

	return { geruechte, aktivitaeten, entdeckungen };
}

// ==========================================
// Ort Geschichte Generation (Events/History)
// ==========================================

export interface OrtGeschichteInput extends OrtDetailsInput {
	details: OrtDetailsResult;
}

export interface OrtGeschichteEvent {
	jahr?: string;
	event: string;
}

export async function generateOrtGeschichte(ort: OrtGeschichteInput): Promise<OrtGeschichteEvent[]> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 📚 Generiere Geschichte für: ${ort.name}`);

	// Build context
	const naturelleContext = ort.naturelle.map(n => {
		const tags = n.metaphorisch ? ' [METAPHORISCH]' : '';
		return `- ${n.name}${tags}: ${n.beschreibung}`;
	}).join('\n');

	const bekannteContext = ort.bekannte.map(b =>
		`- ${b.name} (${b.tier}): ${b.berufe.join(', ')}`
	).join('\n');

	const detailsContext = `
GERÜCHTE über diesen Ort:
${ort.details.geruechte.map(g => `- ${g}`).join('\n')}

AKTIVITÄTEN die man hier tun kann:
${ort.details.aktivitaeten.map(a => `- ${a}`).join('\n')}

ENTDECKUNGEN die man hier machen kann:
${ort.details.entdeckungen.map(e => `- ${e}`).join('\n')}`;

	let regionContext = '';
	if (ort.region) {
		regionContext = `\n\nREGION: ${ort.region.name}`;
	}

	const prompt = `Du generierst die GESCHICHTE eines Ortes namens "${ort.name}" in einem Märchen-Rollenspiel mit anthropomorphen Tierwesen.

NATURELLE (Orts-Aspekte):
${naturelleContext}

BEKANNTE BEWOHNER:
${bekannteContext}${regionContext}

BEREITS BEKANNTE DETAILS:
${detailsContext}

Generiere auf DEUTSCH eine GESCHICHTE mit 5-7 EVENTS die an diesem Ort passiert sind.

WICHTIGE REGELN:
1. Das ERSTE/ÄLTESTE Event soll IMMER von einer VERGESSENEN GOTTHEIT oder einem uralten mythischen Wesen handeln, das diesen Ort einst gesegnet, erschaffen oder verflucht hat. Diese Gottheit sollte einen atmosphärischen Namen haben und erklären, warum der Ort so ist wie er ist.
2. Die Events sollen die Gerüchte, Aktivitäten und Entdeckungen ERKLÄREN oder mit ihnen verbunden sein
3. Füge auch andere plausible Ereignisse hinzu die hier passiert sein könnten
4. Die Events sollen zeitlich geordnet sein (älteste zuerst)
5. Jahreszahlen sind optional - können auch relativ sein ("Vor drei Generationen", "Letzten Herbst")
6. Die Geschichte soll Tiefe und Atmosphäre geben
7. ERFINDE KEINE NEUEN PERSONEN außer der vergessenen Gottheit! Wenn Personen erwähnt werden, nutze NUR die "Bekannten Bewohner" von oben. Du darfst anonyme Gruppen verwenden (z.B. "Siedler", "die Vorfahren", "ein Wanderer"), aber KEINE neuen Namen oder spezifischen Charaktere erfinden.
8. Wenn du einen der "Bekannten Bewohner" in einem Event erwähnst, schreibe den Namen EXAKT wie oben angegeben.

ANTWORTFORMAT (genau so!):
- [Optional: Jahr/Zeit] | [Event-Beschreibung]
- [Optional: Jahr/Zeit] | [Event-Beschreibung]
...

Beispiel:
- In uralter Zeit | Die vergessene Göttin Murmelinde, Hüterin der stillen Wasser, segnete diesen Ort und gab ihm seine traumhafte Ruhe
- Vor 50 Jahren | Ein großer Sturm zerstörte den alten Turm
- Letzten Winter | ${ort.bekannte.length > 0 ? ort.bekannte[0].name : 'Eine Mäusefamilie'} entdeckte einen geheimen Keller`;

	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (!result.success || !result.text) {
		throw new Error(result.error || 'Geschichte-Generierung fehlgeschlagen');
	}

	// Parse response
	const events: OrtGeschichteEvent[] = [];
	const lines = result.text.split('\n').filter(line => line.trim().startsWith('-'));

	for (const line of lines) {
		const cleaned = line.replace(/^[-•*]\s*/, '').trim();
		if (!cleaned) continue;

		// Check if there's a | separator for year
		if (cleaned.includes('|')) {
			const [jahr, event] = cleaned.split('|').map(s => s.trim());
			events.push({ jahr: jahr || undefined, event });
		} else {
			events.push({ event: cleaned });
		}
	}

	console.log(`[Gemini] ✅ Geschichte generiert: ${events.length} Events`);

	return events;
}

export async function generateOrtImage(ort: OrtInfo): Promise<string | null> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 🏞️ Starte Bildgenerierung für Ort: ${ort.name}`);
	console.log(`[Gemini] Hauptnaturell: ${ort.hauptNaturell}, Naturelle: ${ort.naturelle.map(n => n.name).join(', ')}`);
	if (ort.anmerkungen) {
		console.log(`[Gemini] Anmerkungen: ${ort.anmerkungen}`);
	}

	// Build naturelle descriptions - metaphorical ones ONLY use description (no name!)
	const naturelleDescriptions = ort.naturelle.map(n => {
		if (n.metaphorisch) {
			// Only use the abstract description, never mention the literal name
			return n.beschreibung;
		}
		return n.name;
	});

	// Check if hauptNaturell is metaphorical
	const hauptNaturellData = ort.naturelle.find(n => n.name === ort.hauptNaturell);
	const hauptNaturellText = hauptNaturellData?.metaphorisch
		? hauptNaturellData.beschreibung
		: ort.hauptNaturell;

	// Collect all stimmung items (atmospheric creatures like butterflies, dragonflies, bees)
	const allStimmung: string[] = [];
	for (const n of ort.naturelle) {
		if (n.stimmung) {
			allStimmung.push(...n.stimmung);
		}
	}

	// Build the prompt for Fritz Baumgarten style landscape
	const anmerkungenText = ort.anmerkungen
		? `\n\nAdditional details from the user: ${ort.anmerkungen}`
		: '';

	const stimmungText = allStimmung.length > 0
		? `\n\nAtmospheric elements to include (small creatures and nature details): ${allStimmung.slice(0, 5).join(', ')}`
		: '';

	// Build region context if available
	let regionText = '';
	if (ort.region && (ort.region.geographisch.length > 0 || ort.region.faunaFlora.length > 0 || ort.region.architektur)) {
		const regionFeatures: string[] = [];

		for (const geo of ort.region.geographisch) {
			regionFeatures.push(geo.promptText);
		}
		for (const flora of ort.region.faunaFlora) {
			regionFeatures.push(flora.promptText);
		}
		if (ort.region.architektur) {
			regionFeatures.push(ort.region.architektur.promptText);
		}

		if (regionFeatures.length > 0) {
			regionText = `\n\nThis location is in the region of "${ort.region.name}" which features: ${regionFeatures.join('; ')}.`;
		}
	}

	const prompt = `Create a colorful hand-drawn landscape illustration in the style of Fritz Baumgarten (German children's book illustration, fairy-tale like, warm, detailed, watercolor-style). Do NOT include any text, labels, titles, or words in the image. Do NOT include any humanoid characters or anthropomorphic animals - but DO include small natural creatures like butterflies, dragonflies, bees, frogs, birds, or fish if they fit the atmosphere.

The image shows: A magical place called "${ort.name}", with a theme of: ${hauptNaturellText}.
The location combines elements of: ${naturelleDescriptions.join(', ')}.${regionText}${stimmungText}${anmerkungenText}

This is a fairy-tale landscape with cozy details like small houses, lanterns, winding paths, bridges, and natural elements. Focus on the environment and atmosphere, not on humanoid inhabitants.

Style: Fairy-tale German children's book illustration like Fritz Baumgarten.
Wide panoramic landscape orientation, horizontal format.
Warm, inviting colors with soft lighting.`;

	let lastError = '';

	// Try each model in order
	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] 🔄 Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		const result = await tryGenerateWithRetry(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] 🎉 Erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] ➡️ Fallback zum nächsten Model...`);
		}
	}

	// Try OpenAI as final fallback
	if (hasOpenAIKey()) {
		console.log(`[Gemini] 🔄 Alle Gemini Models fehlgeschlagen. Versuche OpenAI...`);
		const openaiResult = await generateOpenAIImage(prompt);
		if (openaiResult.success && openaiResult.imageData) {
			console.log(`[OpenAI] 🎉 Erfolgreich mit OpenAI Fallback`);
			return openaiResult.imageData;
		}
		lastError = openaiResult.error || lastError;
	}

	// All providers failed
	console.error(`[Gemini] 💥 Alle Provider fehlgeschlagen. Letzter Fehler: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
}

// ==========================================
// Hex Tile Image Generation (Map Style)
// ==========================================

export interface NeighborHexInfo {
	direction: 'N' | 'NE' | 'SE' | 'S' | 'SW' | 'NW';
	imageData: string; // base64 data URL
	ortName?: string;
}

export interface HexOrtInfo {
	name: string;
	hauptNaturell: string;
	naturelle: NaturellInfo[];
	region?: RegionInfo;
	customDescription?: string; // Manuelle Beschreibung für das Hex-Bild
	neighbors?: NeighborHexInfo[]; // Benachbarte Hex-Bilder für smoothere Übergänge
	biome?: import('$lib/services/worldGenerator').BiomeType; // Biom aus Weltgenerierung
}

/**
 * Crop the edge strip from a neighbor image that borders our hex.
 * For each neighbor direction, we extract the edge that touches our tile:
 * - N neighbor → their S edge (bottom 25%)
 * - NE neighbor → their SW corner (bottom-left quadrant)
 * - SE neighbor → their NW corner (top-left quadrant)
 * - S neighbor → their N edge (top 25%)
 * - SW neighbor → their NE corner (top-right quadrant)
 * - NW neighbor → their SE corner (bottom-right quadrant)
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
			const edgeSize = 0.3; // 30% of image for edge strips

			let sx = 0, sy = 0, sw = w, sh = h;
			let cw = w, ch = h;

			// Determine which part of the neighbor image to crop
			// We want the edge that TOUCHES our hex
			switch (neighborDirection) {
				case 'N':
					// North neighbor's SOUTH edge (bottom strip)
					sy = h * (1 - edgeSize);
					sh = h * edgeSize;
					ch = sh;
					break;
				case 'S':
					// South neighbor's NORTH edge (top strip)
					sy = 0;
					sh = h * edgeSize;
					ch = sh;
					break;
				case 'NE':
					// Northeast neighbor's SOUTHWEST corner (bottom-left)
					sx = 0;
					sy = h * (1 - edgeSize);
					sw = w * edgeSize;
					sh = h * edgeSize;
					cw = sw;
					ch = sh;
					break;
				case 'SE':
					// Southeast neighbor's NORTHWEST corner (top-left)
					sx = 0;
					sy = 0;
					sw = w * edgeSize;
					sh = h * edgeSize;
					cw = sw;
					ch = sh;
					break;
				case 'SW':
					// Southwest neighbor's NORTHEAST corner (top-right)
					sx = w * (1 - edgeSize);
					sy = 0;
					sw = w * edgeSize;
					sh = h * edgeSize;
					cw = sw;
					ch = sh;
					break;
				case 'NW':
					// Northwest neighbor's SOUTHEAST corner (bottom-right)
					sx = w * (1 - edgeSize);
					sy = h * (1 - edgeSize);
					sw = w * edgeSize;
					sh = h * edgeSize;
					cw = sw;
					ch = sh;
					break;
			}

			canvas.width = cw;
			canvas.height = ch;
			ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

			resolve(canvas.toDataURL('image/png'));
		};
		img.onerror = () => reject(new Error('Failed to load image for cropping'));
		img.src = imageDataUrl;
	});
}

/**
 * Helper to generate with neighbor context images (using edge crops)
 */
async function tryGenerateHexWithNeighbors(
	model: string,
	prompt: string,
	apiKey: string,
	neighborImages: NeighborHexInfo[]
): Promise<{ success: boolean; imageData?: string; error?: string; isRateLimit?: boolean }> {
	const startTime = Date.now();
	console.log(`[Gemini] ⏳ Hex-Tile mit ${neighborImages.length} Nachbarn (Edge-Crops), Model: ${model}`);

	const controller = new AbortController();
	const timeoutId = setTimeout(() => {
		console.warn(`[Gemini] ⚠️ Timeout nach ${REQUEST_TIMEOUT_MS / 1000} Sekunden!`);
		controller.abort();
	}, REQUEST_TIMEOUT_MS);

	try {
		// Build parts array with text prompt and neighbor edge crops
		const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

		// Crop and add neighbor edge images
		for (const neighbor of neighborImages) {
			try {
				// Crop only the edge that borders our hex
				const croppedEdge = await cropNeighborEdge(neighbor.imageData, neighbor.direction);
				console.log(`[Gemini] 📐 Edge-Crop für ${neighbor.direction} erstellt`);

				// Extract base64 data from cropped data URL
				const base64Match = croppedEdge.match(/^data:([^;]+);base64,(.+)$/);
				if (base64Match) {
					parts.push({
						inlineData: {
							mimeType: base64Match[1],
							data: base64Match[2]
						}
					});
				}
			} catch (cropError) {
				console.warn(`[Gemini] ⚠️ Edge-Crop fehlgeschlagen für ${neighbor.direction}, verwende Vollbild`);
				// Fallback to full image if cropping fails
				const base64Match = neighbor.imageData.match(/^data:([^;]+);base64,(.+)$/);
				if (base64Match) {
					parts.push({
						inlineData: {
							mimeType: base64Match[1],
							data: base64Match[2]
						}
					});
				}
			}
		}

		// Add the text prompt
		parts.push({ text: prompt });

		const response = await fetch(
			`${GEMINI_API_BASE}/models/${model}:generateContent`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey
				},
				body: JSON.stringify({
					contents: [
						{
							role: 'user',
							parts
						}
					],
					generationConfig: {
						responseModalities: ['TEXT', 'IMAGE']
					}
				}),
				signal: controller.signal
			}
		);

		clearTimeout(timeoutId);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`[Gemini] Response nach ${elapsed}s - Status: ${response.status}`);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.error?.message || response.statusText;
			const isRateLimit = response.status === 429;
			return { success: false, error: errorMessage, isRateLimit };
		}

		const data = await response.json();
		const candidates = data.candidates || [];
		for (const candidate of candidates) {
			const candidateParts = candidate.content?.parts || [];
			for (const part of candidateParts) {
				if (part.inlineData) {
					const mimeType = part.inlineData.mimeType || 'image/png';
					return {
						success: true,
						imageData: `data:${mimeType};base64,${part.inlineData.data}`
					};
				}
			}
		}

		return { success: false, error: 'Kein Bild in der Response' };
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			return { success: false, error: `Timeout nach ${REQUEST_TIMEOUT_MS / 1000} Sekunden` };
		}
		const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
		return { success: false, error: errorMsg };
	}
}

/**
 * Wrapper for tryGenerateHexWithNeighbors with rate limit retry.
 */
async function tryGenerateHexWithNeighborsRetry(
	model: string,
	prompt: string,
	apiKey: string,
	neighborImages: NeighborHexInfo[]
): Promise<{ success: boolean; imageData?: string; error?: string }> {
	let result = await tryGenerateHexWithNeighbors(model, prompt, apiKey, neighborImages);

	if (!result.success && result.isRateLimit) {
		console.log(`[Gemini] ⏳ Rate Limit (Hex) - warte ${RATE_LIMIT_RETRY_DELAY_MS / 1000}s...`);
		await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_RETRY_DELAY_MS));
		console.log(`[Gemini] 🔄 Retry nach Rate Limit...`);
		result = await tryGenerateHexWithNeighbors(model, prompt, apiKey, neighborImages);
	}

	return result;
}

/**
 * Generates a hex tile image in a top-down fantasy map style.
 * The image is designed to be displayed as a hexagonal tile on a map grid.
 * If neighbor images are provided, they will be used to create smoother transitions.
 */
export async function generateHexTileImage(ort: HexOrtInfo): Promise<string | null> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	const hasNeighbors = ort.neighbors && ort.neighbors.length > 0;
	console.log(`[Gemini] 🗺️ Generiere Hex-Tile für: ${ort.name}${hasNeighbors ? ` (mit ${ort.neighbors!.length} Nachbarn)` : ''}`);

	// Build naturelle descriptions - metaphorical ones ONLY use description
	const naturelleDescriptions = ort.naturelle.map(n => {
		if (n.metaphorisch) {
			return n.beschreibung;
		}
		return n.name;
	});

	// Get hauptNaturell text
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

	// Build custom description text if provided
	const customDescText = ort.customDescription?.trim()
		? `\nCustom visual description: ${ort.customDescription.trim()}`
		: '';

	// Build neighbor context for prompt
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

	// Add edge advice even without neighbors
	const edgeAdvice = hasNeighbors ? '' : `

Keep tile edges simple with neutral terrain (grass, earth, sand) in muted tones for future blending.`;

	// Build biome description if available (from world generation)
	let biomeText = '';
	if (ort.biome && BIOME_TERRAIN_PROMPTS[ort.biome]) {
		biomeText = `\n\n🌍 BASE BIOME (IMPORTANT - this determines the overall terrain type):
${BIOME_TERRAIN_PROMPTS[ort.biome]}
The location features below should be integrated INTO this biome landscape.`;
	}

	const prompt = `Create exactly ONE SINGLE hex tile for a fantasy tabletop RPG map.

⚠️ CRITICAL - READ CAREFULLY:
- Generate ONLY ONE hexagonal tile, NOT multiple hexes
- Do NOT create a hex grid or hex map with multiple tiles
- The output is a SINGLE standalone hex tile image
- If you see reference images above, those are NEIGHBORS for edge-matching ONLY - do NOT recreate them!

⚠️ CAMERA RULES - MUST FOLLOW:
- STRICTLY TOP-DOWN VIEW (90° overhead, looking straight down like a map)
- ABSOLUTELY NO sky, NO horizon, NO clouds, NO atmospheric perspective
- The entire image shows ONLY the ground/terrain from directly above
- Think "Google Maps satellite view" but illustrated

STYLE:
- Art style: Vintage children's book illustration (Fritz Baumgarten, Beatrix Potter)
- Soft watercolor, hand-painted feel, warm and cozy
- Color palette: Muted earthy greens, warm browns, soft sage
- Lighting: Even, diffuse (like an overcast day map)

COMPOSITION FOR SEAMLESS TILING:
- CENTER (inner 60%): Place all interesting features here - buildings, trees, rocks, ponds
- EDGES (outer 20% on ALL sides): ONLY simple, flat terrain - plain grass, dirt, or sand
- Edge colors must be NEUTRAL (muted green-brown) to blend with ANY neighbor tile
- NO roads, rivers, or features that would need to continue past the edge
- Edges should look like CONTINUOUS terrain that extends beyond the image bounds
- The image should look like it was CUT from a larger map, NOT like a framed picture

SCALE: Medium bird's eye - see tree canopies as round clusters, buildings as small cozy shapes from above.

⚠️ FORBIDDEN:
- NO text, labels, or writing
- NO characters, people, or creatures
- NO sky or horizon line
- NO perspective vanishing points
- NO decorative borders, frames, or outlines around the hex
- NO visible hex shape outline or edge decoration
- The hex shape should be defined ONLY by the image crop, not by drawn lines

${biomeText}

TERRAIN: ${hauptNaturellText}
Features: ${naturelleDescriptions.join(', ')}${regionText}${customDescText}${neighborContextText}${edgeAdvice}

Remember: Generate exactly ONE SINGLE hex tile seen from DIRECTLY ABOVE. Edges must be plain terrain for seamless connection. Do NOT create multiple hexes or a hex grid!`;

	let lastError = '';

	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] 🔄 Hex-Tile Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		// Use the neighbor-aware function if we have neighbors (both with retry)
		const result = hasNeighbors
			? await tryGenerateHexWithNeighborsRetry(model, prompt, apiKey, ort.neighbors!)
			: await tryGenerateWithRetry(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] 🎉 Hex-Tile erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] ➡️ Fallback zum nächsten Model...`);
		}
	}

	// Try OpenAI as final fallback (no neighbor context, just the prompt)
	if (hasOpenAIKey()) {
		console.log(`[Gemini] 🔄 Alle Gemini Models fehlgeschlagen. Versuche OpenAI...`);
		const openaiResult = await generateOpenAIImage(prompt);
		if (openaiResult.success && openaiResult.imageData) {
			console.log(`[OpenAI] 🎉 Hex-Tile erfolgreich mit OpenAI Fallback`);
			return openaiResult.imageData;
		}
		lastError = openaiResult.error || lastError;
	}

	// All providers failed
	console.error(`[Gemini] 💥 Alle Provider fehlgeschlagen: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
}

// ==========================================
// Gottheit (Deity) Generation
// ==========================================

export interface GottheitInfo {
	name: string;
	beiname?: string;
	domäne: string;
	erscheinung: string;
	fähigkeiten: Array<{ name: string; beschreibung: string; kosten?: string }>;
	opferweg: string;
}

export interface GottheitOrtInfo {
	name: string;
	naturelleNamen: string[];
	ortBeschreibung?: string;
}

/**
 * Generate a backstory (Vorgeschichte) for a deity using the text API.
 * If ortInfo is provided, the backstory will reference the location.
 */
export async function generateGottheitVorgeschichte(
	gottheit: GottheitInfo,
	ortInfo?: GottheitOrtInfo
): Promise<{ success: boolean; vorgeschichte?: string; error?: string }> {
	const apiKey = await getApiKey();
	if (!apiKey) return { success: false, error: 'Kein API Key' };

	const fähigkeitenText = gottheit.fähigkeiten
		.map(f => `- ${f.name}: ${f.beschreibung}${f.kosten ? ` (Kosten: ${f.kosten})` : ''}`)
		.join('\n');

	// Build location context for the prompt
	let ortKontextText = '';
	if (ortInfo) {
		ortKontextText = `

ORTSKONTEXT (die Gottheit ist an diesen Ort gebunden):
Ortsname: "${ortInfo.name}"
Naturelle/Atmosphäre des Ortes: ${ortInfo.naturelleNamen.join(', ')}
${ortInfo.ortBeschreibung ? `Beschreibung des Ortes: ${ortInfo.ortBeschreibung}` : ''}

WICHTIG: Die Vorgeschichte MUSS den Ort "${ortInfo.name}" und seine Atmosphäre einbeziehen!
- Die Gottheit ist mit diesem Ort verwurzelt
- Erwähne wie sie Teil dieses Ortes wurde
- Beschreibe ihre besondere Verbindung zu diesem Ort`;
	}

	const prompt = `Du erzählst die Vorgeschichte einer vergessenen Gottheit in einem Märchen-Rollenspiel.
Diese Gottheit ist inspiriert von Shintoismus, Studio Ghibli und europäischen Märchen.

GOTTHEIT:
Name: ${gottheit.name}${gottheit.beiname ? ` - "${gottheit.beiname}"` : ''}
Domäne: ${gottheit.domäne}
Erscheinung: ${gottheit.erscheinung}
Fähigkeiten:
${fähigkeitenText}
Opferweg: ${gottheit.opferweg}${ortKontextText}

AUFGABE:
Schreibe eine atmosphärische Vorgeschichte (3-5 Sätze) die erklärt:
- Wie diese Gottheit einst entstand oder erwachte${ortInfo ? ` (am Ort "${ortInfo.name}")` : ''}
- Warum sie sich um ihre Domäne kümmert
- Wie sie von den Wesen verehrt oder vergessen wurde
- Ein kleines Detail oder Geheimnis über sie

STIL:
- Märchenhaft und poetisch
- Wie eine alte Legende erzählt
- Mit einem Hauch von Melancholie und Wunder
- In der dritten Person ("Sie", "Er", "Es")

WICHTIG: Schreibe NUR die Vorgeschichte, keine Überschriften oder Erklärungen.`;

	console.log(`[Gemini] Generiere Vorgeschichte für Gottheit: ${gottheit.name}${ortInfo ? ` (Ort: ${ortInfo.name})` : ''}...`);
	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (result.success && result.text) {
		const vorgeschichte = result.text.trim();
		console.log(`[Gemini] Vorgeschichte generiert: ${vorgeschichte.substring(0, 80)}...`);
		return { success: true, vorgeschichte };
	}

	return { success: false, error: result.error || 'Vorgeschichte konnte nicht generiert werden' };
}

/**
 * Generate an image for a deity using the image API.
 * If ortInfo is provided, the image will incorporate location elements.
 */
export async function generateGottheitBild(
	gottheit: GottheitInfo,
	ortInfo?: GottheitOrtInfo
): Promise<string | null> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] Starte Bildgenerierung für Gottheit: ${gottheit.name}${ortInfo ? ` (Ort: ${ortInfo.name})` : ''}`);

	// Build location context for the image
	let locationContext = '';
	if (ortInfo) {
		locationContext = `

IMPORTANT LOCATION CONTEXT - This deity is bound to a specific place:
Location name: "${ortInfo.name}"
Location atmosphere/elements: ${ortInfo.naturelleNamen.join(', ')}
${ortInfo.ortBeschreibung ? `Location description: ${ortInfo.ortBeschreibung}` : ''}

The image MUST incorporate elements from this location! Show the deity IN or connected to this place.
Include visual elements that represent: ${ortInfo.naturelleNamen.slice(0, 3).join(', ')}`;
	}

	// Build the prompt for a mystical deity image
	const prompt = `Create a mystical, ethereal illustration of a forgotten deity/spirit in the style of Studio Ghibli and Hayao Miyazaki, combined with elements of Shintoism and European fairy tales. Do NOT include any text, labels, titles, or words in the image.

The deity appears as: ${gottheit.erscheinung}
Domain/What they protect: ${gottheit.domäne}
${gottheit.beiname ? `Known as: "${gottheit.beiname}"` : ''}${locationContext}

Style Guidelines:
- Ethereal, mysterious, and beautiful
- Soft glowing light emanating from or around the figure
- Mix of nature elements (moss, flowers, leaves, water droplets)
- Colors should be warm but with mystical undertones (gold, soft greens, deep blues)
- Like a forest spirit from Princess Mononoke or Spirited Away
- Semi-transparent or luminescent qualities
- Small magical details (floating particles, gentle glow, nature intertwining)

The deity should feel:
- Ancient but gentle
- Powerful but benevolent
- Mysterious but approachable
- Part of nature itself${ortInfo ? `
- Deeply connected to the place "${ortInfo.name}"` : ''}

Portrait orientation, vertical format, focus on the deity figure${ortInfo ? ' with location elements visible' : ''}.
Watercolor and digital art mixed style, highly detailed but dreamlike.`;

	let lastError = '';

	// Try each model in order
	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		const result = await tryGenerateWithRetry(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] Erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] Fallback zum nächsten Model...`);
		}
	}

	// Try OpenAI as final fallback
	if (hasOpenAIKey()) {
		console.log(`[Gemini] 🔄 Alle Gemini Models fehlgeschlagen. Versuche OpenAI...`);
		const openaiResult = await generateOpenAIImage(prompt);
		if (openaiResult.success && openaiResult.imageData) {
			console.log(`[OpenAI] 🎉 Erfolgreich mit OpenAI Fallback`);
			return openaiResult.imageData;
		}
		lastError = openaiResult.error || lastError;
	}

	// All providers failed
	console.error(`[Gemini] 💥 Alle Provider fehlgeschlagen. Letzter Fehler: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
}

/**
 * Generate supernatural abilities (Fähigkeiten) for a deity using the text API.
 * If ortInfo is provided, abilities will be themed around the location.
 */
export async function generateGottheitFähigkeiten(
	gottheit: { name: string; beiname?: string; domäne: string; erscheinung: string },
	ortInfo?: GottheitOrtInfo
): Promise<{ success: boolean; fähigkeiten?: Array<{ name: string; beschreibung: string; kosten: string }>; error?: string }> {
	const apiKey = await getApiKey();
	if (!apiKey) return { success: false, error: 'Kein API Key' };

	// Build location context
	let ortKontextText = '';
	if (ortInfo) {
		ortKontextText = `

ORTSKONTEXT (die Gottheit ist an diesen Ort gebunden):
Ortsname: "${ortInfo.name}"
Naturelle/Atmosphäre: ${ortInfo.naturelleNamen.join(', ')}
${ortInfo.ortBeschreibung ? `Beschreibung: ${ortInfo.ortBeschreibung}` : ''}

Die Fähigkeiten MÜSSEN zum Ort passen und ihn thematisch einbeziehen!`;
	}

	const prompt = `Du erschaffst übernatürliche Fähigkeiten für eine vergessene Gottheit in einem Märchen-Rollenspiel.
Inspiriert von Shintoismus, Studio Ghibli und europäischen Märchen.

GOTTHEIT:
Name: ${gottheit.name}${gottheit.beiname ? ` - "${gottheit.beiname}"` : ''}
Domäne: ${gottheit.domäne}
Erscheinung: ${gottheit.erscheinung}${ortKontextText}

BEISPIELE für märchenhafte Fähigkeiten:
- "Mondlicht-Segen": Wer im Mondschein an sie denkt, findet den Heimweg. (Kosten: Eine Erinnerung an Zuhause teilen)
- "Stimme der Stille": Kann Geheimnisse hören, die in die Stille geflüstert wurden. (Kosten: Einen Tag lang schweigen)
- "Wurzelflüstern": Kann Botschaften durch die Wurzeln der Bäume senden. (Kosten: Einen Samen pflanzen)
- "Tränenquelle": Ihre Tränen heilen kleine Wunden und großen Kummer. (Kosten: Ehrlich weinen)
- "Nebelmantel": Kann Reisende vor bösen Blicken verbergen. (Kosten: Etwas Wertvolles im Nebel zurücklassen)

AUFGABE:
Generiere 1-3 einzigartige, märchenhafte Fähigkeiten für diese Gottheit.
Jede Fähigkeit braucht:
- Einen poetischen Namen
- Eine kurze Beschreibung (was die Fähigkeit bewirkt)
- Kosten (was man opfern/tun muss, um die Fähigkeit zu erhalten - immer etwas Emotionales, Symbolisches oder eine kleine Handlung)

WICHTIG:
- Fähigkeiten sollen zur Domäne und Erscheinung passen
- Kosten sollen fair und märchenhaft sein (keine Blutopfer oder Grausames)
- Sei kreativ und poetisch!

FORMAT (JSON Array):
[
  {"name": "Name der Fähigkeit", "beschreibung": "Was sie bewirkt", "kosten": "Was es kostet"},
  ...
]

Antworte NUR mit dem JSON Array, keine Erklärungen.`;

	console.log(`[Gemini] Generiere Fähigkeiten für Gottheit: ${gottheit.name}...`);
	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (result.success && result.text) {
		try {
			// Parse JSON - handle potential markdown code blocks
			let jsonText = result.text.trim();
			if (jsonText.startsWith('```')) {
				jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
			}
			const fähigkeiten = JSON.parse(jsonText);
			console.log(`[Gemini] ${fähigkeiten.length} Fähigkeiten generiert`);
			return { success: true, fähigkeiten };
		} catch (e) {
			console.error('[Gemini] JSON Parse Error:', e, result.text);
			return { success: false, error: 'Konnte Antwort nicht parsen' };
		}
	}

	return { success: false, error: result.error || 'Fähigkeiten konnten nicht generiert werden' };
}

/**
 * Generate an offering way (Opferweg) for a deity using the text API.
 * If ortInfo is provided, the offering will be themed around the location.
 */
export async function generateGottheitOpferweg(
	gottheit: { name: string; beiname?: string; domäne: string; erscheinung: string },
	ortInfo?: GottheitOrtInfo
): Promise<{ success: boolean; opferweg?: string; error?: string }> {
	const apiKey = await getApiKey();
	if (!apiKey) return { success: false, error: 'Kein API Key' };

	// Build location context
	let ortKontextText = '';
	if (ortInfo) {
		ortKontextText = `

ORTSKONTEXT (die Gottheit ist an diesen Ort gebunden):
Ortsname: "${ortInfo.name}"
Naturelle/Atmosphäre: ${ortInfo.naturelleNamen.join(', ')}
${ortInfo.ortBeschreibung ? `Beschreibung: ${ortInfo.ortBeschreibung}` : ''}

Der Opferweg MUSS zum Ort passen! Die Handlung soll an diesem Ort stattfinden können.`;
	}

	const prompt = `Du erschaffst einen Opferweg für eine vergessene Gottheit in einem Märchen-Rollenspiel.
Inspiriert von Shintoismus, Studio Ghibli und europäischen Märchen.

GOTTHEIT:
Name: ${gottheit.name}${gottheit.beiname ? ` - "${gottheit.beiname}"` : ''}
Domäne: ${gottheit.domäne}
Erscheinung: ${gottheit.erscheinung}${ortKontextText}

BEISPIELE für märchenhafte Opferwege:
- "Das erste Lied des Morgens singen, bevor die Sonne den Tau trocknet"
- "Sieben Steine vom Flussufer sammeln und in einem Kreis legen"
- "Eine selbstgemachte Puppe aus Stroh an den heiligen Baum hängen"
- "Barfuß durch den Morgentau gehen und dabei an einen verlorenen Freund denken"
- "Einen Brief an jemanden schreiben, den man vermisst, und ihn dem Wind übergeben"
- "Eine Nacht lang wachen und dabei eine Geschichte erzählen, die noch niemand gehört hat"
- "Das letzte Stück Brot mit einem Fremden teilen"
- "Einen vergessenen Gegenstand reparieren und ihm einen neuen Namen geben"

AUFGABE:
Erfinde EINEN einzigartigen, poetischen Opferweg für diese Gottheit.

REGELN:
- Der Opferweg soll eine konkrete Handlung beschreiben
- Er soll zur Domäne und Erscheinung der Gottheit passen
- Er soll märchenhaft und symbolisch sein
- Keine Blutopfer oder grausame Handlungen
- Etwas das Hingabe, Aufmerksamkeit oder ein kleines persönliches Opfer zeigt

FORMAT:
Antworte NUR mit dem Opferweg als einzelner Satz/kurzer Absatz (1-2 Sätze).
Keine Überschriften, keine Erklärungen, nur der Opferweg selbst.`;

	console.log(`[Gemini] Generiere Opferweg für Gottheit: ${gottheit.name}...`);
	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (result.success && result.text) {
		const opferweg = result.text.trim().replace(/^["']|["']$/g, ''); // Remove quotes if present
		console.log(`[Gemini] Opferweg generiert: ${opferweg.substring(0, 60)}...`);
		return { success: true, opferweg };
	}

	return { success: false, error: result.error || 'Opferweg konnte nicht generiert werden' };
}

// ==========================================
// Spielleiter Chat System
// ==========================================

export interface SpielleiterKontext {
	ortName: string;
	ortBeschreibung?: string;
	naturelle: Array<{ name: string; beschreibung: string }>;
	bekannte: Array<{ name: string; tier: string; beruf: string; merkmal: string }>;
	gottheiten?: Array<{ name: string; titel: string; erscheinung: string }>;
	region?: { name: string };
	details?: { geruechte: string[]; aktivitaeten: string[]; entdeckungen: string[] };
	geschichte?: Array<{ jahr?: string; event: string }>;
	bisherigeFakten?: string; // Zusammengefasste Fakten aus früheren Konversationen
}

export interface SpielleiterChatNachricht {
	rolle: 'nutzer' | 'spielleiter';
	text: string;
}

export interface SpielleiterAntwort {
	success: boolean;
	antwort?: string;
	vorgeschlageneFakten?: string[]; // Neue Fakten die der Spielleiter vorschlägt
	error?: string;
}

export async function generateSpielleiterAntwort(
	kontext: SpielleiterKontext,
	neueNachricht: string,
	chatVerlauf: SpielleiterChatNachricht[]
): Promise<SpielleiterAntwort> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		return { success: false, error: 'Kein API Key vorhanden' };
	}

	// Build context string
	let kontextString = `ORT: ${kontext.ortName}`;

	if (kontext.ortBeschreibung) {
		kontextString += `\nBESCHREIBUNG: ${kontext.ortBeschreibung}`;
	}

	if (kontext.naturelle.length > 0) {
		kontextString += `\nNATURELLE (Aspekte des Ortes):\n${kontext.naturelle.map(n => `- ${n.name}: ${n.beschreibung}`).join('\n')}`;
	}

	if (kontext.bekannte.length > 0) {
		kontextString += `\nBEKANNTE (Bewohner/Besucher):\n${kontext.bekannte.map(b => `- ${b.name} (${b.tier}, ${b.beruf}) - ${b.merkmal}`).join('\n')}`;
	}

	if (kontext.gottheiten && kontext.gottheiten.length > 0) {
		kontextString += `\nLOKALE GOTTHEITEN:\n${kontext.gottheiten.map(g => `- ${g.name}, ${g.titel}: ${g.erscheinung}`).join('\n')}`;
	}

	if (kontext.region) {
		kontextString += `\nREGION: ${kontext.region.name}`;
	}

	if (kontext.details) {
		if (kontext.details.geruechte.length > 0) {
			kontextString += `\nGERÜCHTE: ${kontext.details.geruechte.join('; ')}`;
		}
		if (kontext.details.aktivitaeten.length > 0) {
			kontextString += `\nAKTIVITÄTEN: ${kontext.details.aktivitaeten.join('; ')}`;
		}
	}

	if (kontext.geschichte && kontext.geschichte.length > 0) {
		kontextString += `\nGESCHICHTE: ${kontext.geschichte.map(g => g.jahr ? `${g.jahr}: ${g.event}` : g.event).join('; ')}`;
	}

	if (kontext.bisherigeFakten) {
		kontextString += `\n\nBEREITS ETABLIERTE FAKTEN (aus früheren Gesprächen):\n${kontext.bisherigeFakten}`;
	}

	// Build chat history
	let chatHistoryString = '';
	if (chatVerlauf.length > 0) {
		chatHistoryString = '\n\nBISHERIGER GESPRÄCHSVERLAUF:\n' + chatVerlauf.map(n =>
			n.rolle === 'nutzer' ? `BESUCHER: ${n.text}` : `SPIELLEITER: ${n.text}`
		).join('\n');
	}

	const prompt = `Du bist der SPIELLEITER in einem Märchen-Rollenspiel mit anthropomorphen Tierwesen (wie bei Beatrix Potter oder Fritz Baumgarten).

DEINE ROLLE:
- Du beschreibst diesen Ort lebendig und atmosphärisch
- Du beantwortest Fragen über den Ort, seine Bewohner und Geschichten
- Du erfindest passende neue Details wenn nötig (Gerüchte, kleine Geschichten, Geheimnisse)
- Du reagierst auf Fakten die der Besucher einbringt und integrierst sie
- Du sprichst den Besucher direkt an ("du siehst...", "dir fällt auf...")

KONTEXT DIESES ORTES:
${kontextString}${chatHistoryString}

AKTUELLE NACHRICHT DES BESUCHERS:
${neueNachricht}

WICHTIG - ANTWORTFORMAT:
1. Antworte zuerst in 2-4 Sätzen atmosphärisch und märchenhaft
2. Wenn du NEUE FAKTEN erfindest oder der Besucher welche einbringt, liste diese am Ende so auf:
   [NEUE FAKTEN]
   - Fakt 1
   - Fakt 2
   (nur wenn es neue, wichtige Informationen gibt die man sich merken sollte)

Falls keine neuen Fakten nötig sind, lass den [NEUE FAKTEN] Abschnitt komplett weg.

STIL: Märchenhaft, gemütlich, einladend. Wie ein weiser Geschichtenerzähler.`;

	console.log(`[Gemini] 🎭 Spielleiter antwortet auf: "${neueNachricht.substring(0, 50)}..."`);

	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (!result.success || !result.text) {
		return { success: false, error: result.error || 'Keine Antwort erhalten' };
	}

	const text = result.text.trim();

	// Parse response - separate answer from facts
	let antwort = text;
	let vorgeschlageneFakten: string[] = [];

	const faktenMatch = text.match(/\[NEUE FAKTEN\]\s*([\s\S]*?)$/i);
	if (faktenMatch) {
		antwort = text.substring(0, faktenMatch.index).trim();
		const faktenText = faktenMatch[1].trim();
		vorgeschlageneFakten = faktenText
			.split('\n')
			.map(line => line.replace(/^[-•*]\s*/, '').trim())
			.filter(line => line.length > 0);
	}

	console.log(`[Gemini] ✅ Spielleiter-Antwort generiert, ${vorgeschlageneFakten.length} neue Fakten vorgeschlagen`);

	return {
		success: true,
		antwort,
		vorgeschlageneFakten: vorgeschlageneFakten.length > 0 ? vorgeschlageneFakten : undefined
	};
}

export interface ZusammenfassungResult {
	success: boolean;
	zusammenfassung?: string;
	error?: string;
}

export async function fasseSpielleiterChatZusammen(
	chatVerlauf: SpielleiterChatNachricht[],
	bisherigeFakten?: string,
	ortName?: string
): Promise<ZusammenfassungResult> {
	const apiKey = await getApiKey();
	if (!apiKey) {
		return { success: false, error: 'Kein API Key vorhanden' };
	}

	const chatText = chatVerlauf.map(n =>
		n.rolle === 'nutzer' ? `BESUCHER: ${n.text}` : `SPIELLEITER: ${n.text}`
	).join('\n');

	let bisherigeFaktenSection = '';
	if (bisherigeFakten) {
		bisherigeFaktenSection = `\nBEREITS BEKANNTE FAKTEN (aus früheren Gesprächen):\n${bisherigeFakten}\n`;
	}

	const prompt = `Du bist ein Archivar der alle wichtigen FAKTEN aus Gesprächen über Orte sammelt.

ORT: ${ortName || 'Unbekannt'}
${bisherigeFaktenSection}
NEUES GESPRÄCH ZUM ZUSAMMENFASSEN:
${chatText}

AUFGABE:
Erstelle eine kompakte Zusammenfassung ALLER wichtigen Fakten - sowohl die bereits bekannten als auch die neuen aus diesem Gespräch.

REGELN:
- Liste nur FAKTEN auf (keine Meinungen, keine Fragen)
- Kurz und prägnant (Stichpunkte)
- Alles was man über diesen Ort wissen sollte
- Bewohner, Geschichten, Geheimnisse, Eigenheiten, Ereignisse
- Was der Besucher festgelegt hat UND was der Spielleiter erzählt hat

FORMAT:
- Fakt 1
- Fakt 2
- Fakt 3
...

Nur die Faktenliste, keine Einleitung oder Erklärung.`;

	console.log(`[Gemini] 📋 Fasse Spielleiter-Chat zusammen (${chatVerlauf.length} Nachrichten)...`);

	const result = await generateTextWithRetryAndFallback(prompt, apiKey);

	if (!result.success || !result.text) {
		return { success: false, error: result.error || 'Zusammenfassung fehlgeschlagen' };
	}

	const zusammenfassung = result.text.trim();
	console.log(`[Gemini] ✅ Chat zusammengefasst`);

	return { success: true, zusammenfassung };
}
