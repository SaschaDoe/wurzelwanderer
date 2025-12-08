/**
 * Service for generating picture books (Bildbände) with Gemini.
 * Orchestrates the creation of 10-scene illustrated stories in rhymes.
 */

import { getApiKey } from './geminiService';
import { hasOpenAIKey, generateText as generateOpenAIText, generateImagePrompt as generateSmartImagePrompt } from './openaiService';
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
 * Unified text generation: Uses OpenAI GPT-5.1 if available, falls back to Gemini
 */
async function generateText(
	prompt: string,
	options?: { systemPrompt?: string; temperature?: number }
): Promise<{ success: boolean; text?: string; error?: string }> {
	// Try OpenAI first if available
	if (hasOpenAIKey()) {
		console.log('[Bildband] Verwende GPT-5.1 für Textgenerierung...');
		const result = await generateOpenAIText(prompt, {
			systemPrompt: options?.systemPrompt,
			temperature: options?.temperature ?? 0.9,
			maxTokens: 4096
		});
		if (result.success) {
			return result;
		}
		console.warn('[Bildband] GPT-5.1 fehlgeschlagen, versuche Gemini:', result.error);
	}

	// Fallback to Gemini
	console.log('[Bildband] Verwende Gemini für Textgenerierung...');
	const apiKey = await getApiKey();
	if (!apiKey) {
		return { success: false, error: 'Kein API Key vorhanden' };
	}

	// Combine system prompt with user prompt for Gemini (doesn't have system role)
	const fullPrompt = options?.systemPrompt
		? `${options.systemPrompt}\n\n---\n\n${prompt}`
		: prompt;

	return callTextApi(fullPrompt, apiKey);
}

/**
 * Review a rhyme for quality - checks if it actually rhymes and makes sense
 * Returns: { approved: boolean, feedback?: string }
 */
async function reviewReim(
	reim: string,
	szenenDefinition: SzenenDefinition,
	charaktere: string[],
	bisherigeSzenen: string
): Promise<{ approved: boolean; feedback?: string }> {
	const systemPrompt = `Du bist ein strenger Literaturkritiker für deutsche Kinderreime im Stil von James Krüss und Wilhelm Busch.

VORBILDER - SO KLINGEN GUTE DEUTSCHE KINDERREIME:

James Krüss:
"Wenn die Möpse Schnäpse trinken,
wenn die Krebse Lefzen schminken,
wenn die Hummer immer schlummer,
dann ist Sommer, dann ist Sommer."

Wilhelm Busch (Max und Moritz):
"Ach, was muss man oft von bösen
Kindern hören oder lesen!
Wie zum Beispiel hier von diesen,
welche Max und Moritz hießen."

Christian Morgenstern:
"Ein Wiesel saß auf einem Kiesel
inmitten Bachgeriesel."

MERKMALE GUTER REIME:
- Natürlicher Sprachfluss, keine Verrenkungen
- Klares Metrum (ta-DA-ta-DA oder DA-ta-DA-ta)
- Echte, saubere Reime
- Kurze, prägnante Sätze
- Märchenhafter, poetischer Ton

PRÜFKRITERIEN - SEI STRENG BEI DIESEN PUNKTEN:

1. KEINE FÜLLWÖRTER als Reimlösung:
   - VERBOTEN: "sowieso", "irgendwie", "halt", "eben", "nun mal", "ganz genau"
   - Diese zeigen, dass der Autor keine echte Reimlösung gefunden hat
   - Wenn ein Vers auf so einem Füllwort endet = REJECTED

2. GRAMMATIK muss stimmen:
   - "Dein Kunst" statt "Deine Kunst" = REJECTED
   - Fehlende Wörter ("Gutes tun" statt "Gutes tun kann") = REJECTED
   - Apostrophe um Reime zu erzwingen ("beschloss'n") = REJECTED

3. KEINE ERFUNDENEN WÖRTER:
   - "bangst", "frohst", "traurist", "Überdratt", "beschloss'n" etc. existieren NICHT = REJECTED
   - Wörter die auf -st enden um Verben zu "konjugieren" sind meist FALSCH
   - Wenn ein Wort seltsam oder erfunden klingt = REJECTED
   - Im Zweifel: Wenn du das Wort noch nie gehört hast, ist es wahrscheinlich erfunden

4. METRUM - gleichmäßiger Rhythmus:
   - Alle Zeilen sollten ähnliche Länge/Betonung haben
   - Holprige Zeilen, die den Lesefluss stören = REJECTED

5. MÄRCHENHAFTER TON:
   - Umgangssprache vermeiden
   - Poetisch und kindgerecht

WENIGER WICHTIG:
- Reimschema: Solange es sich einigermaßen reimt, ist es OK
- Unreine Reime sind akzeptabel

Du antwortest NUR mit:
- "APPROVED" wenn der Reim wirklich gut ist (wie die Vorbilder!)
- "REJECTED: [konkrete Kritik]" wenn etwas nicht stimmt

Sei STRENG! Lieber einmal zu viel ablehnen als schlechte Reime durchlassen.`;

	const prompt = `SZENE: ${szenenDefinition.nummer}. ${szenenDefinition.titel}
SZENEN-TYP: ${szenenDefinition.beschreibung}
CHARAKTERE: ${charaktere.join(', ')}
BISHERIGE HANDLUNG: ${bisherigeSzenen}

ZU PRÜFENDER REIM:
${reim}

Prüfe diesen Reim nach den Kriterien. Antworte mit APPROVED oder REJECTED: [Grund]`;

	const result = await generateText(prompt, { systemPrompt, temperature: 0.3 });

	if (!result.success || !result.text) {
		// If review fails, approve by default to not block generation
		console.warn('[Bildband] Reim-Review fehlgeschlagen, akzeptiere Reim');
		return { approved: true };
	}

	const response = result.text.trim().toUpperCase();
	if (response.startsWith('APPROVED')) {
		return { approved: true };
	}

	// Extract feedback from rejection
	const feedback = result.text.replace(/^REJECTED:\s*/i, '').trim();
	return { approved: false, feedback };
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
function beschreibeCharaktere(charaktere: GenerierterBekannter[], mitDetails: boolean = false): string {
	return charaktere
		.map((c) => {
			const berufe = c.berufe.join(' und ');
			const held = c.istHeld ? '[HELD] ' : '';
			let beschreibung = `${held}${c.name} (${c.geschlecht === 'weiblich' ? 'weibliche' : 'männlicher'} ${c.tier}, ${berufe}, ${c.merkmal.name})`;

			// Add detailed traits for heroes
			if (mitDetails && c.istHeld) {
				const details: string[] = [];
				if (c.charakterKlasse) {
					details.push(`Klasse: ${c.charakterKlasse.name} - ${c.charakterKlasse.besonders}`);
				}
				if (c.merkmal.aktionen && c.merkmal.aktionen.length > 0) {
					details.push(`Fähigkeiten: ${c.merkmal.aktionen.join(', ')}`);
				}
				if (c.merkmal.beschreibung) {
					details.push(`Eigenart: ${c.merkmal.beschreibung}`);
				}
				if (details.length > 0) {
					beschreibung += `\n   → ${details.join('\n   → ')}`;
				}
			}
			return beschreibung;
		})
		.join('\n');
}

/**
 * Get heroes from character list
 */
function getHelden(charaktere: GenerierterBekannter[]): GenerierterBekannter[] {
	return charaktere.filter(c => c.istHeld === true);
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
		let name = `Bekannter ${i + 1}`;

		const namePrompt = `Gib mir EINEN kurzen, fantasievollen deutschen Namen für einen ${geschlecht === 'weiblich' ? 'weiblichen' : 'männlichen'} ${tier} in einem deutschen Kinderbuch-Märchen. Der Name sollte zum Tier passen und märchenhaft klingen. Antworte NUR mit dem Namen, keine Erklärungen.`;
		const result = await generateText(namePrompt, { temperature: 0.9 });
		if (result.success && result.text) {
			name = result.text.trim().split('\n')[0].replace(/['"]/g, '');
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
 * Pre-plan the entire story before generating individual scenes.
 * Uses a multi-round approach for better story coherence:
 * 1. Brainstorm character relationships
 * 2. Develop story concept
 * 3. Create final scene plan
 */
export async function planeGeschichte(
	charaktere: GenerierterBekannter[],
	bekannte: GenerierterBekannter[],
	startRegion: GespeicherteRegion,
	startOrt: Naturell,
	zweiterOrt: { region: GespeicherteRegion; ort: Naturell }
): Promise<StoryPlan> {

	// Use detailed description for heroes
	const charakterBeschreibung = beschreibeCharaktere(charaktere, true);
	const bekannteBeschreibung = beschreibeCharaktere(bekannte);
	const startBeschreibung = `${startOrt.name} in ${beschreibeRegion(startRegion)}`;
	const zielBeschreibung = `${zweiterOrt.ort.name} in ${beschreibeRegion(zweiterOrt.region)}`;

	const systemPrompt = `Du bist ein erfahrener Kinderbuch-Autor für deutsche Märchen-Fabeln im Stil von Beatrix Potter und Fritz Baumgarten.`;

	// ========== RUNDE 1: CHARAKTERBEZIEHUNGEN BRAINSTORMEN ==========
	console.log('[Bildband] Runde 1: Brainstorme Charakterbeziehungen...');

	const brainstormPrompt = `Du planst eine Kindergeschichte. Bevor du die Geschichte schreibst, musst du dir überlegen wie die Charaktere ZUEINANDER PASSEN.

HAUPTCHARAKTERE (vom Spieler gewählt):
${charakterBeschreibung}

NEBENCHARAKTERE (Bekannte, die dazukommen):
${bekannteBeschreibung}

DEINE AUFGABE: Überlege dir LOGISCHE BEZIEHUNGEN zwischen den Charakteren!

Beispiele für gute Beziehungen:
- Familie: "Silberfell ist Ellers Enkelin, die er großgezogen hat"
- Freundschaft: "Funkelblüte ist Ellers alte Studienfreundin aus Jugendtagen"
- Mentor/Schüler: "Der alte Eller unterrichtet die junge Funkelblüte in der Heilkunst"
- Nachbarn: "Sie wohnen alle im selben Baumhaus-Viertel"
- Reisegefährten: "Sie treffen sich zufällig auf dem Marktplatz und beschließen gemeinsam zu reisen"
- Beruflich: "Funkelblüte ist die Assistentin von Professor Eller"

WICHTIG:
- Die Beziehungen müssen zu den Charakteren PASSEN (Alter, Beruf, Persönlichkeit)
- Ein weiser alter Hirsch mit einer jungen Füchsin? Vielleicht Großvater/Enkelin oder Lehrer/Schülerin
- Die Gruppe muss einen GRUND haben, zusammen zu sein!

Antworte mit 2-3 verschiedenen Ideen für Beziehungen:

IDEE 1: [Beschreibe wie die Charaktere zueinander stehen könnten]
IDEE 2: [Alternative Beziehungskonstellation]
IDEE 3: [Noch eine Möglichkeit]

BESTE IDEE: [Welche Idee funktioniert am besten und warum?]`;

	const brainstormResult = await generateText(brainstormPrompt, { systemPrompt, temperature: 0.9 });
	const beziehungen = brainstormResult.success ? brainstormResult.text : '';
	console.log(`[Bildband] Beziehungs-Brainstorm:\n${beziehungen?.substring(0, 500)}...`);

	// ========== RUNDE 2: STORY-KONZEPT ENTWICKELN ==========
	console.log('[Bildband] Runde 2: Entwickle Story-Konzept...');

	const konzeptPrompt = `Basierend auf den Charakterbeziehungen, entwickle jetzt ein STORY-KONZEPT.

CHARAKTERE UND IHRE BEZIEHUNGEN:
${beziehungen}

ORTE:
- START: ${startBeschreibung}
- ZIEL: ${zielBeschreibung}

DEINE AUFGABE: Entwickle eine einfache, klare Kindergeschichte!

Eine gute Kindergeschichte hat:
- Einen EINFACHEN, KLAREN Konflikt (nicht zu kompliziert!)
- Einen GRUND warum die Gruppe reist
- EMOTIONALE Momente (Angst, Freude, Zusammenhalt)
- Eine MORAL die Kinder verstehen

SCHLECHTE Ideen (vermeide!):
- Zu komplizierte Plots (Magnetberge die Fische stören...)
- Abstrakte Konflikte die Kinder nicht verstehen
- Zu viele Nebenhandlungen

GUTE Ideen:
- "Opa Eller nimmt seine Enkel mit auf eine Reise um ihnen etwas Wichtiges zu zeigen"
- "Die Freunde suchen ein verlorenes Familienerbstück"
- "Ein Freund ist krank und sie suchen ein Heilkraut"
- "Sie wollen zu einem Fest/einer Feier im anderen Tal"

Antworte:

BEZIEHUNG: [Wie stehen die Charaktere zueinander? 1 Satz]
GRUND DER REISE: [Warum reisen sie? 1 Satz]
KONFLIKT: [Was ist das Problem? 1 Satz - EINFACH!]
LÖSUNG: [Wie wird es gelöst? 1 Satz]
MORAL: [Was lernen die Kinder? 1 Satz]`;

	const konzeptResult = await generateText(konzeptPrompt, { systemPrompt, temperature: 0.8 });
	const konzept = konzeptResult.success ? konzeptResult.text : '';
	console.log(`[Bildband] Story-Konzept:\n${konzept}`);

	// ========== RUNDE 3: FINALER SZENEN-PLAN ==========
	console.log('[Bildband] Runde 3: Erstelle finalen Szenen-Plan...');

	const finalPrompt = `Jetzt schreibe den FINALEN SZENEN-PLAN basierend auf dem Konzept.

STORY-KONZEPT:
${konzept}

CHARAKTERE:
- Hauptcharaktere: ${charaktere.map(c => c.name).join(', ')}
- Nebencharaktere: ${bekannte.map(b => b.name).join(', ')}

ORTE:
- START: ${startBeschreibung}
- ZIEL (ab Szene 6): ${zielBeschreibung}

DIE 10 SZENEN:
1. Der Ort - NUR Landschaft, KEINE Charaktere
2. Die Gefährten - Hauptcharaktere werden vorgestellt, ihre Beziehung erklärt
3. Das Problem - Der Grund für die Reise wird klar
4. Das Ziel - Sie beschließen loszugehen
5. Der Weg - Unterwegs passiert etwas
6. Die Reise - Sie kommen am neuen Ort an
7. Neues Land - Was sie dort entdecken
8. Die Wendung - Ein kleines Hindernis
9. Der Triumph - Sie lösen das Problem
10. Das Ende - Glücklicher Abschluss

REGELN FÜR CHARAKTERE:
- Szene 1: KEINE Charaktere (nur Landschaft)
- Szene 2: Nur HAUPTCHARAKTERE (${charaktere.map(c => c.name).join(', ')})
- Nebencharaktere (${bekannte.map(b => b.name).join(', ')}) erscheinen SPÄTER, wenn es zur Geschichte passt
- Wenn Nebencharaktere erscheinen, müssen sie VORGESTELLT werden (wer sind sie, warum sind sie da?)

Antworte im Format:

ZUSAMMENFASSUNG: [2-3 Sätze über die ganze Geschichte]

HAUPTKONFLIKT: [Der einfache, klare Konflikt]

MORAL: [Die Lehre für Kinder]

SZENE 1: [Nur Landschaftsbeschreibung] | CHARAKTERE: keine
SZENE 2: [Was passiert, Beziehung wird erklärt] | CHARAKTERE: ${charaktere.map(c => c.name).join(', ')}
SZENE 3: [Beschreibung] | CHARAKTERE: [Namen]
SZENE 4: [Beschreibung] | CHARAKTERE: [Namen]
SZENE 5: [Beschreibung] | CHARAKTERE: [Namen]
SZENE 6: [Beschreibung] | CHARAKTERE: [Namen]
SZENE 7: [Beschreibung] | CHARAKTERE: [Namen]
SZENE 8: [Beschreibung] | CHARAKTERE: [Namen]
SZENE 9: [Beschreibung] | CHARAKTERE: [Namen]
SZENE 10: [Beschreibung] | CHARAKTERE: [Namen]`;

	const result = await generateText(finalPrompt, { systemPrompt, temperature: 0.7 });

	if (!result.success || !result.text) {
		throw new Error(result.error || 'Story-Planung fehlgeschlagen');
	}

	const text = result.text;

	// Parse the response
	const zusammenfassungMatch = text.match(/ZUSAMMENFASSUNG:\s*(.+?)(?=\n\n|HAUPTKONFLIKT)/is);
	const konfliktMatch = text.match(/HAUPTKONFLIKT:\s*(.+?)(?=\n\n|MORAL)/is);
	const moralMatch = text.match(/MORAL:\s*(.+?)(?=\n\n|SZENE 1)/is);

	const szenenPlaene: string[] = [];
	const charakterEinfuehrungen: string[][] = [];

	// Get all character names for matching
	const alleNamen = [...charaktere.map(c => c.name), ...bekannte.map(b => b.name)];

	for (let i = 1; i <= 10; i++) {
		const szeneMatch = text.match(new RegExp(`SZENE ${i}:\\s*(.+?)(?=\\n|SZENE ${i + 1}|$)`, 'is'));
		const szeneText = szeneMatch?.[1]?.trim() || `Szene ${i}`;

		// Parse: "Beschreibung | CHARAKTERE: Name1, Name2" or "Beschreibung | CHARAKTERE: keine"
		const parts = szeneText.split('|');
		const beschreibung = parts[0]?.trim() || szeneText;
		szenenPlaene.push(beschreibung);

		// Extract character names from CHARAKTERE section
		const charakterePart = parts[1]?.trim() || '';
		const charaktereMatch = charakterePart.match(/CHARAKTERE:\s*(.+)/i);
		const charaktereText = charaktereMatch?.[1]?.trim().toLowerCase() || '';

		if (charaktereText === 'keine' || charaktereText === '' || charaktereText === 'keine charaktere') {
			charakterEinfuehrungen.push([]);
		} else {
			// Find which character names are mentioned
			const gefundeneCharaktere = alleNamen.filter(name =>
				charaktereText.toLowerCase().includes(name.toLowerCase())
			);
			charakterEinfuehrungen.push(gefundeneCharaktere);
		}
	}

	return {
		zusammenfassung: zusammenfassungMatch?.[1]?.trim() || 'Eine märchenhafte Geschichte.',
		hauptkonflikt: konfliktMatch?.[1]?.trim() || 'Die Helden müssen ein Abenteuer bestehen.',
		moral: moralMatch?.[1]?.trim(),
		szenenPlaene,
		charakterEinfuehrungen
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
	// Use detailed description that includes hero markers
	const charakterBeschreibung = beschreibeCharaktere(kontext.charaktere, true);
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

	// Hero focus hint
	const helden = getHelden(kontext.charaktere);
	const heldenHinweis = helden.length > 0
		? `\n\nHELDEN-FOKUS: ${helden.map(h => h.name).join(' und ')} ${helden.length === 1 ? 'ist der HELD' : 'sind die HELDEN'} dieser Geschichte!
- ${helden.length === 1 ? 'Gib diesem Charakter' : 'Gib diesen Charakteren'} mehr Zeilen und Aufmerksamkeit
- Zeige ihre besonderen Eigenschaften: ${helden.map(h => `${h.name} (${h.merkmal.name})`).join(', ')}
- Lass sie wichtige Entscheidungen treffen oder mutig handeln`
		: '';

	const systemPrompt = `Du bist ein Meister deutscher Kinderlyrik im Stil von James Krüss und Wilhelm Busch.

DEINE VORBILDER:

James Krüss - natürlich fließend, spielerisch:
"Wenn die Möpse Schnäpse trinken,
wenn die Krebse Lefzen schminken,
wenn die Hummer immer schlummer,
dann ist Sommer, dann ist Sommer."

Wilhelm Busch - perfektes Metrum, prägnant:
"Ach, was muss man oft von bösen
Kindern hören oder lesen!
Wie zum Beispiel hier von diesen,
welche Max und Moritz hießen."

DEIN STIL:
- Natürlicher Sprachfluss ohne Verrenkungen
- Klares Metrum: ta-DA-ta-DA-ta-DA oder DA-ta-DA-ta-DA
- Saubere, echte Reime
- Kurze, prägnante Sätze
- Märchenhaft und poetisch`;

	const MAX_REVIEW_ATTEMPTS = 2;

	// Determine which characters should appear in this scene based on story plan
	const szenenIndex = kontext.szenenDefinition.nummer - 1;
	const erlaubteCharaktereNamen = storyPlan?.charakterEinfuehrungen?.[szenenIndex] || [];
	const istSzene1 = kontext.szenenDefinition.nummer === 1;

	// Filter characters to only those allowed in this scene
	const szenenCharaktere = erlaubteCharaktereNamen.length > 0
		? kontext.charaktere.filter(c => erlaubteCharaktereNamen.includes(c.name))
		: [];
	const szenenBekannte = erlaubteCharaktereNamen.length > 0 && bekannte
		? bekannte.filter(b => erlaubteCharaktereNamen.includes(b.name))
		: [];

	const charakterNamen = [...szenenCharaktere.map(c => c.name), ...szenenBekannte.map(b => b.name)];

	console.log(`[Bildband] Szene ${kontext.szenenDefinition.nummer} Reim - Erlaubte Charaktere: ${charakterNamen.length > 0 ? charakterNamen.join(', ') : 'KEINE'}`);

	// Generate rhyme with review loop
	for (let attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS + 1; attempt++) {
		const previousFeedback = attempt > 1
			? `\n\nWICHTIG - VORHERIGER VERSUCH WURDE ABGELEHNT!
Der Kritiker hat folgendes bemängelt: ${(kontext as any)._lastReviewFeedback}
Bitte korrigiere diese Fehler im neuen Versuch!`
			: '';

		// Special handling for Scene 1 (location only, no characters!)
		let prompt: string;

		if (istSzene1) {
			prompt = `Schreibe einen kurzen Reim (4 Zeilen) der NUR den ORT beschreibt:

SZENE 1: Der Ort
AUFGABE: Beschreibe NUR die Landschaft/den Ort - atmosphärisch und stimmungsvoll.

ORT: ${ortBeschreibung}
REGION: ${regionBeschreibung}

WICHTIG:
- KEINE Charaktere erwähnen!
- KEINE Namen nennen!
- KEINE Dialoge!
- NUR die Natur/Landschaft/Atmosphäre beschreiben
- Wie sieht es aus? Wie riecht es? Welche Stimmung?

Beispiel-Stil:
"Im Tal, wo Pilze riesig wachsen,
wo Moos bedeckt die alten Fachsen,
da liegt ein See so still und klar,
wie er seit hundert Jahren war."

STRENGE REGELN:
- Schreibe auf Deutsch, märchenhaft-poetisch
- GENAU 4 Zeilen (1 Strophe)
- Reimschema AABB: Zeile 1+2 reimen, Zeile 3+4 reimen
- VERBOTEN: Erfundene Wörter!
- NUR echte deutsche Wörter verwenden!
- Antworte NUR mit dem Reim, keine Erklärungen`;
		} else {
			// Build character section only for allowed characters
			const charakterSection = charakterNamen.length > 0
				? `\nCHARAKTERE IN DIESER SZENE:\n${szenenCharaktere.map(c => `- ${c.name} (${c.tier}, ${c.merkmal.name})`).join('\n')}${szenenBekannte.length > 0 ? '\n' + szenenBekannte.map(b => `- ${b.name} (${b.tier}, ${b.merkmal.name})`).join('\n') : ''}\n\nErwähne NUR diese Charaktere beim Namen!`
				: '\nKEINE Charaktere in dieser Szene - beschreibe nur was passiert/zu sehen ist.';

			prompt = `Schreibe einen Reim für folgende Szene:

SZENE ${kontext.szenenDefinition.nummer}: ${kontext.szenenDefinition.titel}
SZENEN-TYP: ${kontext.szenenDefinition.beschreibung}
HINWEIS: ${kontext.szenenDefinition.promptHinweis}
${szenenPlan ? `\nWAS IN DIESER SZENE PASSIERT: ${szenenPlan}` : ''}
${storyKontext}${charakterSection}${heldenHinweis}

ORT: ${ortBeschreibung}
REGION: ${regionBeschreibung}

BISHERIGE SZENEN:
${bisherig}${anmerkung}${previousFeedback}

STRENGE REGELN:
- Schreibe auf Deutsch, märchenhaft-poetisch
- 4 BIS 8 Zeilen - du entscheidest was besser passt (1-2 Strophen)
- Reimschema AABB: Paarreime (Zeile 1+2 reimen, Zeile 3+4 reimen)
- VERBOTEN als Reimwörter: "sowieso", "irgendwie", "halt", "eben", "ganz genau"
- VERBOTEN: Apostrophe um Reime zu erzwingen ("beschloss'n", "war'n")
- VERBOTEN: Erfundene Wörter! ("bangst", "frohst", "Überdratt" etc. existieren NICHT)
- NUR echte deutsche Wörter verwenden!
- Grammatik muss stimmen! ("Deine Kunst" nicht "Dein Kunst")
- Gleichmäßiges Metrum in allen Zeilen
- Gerne DIREKTE REDE einbauen wenn Charaktere da sind
- Antworte NUR mit dem Reim, keine Erklärungen`;
		}

		console.log(`[Bildband] Generiere Reim für Szene ${kontext.szenenDefinition.nummer} (Versuch ${attempt})...`);

		const result = await generateText(prompt, { systemPrompt });

		if (!result.success || !result.text) {
			throw new Error(result.error || 'Reim-Generierung fehlgeschlagen');
		}

		const reim = result.text.trim();

		// Skip review on last attempt - accept whatever we got
		if (attempt > MAX_REVIEW_ATTEMPTS) {
			console.log(`[Bildband] Max Versuche erreicht, akzeptiere Reim für Szene ${kontext.szenenDefinition.nummer}`);
			return reim;
		}

		// Review the rhyme
		console.log(`[Bildband] Prüfe Reim für Szene ${kontext.szenenDefinition.nummer}...`);
		const review = await reviewReim(reim, kontext.szenenDefinition, charakterNamen, bisherig);

		if (review.approved) {
			console.log(`[Bildband] Reim für Szene ${kontext.szenenDefinition.nummer} APPROVED`);
			return reim;
		}

		console.log(`[Bildband] Reim für Szene ${kontext.szenenDefinition.nummer} REJECTED: ${review.feedback}`);
		(kontext as any)._lastReviewFeedback = review.feedback;
	}

	// This shouldn't be reached, but just in case
	throw new Error('Reim-Generierung fehlgeschlagen nach allen Versuchen');
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

	// Determine which characters should appear in this scene
	const szenenIndex = szene.nummer - 1;
	const erlaubteCharaktere = kontext.storyPlan?.charakterEinfuehrungen?.[szenenIndex] || [];

	// Filter characters to only those that should appear in this scene
	const sichtbareCharaktere = erlaubteCharaktere.length > 0
		? kontext.charaktere.filter(c => erlaubteCharaktere.includes(c.name))
		: []; // If no characters specified, show none (e.g., Scene 1 = just location)

	const sichtbareBekannte = erlaubteCharaktere.length > 0
		? (kontext.bekannte || []).filter(b => erlaubteCharaktere.includes(b.name))
		: [];

	console.log(`[Bildband] Szene ${szene.nummer}: Charaktere im Bild: ${erlaubteCharaktere.length > 0 ? erlaubteCharaktere.join(', ') : 'keine'}`);

	// Collect character portraits for reference (only for visible characters)
	const referenceImages: string[] = [];

	// Add main character portraits (only visible ones)
	for (const c of sichtbareCharaktere) {
		if (c.bild) {
			referenceImages.push(c.bild);
		}
	}

	// Add bekannte portraits if available (only visible ones)
	for (const b of sichtbareBekannte) {
		if (b.bild) {
			referenceImages.push(b.bild);
		}
	}

	// Try to use GPT-5.1 for smart prompt generation
	let prompt: string;

	if (hasOpenAIKey()) {
		console.log(`[Bildband] Verwende GPT-5.1 für intelligenten Bild-Prompt...`);

		// Build context for GPT-5.1 - only include visible characters!
		const smartPromptResult = await generateSmartImagePrompt({
			szenenNummer: szene.nummer,
			szenenTitel: szene.titel,
			szenenTyp: szene.typ,
			reim: szene.reim,
			storyPlan: kontext.storyPlan ? {
				zusammenfassung: kontext.storyPlan.zusammenfassung,
				szenenUebersicht: kontext.storyPlan.szenenPlaene.map((plan, i) => ({
					nummer: i + 1,
					kurzinhalt: plan
				}))
			} : undefined,
			charaktere: sichtbareCharaktere.map((c) => ({
				name: c.name,
				tier: c.tier,
				geschlecht: c.geschlecht,
				berufe: c.berufe,
				merkmalName: c.merkmal.name,
				hatPortrait: !!c.bild
			})),
			bekannte: sichtbareBekannte.map(b => ({
				name: b.name,
				tier: b.tier,
				geschlecht: b.geschlecht,
				berufe: b.berufe,
				merkmalName: b.merkmal.name
			})),
			aktuelleRegion: {
				name: kontext.aktuelleRegion.name,
				geographisch: kontext.aktuelleRegion.geographisch.map(g => g.promptText),
				faunaFlora: kontext.aktuelleRegion.faunaFlora.map(f => f.promptText),
				architektur: kontext.aktuelleRegion.architektur?.promptText
			},
			aktuellerOrt: {
				name: kontext.aktuellerOrt.name,
				beschreibung: kontext.aktuellerOrt.beschreibung
			},
			bisherigeSzenen: kontext.bisherigeSzenen.map(s => ({
				nummer: s.nummer,
				titel: s.titel,
				kurzinhalt: s.reim.split('\n')[0] + '...'
			}))
		});

		if (smartPromptResult.success && smartPromptResult.prompt) {
			// Add reference image instruction and style guidance
			const referenceInstruction = referenceImages.length > 0
				? `\n\nIMPORTANT: Reference images are provided showing how main characters should look. Use these to maintain character consistency.`
				: '';

			prompt = `${smartPromptResult.prompt}

Style: Fritz Baumgarten German children's book illustration, watercolor, fairy-tale, warm colors.
Horizontal landscape format.${referenceInstruction}

CRITICAL: ABSOLUTELY NO TEXT IN THE IMAGE!
- No speech bubbles
- No written words
- No labels
- No letters
- No signs with writing
- Pure illustration only!`;

			console.log(`[Bildband] GPT-5.1 Prompt generiert (${prompt.length} Zeichen)`);
		} else {
			console.warn(`[Bildband] GPT-5.1 Prompt-Generierung fehlgeschlagen, nutze Fallback: ${smartPromptResult.error}`);
			prompt = buildFallbackPrompt(szene, kontext, referenceImages.length, sichtbareCharaktere, sichtbareBekannte);
		}
	} else {
		// Fallback: Use simple prompt without GPT-5.1
		prompt = buildFallbackPrompt(szene, kontext, referenceImages.length, sichtbareCharaktere, sichtbareBekannte);
	}

	console.log(`[Bildband] Generiere Bild für Szene ${szene.nummer} mit ${referenceImages.length} Referenzbildern...`);

	const result = await callImageApi(prompt, apiKey, referenceImages.length > 0 ? referenceImages : undefined);

	if (!result.success || !result.imageData) {
		console.error(`[Bildband] Bild-Generierung fehlgeschlagen: ${result.error}`);
		return { fehler: true };
	}

	return { bild: result.imageData };
}

/**
 * Build a simple fallback prompt when GPT-5.1 is not available
 */
function buildFallbackPrompt(
	szene: BildbandSzene,
	kontext: SzenenKontext,
	refCount: number,
	sichtbareCharaktere: GenerierterBekannter[],
	sichtbareBekannte: GenerierterBekannter[]
): string {
	// Build character descriptions - only for visible characters!
	const allCharacters = [...sichtbareCharaktere, ...sichtbareBekannte];

	// Handle scene with no characters (e.g., Scene 1 = just location)
	const charakterBeschreibungen = allCharacters.length > 0
		? allCharacters
			.map((c, index) => {
				const berufe = c.berufe.join(' and ');
				const hasPortrait = c.bild ? ` (reference image ${index + 1})` : '';
				return `${c.name}: ${c.geschlecht === 'weiblich' ? 'female' : 'male'} ${c.tier}, ${berufe}, ${c.merkmal.name}${hasPortrait}`;
			})
			.join('; ')
		: 'NO CHARACTERS - show only the location/landscape!';

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

	const referenceInstruction = refCount > 0
		? `\n\nIMPORTANT: Reference images show character appearances. Match them in the illustration.`
		: '';

	// Build character section - only if there are characters to show
	const characterSection = allCharacters.length > 0
		? `\nCHARACTERS (anthropomorphic animals in clothing):\n${charakterBeschreibungen}`
		: `\nIMPORTANT: This is a LANDSCAPE-ONLY scene. Do NOT include any characters, people, or animals. Show ONLY the environment and location.`;

	return `Create a colorful hand-drawn illustration in Fritz Baumgarten style (German children's book, fairy-tale, watercolor).

SCENE: "${szene.reim}"

LOCATION: ${kontext.aktuellerOrt.name} - ${kontext.aktuellerOrt.beschreibung}
REGION: ${regionFeatures.join(', ')}
${characterSection}

Scene type: ${szene.titel} - ${szene.typ}
Horizontal landscape, warm inviting colors.${referenceInstruction}

CRITICAL: ABSOLUTELY NO TEXT IN THE IMAGE!
- No speech bubbles
- No written words
- No labels or letters
- No signs with writing
- Pure illustration only!`;
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
	const alleReime = szenen.map((s) => `${s.titel}: ${s.reim}`).join('\n\n');
	const charakterNamen = charaktere.map((c) => c.name).join(', ');

	const prompt = `Basierend auf dieser Geschichte mit den Charakteren ${charakterNamen}:

${alleReime}

Generiere:
1. Einen poetischen deutschen Titel (3-6 Wörter)
2. Eine kurze Beschreibung (1-2 Sätze)

Antworte im Format:
TITEL: [Titel hier]
BESCHREIBUNG: [Beschreibung hier]`;

	const systemPrompt = `Du bist ein Kinderbuch-Autor für deutsche Märchen.`;
	const result = await generateText(prompt, { systemPrompt, temperature: 0.7 });

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

		// Detailed logging of story plan
		console.log(`[Bildband] ========== STORY-PLAN ==========`);
		console.log(`[Bildband] Zusammenfassung: ${storyPlan.zusammenfassung}`);
		console.log(`[Bildband] Hauptkonflikt: ${storyPlan.hauptkonflikt}`);
		console.log(`[Bildband] Moral: ${storyPlan.moral || 'keine'}`);
		console.log(`[Bildband] --- SZENEN & CHARAKTERE ---`);
		storyPlan.szenenPlaene.forEach((plan, i) => {
			const chars = storyPlan!.charakterEinfuehrungen[i] || [];
			console.log(`[Bildband] Szene ${i + 1}: ${plan.substring(0, 60)}...`);
			console.log(`[Bildband]   -> Charaktere: ${chars.length > 0 ? chars.join(', ') : 'KEINE'}`);
		});
		console.log(`[Bildband] ================================`);
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

		// Add scene to bildband IMMEDIATELY so UI can show it during generation
		// IMPORTANT: Create NEW bildband object for Svelte reactivity!
		const szenenIndex = bildband.szenen.length;
		bildband = {
			...bildband,
			szenen: [...bildband.szenen, szene],
			letzteAktualisierung: new Date().toISOString()
		};
		await saveCallback?.(bildband);

		const kontext: SzenenKontext = {
			charaktere,
			bekannte,
			aktuelleRegion,
			aktuellerOrt,
			zweiterOrt: effektiverZweiterOrt,
			bisherigeSzenen: bildband.szenen.slice(0, szenenIndex), // Previous scenes only
			szenenDefinition: definition,
			storyPlan
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
			// Update scene in bildband array - create NEW object for Svelte reactivity
			bildband = {
				...bildband,
				szenen: bildband.szenen.map((s, i) => i === szenenIndex ? { ...szene } : s),
				letzteAktualisierung: new Date().toISOString()
			};
			await saveCallback?.(bildband);
		} catch (error) {
			console.error(`[Bildband] Fehler bei Reim ${definition.nummer}:`, error);
			szene.reim = `Szene ${definition.nummer}: ${definition.titel}\n(Reim konnte nicht generiert werden)`;
			bildband = {
				...bildband,
				szenen: bildband.szenen.map((s, i) => i === szenenIndex ? { ...szene } : s)
			};
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

		// Update scene in bildband array with final state - create NEW object for Svelte reactivity
		bildband = {
			...bildband,
			szenen: bildband.szenen.map((s, i) => i === szenenIndex ? { ...szene } : s),
			letzteAktualisierung: new Date().toISOString(),
			coverBild: definition.nummer === 1 && szene.bilder[0] ? szene.bilder[0] : bildband.coverBild
		};

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

		// Add scene to bildband IMMEDIATELY so UI can show it during generation
		// IMPORTANT: Create NEW bildband object for Svelte reactivity!
		const szenenIndex = bildband.szenen.length;
		bildband = {
			...bildband,
			szenen: [...bildband.szenen, szene],
			letzteAktualisierung: new Date().toISOString()
		};
		await onSave?.(bildband);

		const kontext: SzenenKontext = {
			charaktere,
			bekannte: bildband.bekannte,
			aktuelleRegion,
			aktuellerOrt,
			zweiterOrt: effektiverZweiterOrt,
			bisherigeSzenen: bildband.szenen.slice(0, szenenIndex), // Previous scenes only
			szenenDefinition: definition,
			storyPlan: effectiveStoryPlan
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
			// Update scene in bildband array - create NEW object for Svelte reactivity
			bildband = {
				...bildband,
				szenen: bildband.szenen.map((s, i) => i === szenenIndex ? { ...szene } : s),
				letzteAktualisierung: new Date().toISOString()
			};
			await onSave?.(bildband);
		} catch (error) {
			console.error(`[Bildband] Resume: Fehler bei Reim ${definition.nummer}:`, error);
			szene.reim = `Szene ${definition.nummer}: ${definition.titel}\n(Reim konnte nicht generiert werden)`;
			bildband = {
				...bildband,
				szenen: bildband.szenen.map((s, i) => i === szenenIndex ? { ...szene } : s)
			};
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

		// Update scene in bildband array with final state - create NEW object for Svelte reactivity
		bildband = {
			...bildband,
			szenen: bildband.szenen.map((s, i) => i === szenenIndex ? { ...szene } : s),
			letzteAktualisierung: new Date().toISOString(),
			coverBild: !bildband.coverBild && definition.nummer === 1 && szene.bilder[0] ? szene.bilder[0] : bildband.coverBild
		};

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
		bekannte: bildband.bekannte,
		aktuelleRegion: istNachOrtswechsel
			? bildband.zweiterOrt?.region || bildband.startRegion
			: bildband.startRegion,
		aktuellerOrt: istNachOrtswechsel
			? bildband.zweiterOrt?.ort || bildband.startOrt
			: bildband.startOrt,
		zweiterOrt: bildband.zweiterOrt,
		bisherigeSzenen: bildband.szenen.slice(0, szeneIndex),
		szenenDefinition: definition,
		storyPlan: bildband.storyPlan,
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
		bekannte: bildband.bekannte,
		aktuelleRegion: istNachOrtswechsel
			? bildband.zweiterOrt?.region || bildband.startRegion
			: bildband.startRegion,
		aktuellerOrt: istNachOrtswechsel
			? bildband.zweiterOrt?.ort || bildband.startOrt
			: bildband.startOrt,
		zweiterOrt: bildband.zweiterOrt,
		bisherigeSzenen: bildband.szenen.slice(0, szeneIndex),
		szenenDefinition: definition,
		storyPlan: bildband.storyPlan,
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
