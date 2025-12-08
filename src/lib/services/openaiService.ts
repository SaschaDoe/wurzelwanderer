/**
 * OpenAI GPT-5.1 Service for text and image generation.
 * Used for text generation tasks and as fallback for image generation when Gemini fails.
 */

import { browser } from '$app/environment';
import { getStoredString, setStoredString, STORAGE_KEYS } from '$lib/utils/storage';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const TEXT_MODEL = 'gpt-5.1';
const IMAGE_MODEL = 'gpt-image-1'; // OpenAI's latest image generation model
const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes for complex prompts

let cachedApiKey: string | null = null;

/**
 * Initialize OpenAI API key from storage
 */
export async function initOpenAIKey(): Promise<void> {
	if (!browser) return;
	cachedApiKey = await getStoredString(STORAGE_KEYS.OPENAI_API_KEY);
}

/**
 * Get the current OpenAI API key
 */
export async function getOpenAIKey(): Promise<string | null> {
	if (cachedApiKey) return cachedApiKey;
	if (!browser) return null;
	cachedApiKey = await getStoredString(STORAGE_KEYS.OPENAI_API_KEY);
	return cachedApiKey;
}

/**
 * Save OpenAI API key to storage
 */
export async function saveOpenAIKey(key: string): Promise<void> {
	cachedApiKey = key;
	await setStoredString(STORAGE_KEYS.OPENAI_API_KEY, key);
}

/**
 * Check if OpenAI API key is configured
 */
export function hasOpenAIKey(): boolean {
	return !!cachedApiKey;
}

/**
 * Generate text using GPT-5.1
 */
export async function generateText(
	prompt: string,
	options?: {
		temperature?: number;
		maxTokens?: number;
		systemPrompt?: string;
	}
): Promise<{ success: boolean; text?: string; error?: string }> {
	const apiKey = await getOpenAIKey();
	if (!apiKey) {
		return { success: false, error: 'Kein OpenAI API Key konfiguriert' };
	}

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const messages: Array<{ role: 'system' | 'user'; content: string }> = [];

		if (options?.systemPrompt) {
			messages.push({ role: 'system', content: options.systemPrompt });
		}
		messages.push({ role: 'user', content: prompt });

		const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: TEXT_MODEL,
				messages,
				temperature: options?.temperature ?? 0.9,
				max_completion_tokens: options?.maxTokens ?? 4096
			}),
			signal: controller.signal
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.error?.message || response.statusText;
			console.error(`[OpenAI] API Fehler: ${errorMessage}`);
			return { success: false, error: errorMessage };
		}

		const data = await response.json();
		const text = data.choices?.[0]?.message?.content;

		if (!text) {
			return { success: false, error: 'Keine Antwort vom Model erhalten' };
		}

		return { success: true, text };
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			return { success: false, error: 'Timeout - Anfrage hat zu lange gedauert' };
		}
		const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
		console.error(`[OpenAI] Exception: ${errorMsg}`);
		return { success: false, error: errorMsg };
	}
}

/**
 * Generate a smart image prompt by analyzing the full story context.
 * This uses GPT-5.1 to create a focused, accurate prompt for image generation.
 */
export async function generateImagePrompt(context: {
	szenenNummer: number;
	szenenTitel: string;
	szenenTyp: string;
	reim: string;
	storyPlan?: {
		zusammenfassung: string;
		szenenUebersicht: Array<{ nummer: number; kurzinhalt: string }>;
	};
	charaktere: Array<{
		name: string;
		tier: string;
		geschlecht: string;
		berufe: string[];
		merkmalName: string;
		hatPortrait: boolean;
	}>;
	bekannte: Array<{
		name: string;
		tier: string;
		geschlecht: string;
		berufe: string[];
		merkmalName: string;
	}>;
	aktuelleRegion: {
		name: string;
		geographisch: string[];
		faunaFlora: string[];
		architektur?: string;
	};
	aktuellerOrt: {
		name: string;
		beschreibung: string;
	};
	bisherigeSzenen: Array<{
		nummer: number;
		titel: string;
		kurzinhalt: string;
	}>;
}): Promise<{ success: boolean; prompt?: string; error?: string }> {
	const charakterListe = context.charaktere
		.map(c => `- ${c.name}: ${c.geschlecht === 'weiblich' ? 'weibliche' : 'männlicher'} ${c.tier}, ${c.berufe.join('/')}, ${c.merkmalName}${c.hatPortrait ? ' (hat Referenzbild)' : ''}`)
		.join('\n');

	const bekannteListe = context.bekannte
		.map(c => `- ${c.name}: ${c.geschlecht === 'weiblich' ? 'weibliche' : 'männlicher'} ${c.tier}, ${c.berufe.join('/')}, ${c.merkmalName}`)
		.join('\n');

	const bisherigeHandlung = context.bisherigeSzenen.length > 0
		? context.bisherigeSzenen.map(s => `Szene ${s.nummer} "${s.titel}": ${s.kurzinhalt}`).join('\n')
		: 'Dies ist die erste Szene.';

	const storyContext = context.storyPlan
		? `STORY-ZUSAMMENFASSUNG: ${context.storyPlan.zusammenfassung}\n\nGEPLANTE SZENE ${context.szenenNummer}: ${context.storyPlan.szenenUebersicht.find(s => s.nummer === context.szenenNummer)?.kurzinhalt || 'Nicht geplant'}`
		: '';

	const systemPrompt = `Du bist ein Experte für Bild-Prompts im Stil von Fritz Baumgarten (deutsche Kinderbuch-Illustration, Märchenhaft, warm, detailliert, Aquarell-Stil).

Deine Aufgabe: Analysiere die Geschichte und erstelle einen FOKUSSIERTEN englischen Bild-Prompt.

WICHTIG:
- Zeige NUR was in der AKTUELLEN Szene passiert
- Wenn die Charaktere einen Ort VERLASSEN haben, zeige diesen Ort NICHT mehr
- Beschreibe die Umgebung basierend auf dem AKTUELLEN Ort, nicht auf vorherigen
- Nenne ALLE Charaktere die im Reim vorkommen mit ihrem Aussehen
- Benutze die Region-Features für die Umgebung
- Der Prompt muss auf ENGLISCH sein für das Bildmodell`;

	const prompt = `AKTUELLE SZENE: ${context.szenenNummer}. ${context.szenenTitel} (${context.szenenTyp})

REIM DER SZENE:
${context.reim}

${storyContext}

BISHERIGE HANDLUNG:
${bisherigeHandlung}

HAUPTCHARAKTERE:
${charakterListe}

NEBENCHARAKTERE (Bekannte):
${bekannteListe}

AKTUELLER ORT: ${context.aktuellerOrt.name}
${context.aktuellerOrt.beschreibung}

REGION-MERKMALE:
- Geographie: ${context.aktuelleRegion.geographisch.join(', ')}
- Flora/Fauna: ${context.aktuelleRegion.faunaFlora.join(', ')}
${context.aktuelleRegion.architektur ? `- Architektur: ${context.aktuelleRegion.architektur}` : ''}

---

Erstelle jetzt einen detaillierten englischen Bild-Prompt (ca. 150-200 Wörter) der:
1. Die Szene aus dem Reim visuell beschreibt
2. ALLE im Reim genannten Charaktere mit korrektem Aussehen einbezieht
3. Die AKTUELLE Umgebung zeigt (nicht vorherige Orte!)
4. Im Fritz Baumgarten Stil gehalten ist
5. Keine Text-Elemente im Bild fordert

Antworte NUR mit dem englischen Prompt, keine Erklärungen.`;

	const result = await generateText(prompt, {
		systemPrompt,
		temperature: 0.7,
		maxTokens: 500
	});

	if (result.success && result.text) {
		return { success: true, prompt: result.text.trim() };
	}

	return { success: false, error: result.error };
}

/**
 * Generate an image using OpenAI's gpt-image-1 model.
 * Used as fallback when Gemini image generation fails.
 */
export async function generateImage(
	prompt: string,
	options?: {
		size?: '1024x1024' | '1536x1024' | '1024x1536';
		quality?: 'low' | 'medium' | 'high';
	}
): Promise<{ success: boolean; imageData?: string; error?: string }> {
	const apiKey = await getOpenAIKey();
	if (!apiKey) {
		return { success: false, error: 'Kein OpenAI API Key konfiguriert' };
	}

	console.log(`[OpenAI] 🎨 Starte Bildgenerierung mit ${IMAGE_MODEL}`);
	const startTime = Date.now();

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`
			},
			body: JSON.stringify({
				model: IMAGE_MODEL,
				prompt,
				n: 1,
				size: options?.size ?? '1024x1024',
				quality: options?.quality ?? 'medium',
				response_format: 'b64_json'
			}),
			signal: controller.signal
		});

		clearTimeout(timeoutId);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
		console.log(`[OpenAI] Response nach ${elapsed}s - Status: ${response.status}`);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			const errorMessage = errorData.error?.message || response.statusText;
			console.error(`[OpenAI] ❌ Bildgenerierung fehlgeschlagen: ${errorMessage}`);
			return { success: false, error: errorMessage };
		}

		const data = await response.json();
		const imageBase64 = data.data?.[0]?.b64_json;

		if (!imageBase64) {
			return { success: false, error: 'Kein Bild in der Response erhalten' };
		}

		console.log(`[OpenAI] 🎉 Bild erfolgreich generiert`);
		return {
			success: true,
			imageData: `data:image/png;base64,${imageBase64}`
		};
	} catch (error) {
		clearTimeout(timeoutId);
		if (error instanceof Error && error.name === 'AbortError') {
			return { success: false, error: 'Timeout - Bildgenerierung hat zu lange gedauert' };
		}
		const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
		console.error(`[OpenAI] Exception: ${errorMsg}`);
		return { success: false, error: errorMsg };
	}
}
