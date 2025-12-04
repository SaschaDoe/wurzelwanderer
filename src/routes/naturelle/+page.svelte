<script lang="ts">
	import { browser } from '$app/environment';
	import { generateOrtImage, hasApiKey } from '$lib/services/geminiService';
	import BekannterCard from '$lib/components/BekannterCard.svelte';
	import ImageGalleryModal from '$lib/components/ImageGalleryModal.svelte';
	import { generiereBekanntenData, type GenerierterBekannter } from '$lib/data/merkmale';
	import { STORAGE_KEYS, getStoredItem, setStoredItem } from '$lib/utils/storage';
	import { toElementId } from '$lib/utils/slugify';
	import { getRandomElement, getRandomElements } from '$lib/utils/random';
	import {
		kategorien,
		getStimmungText as getText,
		isMagisch,
		isTrauma,
		type StimmungItem
	} from '$lib/data/naturelle';

	// Type definitions

	interface GespeicherterOrt {
		id: string;
		name: string;
		bilder?: string[];
		hauptNaturell?: string;
		anmerkungen?: string;
		bekannte: GenerierterBekannter[];
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
	}

	// Generator State
	let erlaubeMagisch = $state(true);
	let erlaubeTrauma = $state(true);
	let anzahlNaturelle = $state(3);
	let aktiveKategorien = $state<string[]>(['Gemütlich', 'Lebendig', 'Verbindend', 'Weitläufig', 'Einsam', 'Verlassen']);

	let generierterOrt = $state<GespeicherterOrt | null>(null);
	let gespeicherteOrte = $state<GespeicherterOrt[]>([]);
	let bearbeitungsModus = $state(false);

	// Image generation state
	let isGeneratingImage = $state(false);
	let imageError = $state<string | null>(null);
	let showImageModal = $state(false);
	let galerieIndex = $state(0);
	let anmerkungenExpanded = $state(true);

	// Bekannte state
	let anzahlBekannte = $state(2);

	// Debounce timer for anmerkungen
	let anmerkungenSyncTimer: ReturnType<typeof setTimeout> | null = null;

	// Load saved places on mount
	$effect(() => {
		if (browser) {
			const saved = getStoredItem<GespeicherterOrt[]>(STORAGE_KEYS.ORTE);
			if (saved) {
				gespeicherteOrte = saved;
			}
		}
	});

	function speichereOrte() {
		setStoredItem(STORAGE_KEYS.ORTE, gespeicherteOrte);
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

	async function generateImage() {
		if (!generierterOrt || isGeneratingImage) return;

		isGeneratingImage = true;
		imageError = null;

		try {
			// Extract stimmung text from items (handle both string and object formats)
			const extractStimmungText = (items: StimmungItem[]): string[] => {
				return items.map(s => typeof s === 'string' ? s : s.text);
			};

			const imageData = await generateOrtImage({
				name: generierterOrt.name,
				hauptNaturell: generierterOrt.hauptNaturell || generierterOrt.naturelle[0]?.name || '',
				naturelle: generierterOrt.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch,
					stimmung: extractStimmungText(n.stimmung)
				})),
				anmerkungen: generierterOrt.anmerkungen
			});

			if (imageData) {
				const neueBilder = [...(generierterOrt.bilder || []), imageData];
				generierterOrt = { ...generierterOrt, bilder: neueBilder };
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

	function generiereOrt() {
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
			name: ortsname,
			hauptNaturell,
			bekannte: initialeBekannte,
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

</script>

<svelte:head>
	<title>Naturelle - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Ort erschaffen</h1>
	<p class="intro">
		Erschaffe einen Ort aus Naturellen und füge Bekannte hinzu, die dort leben.
	</p>

	<!-- Gespeicherte Orte -->
	{#if gespeicherteOrte.length > 0}
		<div class="gespeicherte-orte-section">
			<h3>Gespeicherte Orte</h3>
			<div class="gespeicherte-orte-liste">
				{#each gespeicherteOrte as ort}
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
				<h2 class="result-title">{generierterOrt.name}</h2>
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
								<span class="ort-placeholder-text">Generiere Bild...</span>
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
				</div>

				<!-- Anmerkungen rechts -->
				<div class="anmerkungen-section" class:collapsed={!anmerkungenExpanded && generierterOrt.bilder?.length}>
					<button class="anmerkungen-header" onclick={toggleAnmerkungen}>
						<span class="anmerkungen-title">Anmerkungen</span>
						<span class="anmerkungen-toggle">{anmerkungenExpanded ? '▼' : '▶'}</span>
					</button>
					{#if anmerkungenExpanded || !generierterOrt.bilder?.length}
						<textarea
							class="anmerkungen-textarea"
							placeholder="Beschreibe Details für die Bildgenerierung..."
							value={generierterOrt.anmerkungen || ''}
							oninput={updateAnmerkungen}
						></textarea>
						{#if hasApiKey() && generierterOrt.bilder?.length}
							<button
								class="btn btn-sm anmerkungen-generate-btn"
								onclick={generateImage}
								disabled={isGeneratingImage}
							>
								{isGeneratingImage ? 'Generiere...' : 'Neues Bild generieren'}
							</button>
						{/if}
					{/if}
				</div>
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
							<div class="bekannte-item">
								<BekannterCard
									{bekannter}
									onUpdate={(updated) => aktualisiereBekannten(index, updated)}
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

	.anmerkungen-generate-btn {
		display: block;
		width: calc(100% - var(--space-md));
		margin: 0 auto var(--space-sm);
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

</style>
