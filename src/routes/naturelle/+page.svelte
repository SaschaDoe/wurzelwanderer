<script lang="ts">
	import { onMount } from 'svelte';
	import { generateSceneDescription, generateImageFromPrompt, hasApiKey, initApiKey, generateOrtDetails, generateOrtGeschichte, generateOrtBeschreibung, generateSpielleiterAntwort, fasseSpielleiterChatZusammen, type RegionInfo, type SceneGenerationResult, type OrtDetailsResult, type OrtGeschichteEvent as GeminiOrtGeschichteEvent, type SpielleiterKontext, type SpielleiterChatNachricht, generateGottheitVorgeschichte, generateGottheitBild, generateGottheitFähigkeiten, generateGottheitOpferweg } from '$lib/services/geminiService';
	import BekannterCard from '$lib/components/BekannterCard.svelte';
	import GottheitCard from '$lib/components/GottheitCard.svelte';
	import ImageGalleryModal from '$lib/components/ImageGalleryModal.svelte';
	import RegionCard from '$lib/components/RegionCard.svelte';
	import RegionEditor from '$lib/components/RegionEditor.svelte';
	import { generiereBekanntenData, type GenerierterBekannter } from '$lib/data/merkmale';
	import { type Gottheit, type OrtKontext, erstelleGottheit, generiereGottheitData } from '$lib/data/gottheiten';
	import { STORAGE_KEYS, getStoredItem, setStoredItem, getStoredString, setStoredString } from '$lib/utils/storage';
	import { toElementId } from '$lib/utils/slugify';
	import { getRandomElement, getRandomElements } from '$lib/utils/random';
	import {
		kategorien,
		getStimmungText as getText,
		isMagisch,
		isTrauma,
		type StimmungItem
	} from '$lib/data/naturelle';
	import {
		type GespeicherteRegion,
		type Besonderheit,
		HEIMATGEFILDE,
		HEIMATGEFILDE_ID,
		generiereZufaelligeRegion
	} from '$lib/data/regionen';

	// Type definitions

	interface OrtGeschichteEvent {
		jahr?: string;
		event: string;
	}

	interface OrtDetails {
		geruechte: string[];
		aktivitaeten: string[];
		entdeckungen: string[];
	}

	interface SpielleiterNachricht {
		id: string;
		rolle: 'nutzer' | 'spielleiter';
		text: string;
		timestamp: string;
		vorgeschlageneFakten?: string[]; // Fakten die der Spielleiter in dieser Nachricht vorschlägt
		akzeptierteFakten?: string[]; // Welche davon wurden akzeptiert
	}

	interface GespeicherterOrt {
		id: string;
		regionId: string;
		name: string;
		bilder?: string[];
		hauptNaturell?: string;
		ortBeschreibung?: string; // Interpretation/Bedeutung des Ortes (editierbar)
		anmerkungen?: string; // Visuelle Details für das Bild
		beschreibungsAnmerkungen?: string; // Nutzer-Anmerkungen für die KI-Beschreibung
		szenenBeschreibung?: string; // Generierter Bild-Prompt (intern)
		bekannte: GenerierterBekannter[];
		gottheiten?: Gottheit[]; // Lokale Gottheiten für diesen Ort
		naturelle: Array<{
			name: string;
			bild: string;
			beschreibung: string;
			kannImmer: string[];
			stimmung: StimmungItem[];
			volkssagen: StimmungItem[];
			kategorie: string;
			farbe: string;
			ortsnamen?: string[];
			metaphorisch?: boolean;
		}>;
		erstelltAm: string;
		// Generierte Details
		details?: OrtDetails;
		geschichte?: OrtGeschichteEvent[];
		// Spielleiter-Chat
		spielleiterChat?: SpielleiterNachricht[];
		spielleiterFakten?: string; // Zusammengefasste Fakten aus früheren Konversationen
	}

	// Generator State
	let erlaubeMagisch = $state(true);
	let erlaubeTrauma = $state(true);
	let anzahlNaturelle = $state(3);
	let aktiveKategorien = $state<string[]>(['Gemütlich', 'Lebendig', 'Verbindend', 'Weitläufig', 'Einsam', 'Verlassen']);

	let generierterOrt = $state<GespeicherterOrt | null>(null);
	let gespeicherteOrte = $state<GespeicherterOrt[]>([]);
	let bearbeitungsModus = $state(false);

	// Region State
	let regionen = $state<GespeicherteRegion[]>([]);
	let aktiveRegionId = $state<string>(HEIMATGEFILDE_ID);
	let showRegionEditor = $state(false);
	let bearbeiteteRegion = $state<GespeicherteRegion | null>(null);

	// Derived: Aktive Region
	let aktiveRegion = $derived(regionen.find(r => r.id === aktiveRegionId) || HEIMATGEFILDE);

	// Derived: Orte der aktiven Region
	let orteInAktiverRegion = $derived(gespeicherteOrte.filter(o => o.regionId === aktiveRegionId));

	// Image generation state
	let isGeneratingImage = $state(false);
	let generationPhase = $state<'scene' | 'image' | null>(null);
	let sceneDescription = $state<string | null>(null);
	let imageError = $state<string | null>(null);
	let showImageModal = $state(false);
	let galerieIndex = $state(0);
	let anmerkungenExpanded = $state(true);
	let beschreibungsAnmerkungenExpanded = $state(false);

	// Bekannte state
	let anzahlBekannte = $state(2);

	// Gottheiten state
	let isGeneratingGottheitBild = $state<string | null>(null); // ID der Gottheit die gerade ein Bild generiert
	let isGeneratingGottheitVorgeschichte = $state<string | null>(null); // ID der Gottheit die gerade eine Vorgeschichte generiert
	let isGeneratingGottheitFähigkeiten = $state<string | null>(null); // ID der Gottheit die gerade Fähigkeiten generiert
	let isGeneratingGottheitOpferweg = $state<string | null>(null); // ID der Gottheit die gerade einen Opferweg generiert

	// Ort-Beschreibung (interpretation) state
	let isGeneratingBeschreibung = $state(false);
	let beschreibungError = $state<string | null>(null);
	let beschreibungExpanded = $state(false); // Collapsed by default, shows text directly

	// Ort details & history generation state
	let isGeneratingDetails = $state(false);
	let isGeneratingGeschichte = $state(false);
	let detailsError = $state<string | null>(null);
	let geschichteError = $state<string | null>(null);
	let geschichteExpanded = $state(false);

	// Spielleiter-Chat state
	let spielleiterChatExpanded = $state(false);
	let spielleiterInput = $state('');
	let isSpielleiterGenerating = $state(false);
	let spielleiterError = $state<string | null>(null);
	let isZusammenfassend = $state(false);
	let showFaktenModal = $state(false);

	// Debounce timer for anmerkungen
	let anmerkungenSyncTimer: ReturnType<typeof setTimeout> | null = null;

	// Load saved data on mount with migration
	onMount(async () => {
		// Initialize API key cache for hasApiKey() to work synchronously
		await initApiKey();

		// Load regions
		const savedRegionen = await getStoredItem<GespeicherteRegion[]>(STORAGE_KEYS.REGIONEN);
		let loadedRegionen: GespeicherteRegion[];
		if (savedRegionen && savedRegionen.length > 0) {
			// Ensure Heimatgefilde exists
			const hasHeimat = savedRegionen.some(r => r.id === HEIMATGEFILDE_ID);
			loadedRegionen = hasHeimat ? savedRegionen : [HEIMATGEFILDE, ...savedRegionen];
		} else {
			loadedRegionen = [HEIMATGEFILDE];
		}
		regionen = loadedRegionen;

		// Load active region
		const savedAktiveRegion = await getStoredString(STORAGE_KEYS.AKTIVE_REGION);
		if (savedAktiveRegion && loadedRegionen.some(r => r.id === savedAktiveRegion)) {
			aktiveRegionId = savedAktiveRegion;
		} else {
			aktiveRegionId = HEIMATGEFILDE_ID;
		}

		// Load orte
		const saved = await getStoredItem<GespeicherterOrt[]>(STORAGE_KEYS.ORTE);
		if (saved) {
			// Build lookup map for original naturelle data
			const naturellBildMap = new Map<string, string>();
			for (const kat of kategorien) {
				for (const nat of kat.naturelle) {
					naturellBildMap.set(nat.name, nat.bild);
				}
			}

			// Migration: assign regionId and restore missing bild properties
			let needsSave = false;
			const migratedOrte = saved.map(ort => {
				const migratedNaturelle = ort.naturelle.map(nat => {
					if (!nat.bild && naturellBildMap.has(nat.name)) {
						needsSave = true;
						return { ...nat, bild: naturellBildMap.get(nat.name)! };
					}
					return nat;
				});

				if (!ort.regionId) needsSave = true;

				return {
					...ort,
					regionId: ort.regionId || HEIMATGEFILDE_ID,
					naturelle: migratedNaturelle
				};
			});
			gespeicherteOrte = migratedOrte;

			// Save migrated data if needed
			if (needsSave) {
				console.log('[Migration] Restauriere fehlende Naturelle-Bilder...');
				await setStoredItem(STORAGE_KEYS.ORTE, migratedOrte);
			}
		}
	});

	function speichereOrte() {
		setStoredItem(STORAGE_KEYS.ORTE, gespeicherteOrte);
	}

	function speichereRegionen() {
		setStoredItem(STORAGE_KEYS.REGIONEN, regionen);
	}

	function speichereAktiveRegion() {
		setStoredString(STORAGE_KEYS.AKTIVE_REGION, aktiveRegionId);
	}

	// Region management functions
	function setAktiveRegion(regionId: string) {
		aktiveRegionId = regionId;
		speichereAktiveRegion();
		// Clear current ort when switching regions
		generierterOrt = null;
		bearbeitungsModus = false;
	}

	function oeffneRegionEditor(region?: GespeicherteRegion) {
		bearbeiteteRegion = region || null;
		showRegionEditor = true;
	}

	function speichereRegion(region: GespeicherteRegion) {
		const existingIndex = regionen.findIndex(r => r.id === region.id);
		if (existingIndex >= 0) {
			regionen = regionen.map((r, i) => i === existingIndex ? region : r);
		} else {
			regionen = [...regionen, region];
		}
		speichereRegionen();
		showRegionEditor = false;
		bearbeiteteRegion = null;

		// Activate the new/edited region
		setAktiveRegion(region.id);
	}

	function loescheRegion(regionId: string) {
		// Don't delete Heimatgefilde
		const region = regionen.find(r => r.id === regionId);
		if (!region || region.istHeimat) return;

		// Move all orte in this region to Heimatgefilde
		gespeicherteOrte = gespeicherteOrte.map(ort =>
			ort.regionId === regionId ? { ...ort, regionId: HEIMATGEFILDE_ID } : ort
		);
		speichereOrte();

		// Remove the region
		regionen = regionen.filter(r => r.id !== regionId);
		speichereRegionen();

		// Switch to Heimatgefilde if we deleted the active region
		if (aktiveRegionId === regionId) {
			setAktiveRegion(HEIMATGEFILDE_ID);
		}
	}

	function generiereNeueRegion() {
		const neueRegion = generiereZufaelligeRegion();
		regionen = [...regionen, neueRegion];
		speichereRegionen();
		setAktiveRegion(neueRegion.id);
	}

	// Helper: Get region info for image generation
	function getRegionInfoForImage(): RegionInfo | undefined {
		if (!aktiveRegion || aktiveRegion.istHeimat) return undefined;
		if (aktiveRegion.geographisch.length === 0 && aktiveRegion.faunaFlora.length === 0 && !aktiveRegion.architektur) {
			return undefined;
		}
		return {
			name: aktiveRegion.name,
			geographisch: aktiveRegion.geographisch.map(b => ({ name: b.name, promptText: b.promptText })),
			faunaFlora: aktiveRegion.faunaFlora.map(b => ({ name: b.name, promptText: b.promptText })),
			architektur: aktiveRegion.architektur ? { name: aktiveRegion.architektur.name, promptText: aktiveRegion.architektur.promptText } : undefined
		};
	}

	// Helper: Count orte per region
	function getOrteCount(regionId: string): number {
		return gespeicherteOrte.filter(o => o.regionId === regionId).length;
	}

	// Auto-sync generierterOrt changes to gespeicherteOrte
	function syncAktuellenOrt() {
		if (!generierterOrt) return;
		const existingIndex = gespeicherteOrte.findIndex(o => o.id === generierterOrt!.id);
		if (existingIndex >= 0) {
			gespeicherteOrte = gespeicherteOrte.map((o, i) =>
				i === existingIndex ? generierterOrt! : o
			);
			speichereOrte();
		}
	}

	function speichereAktuellenOrt() {
		if (!generierterOrt) return;

		// Check if already saved (update) or new
		const existingIndex = gespeicherteOrte.findIndex(o => o.id === generierterOrt!.id);

		if (existingIndex >= 0) {
			// Update existing
			gespeicherteOrte = gespeicherteOrte.map((o, i) =>
				i === existingIndex ? generierterOrt! : o
			);
		} else {
			// Add new
			gespeicherteOrte = [...gespeicherteOrte, generierterOrt];
		}

		speichereOrte();
		bearbeitungsModus = false;
	}

	function ladeOrt(ort: GespeicherterOrt) {
		// Reset image states
		imageError = null;
		sceneDescription = ort.szenenBeschreibung || null;
		galerieIndex = 0;

		generierterOrt = { ...ort };
		bearbeitungsModus = true;
	}

	function loescheOrt(id: string) {
		gespeicherteOrte = gespeicherteOrte.filter(o => o.id !== id);
		speichereOrte();
		if (generierterOrt?.id === id) {
			generierterOrt = null;
			bearbeitungsModus = false;
		}
	}

	function abbrechenBearbeitung() {
		generierterOrt = null;
		bearbeitungsModus = false;
	}

	function updateAnmerkungen(event: Event) {
		if (!generierterOrt) return;
		const target = event.target as HTMLTextAreaElement;
		generierterOrt = { ...generierterOrt, anmerkungen: target.value };

		// Debounced sync - save after 500ms of no typing
		if (anmerkungenSyncTimer) clearTimeout(anmerkungenSyncTimer);
		anmerkungenSyncTimer = setTimeout(() => syncAktuellenOrt(), 500);
	}

	// Debounce timer for ortBeschreibung
	let beschreibungSyncTimer: ReturnType<typeof setTimeout> | null = null;

	function updateOrtBeschreibung(event: Event) {
		if (!generierterOrt) return;
		const target = event.target as HTMLTextAreaElement;
		generierterOrt = { ...generierterOrt, ortBeschreibung: target.value };

		// Debounced sync - save after 500ms of no typing
		if (beschreibungSyncTimer) clearTimeout(beschreibungSyncTimer);
		beschreibungSyncTimer = setTimeout(() => syncAktuellenOrt(), 500);
	}

	// Debounce timer for beschreibungsAnmerkungen
	let beschreibungsAnmerkungenSyncTimer: ReturnType<typeof setTimeout> | null = null;

	function updateBeschreibungsAnmerkungen(event: Event) {
		if (!generierterOrt) return;
		const target = event.target as HTMLTextAreaElement;
		generierterOrt = { ...generierterOrt, beschreibungsAnmerkungen: target.value };

		// Debounced sync - save after 500ms of no typing
		if (beschreibungsAnmerkungenSyncTimer) clearTimeout(beschreibungsAnmerkungenSyncTimer);
		beschreibungsAnmerkungenSyncTimer = setTimeout(() => syncAktuellenOrt(), 500);
	}

	function toggleBeschreibungsAnmerkungen() {
		beschreibungsAnmerkungenExpanded = !beschreibungsAnmerkungenExpanded;
	}

	// ==========================================
	// Spielleiter-Chat Funktionen
	// ==========================================

	function toggleSpielleiterChat() {
		spielleiterChatExpanded = !spielleiterChatExpanded;
	}

	function buildSpielleiterKontext(): SpielleiterKontext | null {
		if (!generierterOrt) return null;

		return {
			ortName: generierterOrt.name,
			ortBeschreibung: generierterOrt.ortBeschreibung,
			naturelle: generierterOrt.naturelle.map(n => ({
				name: n.name,
				beschreibung: n.beschreibung
			})),
			bekannte: generierterOrt.bekannte.map(b => ({
				name: b.name,
				tier: b.tier,
				beruf: b.berufe[0] || 'Unbekannt',
				merkmal: b.merkmal.name
			})),
			gottheiten: generierterOrt.gottheiten?.map(g => ({
				name: g.name,
				titel: g.beiname || g.name,
				erscheinung: g.erscheinung
			})),
			region: aktiveRegion ? { name: aktiveRegion.name } : undefined,
			details: generierterOrt.details,
			geschichte: generierterOrt.geschichte,
			bisherigeFakten: generierterOrt.spielleiterFakten
		};
	}

	function getChatVerlaufForApi(): SpielleiterChatNachricht[] {
		if (!generierterOrt?.spielleiterChat) return [];
		return generierterOrt.spielleiterChat.map(n => ({
			rolle: n.rolle,
			text: n.text
		}));
	}

	async function sendeSpielleiterNachricht() {
		if (!generierterOrt || !spielleiterInput.trim() || isSpielleiterGenerating) return;

		const nachrichtText = spielleiterInput.trim();
		spielleiterInput = '';
		isSpielleiterGenerating = true;
		spielleiterError = null;

		// Add user message
		const userMessage: SpielleiterNachricht = {
			id: crypto.randomUUID(),
			rolle: 'nutzer',
			text: nachrichtText,
			timestamp: new Date().toISOString()
		};

		generierterOrt = {
			...generierterOrt,
			spielleiterChat: [...(generierterOrt.spielleiterChat || []), userMessage]
		};

		try {
			const kontext = buildSpielleiterKontext();
			if (!kontext) throw new Error('Kein Ort-Kontext');

			const chatVerlauf = getChatVerlaufForApi();
			const result = await generateSpielleiterAntwort(kontext, nachrichtText, chatVerlauf.slice(0, -1)); // exclude the just-added message

			if (!result.success || !result.antwort) {
				throw new Error(result.error || 'Keine Antwort erhalten');
			}

			// Add spielleiter response
			const spielleiterMessage: SpielleiterNachricht = {
				id: crypto.randomUUID(),
				rolle: 'spielleiter',
				text: result.antwort,
				timestamp: new Date().toISOString(),
				vorgeschlageneFakten: result.vorgeschlageneFakten
			};

			generierterOrt = {
				...generierterOrt,
				spielleiterChat: [...(generierterOrt.spielleiterChat || []), spielleiterMessage]
			};

			syncAktuellenOrt();
		} catch (error) {
			spielleiterError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isSpielleiterGenerating = false;
		}
	}

	function akzeptiereFakt(nachrichtId: string, faktIndex: number) {
		if (!generierterOrt?.spielleiterChat) return;

		generierterOrt = {
			...generierterOrt,
			spielleiterChat: generierterOrt.spielleiterChat.map(n => {
				if (n.id === nachrichtId && n.vorgeschlageneFakten) {
					const akzeptiert = n.akzeptierteFakten || [];
					const fakt = n.vorgeschlageneFakten[faktIndex];
					if (fakt && !akzeptiert.includes(fakt)) {
						return { ...n, akzeptierteFakten: [...akzeptiert, fakt] };
					}
				}
				return n;
			})
		};

		syncAktuellenOrt();
	}

	function istFaktAkzeptiert(nachricht: SpielleiterNachricht, faktIndex: number): boolean {
		if (!nachricht.vorgeschlageneFakten || !nachricht.akzeptierteFakten) return false;
		const fakt = nachricht.vorgeschlageneFakten[faktIndex];
		return nachricht.akzeptierteFakten.includes(fakt);
	}

	async function fasseSpielleiterChatZusammenUndLeere() {
		if (!generierterOrt?.spielleiterChat || generierterOrt.spielleiterChat.length === 0) return;
		if (isZusammenfassend) return;

		isZusammenfassend = true;
		spielleiterError = null;

		try {
			const chatVerlauf = getChatVerlaufForApi();
			const result = await fasseSpielleiterChatZusammen(
				chatVerlauf,
				generierterOrt.spielleiterFakten,
				generierterOrt.name
			);

			if (!result.success || !result.zusammenfassung) {
				throw new Error(result.error || 'Zusammenfassung fehlgeschlagen');
			}

			// Update with new facts and clear chat
			generierterOrt = {
				...generierterOrt,
				spielleiterFakten: result.zusammenfassung,
				spielleiterChat: []
			};

			syncAktuellenOrt();
		} catch (error) {
			spielleiterError = error instanceof Error ? error.message : 'Fehler bei Zusammenfassung';
		} finally {
			isZusammenfassend = false;
		}
	}

	function handleSpielleiterKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendeSpielleiterNachricht();
		}
	}

	async function generiereOrtBeschreibung() {
		if (!generierterOrt || isGeneratingBeschreibung) return;

		isGeneratingBeschreibung = true;
		beschreibungError = null;

		try {
			const input = {
				name: generierterOrt.name,
				naturelle: generierterOrt.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch
				})),
				region: getRegionInfoForImage(),
				beschreibungsAnmerkungen: generierterOrt.beschreibungsAnmerkungen
			};

			const result = await generateOrtBeschreibung(input);
			generierterOrt = {
				...generierterOrt,
				name: result.suggestedName,
				ortBeschreibung: result.beschreibung
			};
			syncAktuellenOrt();
		} catch (error) {
			beschreibungError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingBeschreibung = false;
		}
	}

	function toggleBeschreibung() {
		beschreibungExpanded = !beschreibungExpanded;
	}

	async function generateImage() {
		if (!generierterOrt || isGeneratingImage) return;

		isGeneratingImage = true;
		imageError = null;
		sceneDescription = null;
		generationPhase = 'scene';

		try {
			// Extract stimmung text from items (handle both string and object formats)
			const extractStimmungText = (items: StimmungItem[]): string[] => {
				return items.map(s => typeof s === 'string' ? s : s.text);
			};

			const ortInfo = {
				name: generierterOrt.name,
				hauptNaturell: generierterOrt.hauptNaturell || generierterOrt.naturelle[0]?.name || '',
				naturelle: generierterOrt.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch,
					stimmung: extractStimmungText(n.stimmung)
				})),
				anmerkungen: generierterOrt.anmerkungen,
				ortBeschreibung: generierterOrt.ortBeschreibung,
				region: getRegionInfoForImage()
			};

			// Phase 1: Generate scene description with LLM
			const sceneResult = await generateSceneDescription(ortInfo);
			sceneDescription = sceneResult.sceneDescription;

			// Phase 2: Generate image from scene prompt
			generationPhase = 'image';
			const imageData = await generateImageFromPrompt(sceneResult.promptForImage, generierterOrt.name);

			if (imageData) {
				const neueBilder = [...(generierterOrt.bilder || []), imageData];
				generierterOrt = {
					...generierterOrt,
					bilder: neueBilder,
					szenenBeschreibung: sceneDescription || undefined
				};
				galerieIndex = neueBilder.length - 1;
				anmerkungenExpanded = false;
				syncAktuellenOrt();
			} else {
				imageError = 'Kein Bild erhalten';
			}
		} catch (error) {
			imageError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingImage = false;
			generationPhase = null;
		}
	}

	function removeImage(index: number) {
		if (!generierterOrt?.bilder) return;
		const neueBilder = generierterOrt.bilder.filter((_, i) => i !== index);
		generierterOrt = { ...generierterOrt, bilder: neueBilder.length > 0 ? neueBilder : undefined };
		if (galerieIndex >= neueBilder.length) {
			galerieIndex = Math.max(0, neueBilder.length - 1);
		}
		syncAktuellenOrt();
	}

	function naechstesBild() {
		if (!generierterOrt?.bilder) return;
		galerieIndex = (galerieIndex + 1) % generierterOrt.bilder.length;
	}

	function vorherigesBild() {
		if (!generierterOrt?.bilder) return;
		galerieIndex = (galerieIndex - 1 + generierterOrt.bilder.length) % generierterOrt.bilder.length;
	}

	function toggleAnmerkungen() {
		anmerkungenExpanded = !anmerkungenExpanded;
	}

	// Bekannte functions
	function fuegeBekanntHinzu() {
		if (!generierterOrt) return;
		const neuerBekannter = generiereBekanntenData(erlaubeMagisch, erlaubeTrauma);
		generierterOrt = {
			...generierterOrt,
			bekannte: [...generierterOrt.bekannte, neuerBekannter]
		};
		syncAktuellenOrt();
	}

	function entferneBekannten(index: number) {
		if (!generierterOrt) return;
		generierterOrt = {
			...generierterOrt,
			bekannte: generierterOrt.bekannte.filter((_, i) => i !== index)
		};
		syncAktuellenOrt();
	}

	function aktualisiereBekannten(index: number, updated: GenerierterBekannter) {
		if (!generierterOrt) return;
		generierterOrt = {
			...generierterOrt,
			bekannte: generierterOrt.bekannte.map((b, i) => i === index ? updated : b)
		};
		syncAktuellenOrt();
	}

	// Gottheiten functions
	function fuegeGottheitHinzu() {
		if (!generierterOrt) return;

		// Erstelle Ort-Kontext für thematisch inspirierte Gottheit
		const ortKontext: OrtKontext = {
			name: generierterOrt.name,
			naturelleNamen: generierterOrt.naturelle.map(n => n.name),
			naturelleKategorien: [...new Set(generierterOrt.naturelle.map(n => n.kategorie))],
			ortBeschreibung: generierterOrt.ortBeschreibung
		};

		// Erstelle Gottheit mit Ort-Kontext für thematische Inspiration
		const neueGottheit = erstelleGottheit({ ortId: generierterOrt.id }, ortKontext);

		generierterOrt = {
			...generierterOrt,
			gottheiten: [...(generierterOrt.gottheiten || []), neueGottheit]
		};
		syncAktuellenOrt();
	}

	function entferneGottheit(id: string) {
		if (!generierterOrt) return;
		generierterOrt = {
			...generierterOrt,
			gottheiten: (generierterOrt.gottheiten || []).filter(g => g.id !== id)
		};
		syncAktuellenOrt();
	}

	function aktualisiereGottheit(updated: Gottheit) {
		if (!generierterOrt) return;
		generierterOrt = {
			...generierterOrt,
			gottheiten: (generierterOrt.gottheiten || []).map(g => g.id === updated.id ? updated : g)
		};
		syncAktuellenOrt();
	}

	async function generiereGottheitBildForOrt(gottheit: Gottheit) {
		isGeneratingGottheitBild = gottheit.id;
		try {
			// Ort-Kontext für das Bild übergeben
			const ortInfo = generierterOrt ? {
				name: generierterOrt.name,
				naturelleNamen: generierterOrt.naturelle.map(n => n.name),
				ortBeschreibung: generierterOrt.ortBeschreibung
			} : undefined;

			const bildData = await generateGottheitBild({
				name: gottheit.name,
				beiname: gottheit.beiname,
				domäne: gottheit.domäne,
				erscheinung: gottheit.erscheinung,
				fähigkeiten: gottheit.fähigkeiten,
				opferweg: gottheit.opferweg
			}, ortInfo);
			if (bildData) {
				aktualisiereGottheit({ ...gottheit, bild: bildData });
			}
		} catch (error) {
			console.error('Fehler bei Gottheit-Bild-Generierung:', error);
		} finally {
			isGeneratingGottheitBild = null;
		}
	}

	async function generiereGottheitVorgeschichteForOrt(gottheit: Gottheit) {
		isGeneratingGottheitVorgeschichte = gottheit.id;
		try {
			// Ort-Kontext für die Vorgeschichte übergeben
			const ortInfo = generierterOrt ? {
				name: generierterOrt.name,
				naturelleNamen: generierterOrt.naturelle.map(n => n.name),
				ortBeschreibung: generierterOrt.ortBeschreibung
			} : undefined;

			const result = await generateGottheitVorgeschichte({
				name: gottheit.name,
				beiname: gottheit.beiname,
				domäne: gottheit.domäne,
				erscheinung: gottheit.erscheinung,
				fähigkeiten: gottheit.fähigkeiten,
				opferweg: gottheit.opferweg
			}, ortInfo);
			if (result.success && result.vorgeschichte) {
				aktualisiereGottheit({ ...gottheit, vorgeschichte: result.vorgeschichte });
			}
		} catch (error) {
			console.error('Fehler bei Gottheit-Vorgeschichte-Generierung:', error);
		} finally {
			isGeneratingGottheitVorgeschichte = null;
		}
	}

	async function generiereGottheitFähigkeitenForOrt(gottheit: Gottheit) {
		isGeneratingGottheitFähigkeiten = gottheit.id;
		try {
			// Ort-Kontext für die Fähigkeiten übergeben
			const ortInfo = generierterOrt ? {
				name: generierterOrt.name,
				naturelleNamen: generierterOrt.naturelle.map(n => n.name),
				ortBeschreibung: generierterOrt.ortBeschreibung
			} : undefined;

			const result = await generateGottheitFähigkeiten({
				name: gottheit.name,
				beiname: gottheit.beiname,
				domäne: gottheit.domäne,
				erscheinung: gottheit.erscheinung
			}, ortInfo);
			if (result.success && result.fähigkeiten) {
				aktualisiereGottheit({ ...gottheit, fähigkeiten: result.fähigkeiten });
			}
		} catch (error) {
			console.error('Fehler bei Gottheit-Fähigkeiten-Generierung:', error);
		} finally {
			isGeneratingGottheitFähigkeiten = null;
		}
	}

	async function generiereGottheitOpferwegForOrt(gottheit: Gottheit) {
		isGeneratingGottheitOpferweg = gottheit.id;
		try {
			// Ort-Kontext für den Opferweg übergeben
			const ortInfo = generierterOrt ? {
				name: generierterOrt.name,
				naturelleNamen: generierterOrt.naturelle.map(n => n.name),
				ortBeschreibung: generierterOrt.ortBeschreibung
			} : undefined;

			const result = await generateGottheitOpferweg({
				name: gottheit.name,
				beiname: gottheit.beiname,
				domäne: gottheit.domäne,
				erscheinung: gottheit.erscheinung
			}, ortInfo);
			if (result.success && result.opferweg) {
				aktualisiereGottheit({ ...gottheit, opferweg: result.opferweg });
			}
		} catch (error) {
			console.error('Fehler bei Gottheit-Opferweg-Generierung:', error);
		} finally {
			isGeneratingGottheitOpferweg = null;
		}
	}

	function scrollToGottheit(id: string) {
		const element = document.getElementById(`gottheit-${id}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			element.classList.add('highlight');
			setTimeout(() => element.classList.remove('highlight'), 1500);
		}
	}

	function aktualisiereOrtName(event: Event) {
		if (!generierterOrt) return;
		const target = event.target as HTMLElement;
		const neuerName = target.innerText.trim();
		if (neuerName && neuerName !== generierterOrt.name) {
			generierterOrt = {
				...generierterOrt,
				name: neuerName
			};
			syncAktuellenOrt();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.target as HTMLElement).blur();
		}
	}

	async function generiereOrtDetails() {
		if (!generierterOrt || isGeneratingDetails) return;

		isGeneratingDetails = true;
		detailsError = null;

		try {
			const ortInput = {
				name: generierterOrt.name,
				naturelle: generierterOrt.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch
				})),
				bekannte: generierterOrt.bekannte.map(b => ({
					name: b.name,
					tier: b.tier,
					berufe: b.berufe
				})),
				ortBeschreibung: generierterOrt.ortBeschreibung,
				region: getRegionInfoForImage(),
				erlaubeMagisch,
				erlaubeTrauma
			};

			const result = await generateOrtDetails(ortInput);

			generierterOrt = {
				...generierterOrt,
				details: {
					geruechte: result.geruechte,
					aktivitaeten: result.aktivitaeten,
					entdeckungen: result.entdeckungen
				}
			};
			syncAktuellenOrt();
		} catch (error) {
			detailsError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingDetails = false;
		}
	}

	async function generiereOrtGeschichte() {
		if (!generierterOrt || isGeneratingGeschichte) return;

		// Geschichte benötigt Details - falls nicht vorhanden, erst generieren
		if (!generierterOrt.details) {
			geschichteError = 'Bitte generiere zuerst die Details für diesen Ort.';
			return;
		}

		isGeneratingGeschichte = true;
		geschichteError = null;

		try {
			const ortInput = {
				name: generierterOrt.name,
				naturelle: generierterOrt.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch
				})),
				bekannte: generierterOrt.bekannte.map(b => ({
					name: b.name,
					tier: b.tier,
					berufe: b.berufe
				})),
				region: getRegionInfoForImage(),
				details: generierterOrt.details
			};

			const events = await generateOrtGeschichte(ortInput);

			generierterOrt = {
				...generierterOrt,
				geschichte: events
			};
			geschichteExpanded = true;
			syncAktuellenOrt();
		} catch (error) {
			geschichteError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingGeschichte = false;
		}
	}

	function generiereOrt() {
		// Reset image states
		imageError = null;
		sceneDescription = null;
		galerieIndex = 0;

		// Filter categories by active selection
		const aktiveKats = kategorien.filter(k => aktiveKategorien.includes(k.name));
		if (aktiveKats.length === 0) return;

		// Collect all naturelle from active categories
		const alleNaturelleRaw = aktiveKats.flatMap(k =>
			k.naturelle.map(n => ({ ...n, kategorie: k.name, farbe: k.farbe }))
		);

		// Filter stimmung based on magic/trauma settings
		const alleNaturelle = alleNaturelleRaw.map(n => ({
			...n,
			stimmung: (n.stimmung as StimmungItem[]).filter(s => {
				if (!erlaubeMagisch && isMagisch(s)) return false;
				if (!erlaubeTrauma && isTrauma(s)) return false;
				return true;
			}),
			volkssagen: (n.volkssagen as StimmungItem[]).filter(v => {
				if (!erlaubeMagisch && isMagisch(v)) return false;
				return true;
			})
		}));

		// Select random naturelle
		const gewaehlteNaturelle = getRandomElements(alleNaturelle, anzahlNaturelle);

		// Generate place name from one of the selected Naturelle and track which one
		const naturellMitNamen = gewaehlteNaturelle.filter(n => n.ortsnamen && n.ortsnamen.length > 0);
		let ortsname: string;
		let hauptNaturell: string;

		if (naturellMitNamen.length > 0) {
			const gewaehlteNaturellFuerName = getRandomElement(naturellMitNamen);
			ortsname = getRandomElement(gewaehlteNaturellFuerName.ortsnamen!);
			hauptNaturell = gewaehlteNaturellFuerName.name;
		} else {
			ortsname = gewaehlteNaturelle[0].name;
			hauptNaturell = gewaehlteNaturelle[0].name;
		}

		// Generate initial Bekannte
		const initialeBekannte: GenerierterBekannter[] = [];
		for (let i = 0; i < anzahlBekannte; i++) {
			initialeBekannte.push(generiereBekanntenData(erlaubeMagisch, erlaubeTrauma));
		}

		// 50% Chance für jedes Naturell, metaphorisch zu sein
		const naturelleMitMetaphorisch = gewaehlteNaturelle.map(n => ({
			...n,
			metaphorisch: Math.random() < 0.5
		}));

		generierterOrt = {
			id: crypto.randomUUID(),
			regionId: aktiveRegionId,
			name: ortsname,
			hauptNaturell,
			bekannte: initialeBekannte,
			gottheiten: [], // Leere Gottheiten-Liste beim Erstellen
			naturelle: naturelleMitMetaphorisch,
			erstelltAm: new Date().toISOString()
		};
		bearbeitungsModus = false;

		// Automatisch speichern
		gespeicherteOrte = [...gespeicherteOrte, generierterOrt];
		speichereOrte();
	}

	function toggleKategorie(name: string) {
		if (aktiveKategorien.includes(name)) {
			if (aktiveKategorien.length > 1) {
				aktiveKategorien = aktiveKategorien.filter(k => k !== name);
			}
		} else {
			aktiveKategorien = [...aktiveKategorien, name];
		}
	}

	
	function scrollToNaturell(name: string) {
		const element = document.getElementById(`naturell-${toElementId(name)}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			element.classList.add('highlight');
			setTimeout(() => element.classList.remove('highlight'), 1500);
		}
	}

	function scrollToBekannter(index: number) {
		const element = document.getElementById(`bekannter-${index}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			element.classList.add('highlight');
			setTimeout(() => element.classList.remove('highlight'), 1500);
		}
	}

	// Highlight Bekannte and Gottheiten names in text and make them clickable
	function highlightBekannteInText(text: string): { html: string; hasMatches: boolean } {
		const hasBekannte = generierterOrt?.bekannte.length;
		const hasGottheiten = generierterOrt?.gottheiten?.length;

		if (!hasBekannte && !hasGottheiten) return { html: text, hasMatches: false };

		let result = text;
		let hasMatches = false;

		// First highlight Gottheiten (with golden/mystical style)
		if (hasGottheiten) {
			const sortedGottheiten = [...(generierterOrt!.gottheiten || [])]
				.map(g => ({ name: g.name, id: g.id }))
				.sort((a, b) => b.name.length - a.name.length);

			for (const { name, id } of sortedGottheiten) {
				const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
				if (regex.test(result)) {
					hasMatches = true;
					result = result.replace(regex, `<button class="gottheit-link" data-id="${id}">${name}</button>`);
				}
			}
		}

		// Then highlight Bekannte
		if (hasBekannte) {
			const sortedBekannte = [...generierterOrt!.bekannte]
				.map((b, i) => ({ name: b.name, index: i }))
				.sort((a, b) => b.name.length - a.name.length);

			for (const { name, index } of sortedBekannte) {
				const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
				const regex = new RegExp(`\\b${escapedName}\\b`, 'gi');
				if (regex.test(result)) {
					hasMatches = true;
					result = result.replace(regex, `<button class="bekannte-link" data-index="${index}">${name}</button>`);
				}
			}
		}

		return { html: result, hasMatches };
	}

	function handleDetailsClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.classList.contains('bekannte-link')) {
			const index = parseInt(target.dataset.index || '0', 10);
			scrollToBekannter(index);
		} else if (target.classList.contains('gottheit-link')) {
			const id = target.dataset.id || '';
			scrollToGottheit(id);
		}
	}

</script>

<svelte:head>
	<title>Naturelle - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Ort erschaffen</h1>
	<p class="intro">
		Wähle eine Region und erschaffe Orte aus Naturellen.
	</p>

	<!-- Region Management Section -->
	<div class="regionen-section">
		<div class="regionen-header">
			<h3>Regionen</h3>
			<div class="regionen-actions">
				<button class="btn btn-sm btn-secondary" onclick={generiereNeueRegion}>
					Zufällige Region
				</button>
				<button class="btn btn-sm btn-primary" onclick={() => oeffneRegionEditor()}>
					Neue Region
				</button>
			</div>
		</div>
		<div class="regionen-liste">
			{#each regionen as region}
				<RegionCard
					{region}
					orteCount={getOrteCount(region.id)}
					isActive={region.id === aktiveRegionId}
					onSelect={() => setAktiveRegion(region.id)}
					onEdit={() => oeffneRegionEditor(region)}
					onDelete={() => loescheRegion(region.id)}
				/>
			{/each}
		</div>
	</div>

	<!-- Aktive Region Info -->
	{#if aktiveRegion && !aktiveRegion.istHeimat}
		<div class="aktive-region-info">
			<h4>{aktiveRegion.name}</h4>
			<div class="region-besonderheiten">
				{#if aktiveRegion.geographisch.length > 0}
					<div class="besonderheit-gruppe">
						<span class="besonderheit-label">Geographie:</span>
						{#each aktiveRegion.geographisch as b}
							<span class="besonderheit-tag geo">{b.name}</span>
						{/each}
					</div>
				{/if}
				{#if aktiveRegion.faunaFlora.length > 0}
					<div class="besonderheit-gruppe">
						<span class="besonderheit-label">Flora & Fauna:</span>
						{#each aktiveRegion.faunaFlora as b}
							<span class="besonderheit-tag flora">{b.name}</span>
						{/each}
					</div>
				{/if}
				{#if aktiveRegion.architektur}
					<div class="besonderheit-gruppe">
						<span class="besonderheit-label">Architektur:</span>
						<span class="besonderheit-tag arch">{aktiveRegion.architektur.name}</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Gespeicherte Orte der aktiven Region -->
	{#if orteInAktiverRegion.length > 0}
		<div class="gespeicherte-orte-section">
			<h3>Orte in {aktiveRegion.name}</h3>
			<div class="gespeicherte-orte-liste">
				{#each orteInAktiverRegion as ort}
					<div class="gespeicherter-ort-card">
						<div class="ort-info">
							<strong>{ort.name}</strong>
							<span class="ort-meta">
								{ort.naturelle.length} Naturelle, {ort.bekannte.length} Bekannte
							</span>
						</div>
						<div class="ort-actions">
							<button class="btn btn-sm btn-secondary" onclick={() => ladeOrt(ort)}>
								Laden
							</button>
							<button class="btn btn-sm btn-danger" onclick={() => loescheOrt(ort.id)}>
								Löschen
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Generator Section -->
	<div class="generator-row">
		<button class="btn btn-primary generate-btn" onclick={generiereOrt}>
			Ort erschaffen
		</button>

		<label class="compact-toggle" class:active={erlaubeMagisch} title="Übernatürliche Elemente, Gottheiten, Geistwesen">
			<input type="checkbox" bind:checked={erlaubeMagisch} />
			<span class="symbol-btn magic">✧</span>
			<span class="toggle-text">Magisch</span>
		</label>

		<label class="compact-toggle" class:active={erlaubeTrauma} title="Dunklere Elemente mit schwierigen Hintergründen">
			<input type="checkbox" bind:checked={erlaubeTrauma} />
			<span class="symbol-btn trauma">‡</span>
			<span class="toggle-text">Trauma</span>
		</label>
	</div>

	<div class="generator-options">
		<div class="option-group">
			<span class="option-label">Naturelle: <strong>{anzahlNaturelle}</strong></span>
			<input type="range" min="1" max="5" bind:value={anzahlNaturelle} class="range-input" />
		</div>

		<div class="kategorie-filter">
			{#each kategorien as kat}
				<button
					class="filter-btn"
					class:active={aktiveKategorien.includes(kat.name)}
					data-farbe={kat.farbe}
					onclick={() => toggleKategorie(kat.name)}
				>
					{kat.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- Generated Result -->
	{#if generierterOrt}
		<div class="result-section" class:bearbeitung={bearbeitungsModus}>
			<!-- Header mit Name -->
			<div class="result-header">
				<h2
					class="result-title"
					contenteditable="true"
					onblur={aktualisiereOrtName}
					onkeydown={handleKeyDown}
					title="Klicken zum Bearbeiten"
				>{generierterOrt.name}</h2>
				{#if bearbeitungsModus}
					<span class="bearbeitung-badge">Bearbeitung</span>
				{/if}
			</div>

			<!-- Bild und Anmerkungen nebeneinander -->
			<div class="bild-anmerkungen-row">
				<!-- Bild-Bereich links -->
				<div class="ort-image-section">
					{#if generierterOrt.bilder && generierterOrt.bilder.length > 0}
						<div class="ort-image-container">
							<button class="ort-image-button" onclick={() => showImageModal = true} title="Bild vergrößern">
								<img src={generierterOrt.bilder[galerieIndex]} alt={generierterOrt.name} class="ort-image" />
							</button>
							{#if generierterOrt.bilder.length > 1}
								<div class="ort-image-counter">{galerieIndex + 1} / {generierterOrt.bilder.length}</div>
							{/if}
							<button
								class="ort-regenerate-btn"
								onclick={generateImage}
								disabled={isGeneratingImage}
								title="Neues Bild generieren"
							>
								{isGeneratingImage ? '⏳' : '🔄'}
							</button>
						</div>
					{:else if hasApiKey()}
						<button
							class="ort-image-placeholder"
							onclick={generateImage}
							disabled={isGeneratingImage}
							title="Klicken um Bild zu generieren"
						>
							{#if isGeneratingImage}
								<span class="ort-placeholder-spinner"></span>
								<span class="ort-placeholder-text">
									{#if generationPhase === 'scene'}
										Szene wird erdacht...
									{:else if generationPhase === 'image'}
										Bild wird generiert...
									{:else}
										Generiere...
									{/if}
								</span>
							{:else}
								<span class="ort-placeholder-icon">🏞️</span>
								<span class="ort-placeholder-text">Bild generieren</span>
							{/if}
						</button>
					{:else}
						<div class="ort-image-placeholder-static">
							<span class="ort-placeholder-icon">🏞️</span>
							<a href="/einstellungen" class="ort-api-hint">API Key einrichten</a>
						</div>
					{/if}
					{#if imageError}
						<p class="ort-image-error">{imageError}</p>
					{/if}
					{#if sceneDescription && !isGeneratingImage}
						<details class="scene-description-details">
							<summary>Generierte Szene</summary>
							<p class="scene-description-text">{sceneDescription}</p>
						</details>
					{/if}
				</div>

				<!-- Anmerkungen rechts -->
				<div class="anmerkungen-section">
					<button class="anmerkungen-header" onclick={toggleAnmerkungen}>
						<span class="anmerkungen-title">Anmerkungen</span>
						<span class="anmerkungen-toggle">{anmerkungenExpanded ? '▼' : '▶'}</span>
					</button>
					{#if anmerkungenExpanded}
						<textarea
							class="anmerkungen-textarea"
							placeholder="Beschreibe Details für die Bildgenerierung..."
							value={generierterOrt.anmerkungen || ''}
							oninput={updateAnmerkungen}
						></textarea>
					{/if}
					{#if sceneDescription}
						<details class="gemini-szene-details">
							<summary>Gemini Szenen-Beschreibung</summary>
							<p class="gemini-szene-text">{sceneDescription}</p>
						</details>
					{/if}
				</div>
			</div>

			<!-- Orts-Beschreibung (unter dem Bild) -->
			<div class="ort-beschreibung-section">
				{#if generierterOrt.ortBeschreibung}
					<div class="ort-beschreibung-display">
						<p class="ort-beschreibung-text">{generierterOrt.ortBeschreibung}</p>
						<div class="ort-beschreibung-actions">
							<button
								class="ort-beschreibung-edit-btn"
								onclick={() => beschreibungExpanded = !beschreibungExpanded}
								title="Bearbeiten"
							>
								✏️
							</button>
							<button
								class="ort-beschreibung-regenerate-btn"
								onclick={generiereOrtBeschreibung}
								disabled={isGeneratingBeschreibung}
								title="Neu generieren"
							>
								{isGeneratingBeschreibung ? '⏳' : '🔄'}
							</button>
						</div>
					</div>
					{#if beschreibungExpanded}
						<textarea
							class="ort-beschreibung-textarea"
							value={generierterOrt.ortBeschreibung}
							oninput={updateOrtBeschreibung}
							rows="3"
						></textarea>
					{/if}
				{:else if hasApiKey()}
					<!-- Anmerkungen für die Beschreibung (optional) -->
					<div class="beschreibungs-anmerkungen-section">
						<button class="beschreibungs-anmerkungen-header" onclick={toggleBeschreibungsAnmerkungen}>
							<span class="beschreibungs-anmerkungen-title">Anmerkungen zur Beschreibung (optional)</span>
							<span class="beschreibungs-anmerkungen-toggle">{beschreibungsAnmerkungenExpanded ? '▼' : '▶'}</span>
						</button>
						{#if beschreibungsAnmerkungenExpanded}
							<textarea
								class="beschreibungs-anmerkungen-textarea"
								placeholder="Was soll in der Beschreibung vorkommen? Z.B. 'Ein alter Brunnen steht in der Mitte' oder 'Hier leben viele Frösche'..."
								value={generierterOrt.beschreibungsAnmerkungen || ''}
								oninput={updateBeschreibungsAnmerkungen}
								rows="3"
							></textarea>
							<p class="beschreibungs-anmerkungen-hint">Diese Details werden in die generierte Beschreibung eingearbeitet und ausgeschmückt.</p>
						{/if}
					</div>

					<button
						class="ort-beschreibung-generate-btn"
						onclick={generiereOrtBeschreibung}
						disabled={isGeneratingBeschreibung}
					>
						{#if isGeneratingBeschreibung}
							<span class="ort-placeholder-spinner"></span>
							<span>Beschreibung & Name werden generiert...</span>
						{:else}
							<span>✨ Ort interpretieren</span>
						{/if}
					</button>
				{:else}
					<p class="ort-beschreibung-hint">
						<a href="/einstellungen">API Key einrichten</a> um eine Interpretation zu generieren.
					</p>
				{/if}
				{#if beschreibungError}
					<p class="ort-beschreibung-error">{beschreibungError}</p>
				{/if}
			</div>

			<!-- Naturelle des Ortes -->
			<div class="result-naturelle">
				{#each generierterOrt.naturelle as nat}
					<div class="result-naturell-card" class:ist-haupt={nat.name === generierterOrt.hauptNaturell} data-farbe={nat.farbe}>
						<img src={nat.bild} alt={nat.name} class="result-naturell-bild" />
						<div class="result-naturell-info">
							<h3>
								{nat.name}
								{#if nat.name === generierterOrt.hauptNaturell}
									<span class="haupt-tag">Haupt</span>
								{/if}
								{#if nat.metaphorisch}
									<span class="metaphorisch-tag">Metaphorisch</span>
								{/if}
							</h3>
							<p class="result-beschreibung">{nat.beschreibung}</p>
							<div class="result-stimmung">
								<strong>Stimmung:</strong>
								{#each getRandomElements(nat.stimmung, 2) as s}
									<span class="stimmung-tag" class:magisch={isMagisch(s)} class:trauma={isTrauma(s)}>
										{getText(s)}
									</span>
								{/each}
							</div>
							<div class="result-kannImmer">
								<strong>Hier kannst du immer:</strong>
								<ul>
									{#each nat.kannImmer as aktion}
										<li>{aktion}</li>
									{/each}
								</ul>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Bekannte des Ortes -->
			<div class="result-bekannte">
				<div class="bekannte-header">
					<h3>Bekannte an diesem Ort</h3>
					<div class="bekannte-controls">
						<button
							class="bekannte-ctrl-btn"
							onclick={() => entferneBekannten(generierterOrt!.bekannte.length - 1)}
							disabled={!generierterOrt?.bekannte.length}
							title="Letzten Bekannten entfernen"
						>−</button>
						<span class="bekannte-count">{generierterOrt?.bekannte.length || 0}</span>
						<button
							class="bekannte-ctrl-btn"
							onclick={fuegeBekanntHinzu}
							title="Bekannten hinzufügen"
						>+</button>
					</div>
				</div>

				{#if generierterOrt?.bekannte.length}
					<p class="bekannte-hint">Klicke auf einen Namen um ihn zu bearbeiten</p>
					<div class="bekannte-list">
						{#each generierterOrt.bekannte as bekannter, index}
							<div class="bekannte-item" id="bekannter-{index}">
								<BekannterCard
									{bekannter}
									editable={true}
									onUpdate={(updated) => aktualisiereBekannten(index, updated)}
									ortContext={generierterOrt ? { name: generierterOrt.name, naturelleNames: generierterOrt.naturelle.map(n => n.name), szenenBeschreibung: generierterOrt.szenenBeschreibung } : undefined}
									regionContext={getRegionInfoForImage()}
								/>
								<button
									class="bekannte-remove-btn"
									onclick={() => entferneBekannten(index)}
									title="Bekannten entfernen"
								>×</button>
							</div>
						{/each}
					</div>
				{:else}
					<p class="keine-bekannte">Keine Bekannten an diesem Ort. Klicke +, um welche hinzuzufügen.</p>
				{/if}
			</div>

			<!-- Lokale Gottheiten des Ortes -->
			<div class="result-gottheiten">
				<div class="gottheiten-header">
					<h3>Lokale Gottheiten</h3>
					<div class="gottheiten-controls">
						<button
							class="gottheiten-ctrl-btn"
							onclick={() => {
								const gottheiten = generierterOrt?.gottheiten || [];
								if (gottheiten.length > 0) {
									entferneGottheit(gottheiten[gottheiten.length - 1].id);
								}
							}}
							disabled={!generierterOrt?.gottheiten?.length}
							title="Letzte Gottheit entfernen"
						>−</button>
						<span class="gottheiten-count">{generierterOrt?.gottheiten?.length || 0}</span>
						<button
							class="gottheiten-ctrl-btn"
							onclick={fuegeGottheitHinzu}
							title="Gottheit hinzufügen"
						>+</button>
					</div>
				</div>

				{#if generierterOrt?.gottheiten?.length}
					<p class="gottheiten-hint">Vergessene Götter und kleine Geister, die an diesem Ort weilen.</p>
					<div class="gottheiten-list">
						{#each generierterOrt.gottheiten as gottheit}
							<div class="gottheit-item" id="gottheit-{gottheit.id}">
								<GottheitCard
									{gottheit}
									compact={false}
									editable={true}
									onUpdate={aktualisiereGottheit}
									onRemove={() => entferneGottheit(gottheit.id)}
									onGenerateBild={() => generiereGottheitBildForOrt(gottheit)}
									onGenerateVorgeschichte={() => generiereGottheitVorgeschichteForOrt(gottheit)}
									onGenerateFähigkeiten={() => generiereGottheitFähigkeitenForOrt(gottheit)}
									onGenerateOpferweg={() => generiereGottheitOpferwegForOrt(gottheit)}
									isGeneratingBild={isGeneratingGottheitBild === gottheit.id}
									isGeneratingVorgeschichte={isGeneratingGottheitVorgeschichte === gottheit.id}
									isGeneratingFähigkeiten={isGeneratingGottheitFähigkeiten === gottheit.id}
									isGeneratingOpferweg={isGeneratingGottheitOpferweg === gottheit.id}
								/>
							</div>
						{/each}
					</div>
				{:else}
					<p class="keine-gottheiten">Keine lokalen Gottheiten. Klicke +, um eine zu erschaffen. (Optional)</p>
				{/if}
			</div>

			<!-- Spielleiter-Chat Section -->
			<div class="spielleiter-chat-section">
				<button class="spielleiter-chat-header" onclick={toggleSpielleiterChat}>
					<span class="spielleiter-chat-title">
						🎭 Spielleiter fragen
						{#if generierterOrt?.spielleiterChat?.length}
							<span class="chat-count">({generierterOrt.spielleiterChat.length})</span>
						{/if}
					</span>
					<span class="spielleiter-chat-toggle">{spielleiterChatExpanded ? '▼' : '▶'}</span>
				</button>

				{#if spielleiterChatExpanded}
					<div class="spielleiter-chat-content">
						<!-- Gespeicherte Fakten anzeigen -->
						{#if generierterOrt?.spielleiterFakten}
							<div class="spielleiter-fakten-box">
								<button class="fakten-toggle" onclick={() => showFaktenModal = true}>
									📜 Bekannte Fakten anzeigen
								</button>
							</div>
						{/if}

						<!-- Chat-Verlauf -->
						<div class="spielleiter-chat-messages">
							{#if !generierterOrt?.spielleiterChat?.length && !generierterOrt?.spielleiterFakten}
								<p class="chat-empty-hint">
									Frage den Spielleiter nach Geschichten, Geheimnissen oder Details zu diesem Ort.
									Du kannst auch eigene Fakten einbringen!
								</p>
							{/if}

							{#each generierterOrt?.spielleiterChat || [] as nachricht}
								<div class="chat-message" class:nutzer={nachricht.rolle === 'nutzer'} class:spielleiter={nachricht.rolle === 'spielleiter'}>
									<div class="chat-message-header">
										<span class="chat-rolle">{nachricht.rolle === 'nutzer' ? 'Du' : 'Spielleiter'}</span>
									</div>
									<div class="chat-message-text">{nachricht.text}</div>

									<!-- Vorgeschlagene Fakten -->
									{#if nachricht.rolle === 'spielleiter' && nachricht.vorgeschlageneFakten?.length}
										<div class="chat-fakten-vorschlaege">
											<span class="fakten-label">Neue Fakten:</span>
											{#each nachricht.vorgeschlageneFakten as fakt, faktIndex}
												<div class="fakt-vorschlag" class:akzeptiert={istFaktAkzeptiert(nachricht, faktIndex)}>
													<span class="fakt-text">{fakt}</span>
													{#if !istFaktAkzeptiert(nachricht, faktIndex)}
														<button
															class="fakt-akzeptieren-btn"
															onclick={() => akzeptiereFakt(nachricht.id, faktIndex)}
															title="Fakt akzeptieren"
														>✓</button>
													{:else}
														<span class="fakt-akzeptiert-mark">✓</span>
													{/if}
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}

							{#if isSpielleiterGenerating}
								<div class="chat-message spielleiter generating">
									<div class="chat-message-header">
										<span class="chat-rolle">Spielleiter</span>
									</div>
									<div class="chat-message-text">
										<span class="typing-indicator">
											<span></span><span></span><span></span>
										</span>
									</div>
								</div>
							{/if}
						</div>

						<!-- Eingabe -->
						{#if hasApiKey()}
							<div class="spielleiter-chat-input-area">
								<textarea
									class="spielleiter-chat-input"
									placeholder="Frage stellen oder Fakten einbringen..."
									bind:value={spielleiterInput}
									onkeydown={handleSpielleiterKeydown}
									disabled={isSpielleiterGenerating}
									rows="2"
								></textarea>
								<button
									class="spielleiter-send-btn"
									onclick={sendeSpielleiterNachricht}
									disabled={isSpielleiterGenerating || !spielleiterInput.trim()}
									title="Nachricht senden"
								>
									{isSpielleiterGenerating ? '...' : '➤'}
								</button>
							</div>

							<!-- Chat-Aktionen -->
							{#if generierterOrt?.spielleiterChat?.length}
								<div class="spielleiter-chat-actions">
									<button
										class="btn btn-sm btn-secondary"
										onclick={fasseSpielleiterChatZusammenUndLeere}
										disabled={isZusammenfassend}
										title="Fasst alle Fakten zusammen und leert den Chat"
									>
										{isZusammenfassend ? 'Fasse zusammen...' : '📋 Zusammenfassen & leeren'}
									</button>
								</div>
							{/if}
						{:else}
							<p class="spielleiter-no-api">
								<a href="/einstellungen">API Key einrichten</a> um den Spielleiter zu nutzen.
							</p>
						{/if}

						{#if spielleiterError}
							<p class="spielleiter-error">{spielleiterError}</p>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Fakten-Modal -->
			{#if showFaktenModal && generierterOrt?.spielleiterFakten}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<div class="fakten-modal-backdrop" onclick={() => showFaktenModal = false}>
					<div class="fakten-modal" onclick={(e) => e.stopPropagation()}>
						<div class="fakten-modal-header">
							<h3>📜 Bekannte Fakten zu {generierterOrt.name}</h3>
							<button class="fakten-modal-close" onclick={() => showFaktenModal = false}>×</button>
						</div>
						<div class="fakten-modal-content">
							<pre class="fakten-text">{generierterOrt.spielleiterFakten}</pre>
						</div>
					</div>
				</div>
			{/if}

			<!-- Ort Details Section -->
			<div class="ort-details-section">
				<div class="details-header">
					<h3>Über diesen Ort</h3>
					{#if hasApiKey()}
						<button
							class="btn btn-sm btn-secondary"
							onclick={generiereOrtDetails}
							disabled={isGeneratingDetails}
						>
							{#if isGeneratingDetails}
								Generiere...
							{:else if generierterOrt?.details}
								Neu generieren
							{:else}
								Details generieren
							{/if}
						</button>
					{/if}
				</div>

				{#if detailsError}
					<p class="details-error">{detailsError}</p>
				{/if}

				{#if generierterOrt?.details}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div class="details-content" onclick={handleDetailsClick}>
						<div class="details-column">
							<h4>Gerüchte</h4>
							<ul class="details-list geruechte">
								{#each generierterOrt.details.geruechte as geruecht}
									<li>{@html highlightBekannteInText(geruecht).html}</li>
								{/each}
							</ul>
						</div>
						<div class="details-column">
							<h4>Aktivitäten</h4>
							<ul class="details-list aktivitaeten">
								{#each generierterOrt.details.aktivitaeten as aktivitaet}
									<li>{@html highlightBekannteInText(aktivitaet).html}</li>
								{/each}
							</ul>
						</div>
						<div class="details-column">
							<h4>Entdeckungen</h4>
							<ul class="details-list entdeckungen">
								{#each generierterOrt.details.entdeckungen as entdeckung}
									<li>{@html highlightBekannteInText(entdeckung).html}</li>
								{/each}
							</ul>
						</div>
					</div>
				{:else if !hasApiKey()}
					<p class="details-placeholder">
						<a href="/einstellungen">API Key einrichten</a>, um Details zu generieren.
					</p>
				{:else}
					<p class="details-placeholder">
						Klicke auf "Details generieren", um Gerüchte, Aktivitäten und Entdeckungen für diesen Ort zu erstellen.
					</p>
				{/if}
			</div>

			<!-- Ort Geschichte Section -->
			<div class="ort-geschichte-section">
				<button class="geschichte-header" onclick={() => geschichteExpanded = !geschichteExpanded}>
					<h3>Geschichte des Ortes</h3>
					<span class="geschichte-toggle">{geschichteExpanded ? '▼' : '▶'}</span>
				</button>

				{#if geschichteExpanded}
					<div class="geschichte-content">
						{#if hasApiKey()}
							<button
								class="btn btn-sm btn-secondary geschichte-generate-btn"
								onclick={generiereOrtGeschichte}
								disabled={isGeneratingGeschichte}
							>
								{#if isGeneratingGeschichte}
									Generiere...
								{:else if generierterOrt?.geschichte?.length}
									Neu generieren
								{:else}
									Geschichte generieren
								{/if}
							</button>
						{/if}

						{#if geschichteError}
							<p class="geschichte-error">{geschichteError}</p>
						{/if}

						{#if generierterOrt?.geschichte?.length}
							<div class="geschichte-timeline">
								{#each generierterOrt.geschichte as event}
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<div class="geschichte-event" onclick={handleDetailsClick}>
										{#if event.jahr}
											<span class="event-jahr">{event.jahr}</span>
										{/if}
										<p class="event-text">{@html highlightBekannteInText(event.event).html}</p>
									</div>
								{/each}
							</div>
						{:else if !hasApiKey()}
							<p class="geschichte-placeholder">
								<a href="/einstellungen">API Key einrichten</a>, um die Geschichte zu generieren.
							</p>
						{:else}
							<p class="geschichte-placeholder">
								Generiere zuerst Details, dann klicke auf "Geschichte generieren" für eine Zeitleiste der Ereignisse.
							</p>
						{/if}
					</div>
				{/if}
			</div>

			<div class="result-actions">
				{#if bearbeitungsModus}
					<button class="btn btn-primary" onclick={speichereAktuellenOrt}>
						Änderungen speichern
					</button>
				{/if}
				<button class="btn btn-secondary" onclick={generiereOrt}>
					Neuen Ort erschaffen
				</button>
				{#if bearbeitungsModus}
					<button class="btn btn-outline" onclick={abbrechenBearbeitung}>
						Abbrechen
					</button>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Image Modal mit Galerie -->
	{#if showImageModal && generierterOrt?.bilder?.length}
		<ImageGalleryModal
			images={generierterOrt.bilder}
			currentIndex={galerieIndex}
			alt={generierterOrt.name}
			caption={generierterOrt.name}
			onClose={() => showImageModal = false}
			onIndexChange={(i) => galerieIndex = i}
			onRegenerate={() => anmerkungenExpanded = true}
			onDelete={removeImage}
		/>
	{/if}

	<div class="divider"></div>

	<!-- Naturelle-Rad (gruppiert nach Kategorie) -->
	<div class="naturelle-rad-gruppiert">
		{#each kategorien as kat}
			<div class="rad-gruppe" data-farbe={kat.farbe}>
				<span class="rad-gruppe-label">{kat.name}</span>
				<div class="rad-gruppe-naturelle">
					{#each kat.naturelle as naturell}
						<button class="rad-segment" data-farbe={kat.farbe} onclick={() => scrollToNaturell(naturell.name)}>
							<img src={naturell.bild} alt={naturell.name} class="rad-bild" />
							<span class="rad-name">{naturell.name}</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="divider"></div>

	<!-- Detaillierte Kategorien -->
	{#each kategorien as kategorie}
		<section class="kategorie" data-farbe={kategorie.farbe}>
			<header class="kategorie-header">
				<h2>{kategorie.name}</h2>
				<p>{kategorie.beschreibung}</p>
			</header>

			<div class="naturelle-liste">
				{#each kategorie.naturelle as naturell}
					<article
						class="naturell-card card"
						data-farbe={kategorie.farbe}
						id="naturell-{naturell.name.toLowerCase().replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ß/g, 'ss').replace(/ /g, '-')}"
					>
						<header>
							<img src={naturell.bild} alt={naturell.name} class="naturell-bild" />
							<div>
								<h3>{naturell.name}</h3>
								<p class="beschreibung">{naturell.beschreibung}</p>
							</div>
						</header>

						<div class="naturell-details">
							<div class="kann-immer">
								<h4>Dies kann der Ort immer tun:</h4>
								<ul>
									{#each naturell.kannImmer as aktion}
										<li>{aktion}</li>
									{/each}
								</ul>
							</div>

							<div class="stimmung">
								<h4>Stimmungselemente</h4>
								<div class="tags">
									{#each naturell.stimmung as element}
										<span class="tag" class:magisch={isMagisch(element)} class:trauma={isTrauma(element)}>{getText(element)}</span>
									{/each}
								</div>
							</div>

							<div class="volkssagen">
								<h4>Volkssagen</h4>
								<ul class="sagen-liste">
									{#each naturell.volkssagen as sage}
										<li class:magisch-text={isMagisch(sage)}>{getText(sage)}</li>
									{/each}
								</ul>
							</div>
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/each}

	<div class="divider"></div>

	<section class="beispiel card">
		<h2>Beispiel: Die Nebelbrücke</h2>
		<p>
			<strong>Naturelle:</strong> Brücke + Moor + Höhle
		</p>
		<p>
			Eine uralte Steinbrücke führt über ein nebelverhangenes Moor.
			Unter der Brücke öffnet sich ein dunkler Höhleneingang.
			Im Nebel flüstern die Irrlichter Geschichten von früher.
		</p>
		<p>
			<strong>Bewohner:</strong> Frösche, Reiher, ein scheuer Dachs<br>
			<strong>Kleine Wesen:</strong> Nebel-Gnome, die im Moor leben
		</p>
	</section>

	<div class="divider"></div>

	<section class="text-center">
		<h2>Ort erschaffen?</h2>
		<p>Schaut euch an, in welcher Jahreszeit ihr spielt!</p>
		<a href="/jahreskreis" class="btn btn-primary mt-md">Zum Jahreskreis</a>
	</section>
</div>

<!-- Region Editor Modal -->
{#if showRegionEditor}
	<RegionEditor
		region={bearbeiteteRegion ?? undefined}
		onSave={speichereRegion}
		onCancel={() => { showRegionEditor = false; bearbeiteteRegion = null; }}
	/>
{/if}

<style>
	.intro {
		font-size: 1.25rem;
		max-width: 700px;
	}

	/* Generator styles - matching Bekannte */
	.generator-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
		margin-bottom: var(--space-md);
		padding: var(--space-md);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
	}

	.generate-btn {
		padding: var(--space-sm) var(--space-lg);
		font-size: 1rem;
	}

	.compact-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		user-select: none;
		transition: all 0.2s ease;
		opacity: 0.5;
		border: 2px solid transparent;
	}

	.compact-toggle input {
		display: none;
	}

	.compact-toggle.active {
		opacity: 1;
	}

	.compact-toggle:hover {
		opacity: 0.8;
	}

	.compact-toggle.active:hover {
		opacity: 1;
	}

	.symbol-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		font-weight: bold;
		font-size: 1.1rem;
		transition: transform 0.2s ease;
	}

	.compact-toggle.active .symbol-btn {
		transform: scale(1.1);
	}

	.symbol-btn.magic {
		background: linear-gradient(135deg, #9c7c38, #c9a227);
		color: white;
	}

	.symbol-btn.trauma {
		background: linear-gradient(135deg, #8e7cc3, #6a5acd);
		color: white;
	}

	.toggle-text {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-earth-dark);
	}

	.generator-options {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-parchment);
		border-radius: var(--radius-md);
	}

	.option-group {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.option-label {
		font-size: 0.9rem;
		color: var(--color-earth-dark);
	}

	.range-input {
		width: 100px;
		accent-color: var(--color-earth);
	}

	.kategorie-filter {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		align-items: center;
	}

	.filter-btn {
		padding: var(--space-xs) var(--space-sm);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		transition: all 0.2s ease;
		opacity: 0.5;
	}

	.filter-btn:hover {
		opacity: 0.8;
	}

	.filter-btn.active {
		opacity: 1;
		border-color: var(--color-earth);
	}

	.filter-btn[data-farbe="warm"].active { border-color: #d4a574; background: rgba(212, 165, 116, 0.15); }
	.filter-btn[data-farbe="nature"].active { border-color: #7cb342; background: rgba(124, 179, 66, 0.15); }
	.filter-btn[data-farbe="connect"].active { border-color: #5c9ead; background: rgba(92, 158, 173, 0.15); }
	.filter-btn[data-farbe="grand"].active { border-color: #9c7c38; background: rgba(156, 124, 56, 0.15); }
	.filter-btn[data-farbe="lonely"].active { border-color: #8e7cc3; background: rgba(142, 124, 195, 0.15); }
	.filter-btn[data-farbe="desolate"].active { border-color: #8b4513; background: rgba(139, 69, 19, 0.15); }

	/* Result styles */
	.result-section {
		margin: var(--space-lg) 0;
		padding: var(--space-lg);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		border-left: 4px solid var(--color-earth);
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.result-title {
		font-family: var(--font-display);
		font-size: 2rem;
		margin: 0;
		color: var(--color-earth-dark);
		text-align: center;
		cursor: text;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease;
		outline: none;
	}

	.result-title:hover {
		background-color: rgba(139, 119, 101, 0.1);
	}

	.result-title:focus {
		background-color: rgba(139, 119, 101, 0.15);
		box-shadow: 0 0 0 2px var(--color-earth-light);
	}

	.result-naturelle {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.result-naturell-card {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-earth);
	}

	.result-naturell-card[data-farbe="warm"] { border-left-color: #d4a574; }
	.result-naturell-card[data-farbe="nature"] { border-left-color: #7cb342; }
	.result-naturell-card[data-farbe="connect"] { border-left-color: #5c9ead; }
	.result-naturell-card[data-farbe="grand"] { border-left-color: #9c7c38; }
	.result-naturell-card[data-farbe="lonely"] { border-left-color: #8e7cc3; }
	.result-naturell-card[data-farbe="desolate"] { border-left-color: #8b4513; }

	/* Haupt-Naturell Hervorhebung */
	.result-naturell-card.ist-haupt {
		border-left-width: 8px;
		border-left-color: #c9a227 !important;
		background: linear-gradient(90deg, rgba(201, 162, 39, 0.12), var(--color-cream));
		box-shadow: 0 2px 12px rgba(201, 162, 39, 0.25);
	}

	.result-naturell-bild {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 2px solid var(--color-earth-light);
	}

	.result-naturell-info h3 {
		margin-bottom: var(--space-xs);
		font-family: var(--font-display);
	}

	.result-beschreibung {
		font-size: 0.9rem;
		color: var(--color-earth);
		margin-bottom: var(--space-sm);
	}

	.result-stimmung {
		font-size: 0.85rem;
	}

	.stimmung-tag {
		display: inline-block;
		padding: 2px 8px;
		margin: 2px;
		background: var(--color-earth-light);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
	}

	.stimmung-tag.magisch {
		background: linear-gradient(135deg, rgba(156, 124, 56, 0.2), rgba(201, 162, 39, 0.2));
		border: 1px solid #c9a227;
	}

	.stimmung-tag.trauma {
		background: linear-gradient(135deg, rgba(142, 124, 195, 0.2), rgba(106, 90, 205, 0.2));
		border: 1px solid #8e7cc3;
	}

	/* Bekannte section */
	.result-bekannte {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-earth-light);
	}

	.bekannte-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.bekannte-header h3 {
		margin: 0;
		font-family: var(--font-display);
	}

	.bekannte-controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.bekannte-ctrl-btn {
		width: 32px;
		height: 32px;
		border: 2px solid var(--color-earth);
		border-radius: 50%;
		background: var(--color-cream);
		color: var(--color-earth-dark);
		font-size: 1.2rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bekannte-ctrl-btn:hover:not(:disabled) {
		background: var(--color-earth);
		color: var(--color-cream);
	}

	.bekannte-ctrl-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.bekannte-count {
		font-weight: 600;
		font-size: 1rem;
		min-width: 20px;
		text-align: center;
	}

	.bekannte-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 900px) {
		.bekannte-list {
			grid-template-columns: 1fr;
		}
	}

	.bekannte-item {
		position: relative;
	}

	.bekannte-remove-btn {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 32px;
		height: 32px;
		border: 2px solid var(--color-earth-light);
		border-radius: 50%;
		background: var(--color-cream);
		color: var(--color-earth);
		font-size: 1.2rem;
		cursor: pointer;
		opacity: 0.7;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bekannte-remove-btn:hover {
		opacity: 1;
		background: #c0392b;
		border-color: #c0392b;
		color: white;
	}

	.keine-bekannte {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
		padding: var(--space-md);
	}

	/* Naturelle-Rad gruppiert */
	.naturelle-rad-gruppiert {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-md);
		padding: var(--space-lg);
	}

	.rad-gruppe {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-lg);
		border: 2px solid var(--color-earth-light);
		border-top: 4px solid var(--color-earth);
	}

	.rad-gruppe[data-farbe="warm"] { border-top-color: #d4a574; background: linear-gradient(to bottom, rgba(212, 165, 116, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="nature"] { border-top-color: #7cb342; background: linear-gradient(to bottom, rgba(124, 179, 66, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="connect"] { border-top-color: #5c9ead; background: linear-gradient(to bottom, rgba(92, 158, 173, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="grand"] { border-top-color: #9c7c38; background: linear-gradient(to bottom, rgba(156, 124, 56, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="lonely"] { border-top-color: #8e7cc3; background: linear-gradient(to bottom, rgba(142, 124, 195, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="desolate"] { border-top-color: #8b4513; background: linear-gradient(to bottom, rgba(139, 69, 19, 0.15), var(--color-cream)); }

	.rad-gruppe-label {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-earth-dark);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-earth-light);
		width: 100%;
		text-align: center;
	}

	.rad-gruppe-naturelle {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-xs);
	}

	.rad-segment {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-parchment);
		border-radius: var(--radius-md);
		min-width: 80px;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
	}

	.rad-segment:hover {
		transform: scale(1.08);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
	}

	.rad-segment:focus-visible {
		outline: 2px solid var(--color-earth);
		outline-offset: 2px;
	}

	.rad-bild {
		width: 70px;
		height: 70px;
		object-fit: cover;
		border-radius: 50%;
		border: 2px solid var(--color-earth-light);
	}

	.rad-name {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.8rem;
		color: var(--color-earth-dark);
		text-align: center;
	}

	/* Kategorien */
	.kategorie {
		margin-bottom: var(--space-xl);
	}

	.kategorie-header {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 2px solid var(--color-earth-light);
	}

	.kategorie-header h2 {
		margin: 0 0 var(--space-xs) 0;
	}

	.kategorie-header p {
		margin: 0;
		color: var(--color-earth);
		font-style: italic;
	}

	/* Naturelle-Liste */
	.naturelle-liste {
		display: grid;
		gap: var(--space-lg);
	}

	.naturell-card {
		border-left: 4px solid var(--color-earth);
		scroll-margin-top: var(--space-lg);
		transition: box-shadow 0.3s ease;
	}

	.naturell-card.highlight {
		animation: highlight-pulse 1.5s ease;
	}

	@keyframes highlight-pulse {
		0%, 100% { box-shadow: none; }
		20%, 80% { box-shadow: 0 0 0 3px var(--color-earth-light), 0 4px 16px rgba(0, 0, 0, 0.15); }
	}

	.naturell-card[data-farbe="warm"] { border-left-color: #d4a574; }
	.naturell-card[data-farbe="nature"] { border-left-color: #7cb342; }
	.naturell-card[data-farbe="connect"] { border-left-color: #5c9ead; }
	.naturell-card[data-farbe="grand"] { border-left-color: #9c7c38; }
	.naturell-card[data-farbe="lonely"] { border-left-color: #8e7cc3; }
	.naturell-card[data-farbe="desolate"] { border-left-color: #8b4513; }

	.naturell-card header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.naturell-bild {
		width: 100px;
		height: 100px;
		object-fit: cover;
		border-radius: 50%;
		border: 3px solid var(--color-earth-light);
		flex-shrink: 0;
	}

	.naturell-card h3 {
		margin: 0 0 var(--space-xs) 0;
		font-size: 1.3rem;
	}

	.naturell-card .beschreibung {
		margin: 0;
		font-size: 1.05rem;
		color: var(--color-earth-dark);
	}

	.naturell-details {
		display: grid;
		gap: var(--space-md);
	}

	.kann-immer h4,
	.stimmung h4,
	.volkssagen h4 {
		font-size: 0.95rem;
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-leaf-dark);
	}

	.kann-immer ul {
		padding-left: var(--space-lg);
		margin: 0;
	}

	.kann-immer li {
		margin-bottom: var(--space-xs);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tag {
		background: var(--color-earth-light);
		color: var(--color-bark);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
	}

	.tag.magisch {
		background: linear-gradient(135deg, rgba(123, 104, 238, 0.3), rgba(147, 112, 219, 0.3));
		border: 1px solid #9370db;
	}

	.tag.trauma {
		background: linear-gradient(135deg, rgba(205, 133, 63, 0.3), rgba(139, 69, 19, 0.3));
		border: 1px solid #cd853f;
	}

	.magisch-text {
		color: #7b68ee;
	}

	.sagen-liste {
		padding-left: var(--space-lg);
		margin: 0;
		font-style: italic;
	}

	.sagen-liste li {
		margin-bottom: var(--space-xs);
	}

	.beispiel {
		background: linear-gradient(135deg, var(--color-parchment), var(--color-cream));
	}

	.beispiel h2 {
		color: var(--color-leaf-dark);
	}


	@media (min-width: 768px) {
		.naturelle-liste {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1200px) {
		.naturelle-liste {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	/* Gespeicherte Orte */
	.gespeicherte-orte-section {
		background: var(--color-parchment);
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
		border: 2px solid var(--color-earth-light);
	}

	.gespeicherte-orte-section h3 {
		margin: 0 0 var(--space-md) 0;
		font-size: 1rem;
		color: var(--color-earth-dark);
	}

	.gespeicherte-orte-liste {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.gespeicherter-ort-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border-left: 3px solid var(--color-leaf);
	}

	.ort-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ort-meta {
		font-size: 0.8rem;
		color: var(--color-earth);
	}

	.ort-actions {
		display: flex;
		gap: var(--space-xs);
	}

	.btn-sm {
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.8rem;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
		border: none;
	}

	.btn-danger:hover {
		background: #c82333;
	}

	.btn-outline {
		background: transparent;
		border: 2px solid var(--color-earth);
		color: var(--color-earth-dark);
	}

	.btn-outline:hover {
		background: var(--color-earth-light);
	}

	/* Result Section Erweiterungen */
	.result-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		position: relative;
	}

	.result-section.bearbeitung {
		border: 2px solid var(--color-leaf);
	}

	.bearbeitung-badge {
		position: absolute;
		top: 0;
		right: 0;
		background: var(--color-leaf);
		color: white;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-size: 0.8rem;
		font-weight: 600;
	}

	.result-actions {
		display: flex;
		gap: var(--space-md);
		margin-top: var(--space-lg);
		flex-wrap: wrap;
	}

	.bekannte-hint {
		font-size: 0.85rem;
		color: var(--color-earth);
		margin-bottom: var(--space-sm);
		font-style: italic;
	}

	@media (max-width: 600px) {
		.gespeicherter-ort-card {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-sm);
		}

		.ort-actions {
			width: 100%;
		}

		.ort-actions button {
			flex: 1;
		}
	}

	/* Ort Image Section - Compact Landscape */
	.ort-image-section {
		margin-bottom: var(--space-lg);
	}

	.ort-image-container {
		position: relative;
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}

	.ort-image-button {
		display: block;
		width: 100%;
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.ort-image-button:hover {
		transform: scale(1.02);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.ort-image {
		width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		border-radius: var(--radius-md);
		border: 3px solid var(--color-earth-light);
	}

	.ort-regenerate-btn {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.9);
		color: var(--color-earth-dark);
		font-size: 1.1rem;
		cursor: pointer;
		opacity: 0;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	.ort-image-container:hover .ort-regenerate-btn {
		opacity: 1;
	}

	.ort-regenerate-btn:hover {
		background: white;
		transform: scale(1.1);
	}

	.ort-regenerate-btn:disabled {
		cursor: wait;
	}

	.ort-image-placeholder,
	.ort-image-placeholder-static {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		width: 140px;
		height: 105px;
		background: linear-gradient(135deg, var(--color-cream), var(--color-earth-light));
		border: 2px dashed var(--color-earth-light);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.ort-image-placeholder:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--color-earth-light), var(--color-cream));
		border-color: var(--color-earth);
	}

	.ort-image-placeholder:disabled {
		cursor: wait;
	}

	.ort-image-placeholder-static {
		cursor: default;
	}

	.ort-placeholder-icon {
		font-size: 1.5rem;
	}

	.ort-placeholder-text {
		font-size: 0.7rem;
		color: var(--color-earth);
		text-align: center;
		padding: 0 var(--space-xs);
	}

	.ort-placeholder-spinner {
		width: 24px;
		height: 24px;
		border: 3px solid var(--color-earth-light);
		border-top-color: var(--color-leaf);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.ort-api-hint {
		font-size: 0.85rem;
		color: var(--color-leaf-dark);
		text-decoration: underline;
	}

	.ort-image-error {
		text-align: center;
		color: #c0392b;
		font-size: 0.9rem;
		margin-top: var(--space-sm);
	}

	.scene-description-details {
		margin-top: var(--space-sm);
		font-size: 0.85rem;
		color: var(--color-earth);
	}

	.scene-description-details summary {
		cursor: pointer;
		font-weight: 500;
		color: var(--color-earth-dark);
	}

	.scene-description-details summary:hover {
		color: var(--color-leaf-dark);
	}

	.scene-description-text {
		margin-top: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-sand-light);
		border-radius: var(--radius-sm);
		font-style: italic;
		line-height: 1.5;
	}

	.haupt-tag {
		display: inline-block;
		background: linear-gradient(135deg, #c9a227, #9c7c38);
		color: white;
		padding: 3px 10px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 700;
		margin-left: var(--space-sm);
		vertical-align: middle;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.metaphorisch-tag {
		display: inline-block;
		background: linear-gradient(135deg, #7b68ee, #9370db);
		color: white;
		padding: 3px 10px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: 700;
		margin-left: var(--space-sm);
		vertical-align: middle;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	/* Bild + Anmerkungen Layout */
	.bild-anmerkungen-row {
		display: flex;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
		align-items: flex-start;
	}

	.bild-anmerkungen-row .ort-image-section {
		flex-shrink: 0;
		margin-bottom: 0;
		width: auto;
	}

	.bild-anmerkungen-row .ort-image-container {
		margin: 0;
	}

	.ort-image-counter {
		position: absolute;
		bottom: var(--space-sm);
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.6);
		color: white;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
	}

	/* Orts-Beschreibung Section */
	.ort-beschreibung-section {
		margin: var(--space-md) 0;
		position: relative;
	}

	.ort-beschreibung-display {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-md);
		background: linear-gradient(135deg, var(--color-cream) 0%, var(--color-parchment) 100%);
		border-left: 4px solid var(--color-leaf);
		border-radius: 0 var(--radius-md) var(--radius-md) 0;
	}

	.ort-beschreibung-text {
		flex: 1;
		margin: 0;
		font-size: 1rem;
		line-height: 1.6;
		color: var(--color-earth-dark);
		font-style: italic;
	}

	.ort-beschreibung-actions {
		display: flex;
		flex-direction: column;
		gap: 4px;
		opacity: 0.5;
		transition: opacity 0.2s;
	}

	.ort-beschreibung-display:hover .ort-beschreibung-actions {
		opacity: 1;
	}

	.ort-beschreibung-edit-btn,
	.ort-beschreibung-regenerate-btn {
		width: 28px;
		height: 28px;
		padding: 0;
		border: none;
		background: var(--color-earth-light);
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.ort-beschreibung-edit-btn:hover,
	.ort-beschreibung-regenerate-btn:hover:not(:disabled) {
		background: var(--color-leaf);
		color: white;
	}

	.ort-beschreibung-regenerate-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.ort-beschreibung-textarea {
		width: 100%;
		margin-top: var(--space-sm);
		padding: var(--space-sm);
		border: 2px solid var(--color-leaf-light);
		border-radius: var(--radius-md);
		background: white;
		font-family: inherit;
		font-size: 0.95rem;
		resize: vertical;
		line-height: 1.5;
	}

	.ort-beschreibung-textarea:focus {
		outline: none;
		border-color: var(--color-leaf);
	}

	.ort-beschreibung-generate-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: linear-gradient(135deg, var(--color-leaf-light) 0%, var(--color-leaf) 100%);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 1rem;
		font-weight: 600;
		color: white;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.ort-beschreibung-generate-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
	}

	.ort-beschreibung-generate-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.ort-beschreibung-hint {
		padding: var(--space-md);
		font-size: 0.9rem;
		color: var(--color-earth);
		font-style: italic;
		text-align: center;
		background: var(--color-cream);
		border-radius: var(--radius-md);
	}

	.ort-beschreibung-hint a {
		color: var(--color-leaf);
		text-decoration: underline;
	}

	.ort-beschreibung-error {
		margin-top: var(--space-sm);
		padding: var(--space-sm);
		color: var(--color-berry);
		font-size: 0.85rem;
		background: rgba(220, 53, 69, 0.1);
		border-radius: var(--radius-sm);
	}

	/* Anmerkungen Section */
	.anmerkungen-section {
		flex: 1;
		min-width: 200px;
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-earth-light);
		overflow: hidden;
		align-self: flex-start;
	}

	.anmerkungen-section.collapsed {
		flex: 0 0 auto;
		min-width: auto;
		width: auto;
	}

	.anmerkungen-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-earth-light);
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-earth-dark);
	}

	.anmerkungen-header:hover {
		background: var(--color-earth);
		color: white;
	}

	.anmerkungen-toggle {
		font-size: 0.8rem;
	}

	.anmerkungen-textarea {
		width: 100%;
		min-height: 80px;
		padding: var(--space-sm);
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.9rem;
		resize: vertical;
	}

	.anmerkungen-textarea:focus {
		outline: none;
	}

	.anmerkungen-textarea::placeholder {
		color: var(--color-earth);
		font-style: italic;
	}

	.gemini-szene-details {
		margin: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-earth-light);
	}

	.gemini-szene-details summary {
		padding: var(--space-sm);
		cursor: pointer;
		font-size: 0.85rem;
		color: var(--color-earth);
		font-weight: 500;
	}

	.gemini-szene-details summary:hover {
		color: var(--color-earth-dark);
	}

	.gemini-szene-text {
		padding: 0 var(--space-sm) var(--space-sm);
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-earth-dark);
		line-height: 1.5;
		font-style: italic;
	}

	/* Beschreibungs-Anmerkungen Section */
	.beschreibungs-anmerkungen-section {
		margin-bottom: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-leaf-light, var(--color-earth-light));
		overflow: hidden;
	}

	.beschreibungs-anmerkungen-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		background: rgba(107, 142, 78, 0.2);
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-leaf-dark);
	}

	.beschreibungs-anmerkungen-header:hover {
		background: rgba(107, 142, 78, 0.35);
	}

	.beschreibungs-anmerkungen-title {
		font-size: 0.85rem;
	}

	.beschreibungs-anmerkungen-toggle {
		font-size: 0.8rem;
	}

	.beschreibungs-anmerkungen-textarea {
		width: 100%;
		min-height: 70px;
		padding: var(--space-sm);
		border: none;
		background: transparent;
		font-family: inherit;
		font-size: 0.9rem;
		resize: vertical;
	}

	.beschreibungs-anmerkungen-textarea:focus {
		outline: none;
	}

	.beschreibungs-anmerkungen-textarea::placeholder {
		color: var(--color-earth);
		font-style: italic;
	}

	.beschreibungs-anmerkungen-hint {
		margin: 0;
		padding: var(--space-xs) var(--space-sm) var(--space-sm);
		font-size: 0.8rem;
		color: var(--color-earth);
		font-style: italic;
	}

	@media (max-width: 600px) {
		.bild-anmerkungen-row {
			flex-direction: column;
		}

		.bild-anmerkungen-row .ort-image-section {
			width: 100%;
		}

		.anmerkungen-section {
			width: 100%;
		}
	}

	/* Region Management Styles */
	.regionen-section {
		background: var(--color-parchment);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
		border: 2px solid var(--color-earth-light);
	}

	.regionen-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.regionen-header h3 {
		margin: 0;
		font-size: 1.1rem;
		color: var(--color-bark);
	}

	.regionen-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.regionen-liste {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	/* Aktive Region Info */
	.aktive-region-info {
		background: linear-gradient(135deg, rgba(107, 142, 78, 0.1) 0%, var(--color-cream) 100%);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
		border: 2px solid var(--color-leaf);
	}

	.aktive-region-info h4 {
		margin: 0 0 var(--space-sm) 0;
		font-family: var(--font-display);
		color: var(--color-leaf-dark);
	}

	.region-besonderheiten {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.besonderheit-gruppe {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.besonderheit-label {
		font-size: 0.85rem;
		color: var(--color-earth);
		font-weight: 600;
		min-width: 100px;
	}

	.besonderheit-tag {
		display: inline-block;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		background: var(--color-earth-light);
	}

	.besonderheit-tag.geo {
		background: rgba(139, 119, 101, 0.2);
		border: 1px solid rgba(139, 119, 101, 0.4);
	}

	.besonderheit-tag.flora {
		background: rgba(107, 142, 78, 0.2);
		border: 1px solid rgba(107, 142, 78, 0.4);
	}

	.besonderheit-tag.arch {
		background: rgba(156, 124, 56, 0.2);
		border: 1px solid rgba(156, 124, 56, 0.4);
	}

	@media (max-width: 500px) {
		.regionen-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.regionen-actions {
			width: 100%;
		}

		.regionen-actions button {
			flex: 1;
		}

		.besonderheit-gruppe {
			flex-direction: column;
			align-items: flex-start;
		}

		.besonderheit-label {
			min-width: auto;
		}
	}

	/* Ort Details Section */
	.ort-details-section {
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-earth-light);
	}

	.details-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.details-header h3 {
		margin: 0;
		font-family: var(--font-display);
		color: var(--color-earth-dark);
	}

	.details-content {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-lg);
	}

	@media (max-width: 900px) {
		.details-content {
			grid-template-columns: 1fr;
		}
	}

	.details-column h4 {
		margin: 0 0 var(--space-sm) 0;
		font-size: 0.95rem;
		color: var(--color-leaf-dark);
		border-bottom: 2px solid var(--color-earth-light);
		padding-bottom: var(--space-xs);
	}

	.details-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.details-list li {
		padding: var(--space-sm);
		margin-bottom: var(--space-xs);
		background: var(--color-parchment);
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
		line-height: 1.4;
		border-left: 3px solid var(--color-earth-light);
	}

	.details-list.geruechte li {
		border-left-color: #8e7cc3;
	}

	.details-list.aktivitaeten li {
		border-left-color: #7cb342;
	}

	.details-list.entdeckungen li {
		border-left-color: #c9a227;
	}

	.details-placeholder {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
		padding: var(--space-md);
	}

	.details-placeholder a {
		color: var(--color-leaf-dark);
	}

	.details-error {
		color: #c0392b;
		font-size: 0.9rem;
		text-align: center;
		margin-bottom: var(--space-sm);
	}

	/* Ort Geschichte Section */
	.ort-geschichte-section {
		margin-top: var(--space-lg);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-earth-light);
		overflow: hidden;
	}

	.geschichte-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: linear-gradient(135deg, rgba(156, 124, 56, 0.15), var(--color-earth-light));
		border: none;
		cursor: pointer;
		font-family: inherit;
	}

	.geschichte-header:hover {
		background: linear-gradient(135deg, rgba(156, 124, 56, 0.25), var(--color-earth-light));
	}

	.geschichte-header h3 {
		margin: 0;
		font-family: var(--font-display);
		color: var(--color-earth-dark);
		font-size: 1rem;
	}

	.geschichte-toggle {
		font-size: 0.9rem;
		color: var(--color-earth);
	}

	.geschichte-content {
		padding: var(--space-lg);
	}

	.geschichte-generate-btn {
		margin-bottom: var(--space-md);
	}

	.geschichte-error {
		color: #c0392b;
		font-size: 0.9rem;
		margin-bottom: var(--space-sm);
	}

	.geschichte-placeholder {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
	}

	.geschichte-placeholder a {
		color: var(--color-leaf-dark);
	}

	.geschichte-timeline {
		position: relative;
		padding-left: var(--space-lg);
		border-left: 3px solid var(--color-earth-light);
	}

	.geschichte-event {
		position: relative;
		padding-bottom: var(--space-md);
	}

	.geschichte-event:last-child {
		padding-bottom: 0;
	}

	.geschichte-event::before {
		content: '';
		position: absolute;
		left: calc(-1 * var(--space-lg) - 6px);
		top: 4px;
		width: 12px;
		height: 12px;
		background: var(--color-earth);
		border-radius: 50%;
		border: 2px solid var(--color-cream);
	}

	.event-jahr {
		display: inline-block;
		background: linear-gradient(135deg, #9c7c38, #c9a227);
		color: white;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
		font-weight: 600;
		margin-bottom: var(--space-xs);
	}

	.event-text {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--color-earth-dark);
	}

	/* Bekannte Links in Details */
	:global(.bekannte-link) {
		background: linear-gradient(135deg, rgba(107, 142, 78, 0.2), rgba(107, 142, 78, 0.3));
		border: 1px solid var(--color-leaf);
		border-radius: var(--radius-sm);
		padding: 1px 6px;
		font-family: inherit;
		font-size: inherit;
		font-weight: 600;
		color: var(--color-leaf-dark);
		cursor: pointer;
		transition: all 0.2s ease;
	}

	:global(.bekannte-link:hover) {
		background: linear-gradient(135deg, rgba(107, 142, 78, 0.4), rgba(107, 142, 78, 0.5));
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	:global(.bekannte-link:active) {
		transform: translateY(0);
	}

	/* Highlight animation for bekannte-item */
	.bekannte-item.highlight {
		animation: bekannte-highlight-pulse 1.5s ease;
	}

	@keyframes bekannte-highlight-pulse {
		0%, 100% { box-shadow: none; }
		20%, 80% { box-shadow: 0 0 0 3px var(--color-leaf), 0 4px 16px rgba(107, 142, 78, 0.3); }
	}

	/* Gottheiten Section */
	.result-gottheiten {
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		background: linear-gradient(135deg, rgba(201, 162, 39, 0.05), rgba(139, 105, 20, 0.08));
		border-radius: var(--radius-lg);
		border: 2px solid rgba(201, 162, 39, 0.3);
	}

	.gottheiten-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.gottheiten-header h3 {
		margin: 0;
		color: #8b6914;
		font-size: 1.1rem;
	}

	.gottheiten-controls {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.gottheiten-ctrl-btn {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid #c9a227;
		background: linear-gradient(135deg, #fff9e6, #f5e6c8);
		color: #8b6914;
		font-size: 1rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.gottheiten-ctrl-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #c9a227, #a07d1c);
		color: white;
		transform: scale(1.05);
	}

	.gottheiten-ctrl-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.gottheiten-count {
		min-width: 24px;
		text-align: center;
		font-weight: 600;
		color: #8b6914;
	}

	.gottheiten-hint {
		font-style: italic;
		color: #8b6914;
		font-size: 0.9rem;
		margin-bottom: var(--space-md);
	}

	.gottheiten-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.gottheit-item {
		transition: all 0.3s ease;
		border-radius: var(--radius-md);
	}

	.keine-gottheiten {
		text-align: center;
		color: #8b6914;
		font-style: italic;
		padding: var(--space-md);
	}

	/* Gottheit Links in Text (golden/mystical style) */
	:global(.gottheit-link) {
		background: linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(201, 162, 39, 0.35));
		border: 1px solid #c9a227;
		border-radius: var(--radius-sm);
		padding: 1px 6px;
		font-family: inherit;
		font-size: inherit;
		font-weight: 600;
		color: #8b6914;
		cursor: pointer;
		transition: all 0.2s ease;
		text-shadow: 0 0 2px rgba(201, 162, 39, 0.3);
	}

	:global(.gottheit-link:hover) {
		background: linear-gradient(135deg, rgba(201, 162, 39, 0.4), rgba(201, 162, 39, 0.55));
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(201, 162, 39, 0.3), 0 0 4px rgba(201, 162, 39, 0.2);
	}

	:global(.gottheit-link:active) {
		transform: translateY(0);
	}

	/* Highlight animation for gottheit-item */
	.gottheit-item.highlight {
		animation: gottheit-highlight-pulse 1.5s ease;
	}

	@keyframes gottheit-highlight-pulse {
		0%, 100% { box-shadow: none; }
		20%, 80% { box-shadow: 0 0 0 3px #c9a227, 0 4px 16px rgba(201, 162, 39, 0.4); }
	}

	/* ==========================================
	   Spielleiter-Chat Styles
	   ========================================== */

	.spielleiter-chat-section {
		margin-top: var(--space-xl);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		border: 2px solid var(--color-leaf);
		overflow: hidden;
	}

	.spielleiter-chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: linear-gradient(135deg, rgba(107, 142, 78, 0.2), rgba(107, 142, 78, 0.35));
		border: none;
		cursor: pointer;
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-leaf-dark);
		transition: background 0.2s;
	}

	.spielleiter-chat-header:hover {
		background: linear-gradient(135deg, rgba(107, 142, 78, 0.3), rgba(107, 142, 78, 0.45));
	}

	.spielleiter-chat-title {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.chat-count {
		font-size: 0.85rem;
		font-weight: normal;
		color: var(--color-earth);
	}

	.spielleiter-chat-toggle {
		font-size: 0.9rem;
	}

	.spielleiter-chat-content {
		padding: var(--space-md);
	}

	.spielleiter-fakten-box {
		margin-bottom: var(--space-md);
		text-align: center;
	}

	.fakten-toggle {
		padding: var(--space-sm) var(--space-md);
		background: rgba(201, 162, 39, 0.15);
		border: 1px solid #c9a227;
		border-radius: var(--radius-md);
		color: #8b6914;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.fakten-toggle:hover {
		background: rgba(201, 162, 39, 0.3);
	}

	.spielleiter-chat-messages {
		max-height: 400px;
		overflow-y: auto;
		margin-bottom: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		min-height: 100px;
	}

	.chat-empty-hint {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
		padding: var(--space-lg);
	}

	.chat-message {
		margin-bottom: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		animation: fadeIn 0.3s ease;
	}

	.chat-message.nutzer {
		background: rgba(107, 142, 78, 0.15);
		margin-left: var(--space-lg);
		border-left: 3px solid var(--color-leaf);
	}

	.chat-message.spielleiter {
		background: rgba(139, 119, 101, 0.1);
		margin-right: var(--space-lg);
		border-left: 3px solid var(--color-earth);
	}

	.chat-message-header {
		margin-bottom: var(--space-xs);
	}

	.chat-rolle {
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-earth-dark);
	}

	.chat-message.nutzer .chat-rolle {
		color: var(--color-leaf-dark);
	}

	.chat-message-text {
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--color-bark);
	}

	/* Typing Indicator */
	.typing-indicator {
		display: inline-flex;
		gap: 4px;
		padding: var(--space-xs);
	}

	.typing-indicator span {
		width: 8px;
		height: 8px;
		background: var(--color-earth);
		border-radius: 50%;
		animation: typing-bounce 1.4s infinite ease-in-out both;
	}

	.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
	.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

	@keyframes typing-bounce {
		0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
		40% { transform: scale(1); opacity: 1; }
	}

	/* Fakten Vorschläge */
	.chat-fakten-vorschlaege {
		margin-top: var(--space-sm);
		padding-top: var(--space-sm);
		border-top: 1px dashed var(--color-earth-light);
	}

	.fakten-label {
		display: block;
		font-size: 0.8rem;
		color: var(--color-earth);
		margin-bottom: var(--space-xs);
		font-weight: 600;
	}

	.fakt-vorschlag {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		padding: var(--space-xs) var(--space-sm);
		background: rgba(201, 162, 39, 0.1);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-xs);
		font-size: 0.9rem;
	}

	.fakt-vorschlag.akzeptiert {
		background: rgba(107, 142, 78, 0.2);
		border: 1px solid var(--color-leaf);
	}

	.fakt-text {
		flex: 1;
	}

	.fakt-akzeptieren-btn {
		width: 24px;
		height: 24px;
		padding: 0;
		border: none;
		background: var(--color-leaf);
		color: white;
		border-radius: 50%;
		cursor: pointer;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.fakt-akzeptieren-btn:hover {
		background: var(--color-leaf-dark);
		transform: scale(1.1);
	}

	.fakt-akzeptiert-mark {
		color: var(--color-leaf-dark);
		font-weight: bold;
	}

	/* Eingabe */
	.spielleiter-chat-input-area {
		display: flex;
		gap: var(--space-sm);
		align-items: flex-end;
	}

	.spielleiter-chat-input {
		flex: 1;
		padding: var(--space-sm);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.95rem;
		resize: none;
		background: white;
	}

	.spielleiter-chat-input:focus {
		outline: none;
		border-color: var(--color-leaf);
	}

	.spielleiter-chat-input:disabled {
		background: var(--color-cream);
	}

	.spielleiter-send-btn {
		width: 44px;
		height: 44px;
		padding: 0;
		border: none;
		background: var(--color-leaf);
		color: white;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 1.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.spielleiter-send-btn:hover:not(:disabled) {
		background: var(--color-leaf-dark);
	}

	.spielleiter-send-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.spielleiter-chat-actions {
		margin-top: var(--space-md);
		display: flex;
		justify-content: flex-end;
	}

	.spielleiter-no-api {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
	}

	.spielleiter-no-api a {
		color: var(--color-leaf-dark);
		font-weight: 600;
	}

	.spielleiter-error {
		margin-top: var(--space-sm);
		color: #c0392b;
		font-size: 0.9rem;
		text-align: center;
	}

	/* Fakten Modal */
	.fakten-modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
	}

	.fakten-modal {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		max-width: 600px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.fakten-modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		background: linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(201, 162, 39, 0.35));
		border-bottom: 1px solid #c9a227;
	}

	.fakten-modal-header h3 {
		margin: 0;
		color: #8b6914;
		font-size: 1.1rem;
	}

	.fakten-modal-close {
		width: 32px;
		height: 32px;
		padding: 0;
		border: none;
		background: transparent;
		color: #8b6914;
		font-size: 1.5rem;
		cursor: pointer;
		border-radius: 50%;
		transition: all 0.2s;
	}

	.fakten-modal-close:hover {
		background: rgba(201, 162, 39, 0.3);
	}

	.fakten-modal-content {
		padding: var(--space-lg);
		overflow-y: auto;
	}

	.fakten-text {
		margin: 0;
		font-family: inherit;
		font-size: 0.95rem;
		line-height: 1.6;
		white-space: pre-wrap;
		color: var(--color-bark);
	}

</style>
