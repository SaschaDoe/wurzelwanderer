<script lang="ts">
	import { onMount } from 'svelte';
	import { initApiKey, hasApiKey } from '$lib/services/geminiService';
	import {
		generiereBildband,
		resumeBildband,
		regeneriereSzene,
		regeneriereNurReim,
		generiereWeiteresBild
	} from '$lib/services/bildbandService';
	import {
		type GespeicherterBildband,
		type BildbandSzene as BildbandSzeneType,
		type SzenenKontext,
		type BildbandProgress,
		SZENEN_STRUKTUR
	} from '$lib/data/bildband';
	import type { GenerierterBekannter } from '$lib/data/merkmale';
	import type { GespeicherteRegion } from '$lib/data/regionen';
	import type { Naturell } from '$lib/data/naturelle';
	import { STORAGE_KEYS, getStoredItem, setStoredItem } from '$lib/utils/storage';
	import BildbandWizard from '$lib/components/BildbandWizard.svelte';
	import BildbandSzeneComponent from '$lib/components/BildbandSzene.svelte';
	import BildbandGalerie from '$lib/components/BildbandGalerie.svelte';
	import BildbandModal from '$lib/components/BildbandModal.svelte';

	// View states
	type ViewState = 'galerie' | 'wizard' | 'generating' | 'viewing' | 'complete';
	let viewState = $state<ViewState>('galerie');

	// Data
	let gespeicherteBildbaende = $state<GespeicherterBildband[]>([]);
	let aktuellerBildband = $state<GespeicherterBildband | null>(null);
	let showModal = $state(false);
	let selectedModalBildband = $state<GespeicherterBildband | null>(null);

	// Generation state
	let isGenerating = $state(false);
	let generatingProgress = $state<BildbandProgress | null>(null);
	let currentSzeneIndex = $state(0);
	let generationError = $state<string | null>(null);

	// Generation config (saved during wizard)
	let generationConfig = $state<{
		charaktere: GenerierterBekannter[];
		startRegion: GespeicherteRegion;
		startOrt: Naturell;
		zweiterOrt?: { region: GespeicherteRegion; ort: Naturell };
	} | null>(null);

	// Derived
	let aktuelleSzene = $derived(aktuellerBildband?.szenen[currentSzeneIndex] || null);
	let fortschrittProzent = $derived(
		generatingProgress
			? Math.round((generatingProgress.aktuellerSchritt / generatingProgress.gesamtSchritte) * 100)
			: 0
	);

	onMount(async () => {
		await initApiKey();

		// Load saved bildbaende
		const saved = await getStoredItem<GespeicherterBildband[]>(STORAGE_KEYS.BILDBAENDE);
		if (saved) {
			gespeicherteBildbaende = saved;
		}
	});

	async function speichereBildbaende() {
		await setStoredItem(STORAGE_KEYS.BILDBAENDE, gespeicherteBildbaende);
	}

	function startWizard() {
		viewState = 'wizard';
	}

	function cancelWizard() {
		viewState = 'galerie';
	}

	async function saveBildbandProgress(bildband: GespeicherterBildband) {
		// Update the list of saved bildbaende
		const existingIndex = gespeicherteBildbaende.findIndex((b) => b.id === bildband.id);
		if (existingIndex >= 0) {
			gespeicherteBildbaende[existingIndex] = bildband;
		} else {
			gespeicherteBildbaende = [bildband, ...gespeicherteBildbaende];
		}
		await speichereBildbaende();
	}

	async function startGeneration(config: {
		charaktere: GenerierterBekannter[];
		startRegion: GespeicherteRegion;
		startOrt: Naturell;
		zweiterOrt?: { region: GespeicherteRegion; ort: Naturell };
	}) {
		if (!hasApiKey()) {
			generationError = 'Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.';
			return;
		}

		generationConfig = config;
		viewState = 'generating';
		isGenerating = true;
		generationError = null;
		currentSzeneIndex = 0;

		try {
			const bildband = await generiereBildband(
				config.charaktere,
				config.startRegion,
				config.startOrt,
				config.zweiterOrt,
				(progress) => {
					generatingProgress = progress;
					if (progress.szene) {
						// Update current scene index based on progress
						currentSzeneIndex = progress.szene.nummer - 1;
					}
					// Note: Don't update aktuellerBildband here - the onSave callback
					// provides the complete data including images after each scene
				},
				async (updatedBildband) => {
					aktuellerBildband = updatedBildband;
					await saveBildbandProgress(updatedBildband);
				}
			);

			aktuellerBildband = bildband;
			viewState = 'complete';
		} catch (error) {
			console.error('Bildband generation failed:', error);
			generationError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGenerating = false;
		}
	}

	async function handleResumeBildband(bildband: GespeicherterBildband) {
		if (!hasApiKey()) {
			generationError = 'Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.';
			return;
		}

		// Set up the config from the saved bildband
		generationConfig = {
			charaktere: bildband.charaktere,
			startRegion: bildband.startRegion,
			startOrt: bildband.startOrt,
			zweiterOrt: bildband.zweiterOrt
		};

		aktuellerBildband = bildband;
		viewState = 'generating';
		isGenerating = true;
		generationError = null;
		currentSzeneIndex = bildband.szenen.length > 0 ? bildband.szenen.length - 1 : 0;

		try {
			const completedBildband = await resumeBildband(
				bildband,
				(progress) => {
					generatingProgress = progress;
					if (progress.szene) {
						currentSzeneIndex = progress.szene.nummer - 1;
					}
				},
				async (updatedBildband) => {
					aktuellerBildband = updatedBildband;
					await saveBildbandProgress(updatedBildband);
				}
			);

			aktuellerBildband = completedBildband;
			viewState = 'complete';
		} catch (error) {
			console.error('Bildband resume failed:', error);
			generationError = error instanceof Error ? error.message : 'Unbekannter Fehler';
		} finally {
			isGenerating = false;
		}
	}

	async function handleRegenerate(anmerkung?: string) {
		if (!aktuellerBildband || !aktuelleSzene) return;

		isGenerating = true;
		generatingProgress = {
			aktuellerSchritt: 1,
			gesamtSchritte: 2,
			phase: 'reim'
		};

		try {
			const neueSzene = await regeneriereSzene(
				aktuellerBildband,
				aktuelleSzene.nummer,
				anmerkung
			);

			// Update the scene in the bildband
			aktuellerBildband.szenen[currentSzeneIndex] = neueSzene;
			aktuellerBildband = { ...aktuellerBildband }; // Trigger reactivity
		} catch (error) {
			console.error('Scene regeneration failed:', error);
			generationError = error instanceof Error ? error.message : 'Fehler bei Regenerierung';
		} finally {
			isGenerating = false;
			generatingProgress = null;
		}
	}

	async function handleGenerateNewImage() {
		if (!aktuellerBildband || !aktuelleSzene || !generationConfig) return;

		isGenerating = true;
		generatingProgress = {
			aktuellerSchritt: 1,
			gesamtSchritte: 1,
			phase: 'bild'
		};

		try {
			const istNachOrtswechsel = aktuelleSzene.nummer >= 6;
			const kontext: SzenenKontext = {
				charaktere: generationConfig.charaktere,
				bekannte: aktuellerBildband.bekannte,
				aktuelleRegion: istNachOrtswechsel
					? aktuellerBildband.zweiterOrt?.region || aktuellerBildband.startRegion
					: aktuellerBildband.startRegion,
				aktuellerOrt: istNachOrtswechsel
					? aktuellerBildband.zweiterOrt?.ort || aktuellerBildband.startOrt
					: aktuellerBildband.startOrt,
				zweiterOrt: aktuellerBildband.zweiterOrt,
				bisherigeSzenen: aktuellerBildband.szenen.slice(0, currentSzeneIndex),
				szenenDefinition: SZENEN_STRUKTUR[currentSzeneIndex],
				storyPlan: aktuellerBildband.storyPlan
			};

			const result = await generiereWeiteresBild(aktuelleSzene, kontext);

			if ('bild' in result) {
				aktuelleSzene.bilder = [...aktuelleSzene.bilder, result.bild];
				aktuelleSzene.aktivBildIndex = aktuelleSzene.bilder.length - 1;
				aktuelleSzene.bildFehler = false;
				aktuellerBildband = { ...aktuellerBildband };
			}
		} catch (error) {
			console.error('Image generation failed:', error);
		} finally {
			isGenerating = false;
			generatingProgress = null;
		}
	}

	async function handleRetryImage() {
		await handleGenerateNewImage();
	}

	async function handleRetryReim(anmerkung?: string) {
		if (!aktuellerBildband || !aktuelleSzene) return;

		isGenerating = true;
		generatingProgress = {
			aktuellerSchritt: 1,
			gesamtSchritte: 1,
			phase: 'reim'
		};

		try {
			const neueSzene = await regeneriereNurReim(
				aktuellerBildband,
				aktuelleSzene.nummer,
				anmerkung
			);

			// Update the scene in the bildband
			aktuellerBildband.szenen[currentSzeneIndex] = neueSzene;
			aktuellerBildband = { ...aktuellerBildband }; // Trigger reactivity
		} catch (error) {
			console.error('Rhyme regeneration failed:', error);
			generationError = error instanceof Error ? error.message : 'Fehler bei Reim-Regenerierung';
		} finally {
			isGenerating = false;
			generatingProgress = null;
		}
	}

	function goToNextScene() {
		if (aktuellerBildband && currentSzeneIndex < aktuellerBildband.szenen.length - 1) {
			currentSzeneIndex++;
		}
	}

	function goToPrevScene() {
		if (currentSzeneIndex > 0) {
			currentSzeneIndex--;
		}
	}

	function saveBildband() {
		if (!aktuellerBildband) return;

		// Ensure status is completed
		aktuellerBildband.status = 'completed';

		// Set cover image
		if (!aktuellerBildband.coverBild && aktuellerBildband.szenen[0]?.bilder[0]) {
			aktuellerBildband.coverBild = aktuellerBildband.szenen[0].bilder[0];
		}

		// Check if already saved
		const existingIndex = gespeicherteBildbaende.findIndex(
			(b) => b.id === aktuellerBildband!.id
		);

		if (existingIndex >= 0) {
			gespeicherteBildbaende[existingIndex] = aktuellerBildband;
		} else {
			gespeicherteBildbaende = [aktuellerBildband, ...gespeicherteBildbaende];
		}

		speichereBildbaende();
		viewState = 'galerie';
		aktuellerBildband = null;
		generationConfig = null;
	}

	function viewBildband(bildband: GespeicherterBildband) {
		selectedModalBildband = bildband;
		showModal = true;
	}

	function deleteBildband(bildband: GespeicherterBildband) {
		if (confirm(`Bildband "${bildband.titel}" wirklich loeschen?`)) {
			gespeicherteBildbaende = gespeicherteBildbaende.filter((b) => b.id !== bildband.id);
			speichereBildbaende();
		}
	}

	function closeModal() {
		showModal = false;
		selectedModalBildband = null;
	}

	function backToGallery() {
		if (aktuellerBildband && viewState === 'complete') {
			if (confirm('Bildband verwerfen? Ungespeicherte Aenderungen gehen verloren.')) {
				aktuellerBildband = null;
				generationConfig = null;
				viewState = 'galerie';
			}
		} else {
			aktuellerBildband = null;
			generationConfig = null;
			viewState = 'galerie';
		}
	}
</script>

<svelte:head>
	<title>Bildband - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Bildband</h1>
	<p class="intro">
		Erstelle illustrierte Maerchen-Geschichten in Reimen mit deinen Charakteren.
	</p>

	{#if viewState === 'galerie'}
		<div class="galerie-header">
			<button class="btn btn-primary" onclick={startWizard}>
				Neuen Bildband erstellen
			</button>
		</div>

		<section class="galerie-section">
			<h2>Meine Bildbaende</h2>
			<BildbandGalerie
				bildbaende={gespeicherteBildbaende}
				onSelect={viewBildband}
				onDelete={deleteBildband}
				onResume={handleResumeBildband}
			/>
		</section>
	{:else if viewState === 'wizard'}
		<BildbandWizard onStart={startGeneration} onCancel={cancelWizard} />
	{:else if viewState === 'generating' || viewState === 'complete' || viewState === 'viewing'}
		<div class="generation-view">
			<!-- Progress Header -->
			{#if viewState === 'generating' && generatingProgress}
				<div class="progress-header">
					<div class="progress-text">
						Szene {generatingProgress.szene?.nummer || '...'} von 10
						{#if generatingProgress.phase === 'reim'}
							- Reim wird geschrieben...
						{:else if generatingProgress.phase === 'bild'}
							- Bild wird generiert...
						{:else if generatingProgress.phase === 'metadaten'}
							- Titel wird erstellt...
						{/if}
					</div>
					<div class="progress-bar">
						<div class="progress-fill" style="width: {fortschrittProzent}%"></div>
					</div>
				</div>
			{/if}

			<!-- Complete Header -->
			{#if viewState === 'complete' && aktuellerBildband}
				<div class="complete-header">
					<h2>{aktuellerBildband.titel}</h2>
					<p class="beschreibung">{aktuellerBildband.beschreibung}</p>
				</div>
			{/if}

			<!-- Error Display -->
			{#if generationError}
				<div class="error-box">
					<strong>Fehler:</strong> {generationError}
				</div>
			{/if}

			<!-- Scene Display -->
			{#if aktuelleSzene}
				<div class="scene-wrapper">
					<BildbandSzeneComponent
						szene={aktuelleSzene}
						isGenerating={isGenerating}
						generatingPhase={generatingProgress?.phase === 'metadaten' ? null : generatingProgress?.phase}
						onRegenerate={viewState === 'complete' ? handleRegenerate : undefined}
						onRetryReim={viewState === 'complete' ? handleRetryReim : undefined}
						onGenerateNewImage={viewState === 'complete' ? handleGenerateNewImage : undefined}
						onRetryImage={handleRetryImage}
						onWeiter={viewState === 'complete' && currentSzeneIndex < 9
							? goToNextScene
							: undefined}
						showActions={viewState === 'complete' && !isGenerating}
					/>
				</div>

				<!-- Scene Navigation (during generation AND when complete) -->
				{#if aktuellerBildband && aktuellerBildband.szenen.length > 0}
					<div class="scene-nav">
						<button
							class="btn btn-secondary"
							onclick={goToPrevScene}
							disabled={currentSzeneIndex === 0}
						>
							&#8592; Zurueck
						</button>

						<div class="scene-dots">
							{#each aktuellerBildband.szenen as _, index}
								<button
									class="dot"
									class:active={index === currentSzeneIndex}
									class:generating={viewState === 'generating' && index === aktuellerBildband.szenen.length - 1}
									onclick={() => (currentSzeneIndex = index)}
									title="Szene {index + 1}"
								></button>
							{/each}
						</div>

						<button
							class="btn btn-secondary"
							onclick={goToNextScene}
							disabled={currentSzeneIndex >= aktuellerBildband.szenen.length - 1}
						>
							Weiter &#8594;
						</button>
					</div>
				{/if}
			{/if}

			<!-- Final Actions -->
			{#if viewState === 'complete' && aktuellerBildband}
				<div class="final-actions">
					<button class="btn btn-secondary" onclick={backToGallery}>Verwerfen</button>
					<button class="btn btn-primary" onclick={saveBildband}>Bildband speichern</button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modal for viewing saved bildbaende -->
{#if showModal && selectedModalBildband}
	<BildbandModal bildband={selectedModalBildband} onClose={closeModal} />
{/if}

<style>
	.intro {
		font-size: 1.25rem;
		max-width: 700px;
		margin-bottom: var(--space-xl);
	}

	.galerie-header {
		margin-bottom: var(--space-xl);
	}

	.galerie-section h2 {
		margin-bottom: var(--space-lg);
		color: var(--color-earth-dark);
	}

	/* Generation View */
	.generation-view {
		max-width: 800px;
		margin: 0 auto;
	}

	.progress-header {
		background: var(--color-parchment);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
		text-align: center;
	}

	.progress-text {
		margin-bottom: var(--space-md);
		color: var(--color-earth-dark);
		font-weight: 500;
	}

	.progress-bar {
		height: 8px;
		background: var(--color-earth-light);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-leaf);
		transition: width 0.3s ease;
	}

	.complete-header {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.complete-header h2 {
		color: var(--color-leaf-dark);
		margin-bottom: var(--space-sm);
	}

	.complete-header .beschreibung {
		color: var(--color-earth);
		font-style: italic;
	}

	.error-box {
		background: #f8d7da;
		border: 1px solid #f5c6cb;
		color: #721c24;
		padding: var(--space-md);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
	}

	.scene-wrapper {
		margin-bottom: var(--space-lg);
	}

	/* Scene Navigation */
	.scene-nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		margin-bottom: var(--space-lg);
	}

	.scene-dots {
		display: flex;
		gap: var(--space-xs);
	}

	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--color-earth-light);
		border: none;
		cursor: pointer;
		padding: 0;
		transition: all 0.2s;
	}

	.dot:hover {
		background: var(--color-earth);
	}

	.dot.active {
		background: var(--color-leaf-dark);
		transform: scale(1.2);
	}

	.dot.generating {
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	/* Final Actions */
	.final-actions {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-earth-light);
	}
</style>
