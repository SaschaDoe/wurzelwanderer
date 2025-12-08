<script lang="ts">
	/**
	 * OrtAnsicht - Wiederverwendbare Komponente für die Anzeige und Bearbeitung eines Ortes
	 * Kann auf der Naturelle-Seite und im Hexkarte-Modal verwendet werden
	 */
	import { hasApiKey, generateSceneDescription, generateImageFromPrompt, generateOrtBeschreibung, generateOrtDetails, generateOrtGeschichte, generateSpielleiterAntwort, fasseSpielleiterChatZusammen, generateGottheitBild, generateGottheitVorgeschichte, generateGottheitFähigkeiten, generateGottheitOpferweg, type RegionInfo, type SpielleiterKontext, type SpielleiterChatNachricht } from '$lib/services/geminiService';
	import BekannterCard from '$lib/components/BekannterCard.svelte';
	import GottheitCard from '$lib/components/GottheitCard.svelte';
	import ImageGalleryModal from '$lib/components/ImageGalleryModal.svelte';
	import { generiereBekanntenData, type GenerierterBekannter } from '$lib/data/merkmale';
	import { type Gottheit, type OrtKontext, erstelleGottheit } from '$lib/data/gottheiten';
	import { getRandomElements } from '$lib/utils/random';
	import { getStimmungText as getText, isMagisch, isTrauma, type StimmungItem } from '$lib/data/naturelle';
	import type { GespeicherterOrt, OrtNaturell } from '$lib/data/ort';

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
		vorgeschlageneFakten?: string[];
		akzeptierteFakten?: string[];
	}

	interface Props {
		// Haupt-Daten
		ort: GespeicherterOrt;
		regionInfo?: RegionInfo;

		// Callbacks
		onUpdate: (ort: GespeicherterOrt) => void;
		onSave?: () => void;

		// Feature Flags
		showBildBereich?: boolean;
		showBeschreibung?: boolean;
		showNaturelle?: boolean;
		showBekannte?: boolean;
		showGottheiten?: boolean;
		showDetails?: boolean;
		showGeschichte?: boolean;
		showSpielleiter?: boolean;

		// Modi
		editable?: boolean;
		compact?: boolean;
		showBearbeitungsBadge?: boolean;

		// Generator-Einstellungen (für neue Bekannte/Gottheiten)
		erlaubeMagisch?: boolean;
		erlaubeTrauma?: boolean;
	}

	let {
		ort = $bindable(),
		regionInfo,
		onUpdate,
		onSave,
		showBildBereich = true,
		showBeschreibung = true,
		showNaturelle = true,
		showBekannte = true,
		showGottheiten = true,
		showDetails = true,
		showGeschichte = true,
		showSpielleiter = true,
		editable = true,
		compact = false,
		showBearbeitungsBadge = false,
		erlaubeMagisch = true,
		erlaubeTrauma = true
	}: Props = $props();

	// Image generation state
	let isGeneratingImage = $state(false);
	let generationPhase = $state<'scene' | 'image' | null>(null);
	let sceneDescription = $state<string | null>(null);
	let imageError = $state<string | null>(null);
	let showImageModal = $state(false);
	let galerieIndex = $state(0);
	let anmerkungenExpanded = $state(true);
	let beschreibungsAnmerkungenExpanded = $state(false);

	// Beschreibung state
	let isGeneratingBeschreibung = $state(false);
	let beschreibungError = $state<string | null>(null);
	let beschreibungExpanded = $state(false);

	// Details & Geschichte state
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

	// Gottheiten state
	let isGeneratingGottheitBild = $state<string | null>(null);
	let isGeneratingGottheitVorgeschichte = $state<string | null>(null);
	let isGeneratingGottheitFähigkeiten = $state<string | null>(null);
	let isGeneratingGottheitOpferweg = $state<string | null>(null);

	// Debounce timers
	let anmerkungenSyncTimer: ReturnType<typeof setTimeout> | null = null;
	let beschreibungSyncTimer: ReturnType<typeof setTimeout> | null = null;
	let beschreibungsAnmerkungenSyncTimer: ReturnType<typeof setTimeout> | null = null;

	// Sync function
	function syncOrt() {
		onUpdate(ort);
	}

	// ==========================================
	// Name bearbeiten
	// ==========================================
	function aktualisiereOrtName(event: Event) {
		if (!editable) return;
		const target = event.target as HTMLElement;
		const neuerName = target.innerText.trim();
		if (neuerName && neuerName !== ort.name) {
			ort = { ...ort, name: neuerName };
			syncOrt();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.target as HTMLElement).blur();
		}
	}

	// ==========================================
	// Bild-Generierung
	// ==========================================
	async function generateImage() {
		if (!editable || isGeneratingImage) return;

		isGeneratingImage = true;
		imageError = null;
		sceneDescription = null;
		generationPhase = 'scene';

		try {
			const extractStimmungText = (items: StimmungItem[]): string[] => {
				return items.map(s => typeof s === 'string' ? s : s.text);
			};

			const ortInfo = {
				name: ort.name,
				hauptNaturell: ort.hauptNaturell || ort.naturelle[0]?.name || '',
				naturelle: ort.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch,
					stimmung: extractStimmungText(n.stimmung)
				})),
				anmerkungen: ort.anmerkungen,
				ortBeschreibung: ort.ortBeschreibung,
				region: regionInfo
			};

			const sceneResult = await generateSceneDescription(ortInfo);
			sceneDescription = sceneResult.sceneDescription;

			generationPhase = 'image';
			const imageData = await generateImageFromPrompt(sceneResult.promptForImage, ort.name);

			if (imageData) {
				const neueBilder = [...(ort.bilder || []), imageData];
				ort = { ...ort, bilder: neueBilder, szenenBeschreibung: sceneDescription || undefined };
				galerieIndex = neueBilder.length - 1;
				anmerkungenExpanded = false;
				syncOrt();
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
		if (!ort.bilder) return;
		const neueBilder = ort.bilder.filter((_, i) => i !== index);
		ort = { ...ort, bilder: neueBilder.length > 0 ? neueBilder : undefined };
		if (galerieIndex >= neueBilder.length) {
			galerieIndex = Math.max(0, neueBilder.length - 1);
		}
		syncOrt();
	}

	function naechstesBild() {
		if (!ort.bilder) return;
		galerieIndex = (galerieIndex + 1) % ort.bilder.length;
	}

	function vorherigesBild() {
		if (!ort.bilder) return;
		galerieIndex = (galerieIndex - 1 + ort.bilder.length) % ort.bilder.length;
	}

	function toggleAnmerkungen() {
		anmerkungenExpanded = !anmerkungenExpanded;
	}

	function updateAnmerkungen(event: Event) {
		if (!editable) return;
		const target = event.target as HTMLTextAreaElement;
		ort = { ...ort, anmerkungen: target.value };
		if (anmerkungenSyncTimer) clearTimeout(anmerkungenSyncTimer);
		anmerkungenSyncTimer = setTimeout(() => syncOrt(), 500);
	}

	// ==========================================
	// Beschreibung
	// ==========================================
	async function generiereOrtBeschreibung() {
		if (!editable || isGeneratingBeschreibung) return;

		isGeneratingBeschreibung = true;
		beschreibungError = null;

		try {
			const input = {
				name: ort.name,
				naturelle: ort.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch
				})),
				region: regionInfo,
				beschreibungsAnmerkungen: ort.beschreibungsAnmerkungen
			};

			const result = await generateOrtBeschreibung(input);
			ort = { ...ort, name: result.suggestedName, ortBeschreibung: result.beschreibung };
			syncOrt();
		} catch (error) {
			beschreibungError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingBeschreibung = false;
		}
	}

	function toggleBeschreibung() {
		beschreibungExpanded = !beschreibungExpanded;
	}

	function updateOrtBeschreibung(event: Event) {
		if (!editable) return;
		const target = event.target as HTMLTextAreaElement;
		ort = { ...ort, ortBeschreibung: target.value };
		if (beschreibungSyncTimer) clearTimeout(beschreibungSyncTimer);
		beschreibungSyncTimer = setTimeout(() => syncOrt(), 500);
	}

	function toggleBeschreibungsAnmerkungen() {
		beschreibungsAnmerkungenExpanded = !beschreibungsAnmerkungenExpanded;
	}

	function updateBeschreibungsAnmerkungen(event: Event) {
		if (!editable) return;
		const target = event.target as HTMLTextAreaElement;
		ort = { ...ort, beschreibungsAnmerkungen: target.value };
		if (beschreibungsAnmerkungenSyncTimer) clearTimeout(beschreibungsAnmerkungenSyncTimer);
		beschreibungsAnmerkungenSyncTimer = setTimeout(() => syncOrt(), 500);
	}

	// ==========================================
	// Bekannte
	// ==========================================
	function fuegeBekanntHinzu() {
		if (!editable) return;
		const neuerBekannter = generiereBekanntenData(erlaubeMagisch, erlaubeTrauma);
		ort = { ...ort, bekannte: [...ort.bekannte, neuerBekannter] };
		syncOrt();
	}

	function entferneBekannten(index: number) {
		if (!editable) return;
		ort = { ...ort, bekannte: ort.bekannte.filter((_, i) => i !== index) };
		syncOrt();
	}

	function aktualisiereBekannten(index: number, updated: GenerierterBekannter) {
		if (!editable) return;
		ort = { ...ort, bekannte: ort.bekannte.map((b, i) => i === index ? updated : b) };
		syncOrt();
	}

	// ==========================================
	// Gottheiten
	// ==========================================
	function fuegeGottheitHinzu() {
		if (!editable) return;
		const ortKontext: OrtKontext = {
			name: ort.name,
			naturelleNamen: ort.naturelle.map(n => n.name),
			naturelleKategorien: [...new Set(ort.naturelle.map(n => n.kategorie))],
			ortBeschreibung: ort.ortBeschreibung
		};
		const neueGottheit = erstelleGottheit({ ortId: ort.id }, ortKontext);
		ort = { ...ort, gottheiten: [...(ort.gottheiten || []), neueGottheit] };
		syncOrt();
	}

	function entferneGottheit(id: string) {
		if (!editable) return;
		ort = { ...ort, gottheiten: (ort.gottheiten || []).filter(g => g.id !== id) };
		syncOrt();
	}

	function aktualisiereGottheit(updated: Gottheit) {
		if (!editable) return;
		ort = { ...ort, gottheiten: (ort.gottheiten || []).map(g => g.id === updated.id ? updated : g) };
		syncOrt();
	}

	async function generiereGottheitBildForOrt(gottheit: Gottheit) {
		isGeneratingGottheitBild = gottheit.id;
		try {
			const ortInfo = {
				name: ort.name,
				naturelleNamen: ort.naturelle.map(n => n.name),
				ortBeschreibung: ort.ortBeschreibung
			};
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
			const ortInfo = {
				name: ort.name,
				naturelleNamen: ort.naturelle.map(n => n.name),
				ortBeschreibung: ort.ortBeschreibung
			};
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
			const ortInfo = {
				name: ort.name,
				naturelleNamen: ort.naturelle.map(n => n.name),
				ortBeschreibung: ort.ortBeschreibung
			};
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
			const ortInfo = {
				name: ort.name,
				naturelleNamen: ort.naturelle.map(n => n.name),
				ortBeschreibung: ort.ortBeschreibung
			};
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

	// ==========================================
	// Details & Geschichte
	// ==========================================
	async function generiereOrtDetails() {
		if (!editable || isGeneratingDetails) return;

		isGeneratingDetails = true;
		detailsError = null;

		try {
			const ortInput = {
				name: ort.name,
				naturelle: ort.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch
				})),
				bekannte: ort.bekannte.map(b => ({
					name: b.name,
					tier: b.tier,
					berufe: b.berufe
				})),
				ortBeschreibung: ort.ortBeschreibung,
				region: regionInfo,
				erlaubeMagisch,
				erlaubeTrauma
			};

			const result = await generateOrtDetails(ortInput);

			ort = {
				...ort,
				details: {
					geruechte: result.geruechte,
					aktivitaeten: result.aktivitaeten,
					entdeckungen: result.entdeckungen
				}
			};
			syncOrt();
		} catch (error) {
			detailsError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingDetails = false;
		}
	}

	async function generiereOrtGeschichte() {
		if (!editable || isGeneratingGeschichte) return;

		if (!ort.details) {
			geschichteError = 'Bitte generiere zuerst die Details für diesen Ort.';
			return;
		}

		isGeneratingGeschichte = true;
		geschichteError = null;

		try {
			const ortInput = {
				name: ort.name,
				naturelle: ort.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch
				})),
				bekannte: ort.bekannte.map(b => ({
					name: b.name,
					tier: b.tier,
					berufe: b.berufe
				})),
				region: regionInfo,
				details: ort.details
			};

			const events = await generateOrtGeschichte(ortInput);
			ort = { ...ort, geschichte: events };
			geschichteExpanded = true;
			syncOrt();
		} catch (error) {
			geschichteError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingGeschichte = false;
		}
	}

	// ==========================================
	// Spielleiter-Chat
	// ==========================================
	function toggleSpielleiterChat() {
		spielleiterChatExpanded = !spielleiterChatExpanded;
	}

	function buildSpielleiterKontext(): SpielleiterKontext | null {
		return {
			ortName: ort.name,
			ortBeschreibung: ort.ortBeschreibung,
			naturelle: ort.naturelle.map(n => ({
				name: n.name,
				beschreibung: n.beschreibung
			})),
			bekannte: ort.bekannte.map(b => ({
				name: b.name,
				tier: b.tier,
				beruf: b.berufe[0] || 'Unbekannt',
				merkmal: b.merkmal.name
			})),
			gottheiten: ort.gottheiten?.map(g => ({
				name: g.name,
				titel: g.beiname || g.name,
				erscheinung: g.erscheinung
			})),
			region: regionInfo ? { name: regionInfo.name } : undefined,
			details: ort.details,
			geschichte: ort.geschichte,
			bisherigeFakten: ort.spielleiterFakten
		};
	}

	function getChatVerlaufForApi(): SpielleiterChatNachricht[] {
		if (!ort.spielleiterChat) return [];
		return ort.spielleiterChat.map(n => ({
			rolle: n.rolle,
			text: n.text
		}));
	}

	async function sendeSpielleiterNachricht() {
		if (!spielleiterInput.trim() || isSpielleiterGenerating) return;

		const nachrichtText = spielleiterInput.trim();
		spielleiterInput = '';
		isSpielleiterGenerating = true;
		spielleiterError = null;

		const userMessage: SpielleiterNachricht = {
			id: crypto.randomUUID(),
			rolle: 'nutzer',
			text: nachrichtText,
			timestamp: new Date().toISOString()
		};

		ort = { ...ort, spielleiterChat: [...(ort.spielleiterChat || []), userMessage] };

		try {
			const kontext = buildSpielleiterKontext();
			if (!kontext) throw new Error('Kein Ort-Kontext');

			const chatVerlauf = getChatVerlaufForApi();
			const result = await generateSpielleiterAntwort(kontext, nachrichtText, chatVerlauf.slice(0, -1));

			if (!result.success || !result.antwort) {
				throw new Error(result.error || 'Keine Antwort erhalten');
			}

			const spielleiterMessage: SpielleiterNachricht = {
				id: crypto.randomUUID(),
				rolle: 'spielleiter',
				text: result.antwort,
				timestamp: new Date().toISOString(),
				vorgeschlageneFakten: result.vorgeschlageneFakten
			};

			ort = { ...ort, spielleiterChat: [...(ort.spielleiterChat || []), spielleiterMessage] };
			syncOrt();
		} catch (error) {
			spielleiterError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isSpielleiterGenerating = false;
		}
	}

	function akzeptiereFakt(nachrichtId: string, faktIndex: number) {
		if (!ort.spielleiterChat) return;

		ort = {
			...ort,
			spielleiterChat: ort.spielleiterChat.map(n => {
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
		syncOrt();
	}

	function istFaktAkzeptiert(nachricht: SpielleiterNachricht, faktIndex: number): boolean {
		if (!nachricht.vorgeschlageneFakten || !nachricht.akzeptierteFakten) return false;
		const fakt = nachricht.vorgeschlageneFakten[faktIndex];
		return nachricht.akzeptierteFakten.includes(fakt);
	}

	async function fasseSpielleiterChatZusammenUndLeere() {
		if (!ort.spielleiterChat || ort.spielleiterChat.length === 0) return;
		if (isZusammenfassend) return;

		isZusammenfassend = true;
		spielleiterError = null;

		try {
			const chatVerlauf = getChatVerlaufForApi();
			const result = await fasseSpielleiterChatZusammen(chatVerlauf, ort.spielleiterFakten, ort.name);

			if (!result.success || !result.zusammenfassung) {
				throw new Error(result.error || 'Zusammenfassung fehlgeschlagen');
			}

			ort = { ...ort, spielleiterFakten: result.zusammenfassung, spielleiterChat: [] };
			syncOrt();
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

	// ==========================================
	// Highlighting helpers
	// ==========================================
	function highlightBekannteInText(text: string): { html: string; hasMatches: boolean } {
		const hasBekannte = ort.bekannte.length;
		const hasGottheiten = ort.gottheiten?.length;

		if (!hasBekannte && !hasGottheiten) return { html: text, hasMatches: false };

		let result = text;
		let hasMatches = false;

		if (hasGottheiten) {
			const sortedGottheiten = [...(ort.gottheiten || [])]
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

		if (hasBekannte) {
			const sortedBekannte = [...ort.bekannte]
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

	function scrollToBekannter(index: number) {
		const element = document.getElementById(`bekannter-${index}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'center' });
			element.classList.add('highlight');
			setTimeout(() => element.classList.remove('highlight'), 1500);
		}
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

<div class="ort-ansicht" class:compact class:bearbeitung={showBearbeitungsBadge}>
	<!-- Header mit Name -->
	<div class="result-header">
		{#if editable}
			<h2
				class="result-title"
				contenteditable="true"
				onblur={aktualisiereOrtName}
				onkeydown={handleKeyDown}
				title="Klicken zum Bearbeiten"
			>{ort.name}</h2>
		{:else}
			<h2 class="result-title">{ort.name}</h2>
		{/if}
		{#if showBearbeitungsBadge}
			<span class="bearbeitung-badge">Bearbeitung</span>
		{/if}
	</div>

	<!-- Bild und Anmerkungen -->
	{#if showBildBereich}
		<div class="bild-anmerkungen-row">
			<div class="ort-image-section">
				{#if ort.bilder && ort.bilder.length > 0}
					<div class="ort-image-container">
						<button class="ort-image-button" onclick={() => showImageModal = true} title="Bild vergrößern">
							<img src={ort.bilder[galerieIndex]} alt={ort.name} class="ort-image" />
						</button>
						{#if ort.bilder.length > 1}
							<div class="ort-image-counter">{galerieIndex + 1} / {ort.bilder.length}</div>
						{/if}
						{#if editable}
							<button
								class="ort-regenerate-btn"
								onclick={generateImage}
								disabled={isGeneratingImage}
								title="Neues Bild generieren"
							>
								{isGeneratingImage ? '...' : '+'}
							</button>
						{/if}
					</div>
				{:else if hasApiKey() && editable}
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
							<span class="ort-placeholder-icon">&#x1F3DE;</span>
							<span class="ort-placeholder-text">Bild generieren</span>
						{/if}
					</button>
				{:else}
					<div class="ort-image-placeholder-static">
						<span class="ort-placeholder-icon">&#x1F3DE;</span>
						<a href="/einstellungen" class="ort-api-hint">API Key einrichten</a>
					</div>
				{/if}
				{#if imageError}
					<p class="ort-image-error">{imageError}</p>
				{/if}
			</div>

			{#if editable}
				<div class="anmerkungen-section">
					<button class="anmerkungen-header" onclick={toggleAnmerkungen}>
						<span class="anmerkungen-title">Anmerkungen</span>
						<span class="anmerkungen-toggle">{anmerkungenExpanded ? '▼' : '▶'}</span>
					</button>
					{#if anmerkungenExpanded}
						<textarea
							class="anmerkungen-textarea"
							placeholder="Beschreibe Details für die Bildgenerierung..."
							value={ort.anmerkungen || ''}
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
			{/if}
		</div>
	{/if}

	<!-- Orts-Beschreibung -->
	{#if showBeschreibung}
		<div class="ort-beschreibung-section">
			{#if ort.ortBeschreibung}
				<div class="ort-beschreibung-display">
					<p class="ort-beschreibung-text">{ort.ortBeschreibung}</p>
					{#if editable}
						<div class="ort-beschreibung-actions">
							<button
								class="ort-beschreibung-edit-btn"
								onclick={() => beschreibungExpanded = !beschreibungExpanded}
								title="Bearbeiten"
							>
								&#x270F;&#xFE0F;
							</button>
							<button
								class="ort-beschreibung-regenerate-btn"
								onclick={generiereOrtBeschreibung}
								disabled={isGeneratingBeschreibung}
								title="Neu generieren"
							>
								{isGeneratingBeschreibung ? '...' : '&#x1F504;'}
							</button>
						</div>
					{/if}
				</div>
				{#if beschreibungExpanded && editable}
					<textarea
						class="ort-beschreibung-textarea"
						value={ort.ortBeschreibung}
						oninput={updateOrtBeschreibung}
						rows="3"
					></textarea>
				{/if}
			{:else if hasApiKey() && editable}
				<div class="beschreibungs-anmerkungen-section">
					<button class="beschreibungs-anmerkungen-header" onclick={toggleBeschreibungsAnmerkungen}>
						<span class="beschreibungs-anmerkungen-title">Anmerkungen zur Beschreibung (optional)</span>
						<span class="beschreibungs-anmerkungen-toggle">{beschreibungsAnmerkungenExpanded ? '▼' : '▶'}</span>
					</button>
					{#if beschreibungsAnmerkungenExpanded}
						<textarea
							class="beschreibungs-anmerkungen-textarea"
							placeholder="Was soll in der Beschreibung vorkommen?"
							value={ort.beschreibungsAnmerkungen || ''}
							oninput={updateBeschreibungsAnmerkungen}
							rows="3"
						></textarea>
					{/if}
				</div>
				<button
					class="ort-beschreibung-generate-btn"
					onclick={generiereOrtBeschreibung}
					disabled={isGeneratingBeschreibung}
				>
					{#if isGeneratingBeschreibung}
						<span class="ort-placeholder-spinner"></span>
						<span>Beschreibung wird generiert...</span>
					{:else}
						<span>&#x2728; Ort interpretieren</span>
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
	{/if}

	<!-- Naturelle -->
	{#if showNaturelle}
		<div class="result-naturelle">
			{#each ort.naturelle as nat}
				<div class="result-naturell-card" class:ist-haupt={nat.name === ort.hauptNaturell} data-farbe={nat.farbe}>
					{#if nat.bild}
						<img src={nat.bild} alt={nat.name} class="result-naturell-bild" />
					{:else}
						<div class="result-naturell-bild result-naturell-bild-placeholder">
							<span>{nat.name.charAt(0)}</span>
						</div>
					{/if}
					<div class="result-naturell-info">
						<h3>
							{nat.name}
							{#if nat.name === ort.hauptNaturell}
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
	{/if}

	<!-- Bekannte -->
	{#if showBekannte}
		<div class="result-bekannte">
			<div class="bekannte-header">
				<h3>Bekannte an diesem Ort</h3>
				{#if editable}
					<div class="bekannte-controls">
						<button
							class="bekannte-ctrl-btn"
							onclick={() => entferneBekannten(ort.bekannte.length - 1)}
							disabled={!ort.bekannte.length}
							title="Letzten Bekannten entfernen"
						>-</button>
						<span class="bekannte-count">{ort.bekannte.length || 0}</span>
						<button
							class="bekannte-ctrl-btn"
							onclick={fuegeBekanntHinzu}
							title="Bekannten hinzufügen"
						>+</button>
					</div>
				{/if}
			</div>

			{#if ort.bekannte.length}
				<p class="bekannte-hint">Klicke auf einen Namen um ihn zu bearbeiten</p>
				<div class="bekannte-list">
					{#each ort.bekannte as bekannter, index}
						<div class="bekannte-item" id="bekannter-{index}">
							<BekannterCard
								{bekannter}
								editable={editable}
								onUpdate={(updated) => aktualisiereBekannten(index, updated)}
								ortContext={{ name: ort.name, naturelleNames: ort.naturelle.map(n => n.name), szenenBeschreibung: ort.szenenBeschreibung }}
								regionContext={regionInfo}
							/>
							{#if editable}
								<button
									class="bekannte-remove-btn"
									onclick={() => entferneBekannten(index)}
									title="Bekannten entfernen"
								>x</button>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="keine-bekannte">Keine Bekannten an diesem Ort. {#if editable}Klicke +, um welche hinzuzufügen.{/if}</p>
			{/if}
		</div>
	{/if}

	<!-- Gottheiten -->
	{#if showGottheiten}
		<div class="result-gottheiten">
			<div class="gottheiten-header">
				<h3>Lokale Gottheiten</h3>
				{#if editable}
					<div class="gottheiten-controls">
						<button
							class="gottheiten-ctrl-btn"
							onclick={() => {
								const gottheiten = ort.gottheiten || [];
								if (gottheiten.length > 0) {
									entferneGottheit(gottheiten[gottheiten.length - 1].id);
								}
							}}
							disabled={!ort.gottheiten?.length}
							title="Letzte Gottheit entfernen"
						>-</button>
						<span class="gottheiten-count">{ort.gottheiten?.length || 0}</span>
						<button
							class="gottheiten-ctrl-btn"
							onclick={fuegeGottheitHinzu}
							title="Gottheit hinzufügen"
						>+</button>
					</div>
				{/if}
			</div>

			{#if ort.gottheiten?.length}
				<p class="gottheiten-hint">Vergessene Götter und kleine Geister, die an diesem Ort weilen.</p>
				<div class="gottheiten-list">
					{#each ort.gottheiten as gottheit}
						<div class="gottheit-item" id="gottheit-{gottheit.id}">
							<GottheitCard
								{gottheit}
								compact={false}
								editable={editable}
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
				<p class="keine-gottheiten">Keine lokalen Gottheiten. {#if editable}Klicke +, um eine zu erschaffen. (Optional){/if}</p>
			{/if}
		</div>
	{/if}

	<!-- Spielleiter-Chat -->
	{#if showSpielleiter}
		<div class="spielleiter-chat-section">
			<button class="spielleiter-chat-header" onclick={toggleSpielleiterChat}>
				<span class="spielleiter-chat-title">
					&#x1F3AD; Spielleiter fragen
					{#if ort.spielleiterChat?.length}
						<span class="chat-count">({ort.spielleiterChat.length})</span>
					{/if}
				</span>
				<span class="spielleiter-chat-toggle">{spielleiterChatExpanded ? '▼' : '▶'}</span>
			</button>

			{#if spielleiterChatExpanded}
				<div class="spielleiter-chat-content">
					{#if ort.spielleiterFakten}
						<div class="spielleiter-fakten-box">
							<button class="fakten-toggle" onclick={() => showFaktenModal = true}>
								&#x1F4DC; Bekannte Fakten anzeigen
							</button>
						</div>
					{/if}

					<div class="spielleiter-chat-messages">
						{#if !ort.spielleiterChat?.length && !ort.spielleiterFakten}
							<p class="chat-empty-hint">
								Frage den Spielleiter nach Geschichten, Geheimnissen oder Details zu diesem Ort.
							</p>
						{/if}

						{#each ort.spielleiterChat || [] as nachricht}
							<div class="chat-message" class:nutzer={nachricht.rolle === 'nutzer'} class:spielleiter={nachricht.rolle === 'spielleiter'}>
								<div class="chat-message-header">
									<span class="chat-rolle">{nachricht.rolle === 'nutzer' ? 'Du' : 'Spielleiter'}</span>
								</div>
								<div class="chat-message-text">{nachricht.text}</div>

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
													>&#x2713;</button>
												{:else}
													<span class="fakt-akzeptiert-mark">&#x2713;</span>
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
								{isSpielleiterGenerating ? '...' : '&#x27A4;'}
							</button>
						</div>

						{#if ort.spielleiterChat?.length}
							<div class="spielleiter-chat-actions">
								<button
									class="btn btn-sm btn-secondary"
									onclick={fasseSpielleiterChatZusammenUndLeere}
									disabled={isZusammenfassend}
									title="Fasst alle Fakten zusammen und leert den Chat"
								>
									{isZusammenfassend ? 'Fasse zusammen...' : '&#x1F4CB; Zusammenfassen & leeren'}
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
		{#if showFaktenModal && ort.spielleiterFakten}
			<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
			<div class="fakten-modal-backdrop" onclick={() => showFaktenModal = false}>
				<div class="fakten-modal" onclick={(e) => e.stopPropagation()}>
					<div class="fakten-modal-header">
						<h3>&#x1F4DC; Bekannte Fakten zu {ort.name}</h3>
						<button class="fakten-modal-close" onclick={() => showFaktenModal = false}>x</button>
					</div>
					<div class="fakten-modal-content">
						<pre class="fakten-text">{ort.spielleiterFakten}</pre>
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Details Section -->
	{#if showDetails}
		<div class="ort-details-section">
			<div class="details-header">
				<h3>Über diesen Ort</h3>
				{#if hasApiKey() && editable}
					<button
						class="btn btn-sm btn-secondary"
						onclick={generiereOrtDetails}
						disabled={isGeneratingDetails}
					>
						{#if isGeneratingDetails}
							Generiere...
						{:else if ort.details}
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

			{#if ort.details}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
				<div class="details-content" onclick={handleDetailsClick}>
					<div class="details-column">
						<h4>Gerüchte</h4>
						<ul class="details-list geruechte">
							{#each ort.details.geruechte as geruecht}
								<li>{@html highlightBekannteInText(geruecht).html}</li>
							{/each}
						</ul>
					</div>
					<div class="details-column">
						<h4>Aktivitäten</h4>
						<ul class="details-list aktivitaeten">
							{#each ort.details.aktivitaeten as aktivitaet}
								<li>{@html highlightBekannteInText(aktivitaet).html}</li>
							{/each}
						</ul>
					</div>
					<div class="details-column">
						<h4>Entdeckungen</h4>
						<ul class="details-list entdeckungen">
							{#each ort.details.entdeckungen as entdeckung}
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
					Klicke auf "Details generieren", um Gerüchte, Aktivitäten und Entdeckungen zu erstellen.
				</p>
			{/if}
		</div>
	{/if}

	<!-- Geschichte Section -->
	{#if showGeschichte}
		<div class="ort-geschichte-section">
			<button class="geschichte-header" onclick={() => geschichteExpanded = !geschichteExpanded}>
				<h3>Geschichte des Ortes</h3>
				<span class="geschichte-toggle">{geschichteExpanded ? '▼' : '▶'}</span>
			</button>

			{#if geschichteExpanded}
				<div class="geschichte-content">
					{#if hasApiKey() && editable}
						<button
							class="btn btn-sm btn-secondary geschichte-generate-btn"
							onclick={generiereOrtGeschichte}
							disabled={isGeneratingGeschichte}
						>
							{#if isGeneratingGeschichte}
								Generiere...
							{:else if ort.geschichte?.length}
								Neu generieren
							{:else}
								Geschichte generieren
							{/if}
						</button>
					{/if}

					{#if geschichteError}
						<p class="geschichte-error">{geschichteError}</p>
					{/if}

					{#if ort.geschichte?.length}
						<div class="geschichte-timeline">
							{#each ort.geschichte as event}
								<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
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
							Generiere zuerst Details, dann klicke auf "Geschichte generieren".
						</p>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Image Modal -->
{#if showImageModal && ort.bilder?.length}
	<ImageGalleryModal
		images={ort.bilder}
		currentIndex={galerieIndex}
		alt={ort.name}
		caption={ort.name}
		onClose={() => showImageModal = false}
		onIndexChange={(i) => galerieIndex = i}
		onRegenerate={() => anmerkungenExpanded = true}
		onDelete={editable ? removeImage : undefined}
	/>
{/if}

<style>
	.ort-ansicht {
		padding: var(--space-lg);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		border-left: 4px solid var(--color-earth);
	}

	.ort-ansicht.bearbeitung {
		border: 2px solid var(--color-leaf);
	}

	.ort-ansicht.compact {
		padding: var(--space-md);
	}

	/* Header */
	.result-header {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		position: relative;
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

	/* Bild + Anmerkungen Layout */
	.bild-anmerkungen-row {
		display: flex;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
		align-items: flex-start;
	}

	.ort-image-section {
		flex-shrink: 0;
	}

	.ort-image-container {
		position: relative;
		width: 100%;
		max-width: 500px;
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

	.ort-placeholder-icon {
		font-size: 1.5rem;
	}

	.ort-placeholder-text {
		font-size: 0.7rem;
		color: var(--color-earth);
		text-align: center;
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

	/* Anmerkungen */
	.anmerkungen-section {
		flex: 1;
		min-width: 200px;
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-earth-light);
		overflow: hidden;
		align-self: flex-start;
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

	.gemini-szene-text {
		padding: 0 var(--space-sm) var(--space-sm);
		margin: 0;
		font-size: 0.85rem;
		color: var(--color-earth-dark);
		line-height: 1.5;
		font-style: italic;
	}

	/* Beschreibung */
	.ort-beschreibung-section {
		margin: var(--space-md) 0;
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

	.ort-beschreibung-textarea {
		width: 100%;
		margin-top: var(--space-sm);
		padding: var(--space-sm);
		border: 2px solid var(--color-leaf-light, var(--color-earth-light));
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
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-leaf-dark);
	}

	.beschreibungs-anmerkungen-header:hover {
		background: rgba(107, 142, 78, 0.35);
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

	.ort-beschreibung-generate-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		width: 100%;
		padding: var(--space-md) var(--space-lg);
		background: linear-gradient(135deg, var(--color-leaf-light, #8fbc8f) 0%, var(--color-leaf) 100%);
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
		color: #c0392b;
		font-size: 0.85rem;
		background: rgba(220, 53, 69, 0.1);
		border-radius: var(--radius-sm);
	}

	/* Naturelle */
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

	.result-naturell-bild-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-earth-light);
		color: var(--color-bark);
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 600;
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

	.result-kannImmer {
		margin-top: var(--space-sm);
		font-size: 0.85rem;
	}

	.result-kannImmer ul {
		padding-left: var(--space-lg);
		margin: var(--space-xs) 0 0;
	}

	/* Bekannte */
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

	.bekannte-item {
		position: relative;
	}

	.bekannte-item.highlight {
		animation: bekannte-highlight-pulse 1.5s ease;
	}

	@keyframes bekannte-highlight-pulse {
		0%, 100% { box-shadow: none; }
		20%, 80% { box-shadow: 0 0 0 3px var(--color-leaf), 0 4px 16px rgba(107, 142, 78, 0.3); }
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

	.bekannte-hint {
		font-size: 0.85rem;
		color: var(--color-earth);
		margin-bottom: var(--space-sm);
		font-style: italic;
	}

	.keine-bekannte {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
		padding: var(--space-md);
	}

	/* Gottheiten */
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

	.gottheit-item.highlight {
		animation: gottheit-highlight-pulse 1.5s ease;
	}

	@keyframes gottheit-highlight-pulse {
		0%, 100% { box-shadow: none; }
		20%, 80% { box-shadow: 0 0 0 3px #c9a227, 0 4px 16px rgba(201, 162, 39, 0.4); }
	}

	.keine-gottheiten {
		text-align: center;
		color: #8b6914;
		font-style: italic;
		padding: var(--space-md);
	}

	/* Spielleiter Chat */
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
		background: rgba(201, 162, 39, 0.15);
		border-bottom: 1px solid #c9a227;
	}

	.fakten-modal-header h3 {
		margin: 0;
		font-family: var(--font-display);
		color: #8b6914;
	}

	.fakten-modal-close {
		width: 32px;
		height: 32px;
		border: none;
		background: transparent;
		font-size: 1.5rem;
		cursor: pointer;
		color: #8b6914;
		display: flex;
		align-items: center;
		justify-content: center;
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

	/* Details Section */
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

	.details-list.geruechte li { border-left-color: #8e7cc3; }
	.details-list.aktivitaeten li { border-left-color: #7cb342; }
	.details-list.entdeckungen li { border-left-color: #c9a227; }

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

	/* Geschichte */
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

	/* Bekannte Links */
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

	/* Gottheit Links */
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
	}

	:global(.gottheit-link:hover) {
		background: linear-gradient(135deg, rgba(201, 162, 39, 0.4), rgba(201, 162, 39, 0.55));
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(201, 162, 39, 0.3);
	}

	/* Button Styles */
	.btn {
		padding: var(--space-sm) var(--space-md);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-family: inherit;
		font-size: 0.9375rem;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.btn-sm {
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.8rem;
	}

	.btn-primary {
		background: var(--color-leaf);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-leaf-dark);
	}

	.btn-secondary {
		background: var(--color-earth-light);
		color: var(--color-earth-dark);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-earth);
		color: white;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Responsive */
	@media (max-width: 900px) {
		.bekannte-list {
			grid-template-columns: 1fr;
		}

		.details-content {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		.bild-anmerkungen-row {
			flex-direction: column;
		}

		.ort-image-section {
			width: 100%;
		}

		.anmerkungen-section {
			width: 100%;
		}

		.result-title {
			font-size: 1.5rem;
		}
	}
</style>
