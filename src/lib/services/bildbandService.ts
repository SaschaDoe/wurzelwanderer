/**
 * Service for generating picture books (Bildbände) with Gemini.
 * Orchestrates the creation of 10-scene illustrated stories in rhymes.
 */

import { getApiKey } from './geminiService';
import { GEMINI_API_BASE, REQUEST_TIMEOUT_MS, IMAGE_MODELS, TEXT_MODEL } from '$lib/constants/api';
import {
	type BildbandSzene,
	type GespeicherterBildband,
	type SzenenKontext,
	type SzenenDefinition,
	type BildbandProgress,
	type StoryPlan,
	SZENEN_STRUKTUR,
	erstelleLeereSzene
} from '$lib/data/bildband';
import type { GenerierterBekannter, Geschlecht, Merkmal } from '$lib/data/merkmale';
import { tierwesen, alleKategorien } from '$lib/data/merkmale';
import type { GespeicherteRegion } from '$lib/data/regionen';
import type { Naturell } from '$lib/data/naturelle';
import { getRandomElement } from '$lib/utils/random';
import { kategorien } from '$lib/data/naturelle';
import { generiereZufaelligeRegion } from '$lib/data/regionen';

/**
 * Internal helper to call Gemini text API with retry
 */
async function callTextApi(
	prompt: string,
	apiKey: string,
	maxRetries: number = 3
): Promise<{ success: boolean; text?: string; error?: string }> {
	let lastError = 'Unbekannter Fehler';

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			const response = await fetch(`${GEMINI_API_BASE}/models/${TEXT_MODEL}:generateContent`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey
				},
				body: JSON.stringify({
					contents: [{ role: 'user', parts: [{ text: prompt }] }],
					generationConfig: {
						temperature: 0.9,
						maxOutputTokens: 2048
					}
				}),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				lastError = errorData.error?.message || response.statusText;
				console.warn(`[Bildband] Text API Versuch ${attempt}/${maxRetries} fehlgeschlagen: ${lastError}`);

				// If rate limited, wait before retry
				if (response.status === 429) {
					await new Promise((r) => setTimeout(r, 2000 * attempt));
					continue;
				}
				continue;
			}

			const data = await response.json();
			const candidates = data.candidates || [];

			// Log the response structure for debugging
			if (candidates.length === 0) {
				console.warn(`[Bildband] Versuch ${attempt}/${maxRetries}: Keine candidates in Response`, {
					promptFeedback: data.promptFeedback,
					hasError: !!data.error
				});
			}

			for (const candidate of candidates) {
				// Check for finish reason
				if (candidate.finishReason && candidate.finishReason !== 'STOP') {
					console.warn(`[Bildband] Versuch ${attempt}/${maxRetries}: finishReason = ${candidate.finishReason}`);
				}

				for (const part of candidate.content?.parts || []) {
					if (part.text) {
						return { success: true, text: part.text };
					}
				}
			}

			if (data.promptFeedback?.blockReason) {
				lastError = `Prompt blockiert: ${data.promptFeedback.blockReason}`;
				console.warn(`[Bildband] ${lastError}`);
				// Don't retry if blocked
				return { success: false, error: lastError };
			}

			lastError = 'Kein Text in der Response';
			console.warn(`[Bildband] Versuch ${attempt}/${maxRetries}: ${lastError}`);

			// Wait before retry
			if (attempt < maxRetries) {
				await new Promise((r) => setTimeout(r, 1000 * attempt));
			}
		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof Error && error.name === 'AbortError') {
				lastError = 'Timeout';
			} else {
				lastError = error instanceof Error ? error.message : 'Unbekannter Fehler';
			}
			console.warn(`[Bildband] Versuch ${attempt}/${maxRetries} Exception: ${lastError}`);

			if (attempt < maxRetries) {
				await new Promise((r) => setTimeout(r, 1000 * attempt));
			}
		}
	}

	return { success: false, error: `Nach ${maxRetries} Versuchen fehlgeschlagen: ${lastError}` };
}

/**
 * Internal helper to call Gemini image API with optional reference images
 */
async function callImageApi(
	prompt: string,
	apiKey: string,
	referenceImages?: string[] // Base64 data URLs
): Promise<{ success: boolean; imageData?: string; error?: string }> {
	for (const model of IMAGE_MODELS) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

		try {
			// Build parts array with text and optional reference images
			const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

			// Add reference images first if provided
			if (referenceImages && referenceImages.length > 0) {
				for (const imgUrl of referenceImages) {
					// Extract base64 data from data URL
					const match = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
					if (match) {
						parts.push({
							inlineData: {
								mimeType: match[1],
								data: match[2]
							}
						});
					}
				}
			}

			// Add the text prompt
			parts.push({ text: prompt });

			const response = await fetch(`${GEMINI_API_BASE}/models/${model}:generateContent`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey
				},
				body: JSON.stringify({
					contents: [{ role: 'user', parts }],
					generationConfig: {
						responseModalities: ['TEXT', 'IMAGE']
					}
				}),
				signal: controller.signal
			});

			clearTimeout(timeoutId);

			if (!response.ok) {
				console.warn(`[Bildband] Image API ${model} returned ${response.status}`);
				continue;
			}

			const data = await response.json();
			for (const candidate of data.candidates || []) {
				for (const part of candidate.content?.parts || []) {
					if (part.inlineData) {
						const mimeType = part.inlineData.mimeType || 'image/png';
						return {
							success: true,
							imageData: `data:${mimeType};base64,${part.inlineData.data}`
						};
					}
				}
			}
		} catch (error) {
			clearTimeout(timeoutId);
			console.warn(`[Bildband] Image API ${model} error:`, error);
			continue;
		}
	}

	return { success: false, error: 'Alle Bild-Models fehlgeschlagen' };
}

/**
 * Generate a character portrait
 */
export async function generiereCharakterPortrait(
	charakter: GenerierterBekannter
): Promise<{ success: boolean; imageData?: string; error?: string }> {
	const apiKey = await getApiKey();
	if (!apiKey) return { success: false, error: 'Kein API Key' };

	const geschlechtText = charakter.geschlecht === 'weiblich' ? 'female' : 'male';
	const berufeText = charakter.berufe.join(' and ');

	const prompt = `Create a character portrait in the style of Fritz Baumgarten (German children's book illustration, watercolor, warm colors, fairy-tale like).

CHARACTER: ${charakter.name}
- A ${geschlechtText} anthropomorphic ${charakter.tier}
- Profession: ${berufeText}
- Personality trait: ${charakter.merkmal.name}
- Category: ${charakter.kategorie}

REQUIREMENTS:
- Portrait format, showing head and upper body
- The character should be wearing appropriate clothing for their profession
- Warm, inviting expression matching their personality
- Hand-drawn watercolor style like classic German children's books
- Soft, natural colors
- NO text, labels, or words in the image
- Background: simple, muted, not distracting

Style: Classic German fairy-tale children's book illustration like Fritz Baumgarten or Ida Bohatta.`;

	console.log(`[Bildband] Generiere Portrait für ${charakter.name}...`);

	return callImageApi(prompt, apiKey);
}

/**
 * Build character description for prompts
 */
function beschreibeCharaktere(charaktere: GenerierterBekannter[]): string {
	return charaktere
		.map((c) => {
			const berufe = c.berufe.join(' und ');
			return `${c.name} (${c.geschlecht === 'weiblich' ? 'weibliche' : 'männlicher'} ${c.tier}, ${berufe}, ${c.merkmal.name})`;
		})
		.join(', ');
}

/**
 * Build region description for prompts
 */
function beschreibeRegion(region: GespeicherteRegion): string {
	const parts: string[] = [];

	if (region.geographisch.length > 0) {
		parts.push(region.geographisch.map((g) => g.name).join(', '));
	}
	if (region.faunaFlora.length > 0) {
		parts.push(region.faunaFlora.map((f) => f.name).join(', '));
	}
	if (region.architektur) {
		parts.push(region.architektur.name);
	}

	return parts.length > 0 ? `${region.name} (${parts.join('; ')})` : region.name;
}

/**
 * Build location description for prompts
 */
function beschreibeOrt(ort: Naturell, region: GespeicherteRegion): string {
	return `${ort.name} in ${region.name}`;
}

/**
 * Summarize previous scenes for context
 */
function fasseBisherigeSzenenZusammen(szenen: BildbandSzene[]): string {
	if (szenen.length === 0) return 'Dies ist der Anfang der Geschichte.';

	return szenen
		.map((s) => `Szene ${s.nummer} (${s.titel}): ${s.reim.split('\n')[0]}...`)
		.join('\n');
}

/**
 * Generate NPCs (Bekannte) that the characters will encounter
 */
export async function generiereBekannte(
	anzahl: number = 2,
	charaktere: GenerierterBekannter[]
): Promise<GenerierterBekannter[]> {
	const bekannte: GenerierterBekannter[] = [];
	const verwendeteTiere = new Set(charaktere.map((c) => c.tier));

	const geschlechter: Geschlecht[] = ['weiblich', 'männlich'];

	for (let i = 0; i < anzahl; i++) {
		// Pick a different animal than the main characters
		let tier = getRandomElement(tierwesen);
		let attempts = 0;
		while (verwendeteTiere.has(tier) && attempts < 10) {
			tier = getRandomElement(tierwesen);
			attempts++;
		}
		verwendeteTiere.add(tier);

		const geschlecht = getRandomElement(geschlechter);
		// Pick a random category first, then a merkmal from it
		const kategorie = getRandomElement(alleKategorien);
		const merkmal = getRandomElement(kategorie.merkmale);
		// Get a random profession from the merkmal
		const beruf = getRandomElement(merkmal.berufe);

		// Generate a name using LLM
		const apiKey = await getApiKey();
		let name = `Bekannter ${i + 1}`;

		if (apiKey) {
			const namePrompt = `Gib mir EINEN kurzen, fantasievollen deutschen Namen für einen ${geschlecht === 'weiblich' ? 'weiblichen' : 'männlichen'} ${tier} in einem deutschen Kinderbuch-Märchen. Der Name sollte zum Tier passen und märchenhaft klingen. Antworte NUR mit dem Namen, keine Erklärungen.`;
			const result = await callTextApi(namePrompt, apiKey);
			if (result.success && result.text) {
				name = result.text.trim().split('\n')[0].replace(/['"]/g, '');
			}
		}

		bekannte.push({
			name,
			tier,
			geschlecht,
			berufe: [beruf],
			merkmal,
			kategorie: kategorie.name
		});
	}

	return bekannte;
}

/**
 * Pre-plan the entire story before generating individual scenes
 */
export async function planeGeschichte(
	charaktere: GenerierterBekannter[],
	bekannte: GenerierterBekannter[],
	startRegion: GespeicherteRegion,
	startOrt: Naturell,
	zweiterOrt: { region: GespeicherteRegion; ort: Naturell }
): Promise<StoryPlan> {
	const apiKey = await getApiKey();
	if (!apiKey) throw new Error('Kein API Key vorhanden.');

	const charakterBeschreibung = beschreibeCharaktere(charaktere);
	const bekannteBeschreibung = beschreibeCharaktere(bekannte);
	const startBeschreibung = `${startOrt.name} in ${beschreibeRegion(startRegion)}`;
	const zielBeschreibung = `${zweiterOrt.ort.name} in ${beschreibeRegion(zweiterOrt.region)}`;

	const prompt = `Du bist ein erfahrener Kinderbuch-Autor für deutsche Märchen-Fabeln im Stil von Beatrix Potter und Fritz Baumgarten.

DEINE AUFGABE: Denke dir eine vollständige Fabel-Geschichte aus mit folgendem Material:

HAUPTCHARAKTERE (Helden der Geschichte):
${charakterBeschreibung}

NEBENCHARAKTERE (Bekannte, die sie treffen):
${bekannteBeschreibung}

STARTORT: ${startBeschreibung}
ZIELORT (nach der Reise): ${zielBeschreibung}

Die Geschichte folgt dieser 10-Szenen-Struktur:
1. Der Ort - Einführung des Startortes
2. Die Gefährten - Vorstellung der Hauptcharaktere
3. Das Problem - Ein Problem oder Konflikt taucht auf
4. Das Ziel - Die Charaktere setzen sich ein Ziel
5. Der Weg - Sie verfolgen ihr Ziel
6. Die Reise - Ortswechsel zum neuen Ort
7. Neues Land - Ankunft am Zielort
8. Die Wendung - Ein Twist oder neues Hindernis
9. Der Triumph - Sie überwinden das Problem
10. Das Ende - Abschluss der Geschichte

WICHTIG:
- Die Geschichte soll märchenhaft und fabelhaft sein
- Die Nebencharaktere (${bekannte.map((b) => b.name).join(', ')}) sollen aktiv in der Geschichte vorkommen
- Es soll DIALOGE und INTERAKTIONEN zwischen den Charakteren geben
- Die Geschichte soll eine kleine Moral oder Weisheit beinhalten
- Denke an Konflikte, Freundschaft, Mut, Zusammenhalt

Antworte im folgenden Format:

ZUSAMMENFASSUNG: [2-3 Sätze, die die gesamte Geschichte beschreiben]

HAUPTKONFLIKT: [Was ist das zentrale Problem der Geschichte?]

MORAL: [Die Weisheit oder Lehre der Geschichte]

SZENE 1: [Kurze Beschreibung was in Szene 1 passiert]
SZENE 2: [Kurze Beschreibung was in Szene 2 passiert]
SZENE 3: [Kurze Beschreibung was in Szene 3 passiert]
SZENE 4: [Kurze Beschreibung was in Szene 4 passiert]
SZENE 5: [Kurze Beschreibung was in Szene 5 passiert]
SZENE 6: [Kurze Beschreibung was in Szene 6 passiert]
SZENE 7: [Kurze Beschreibung was in Szene 7 passiert]
SZENE 8: [Kurze Beschreibung was in Szene 8 passiert]
SZENE 9: [Kurze Beschreibung was in Szene 9 passiert]
SZENE 10: [Kurze Beschreibung was in Szene 10 passiert]`;

	console.log('[Bildband] Plane Geschichte...');
	const result = await callTextApi(prompt, apiKey);

	if (!result.success || !result.text) {
		throw new Error(result.error || 'Story-Planung fehlgeschlagen');
	}

	const text = result.text;

	// Parse the response
	const zusammenfassungMatch = text.match(/ZUSAMMENFASSUNG:\s*(.+?)(?=\n\n|HAUPTKONFLIKT)/is);
	const konfliktMatch = text.match(/HAUPTKONFLIKT:\s*(.+?)(?=\n\n|MORAL)/is);
	const moralMatch = text.match(/MORAL:\s*(.+?)(?=\n\n|SZENE 1)/is);

	const szenenPlaene: string[] = [];
	for (let i = 1; i <= 10; i++) {
		const szeneMatch = text.match(new RegExp(`SZENE ${i}:\\s*(.+?)(?=\\n\\n|SZENE ${i + 1}|$)`, 'is'));
		szenenPlaene.push(szeneMatch?.[1]?.trim() || `Szene ${i}`);
	}

	return {
		zusammenfassung: zusammenfassungMatch?.[1]?.trim() || 'Eine märchenhafte Geschichte.',
		hauptkonflikt: konfliktMatch?.[1]?.trim() || 'Die Helden müssen ein Abenteuer bestehen.',
		moral: moralMatch?.[1]?.trim(),
		szenenPlaene
	};
}

/**
 * Generate a rhyming text for a scene (with story plan context)
 */
export async function generiereReim(
	kontext: SzenenKontext,
	storyPlan?: StoryPlan,
	bekannte?: GenerierterBekannter[]
): Promise<string> {
	const apiKey = await getApiKey();
	if (!apiKey) throw new Error('Kein API Key vorhanden.');

	const charakterBeschreibung = beschreibeCharaktere(kontext.charaktere);
	const ortBeschreibung = beschreibeOrt(kontext.aktuellerOrt, kontext.aktuelleRegion);
	const regionBeschreibung = beschreibeRegion(kontext.aktuelleRegion);
	const bisherig = fasseBisherigeSzenenZusammen(kontext.bisherigeSzenen);

	const anmerkung = kontext.userAnmerkung
		? `\n\nWICHTIG - Beachte diese Anmerkung des Erzählers: ${kontext.userAnmerkung}`
		: '';

	// Story plan context
	const szenenPlan = storyPlan?.szenenPlaene[kontext.szenenDefinition.nummer - 1] || '';
	const storyKontext = storyPlan
		? `\nGESAMTE GESCHICHTE: ${storyPlan.zusammenfassung}\nKONFLIKT: ${storyPlan.hauptkonflikt}\n${storyPlan.moral ? `MORAL: ${storyPlan.moral}\n` : ''}`
		: '';

	// Bekannte (NPCs)
	const bekannteBeschreibung = bekannte && bekannte.length > 0
		? `\nNEBENCHARAKTERE (können in der Geschichte auftauchen): ${beschreibeCharaktere(bekannte)}`
		: '';

	const prompt = `Du bist ein begnadeter Geschichtenerzähler für deutsche Märchen-Fabeln im Stil von klassischen Kinderbüchern.
Schreibe einen Reim (8 Zeilen, 2 Strophen à 4 Zeilen) für folgende Szene:

SZENE ${kontext.szenenDefinition.nummer}: ${kontext.szenenDefinition.titel}
SZENEN-TYP: ${kontext.szenenDefinition.beschreibung}
HINWEIS: ${kontext.szenenDefinition.promptHinweis}
${szenenPlan ? `\nWAS IN DIESER SZENE PASSIERT: ${szenenPlan}` : ''}
${storyKontext}
HAUPTCHARAKTERE: ${charakterBeschreibung}${bekannteBeschreibung}

ORT: ${ortBeschreibung}
REGION: ${regionBeschreibung}

BISHERIGE SZENEN:
${bisherig}${anmerkung}

WICHTIGE REGELN:
- Schreibe auf Deutsch
- GENAU 8 Zeilen: 2 Strophen mit je 4 Zeilen
- Reimschema: AABB (Paarreim) für jede Strophe
- Märchenhaft, poetisch und lebendig
- WICHTIG: Baue DIREKTE REDE ein! Die Charaktere sollen sprechen!
  z.B. "Kommt, Freunde", rief der Dachs, "wir müssen fort!"
- Zeige INTERAKTIONEN zwischen den Charakteren
- Erwähne die Charaktere beim Namen
- Passe zum Szenen-Typ
- Leere Zeile zwischen den Strophen
- Antworte NUR mit dem Reim, keine Erklärungen oder Überschriften`;

	console.log(`[Bildband] Generiere Reim für Szene ${kontext.szenenDefinition.nummer}...`);

	const result = await callTextApi(prompt, apiKey);

	if (!result.success || !result.text) {
		throw new Error(result.error || 'Reim-Generierung fehlgeschlagen');
	}

	return result.text.trim();
}

/**
 * Generate only the rhyme for a scene (for retry without regenerating image)
 */
export async function generiereNurReim(
	kontext: SzenenKontext,
	storyPlan?: StoryPlan,
	bekannte?: GenerierterBekannter[]
): Promise<string> {
	return generiereReim(kontext, storyPlan, bekannte);
}

/**
 * Generate an image for a scene
 */
export async function generiereSzenenBild(
	szene: BildbandSzene,
	kontext: SzenenKontext
): Promise<{ bild: string } | { fehler: true }> {
	const apiKey = await getApiKey();
	if (!apiKey) return { fehler: true };

	// Collect character portraits for reference
	const referenceImages: string[] = [];
	const charakterBeschreibungen = kontext.charaktere
		.map((c, index) => {
			const berufe = c.berufe.join(' and ');
			const hasPortrait = c.bild ? ` (shown in reference image ${index + 1})` : '';
			if (c.bild) {
				referenceImages.push(c.bild);
			}
			return `${c.name}: a ${c.geschlecht === 'weiblich' ? 'female' : 'male'} ${c.tier} who is a ${berufe}, personality: ${c.merkmal.name}${hasPortrait}`;
		})
		.join('; ');

	// Build region features
	const regionFeatures: string[] = [];
	for (const geo of kontext.aktuelleRegion.geographisch) {
		regionFeatures.push(geo.promptText);
	}
	for (const flora of kontext.aktuelleRegion.faunaFlora) {
		regionFeatures.push(flora.promptText);
	}
	if (kontext.aktuelleRegion.architektur) {
		regionFeatures.push(kontext.aktuelleRegion.architektur.promptText);
	}

	// Add reference image instruction if we have portraits
	const referenceInstruction = referenceImages.length > 0
		? `\n\nIMPORTANT: Reference images are provided showing how each character should look. Use these as visual reference to maintain character consistency. The characters in your generated image should match the appearance shown in the reference portraits.`
		: '';

	const prompt = `Create a colorful hand-drawn illustration in the style of Fritz Baumgarten (German children's book illustration, fairy-tale like, warm, detailed, watercolor-style). Do NOT include any text, labels, titles, or words in the image.

SCENE: "${szene.reim}"

LOCATION: ${kontext.aktuellerOrt.name} - ${kontext.aktuellerOrt.beschreibung}
REGION FEATURES: ${regionFeatures.join(', ')}

CHARACTERS (anthropomorphic animals in clothing):
${charakterBeschreibungen}

The characters are doing what the rhyme describes. They should be visible and recognizable.
Show them in this scene type: ${szene.titel} - ${szene.typ}

Style: Fairy-tale German children's book illustration like Fritz Baumgarten.
Horizontal landscape format with warm, inviting colors.${referenceInstruction}`;

	console.log(`[Bildband] Generiere Bild für Szene ${szene.nummer} mit ${referenceImages.length} Referenzbildern...`);

	const result = await callImageApi(prompt, apiKey, referenceImages.length > 0 ? referenceImages : undefined);

	if (!result.success || !result.imageData) {
		console.error(`[Bildband] Bild-Generierung fehlgeschlagen: ${result.error}`);
		return { fehler: true };
	}

	return { bild: result.imageData };
}

/**
 * Generate additional image for an existing scene
 */
export async function generiereWeiteresBild(
	szene: BildbandSzene,
	kontext: SzenenKontext
): Promise<{ bild: string } | { fehler: true }> {
	// Same as generiereSzenenBild, just generates another variation
	return generiereSzenenBild(szene, kontext);
}

/**
 * Generate title and description for a completed picture book
 */
export async function generiereMetadaten(
	szenen: BildbandSzene[],
	charaktere: GenerierterBekannter[]
): Promise<{ titel: string; beschreibung: string }> {
	const apiKey = await getApiKey();
	if (!apiKey) throw new Error('Kein API Key vorhanden.');

	const alleReime = szenen.map((s) => `${s.titel}: ${s.reim}`).join('\n\n');
	const charakterNamen = charaktere.map((c) => c.name).join(', ');

	const prompt = `Du bist ein Kinderbuch-Autor. Basierend auf dieser Geschichte mit den Charakteren ${charakterNamen}:

${alleReime}

Generiere:
1. Einen poetischen deutschen Titel (3-6 Wörter)
2. Eine kurze Beschreibung (1-2 Sätze)

Antworte im Format:
TITEL: [Titel hier]
BESCHREIBUNG: [Beschreibung hier]`;

	const result = await callTextApi(prompt, apiKey);

	if (!result.success || !result.text) {
		// Fallback
		return {
			titel: `Die Abenteuer von ${charaktere[0]?.name || 'den Wanderern'}`,
			beschreibung: 'Eine märchenhafte Geschichte in Reimen.'
		};
	}

	const text = result.text;
	const titelMatch = text.match(/TITEL:\s*(.+)/i);
	const beschreibungMatch = text.match(/BESCHREIBUNG:\s*(.+)/i);

	return {
		titel: titelMatch?.[1]?.trim() || `Die Abenteuer von ${charaktere[0]?.name || 'den Wanderern'}`,
		beschreibung: beschreibungMatch?.[1]?.trim() || 'Eine märchenhafte Geschichte in Reimen.'
	};
}

/**
 * Pick a random second location for the journey
 */
export function generiereZweitenOrt(): { region: GespeicherteRegion; ort: Naturell } {
	const region = generiereZufaelligeRegion();
	const alleNaturelle = kategorien.flatMap((k) => k.naturelle);
	const ort = getRandomElement(alleNaturelle);

	return { region, ort };
}

/**
 * Options for bildband generation
 */
export interface BildbandGenerationOptions {
	charaktere: GenerierterBekannter[];
	startRegion: GespeicherteRegion;
	startOrt: Naturell;
	zweiterOrt?: { region: GespeicherteRegion; ort: Naturell };
	onProgress?: (progress: BildbandProgress) => void;
	onSave?: (bildband: GespeicherterBildband) => Promise<void>;
}

/**
 * Create an initial Bildband structure for saving before generation starts
 */
export function erstelleInitialBildband(
	charaktere: GenerierterBekannter[],
	startRegion: GespeicherteRegion,
	startOrt: Naturell,
	zweiterOrt?: { region: GespeicherteRegion; ort: Naturell }
): GespeicherterBildband {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		titel: 'Wird generiert...',
		beschreibung: '',
		charaktere,
		bekannte: [],
		startRegion,
		startOrt,
		zweiterOrt,
		szenen: [],
		erstelltAm: now,
		letzteAktualisierung: now,
		status: 'in_progress'
	};
}

/**
 * Main function: Generate a complete picture book
 */
export async function generiereBildband(
	options: BildbandGenerationOptions
): Promise<GespeicherterBildband>;
export async function generiereBildband(
	charaktere: GenerierterBekannter[],
	startRegion: GespeicherteRegion,
	startOrt: Naturell,
	zweiterOrt?: { region: GespeicherteRegion; ort: Naturell },
	onProgress?: (progress: BildbandProgress) => void,
	onSave?: (bildband: GespeicherterBildband) => Promise<void>
): Promise<GespeicherterBildband>;
export async function generiereBildband(
	optionsOrCharaktere: BildbandGenerationOptions | GenerierterBekannter[],
	startRegion?: GespeicherteRegion,
	startOrt?: Naturell,
	zweiterOrt?: { region: GespeicherteRegion; ort: Naturell },
	onProgress?: (progress: BildbandProgress) => void,
	onSave?: (bildband: GespeicherterBildband) => Promise<void>
): Promise<GespeicherterBildband> {
	// Handle both call signatures
	let options: BildbandGenerationOptions;
	if (Array.isArray(optionsOrCharaktere)) {
		options = {
			charaktere: optionsOrCharaktere,
			startRegion: startRegion!,
			startOrt: startOrt!,
			zweiterOrt,
			onProgress,
			onSave
		};
	} else {
		options = optionsOrCharaktere;
	}

	const { charaktere, onProgress: progressCallback, onSave: saveCallback } = options;

	if (charaktere.length === 0) {
		throw new Error('Mindestens ein Charakter erforderlich.');
	}

	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	// Generate second location if not provided
	const effektiverZweiterOrt = options.zweiterOrt || generiereZweitenOrt();

	// Create initial bildband for saving
	let bildband = erstelleInitialBildband(
		charaktere,
		options.startRegion,
		options.startOrt,
		effektiverZweiterOrt
	);

	// Steps: 1 bekannte + 1 story plan + 10 rhymes + 10 images + 1 metadata = 23
	const gesamtSchritte = 23;
	let aktuellerSchritt = 0;

	console.log(`[Bildband] Starte Generierung mit ${charaktere.length} Charakteren...`);
	console.log(`[Bildband] Start: ${options.startOrt.name} in ${options.startRegion.name}`);
	console.log(
		`[Bildband] Ziel: ${effektiverZweiterOrt.ort.name} in ${effektiverZweiterOrt.region.name}`
	);

	// Save initial state
	await saveCallback?.(bildband);

	// Step 1: Generate NPCs (Bekannte)
	aktuellerSchritt++;
	progressCallback?.({
		aktuellerSchritt,
		gesamtSchritte,
		phase: 'reim' // Using 'reim' as placeholder for planning phase
	});

	console.log('[Bildband] Generiere Nebencharaktere (Bekannte)...');
	const bekannte = await generiereBekannte(2, charaktere);
	bildband.bekannte = bekannte;
	bildband.letzteAktualisierung = new Date().toISOString();
	await saveCallback?.(bildband);
	console.log(`[Bildband] Bekannte: ${bekannte.map((b) => b.name).join(', ')}`);

	// Step 2: Plan the story
	aktuellerSchritt++;
	progressCallback?.({
		aktuellerSchritt,
		gesamtSchritte,
		phase: 'reim' // Using 'reim' as placeholder for planning phase
	});

	console.log('[Bildband] Plane Geschichte...');
	let storyPlan: StoryPlan | undefined;
	try {
		storyPlan = await planeGeschichte(
			charaktere,
			bekannte,
			options.startRegion,
			options.startOrt,
			effektiverZweiterOrt
		);
		bildband.storyPlan = storyPlan;
		bildband.letzteAktualisierung = new Date().toISOString();
		await saveCallback?.(bildband);
		console.log(`[Bildband] Story-Plan: ${storyPlan.zusammenfassung}`);
	} catch (error) {
		console.error('[Bildband] Story-Planung fehlgeschlagen, fahre ohne fort:', error);
	}

	for (const definition of SZENEN_STRUKTUR) {
		// Determine current location based on scene
		const istNachOrtswechsel = definition.nummer >= 6;
		const aktuelleRegion = istNachOrtswechsel ? effektiverZweiterOrt.region : options.startRegion;
		const aktuellerOrt = istNachOrtswechsel ? effektiverZweiterOrt.ort : options.startOrt;

		const szene = erstelleLeereSzene(definition);
		szene.region = aktuelleRegion;
		szene.ort = aktuellerOrt;

		const kontext: SzenenKontext = {
			charaktere,
			aktuelleRegion,
			aktuellerOrt,
			zweiterOrt: effektiverZweiterOrt,
			bisherigeSzenen: bildband.szenen,
			szenenDefinition: definition
		};

		// Generate rhyme
		aktuellerSchritt++;
		progressCallback?.({
			aktuellerSchritt,
			gesamtSchritte,
			phase: 'reim',
			szene
		});

		try {
			szene.reim = await generiereReim(kontext, storyPlan, bekannte);
		} catch (error) {
			console.error(`[Bildband] Fehler bei Reim ${definition.nummer}:`, error);
			szene.reim = `Szene ${definition.nummer}: ${definition.titel}\n(Reim konnte nicht generiert werden)`;
		}

		// Generate image
		aktuellerSchritt++;
		progressCallback?.({
			aktuellerSchritt,
			gesamtSchritte,
			phase: 'bild',
			szene
		});

		const bildResult = await generiereSzenenBild(szene, kontext);
		if ('bild' in bildResult) {
			szene.bilder = [bildResult.bild];
			szene.aktivBildIndex = 0;
			szene.bildFehler = false;
		} else {
			szene.bilder = [];
			szene.aktivBildIndex = 0;
			szene.bildFehler = true;
		}

		bildband.szenen = [...bildband.szenen, szene];
		bildband.letzteAktualisierung = new Date().toISOString();

		// Set cover image from first scene
		if (definition.nummer === 1 && szene.bilder[0]) {
			bildband.coverBild = szene.bilder[0];
		}

		// Save after each scene
		await saveCallback?.(bildband);
	}

	// Generate metadata
	aktuellerSchritt++;
	progressCallback?.({
		aktuellerSchritt,
		gesamtSchritte,
		phase: 'metadaten'
	});

	const { titel, beschreibung } = await generiereMetadaten(bildband.szenen, charaktere);

	bildband.titel = titel;
	bildband.beschreibung = beschreibung;
	bildband.status = 'completed';
	bildband.letzteAktualisierung = new Date().toISOString();
	if (!bildband.coverBild && bildband.szenen[0]?.bilder[0]) {
		bildband.coverBild = bildband.szenen[0].bilder[0];
	}

	// Final save
	await saveCallback?.(bildband);

	console.log(`[Bildband] Generierung abgeschlossen: "${titel}"`);

	return bildband;
}

/**
 * Resume generation of an incomplete Bildband
 */
export async function resumeBildband(
	bildband: GespeicherterBildband,
	onProgress?: (progress: BildbandProgress) => void,
	onSave?: (bildband: GespeicherterBildband) => Promise<void>
): Promise<GespeicherterBildband> {
	if (bildband.status === 'completed') {
		console.log('[Bildband] Bildband ist bereits abgeschlossen.');
		return bildband;
	}

	const apiKey = await getApiKey();
	if (!apiKey) {
		throw new Error('Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.');
	}

	const { charaktere, bekannte, startRegion, startOrt, zweiterOrt, storyPlan } = bildband;
	const effektiverZweiterOrt = zweiterOrt || generiereZweitenOrt();

	// Update zweiterOrt if it wasn't set before
	if (!bildband.zweiterOrt) {
		bildband.zweiterOrt = effektiverZweiterOrt;
	}

	// Calculate what's already done
	const completedScenes = bildband.szenen.length;
	const needsBekannte = bekannte.length === 0;
	const needsStoryPlan = !storyPlan;

	// Steps remaining: bekannte(1) + storyPlan(1) + (10-completedScenes) scenes * 2 + metadata(1)
	const remainingSceneSteps = (10 - completedScenes) * 2;
	const gesamtSchritte =
		(needsBekannte ? 1 : 0) + (needsStoryPlan ? 1 : 0) + remainingSceneSteps + 1;
	let aktuellerSchritt = 0;

	console.log(`[Bildband] Resume: ${completedScenes} Szenen bereits generiert.`);
	console.log(`[Bildband] Resume: ${gesamtSchritte} Schritte verbleibend.`);

	// Generate Bekannte if needed
	if (needsBekannte) {
		aktuellerSchritt++;
		onProgress?.({
			aktuellerSchritt,
			gesamtSchritte,
			phase: 'reim'
		});

		console.log('[Bildband] Resume: Generiere Nebencharaktere...');
		bildband.bekannte = await generiereBekannte(2, charaktere);
		bildband.letzteAktualisierung = new Date().toISOString();
		await onSave?.(bildband);
	}

	// Generate story plan if needed
	let effectiveStoryPlan = storyPlan;
	if (needsStoryPlan) {
		aktuellerSchritt++;
		onProgress?.({
			aktuellerSchritt,
			gesamtSchritte,
			phase: 'reim'
		});

		console.log('[Bildband] Resume: Plane Geschichte...');
		try {
			effectiveStoryPlan = await planeGeschichte(
				charaktere,
				bildband.bekannte,
				startRegion,
				startOrt,
				effektiverZweiterOrt
			);
			bildband.storyPlan = effectiveStoryPlan;
			bildband.letzteAktualisierung = new Date().toISOString();
			await onSave?.(bildband);
		} catch (error) {
			console.error('[Bildband] Resume: Story-Planung fehlgeschlagen:', error);
		}
	}

	// Generate remaining scenes
	for (let i = completedScenes; i < 10; i++) {
		const definition = SZENEN_STRUKTUR[i];
		const istNachOrtswechsel = definition.nummer >= 6;
		const aktuelleRegion = istNachOrtswechsel ? effektiverZweiterOrt.region : startRegion;
		const aktuellerOrt = istNachOrtswechsel ? effektiverZweiterOrt.ort : startOrt;

		const szene = erstelleLeereSzene(definition);
		szene.region = aktuelleRegion;
		szene.ort = aktuellerOrt;

		const kontext: SzenenKontext = {
			charaktere,
			aktuelleRegion,
			aktuellerOrt,
			zweiterOrt: effektiverZweiterOrt,
			bisherigeSzenen: bildband.szenen,
			szenenDefinition: definition
		};

		// Generate rhyme
		aktuellerSchritt++;
		onProgress?.({
			aktuellerSchritt,
			gesamtSchritte,
			phase: 'reim',
			szene
		});

		try {
			szene.reim = await generiereReim(kontext, effectiveStoryPlan, bildband.bekannte);
		} catch (error) {
			console.error(`[Bildband] Resume: Fehler bei Reim ${definition.nummer}:`, error);
			szene.reim = `Szene ${definition.nummer}: ${definition.titel}\n(Reim konnte nicht generiert werden)`;
		}

		// Generate image
		aktuellerSchritt++;
		onProgress?.({
			aktuellerSchritt,
			gesamtSchritte,
			phase: 'bild',
			szene
		});

		const bildResult = await generiereSzenenBild(szene, kontext);
		if ('bild' in bildResult) {
			szene.bilder = [bildResult.bild];
			szene.aktivBildIndex = 0;
			szene.bildFehler = false;
		} else {
			szene.bilder = [];
			szene.aktivBildIndex = 0;
			szene.bildFehler = true;
		}

		bildband.szenen = [...bildband.szenen, szene];
		bildband.letzteAktualisierung = new Date().toISOString();

		// Set cover image from first scene if not set
		if (!bildband.coverBild && definition.nummer === 1 && szene.bilder[0]) {
			bildband.coverBild = szene.bilder[0];
		}

		await onSave?.(bildband);
	}

	// Generate metadata
	aktuellerSchritt++;
	onProgress?.({
		aktuellerSchritt,
		gesamtSchritte,
		phase: 'metadaten'
	});

	const { titel, beschreibung } = await generiereMetadaten(bildband.szenen, charaktere);

	bildband.titel = titel;
	bildband.beschreibung = beschreibung;
	bildband.status = 'completed';
	bildband.letzteAktualisierung = new Date().toISOString();
	if (!bildband.coverBild && bildband.szenen[0]?.bilder[0]) {
		bildband.coverBild = bildband.szenen[0].bilder[0];
	}

	await onSave?.(bildband);

	console.log(`[Bildband] Resume abgeschlossen: "${titel}"`);

	return bildband;
}

/**
 * Regenerate a single scene with optional user comment (both rhyme and image)
 */
export async function regeneriereSzene(
	bildband: GespeicherterBildband,
	szenenNummer: number,
	anmerkung?: string
): Promise<BildbandSzene> {
	const szeneIndex = szenenNummer - 1;
	const alteSzene = bildband.szenen[szeneIndex];

	if (!alteSzene) {
		throw new Error(`Szene ${szenenNummer} nicht gefunden.`);
	}

	const definition = SZENEN_STRUKTUR[szeneIndex];
	const istNachOrtswechsel = szenenNummer >= 6;

	const kontext: SzenenKontext = {
		charaktere: bildband.charaktere,
		aktuelleRegion: istNachOrtswechsel
			? bildband.zweiterOrt?.region || bildband.startRegion
			: bildband.startRegion,
		aktuellerOrt: istNachOrtswechsel
			? bildband.zweiterOrt?.ort || bildband.startOrt
			: bildband.startOrt,
		zweiterOrt: bildband.zweiterOrt,
		bisherigeSzenen: bildband.szenen.slice(0, szeneIndex),
		szenenDefinition: definition,
		userAnmerkung: anmerkung
	};

	// Regenerate rhyme with story plan and bekannte
	const neuerReim = await generiereReim(kontext, bildband.storyPlan, bildband.bekannte);

	// Create updated scene
	const neueSzene: BildbandSzene = {
		...alteSzene,
		reim: neuerReim,
		userKommentar: anmerkung
	};

	// Regenerate image
	const bildResult = await generiereSzenenBild(neueSzene, kontext);
	if ('bild' in bildResult) {
		neueSzene.bilder = [...alteSzene.bilder, bildResult.bild];
		neueSzene.aktivBildIndex = neueSzene.bilder.length - 1;
		neueSzene.bildFehler = false;
	} else {
		neueSzene.bildFehler = true;
	}

	return neueSzene;
}

/**
 * Regenerate only the rhyme for a scene (keeps existing images)
 */
export async function regeneriereNurReim(
	bildband: GespeicherterBildband,
	szenenNummer: number,
	anmerkung?: string
): Promise<BildbandSzene> {
	const szeneIndex = szenenNummer - 1;
	const alteSzene = bildband.szenen[szeneIndex];

	if (!alteSzene) {
		throw new Error(`Szene ${szenenNummer} nicht gefunden.`);
	}

	const definition = SZENEN_STRUKTUR[szeneIndex];
	const istNachOrtswechsel = szenenNummer >= 6;

	const kontext: SzenenKontext = {
		charaktere: bildband.charaktere,
		aktuelleRegion: istNachOrtswechsel
			? bildband.zweiterOrt?.region || bildband.startRegion
			: bildband.startRegion,
		aktuellerOrt: istNachOrtswechsel
			? bildband.zweiterOrt?.ort || bildband.startOrt
			: bildband.startOrt,
		zweiterOrt: bildband.zweiterOrt,
		bisherigeSzenen: bildband.szenen.slice(0, szeneIndex),
		szenenDefinition: definition,
		userAnmerkung: anmerkung
	};

	// Regenerate only the rhyme
	const neuerReim = await generiereReim(kontext, bildband.storyPlan, bildband.bekannte);

	// Return updated scene with new rhyme but same images
	return {
		...alteSzene,
		reim: neuerReim,
		userKommentar: anmerkung
	};
}
