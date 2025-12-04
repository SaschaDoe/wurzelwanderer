import { STORAGE_KEYS, getStoredString, setStoredString, removeStoredItem } from '$lib/utils/storage';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 90000; // 90 Sekunden Timeout

// Models to try in order (with fallback)
// See: https://ai.google.dev/gemini-api/docs/image-generation
const IMAGE_MODELS = [
	'gemini-3-pro-image-preview', // "Nano Banana Pro" - state-of-the-art
	'gemini-2.5-flash-image' // Fast "Nano Banana" - stable fallback
];

// Get API key from environment or localStorage
export function getApiKey(): string | null {
	// First check environment variable (for dev)
	const envKey = import.meta.env.VITE_GEMINI_API_KEY;
	if (envKey && envKey !== 'your_api_key_here') {
		return envKey;
	}

	// Then check localStorage
	return getStoredString(STORAGE_KEYS.API_KEY);
}

export function setApiKey(key: string): void {
	setStoredString(STORAGE_KEYS.API_KEY, key);
}

export function clearApiKey(): void {
	removeStoredItem(STORAGE_KEYS.API_KEY);
}

export function hasApiKey(): boolean {
	return !!getApiKey();
}

// Debug: Liste alle verfügbaren Models
export async function listAvailableModels(): Promise<void> {
	const apiKey = getApiKey();
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

interface BekannterInfo {
	name: string;
	tier: string;
	berufe: string[];
	merkmalName: string;
	merkmalBeschreibung: string;
	kategorie: string;
	geschlecht: string;
}

async function tryGenerateWithModel(
	model: string,
	prompt: string,
	apiKey: string
): Promise<{ success: boolean; imageData?: string; error?: string }> {
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
			console.warn(`[Gemini] ❌ Model ${model} fehlgeschlagen: ${errorMessage}`);
			return { success: false, error: errorMessage };
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

export async function generateBekannterImage(bekannter: BekannterInfo): Promise<string | null> {
	const apiKey = getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	console.log(`[Gemini] 🎨 Starte Bildgenerierung für: ${bekannter.name} (${bekannter.tier})`);
	console.log(`[Gemini] Verfügbare Models:`, IMAGE_MODELS);

	// Build the prompt for Fritz Baumgarten style
	const prompt = `Create a colorful hand-drawn illustration in the style of Fritz Baumgarten (German children's book illustration, fairy-tale like, warm, detailed, watercolor-style). Do NOT include any text, labels, titles, or words in the image.

The image shows: ${bekannter.name}, ${bekannter.geschlecht === 'weiblich' ? 'a female' : 'a male'} ${bekannter.tier}.
Profession: ${bekannter.berufe.join(', ')}
Character trait: ${bekannter.merkmalName} - ${bekannter.merkmalBeschreibung}

The animal creature stands upright like a human, wears appropriate clothing for their profession, and has a friendly, expressive face.
Background: Soft, natural background with gentle colors.

Style: Fairy-tale German children's book illustration like Fritz Baumgarten.
Portrait orientation, vertical format, focus on the character.`;

	let lastError = '';

	// Try each model in order
	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] 🔄 Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		const result = await tryGenerateWithModel(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] 🎉 Erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] ➡️ Fallback zum nächsten Model...`);
		}
	}

	// All models failed
	console.error(`[Gemini] 💥 Alle Models fehlgeschlagen. Letzter Fehler: ${lastError}`);
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
	anmerkungen?: string;
}

export async function generateOrtImage(ort: OrtInfo): Promise<string | null> {
	const apiKey = getApiKey();
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

	const prompt = `Create a colorful hand-drawn landscape illustration in the style of Fritz Baumgarten (German children's book illustration, fairy-tale like, warm, detailed, watercolor-style). Do NOT include any text, labels, titles, or words in the image. Do NOT include any humanoid characters or anthropomorphic animals - but DO include small natural creatures like butterflies, dragonflies, bees, frogs, birds, or fish if they fit the atmosphere.

The image shows: A magical place called "${ort.name}", with a theme of: ${hauptNaturellText}.
The location combines elements of: ${naturelleDescriptions.join(', ')}.${stimmungText}${anmerkungenText}

This is a fairy-tale landscape with cozy details like small houses, lanterns, winding paths, bridges, and natural elements. Focus on the environment and atmosphere, not on humanoid inhabitants.

Style: Fairy-tale German children's book illustration like Fritz Baumgarten.
Wide panoramic landscape orientation, horizontal format.
Warm, inviting colors with soft lighting.`;

	let lastError = '';

	// Try each model in order
	for (let i = 0; i < IMAGE_MODELS.length; i++) {
		const model = IMAGE_MODELS[i];
		console.log(`[Gemini] 🔄 Versuch ${i + 1}/${IMAGE_MODELS.length}: ${model}`);

		const result = await tryGenerateWithModel(model, prompt, apiKey);

		if (result.success && result.imageData) {
			console.log(`[Gemini] 🎉 Erfolgreich mit Model: ${model}`);
			return result.imageData;
		}

		lastError = result.error || 'Unbekannter Fehler';

		if (i < IMAGE_MODELS.length - 1) {
			console.log(`[Gemini] ➡️ Fallback zum nächsten Model...`);
		}
	}

	// All models failed
	console.error(`[Gemini] 💥 Alle Models fehlgeschlagen. Letzter Fehler: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
}
