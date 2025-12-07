import { STORAGE_KEYS, getStoredString, setStoredString, removeStoredItem } from '$lib/utils/storage';
import { GEMINI_API_BASE, REQUEST_TIMEOUT_MS, IMAGE_MODELS, TEXT_MODEL } from '$lib/constants/api';

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
	const result = await generateTextWithModel(prompt, apiKey);

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

	if (bekannter.regionContext || bekannter.ortContext) {
		const contextParts: string[] = [];

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

		// Add ort naturelle (up to 2)
		if (bekannter.ortContext && bekannter.ortContext.naturelleNames.length > 0) {
			contextParts.push(`elements of ${bekannter.ortContext.naturelleNames.slice(0, 2).join(' and ')}`);
		}

		if (contextParts.length > 0) {
			backgroundContext = `Background featuring: ${contextParts.slice(0, 4).join(', ')}. Fairy-tale atmosphere.`;
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
): Promise<{ success: boolean; text?: string; error?: string }> {
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
			console.warn(`[Gemini] ❌ Textgenerierung fehlgeschlagen: ${errorMessage}`);
			console.log(`[Gemini] 📋 Vollständige Error-Response:`, JSON.stringify(errorData, null, 2));
			return { success: false, error: errorMessage };
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

	const anmerkungenContext = ort.anmerkungen
		? `\n\nZUSÄTZLICHE ANMERKUNGEN DES SPIELLEITERS:\n${ort.anmerkungen}`
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
${naturelleContext}${regionContext}${anmerkungenContext}

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

	const result = await generateTextWithModel(prompt, apiKey);

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

	console.error(`[Gemini] 💥 Alle Models fehlgeschlagen. Letzter Fehler: ${lastError}`);
	throw new Error(`API Error: ${lastError}`);
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
