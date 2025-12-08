<script lang="ts">
	import { onMount } from 'svelte';
	import { STORAGE_KEYS, getStoredItem, setStoredItem } from '$lib/utils/storage';
	import { initApiKey, type RegionInfo } from '$lib/services/geminiService';
	import type { GespeicherteRegion } from '$lib/data/regionen';
	import { HEIMATGEFILDE, HEIMATGEFILDE_ID } from '$lib/data/regionen';
	import type { GespeicherterOrt } from '$lib/data/ort';
	import type { GespeicherteHexmap, HexOrt, HexPosition } from '$lib/data/hexmap';
	import { kategorien } from '$lib/data/naturelle';
	import { generiereLeereHexmap, addOrtZuHexmap, updateHexInHexmap, createHexmapFromWorld } from '$lib/data/hexmap';
	import { generateWorld, generateSeed } from '$lib/services/worldGenerator';
	import HexGrid from '$lib/components/HexGrid.svelte';
	import HexOrtModal from '$lib/components/HexOrtModal.svelte';
	import HexPlaceholderModal from '$lib/components/HexPlaceholderModal.svelte';
	import OrtGeneratorModal from '$lib/components/OrtGeneratorModal.svelte';
	import HexBildGeneratorModal from '$lib/components/HexBildGeneratorModal.svelte';

	// Data state
	let regionen = $state<GespeicherteRegion[]>([]);
	let aktiveRegionId = $state<string>(HEIMATGEFILDE_ID);
	let gespeicherteOrte = $state<GespeicherterOrt[]>([]);
	let hexmaps = $state<GespeicherteHexmap[]>([]);

	// Derived
	let aktiveRegion = $derived(regionen.find(r => r.id === aktiveRegionId) || HEIMATGEFILDE);
	let orteInRegion = $derived(gespeicherteOrte.filter(o => o.regionId === aktiveRegionId));
	let aktiveHexmap = $derived(hexmaps.find(h => h.regionId === aktiveRegionId));

	// Region info for the modal
	let aktiveRegionInfo = $derived.by((): RegionInfo | undefined => {
		if (!aktiveRegion || aktiveRegion.id === HEIMATGEFILDE_ID) return undefined;
		if (aktiveRegion.geographisch.length === 0 && aktiveRegion.faunaFlora.length === 0 && !aktiveRegion.architektur) {
			return undefined;
		}
		return {
			name: aktiveRegion.name,
			geographisch: aktiveRegion.geographisch.map(b => ({ name: b.name, promptText: b.promptText })),
			faunaFlora: aktiveRegion.faunaFlora.map(b => ({ name: b.name, promptText: b.promptText })),
			architektur: aktiveRegion.architektur ? { name: aktiveRegion.architektur.name, promptText: aktiveRegion.architektur.promptText } : undefined
		};
	});

	// UI state - Hex Detail Modal
	let selectedHex = $state<HexOrt | null>(null);
	let selectedOrt = $state<GespeicherterOrt | null>(null);
	let showModal = $state(false);
	let generatingHexId = $state<string | null>(null);

	// Placeholder modal state
	let showPlaceholderModal = $state(false);
	let selectedPlaceholderPosition = $state<HexPosition | null>(null);

	// Ort Generator modal state
	let showOrtGeneratorModal = $state(false);

	// Hex Bild Generator modal state
	let showHexBildGeneratorModal = $state(false);
	let newlyCreatedOrt = $state<GespeicherterOrt | null>(null);
	let newlyCreatedHexId = $state<string | null>(null);
	let isRegeneratingExistingHex = $state(false); // Track if regenerating from HexOrtModal

	// World hex ort creation - track which hex we're creating an ort for
	let worldHexForOrtCreation = $state<HexOrt | null>(null);

	// World generation state
	let showBiomeOverlay = $state(false);
	let isGeneratingWorld = $state(false);

	// Check if current hexmap is a generated world
	let isWorldHexmap = $derived(aktiveHexmap?.isGeneratedWorld ?? false);

	// Orte die noch nicht auf der Hexmap sind
	let verfuegbareOrte = $derived.by(() => {
		if (!aktiveHexmap) return orteInRegion;
		const hexOrtIds = new Set(aktiveHexmap.hexe.map(h => h.ortId));
		return orteInRegion.filter(o => !hexOrtIds.has(o.id));
	});

	// Debug: Track aktiveHexmap changes
	$effect(() => {
		if (aktiveHexmap) {
			const hexWithImages = aktiveHexmap.hexe.filter(h => !!h.hexBild).length;
			console.log('[Hexkarte] aktiveHexmap changed', { hexCount: aktiveHexmap.hexe.length, hexWithImages });
		}
	});

	onMount(async () => {
		await initApiKey();
		await loadData();
	});

	async function loadData() {
		// Load regions
		const savedRegionen = await getStoredItem<GespeicherteRegion[]>(STORAGE_KEYS.REGIONEN);
		if (savedRegionen) {
			regionen = [HEIMATGEFILDE, ...savedRegionen.filter(r => r.id !== HEIMATGEFILDE_ID)];
		} else {
			regionen = [HEIMATGEFILDE];
		}

		// Load active region
		const savedAktiveRegion = await getStoredItem<string>(STORAGE_KEYS.AKTIVE_REGION);
		if (savedAktiveRegion) {
			aktiveRegionId = savedAktiveRegion;
		}

		// Load orte with migration for missing bild properties
		const savedOrte = await getStoredItem<GespeicherterOrt[]>(STORAGE_KEYS.ORTE);
		if (savedOrte) {
			// Build lookup map for original naturelle data
			const naturellBildMap = new Map<string, string>();
			for (const kat of kategorien) {
				for (const nat of kat.naturelle) {
					naturellBildMap.set(nat.name, nat.bild);
				}
			}

			// Migration: restore missing bild properties
			let needsSave = false;
			const migratedOrte = savedOrte.map(ort => {
				const migratedNaturelle = ort.naturelle.map(nat => {
					if (!nat.bild && naturellBildMap.has(nat.name)) {
						needsSave = true;
						return { ...nat, bild: naturellBildMap.get(nat.name)! };
					}
					return nat;
				});
				return { ...ort, naturelle: migratedNaturelle };
			});
			gespeicherteOrte = migratedOrte;

			if (needsSave) {
				console.log('[Hexkarte] Restauriere fehlende Naturelle-Bilder...');
				await setStoredItem(STORAGE_KEYS.ORTE, migratedOrte);
			}
		}

		// Load hexmaps
		const savedHexmaps = await getStoredItem<GespeicherteHexmap[]>(STORAGE_KEYS.HEXMAPS);
		if (savedHexmaps) {
			hexmaps = savedHexmaps;
		}

		// Ensure hexmap exists for active region
		ensureHexmapForRegion(aktiveRegionId);
	}

	function ensureHexmapForRegion(regionId: string) {
		const existing = hexmaps.find(h => h.regionId === regionId);
		if (!existing) {
			const region = regionen.find(r => r.id === regionId);
			const newHexmap = generiereLeereHexmap(region?.name || 'Neue Karte', regionId);
			hexmaps = [...hexmaps, newHexmap];
			saveHexmaps();
		}
	}

	async function saveHexmaps() {
		await setStoredItem(STORAGE_KEYS.HEXMAPS, hexmaps);
	}

	async function saveOrte() {
		await setStoredItem(STORAGE_KEYS.ORTE, gespeicherteOrte);
	}

	function selectRegion(regionId: string) {
		aktiveRegionId = regionId;
		setStoredItem(STORAGE_KEYS.AKTIVE_REGION, regionId);
		ensureHexmapForRegion(regionId);
	}

	// --- Hex Click Handlers ---

	function handleHexClick(hex: HexOrt, ort: GespeicherterOrt | undefined) {
		// For world hexes without an ort, open the ort generator
		if (isWorldHexmap && !ort && !hex.ortId) {
			worldHexForOrtCreation = hex;
			showOrtGeneratorModal = true;
			return;
		}

		// Normal flow: open hex detail modal
		selectedHex = hex;
		selectedOrt = ort || null;
		showModal = true;
	}

	function handlePlaceholderClick(position: HexPosition) {
		selectedPlaceholderPosition = position;
		showPlaceholderModal = true;
	}

	// --- Modal Close Handlers ---

	function closePlaceholderModal() {
		showPlaceholderModal = false;
		selectedPlaceholderPosition = null;
	}

	function closeModal() {
		showModal = false;
		selectedHex = null;
		selectedOrt = null;
	}

	function closeOrtGeneratorModal() {
		showOrtGeneratorModal = false;
		// Reset position when user explicitly closes without saving
		selectedPlaceholderPosition = null;
		worldHexForOrtCreation = null;
	}

	// --- World Generation ---

	async function handleGenerateNewWorld() {
		if (isGeneratingWorld) return;

		isGeneratingWorld = true;
		console.log('[World] Generating new world...');

		try {
			const seed = generateSeed();
			const world = generateWorld({
				width: 30,
				height: 20,
				seed
			});

			// Create hexmap from world
			const worldName = aktiveRegion?.name ? `${aktiveRegion.name} Welt` : 'Neue Welt';
			const newHexmap = createHexmapFromWorld(world, worldName);
			newHexmap.regionId = aktiveRegionId;

			// Replace existing hexmap for this region
			const existingIndex = hexmaps.findIndex(h => h.regionId === aktiveRegionId);
			if (existingIndex >= 0) {
				hexmaps = hexmaps.map((h, i) => i === existingIndex ? newHexmap : h);
			} else {
				hexmaps = [...hexmaps, newHexmap];
			}

			await saveHexmaps();
			console.log(`[World] Generated world with seed ${seed}: ${world.hexes.size} hexes`);
		} catch (error) {
			console.error('[World] Generation failed:', error);
		} finally {
			isGeneratingWorld = false;
		}
	}

	function toggleBiomeOverlay() {
		showBiomeOverlay = !showBiomeOverlay;
	}

	// Reveal a hidden hex (world hexmaps fog of war) and open ort generator
	async function handleRevealHex(hex: HexOrt) {
		if (!aktiveHexmap || hex.aufgedeckt) return;

		console.log('[Hexkarte] Revealing hex:', hex.id, hex.biome);

		// Mark hex as revealed
		const updated = updateHexInHexmap(aktiveHexmap, hex.id, { aufgedeckt: true });
		hexmaps = hexmaps.map(h => h.id === updated.id ? updated : h);
		await saveHexmaps();

		// Get the updated hex reference and open ort generator
		const revealedHex = updated.hexe.find(h => h.id === hex.id);
		if (revealedHex) {
			worldHexForOrtCreation = revealedHex;
			showOrtGeneratorModal = true;
		}
	}

	// --- Hex Actions ---

	function handleOpenHexBildGenerator() {
		// Open HexBildGeneratorModal for the currently selected hex
		if (!selectedHex || !selectedOrt) return;

		console.log('[HexOrt] Opening HexBildGeneratorModal for existing hex', { hexId: selectedHex.id, ortName: selectedOrt.name });

		// Store data for the hex bild generator
		newlyCreatedOrt = selectedOrt;
		newlyCreatedHexId = selectedHex.id;
		selectedPlaceholderPosition = selectedHex.position;
		isRegeneratingExistingHex = true; // Mark that we're regenerating

		// Close the hex detail modal and open the hex bild generator
		showModal = false;
		showHexBildGeneratorModal = true;
	}

	function handleUpdateOrt(updatedOrt: GespeicherterOrt) {
		gespeicherteOrte = gespeicherteOrte.map(o =>
			o.id === updatedOrt.id ? updatedOrt : o
		);
		selectedOrt = updatedOrt;
		saveOrte();
	}

	async function handleSelectHexBild(bild: string) {
		if (!selectedHex || !aktiveHexmap) return;

		console.log('[HexOrt] Selecting hex bild from history');

		// Update the current hex bild (keep history unchanged, just change display)
		const updated = updateHexInHexmap(aktiveHexmap, selectedHex.id, { hexBild: bild });
		hexmaps = hexmaps.map(h => h.id === updated.id ? updated : h);
		selectedHex = { ...selectedHex, hexBild: bild };
		await saveHexmaps();
	}

	// --- Placeholder Actions ---

	function handleAssignOrtToPlaceholder(ort: GespeicherterOrt) {
		if (!aktiveHexmap || !selectedPlaceholderPosition) return;

		// Add ort to hexmap
		let updated = addOrtZuHexmap(aktiveHexmap, ort.id, selectedPlaceholderPosition);

		// Auto-reveal the hex
		const newHex = updated.hexe.find(h => h.ortId === ort.id);
		if (newHex) {
			updated = updateHexInHexmap(updated, newHex.id, { aufgedeckt: true });
		}

		hexmaps = hexmaps.map(h => h.id === updated.id ? updated : h);
		saveHexmaps();
		closePlaceholderModal();
	}

	function handleCreateNewOrt() {
		// Close placeholder modal but keep the position for later use
		showPlaceholderModal = false;
		// Don't reset selectedPlaceholderPosition here - we need it for the ort creation!
		showOrtGeneratorModal = true;
	}

	// --- Ort Generator Actions ---

	function handleOrtCreated(ort: GespeicherterOrt) {
		// Save the new ort
		gespeicherteOrte = [...gespeicherteOrte, ort];
		saveOrte();

		// Check if we're creating an ort for an existing world hex
		if (aktiveHexmap && worldHexForOrtCreation) {
			// Link ort to existing hex
			const updated = updateHexInHexmap(aktiveHexmap, worldHexForOrtCreation.id, { ortId: ort.id });
			hexmaps = hexmaps.map(h => h.id === updated.id ? updated : h);
			saveHexmaps();

			// Store hex ID for hex bild generator
			newlyCreatedHexId = worldHexForOrtCreation.id;
			// Also store position for the modal
			selectedPlaceholderPosition = worldHexForOrtCreation.position;

			// Clear world hex reference
			worldHexForOrtCreation = null;
		}
		// Regular flow: add to hexmap at the selected placeholder position
		else if (aktiveHexmap && selectedPlaceholderPosition) {
			const updated = addOrtZuHexmap(aktiveHexmap, ort.id, selectedPlaceholderPosition);
			hexmaps = hexmaps.map(h => h.id === updated.id ? updated : h);
			saveHexmaps();

			// Find the newly created hex
			const newHex = updated.hexe.find(h => h.ortId === ort.id);
			if (newHex) {
				newlyCreatedHexId = newHex.id;
			}
		}

		// Store ort for hex bild generator
		newlyCreatedOrt = ort;

		// Close ort generator and open hex bild generator
		// Don't use closeOrtGeneratorModal() here as it would reset the position
		showOrtGeneratorModal = false;
		showHexBildGeneratorModal = true;
	}

	// --- Hex Bild Generator Actions ---

	function closeHexBildGeneratorModal() {
		showHexBildGeneratorModal = false;
		newlyCreatedOrt = null;
		newlyCreatedHexId = null;
		selectedPlaceholderPosition = null;
		isRegeneratingExistingHex = false;
	}

	function handleHexBildSaved(hexBild: string | null) {
		console.log('[HexBild] handleHexBildSaved called', { hexBild: !!hexBild, newlyCreatedHexId, aktiveHexmap: !!aktiveHexmap, isRegeneratingExistingHex });

		// Store these before closing modal
		const wasRegenerating = isRegeneratingExistingHex;
		const savedHexId = newlyCreatedHexId;
		const savedOrt = newlyCreatedOrt;

		// Save the hex bild and mark as aufgedeckt
		if (aktiveHexmap && newlyCreatedHexId) {
			const currentHex = aktiveHexmap.hexe.find(h => h.id === newlyCreatedHexId);
			const updates: { hexBild?: string; hexBildHistory?: Array<{bild: string; erstelltAm: string}>; aufgedeckt: boolean } = { aufgedeckt: true };

			if (hexBild) {
				updates.hexBild = hexBild;
				// Add to history
				const historyEntry = { bild: hexBild, erstelltAm: new Date().toISOString() };
				const existingHistory = currentHex?.hexBildHistory || [];
				updates.hexBildHistory = [...existingHistory, historyEntry];
			}

			const updated = updateHexInHexmap(aktiveHexmap, newlyCreatedHexId, updates);
			hexmaps = hexmaps.map(h => h.id === updated.id ? updated : h);
			saveHexmaps();
			console.log('[HexBild] Hexmap aktualisiert für Hex:', newlyCreatedHexId, 'History:', updates.hexBildHistory?.length);

			// If regenerating, re-open HexOrtModal with updated hex
			if (wasRegenerating && savedHexId && savedOrt) {
				const updatedHex = updated.hexe.find(h => h.id === savedHexId);
				if (updatedHex) {
					// Close the generator modal first
					showHexBildGeneratorModal = false;
					newlyCreatedOrt = null;
					newlyCreatedHexId = null;
					selectedPlaceholderPosition = null;
					isRegeneratingExistingHex = false;

					// Re-open the hex detail modal with updated data
					selectedHex = updatedHex;
					selectedOrt = savedOrt;
					showModal = true;
					return;
				}
			}
		} else {
			console.warn('[HexBild] Konnte nicht speichern - aktiveHexmap:', !!aktiveHexmap, 'newlyCreatedHexId:', newlyCreatedHexId);
		}

		// Close modal and reset
		closeHexBildGeneratorModal();
	}
</script>

<svelte:head>
	<title>Hexkarte | Wurzelwanderer</title>
</svelte:head>

<main class="hexkarte-page">
	<header class="page-header">
		<h1>Hexkarte</h1>
		<p class="subtitle">Entdecke die Welt Hex für Hex</p>
	</header>

	<!-- Region Selection -->
	<section class="region-section">
		<h2>Region</h2>
		<div class="region-cards">
			{#each regionen as region}
				<button
					class="region-btn"
					class:active={region.id === aktiveRegionId}
					onclick={() => selectRegion(region.id)}
				>
					{region.name}
					{#if region.id !== HEIMATGEFILDE_ID}
						<span class="region-features">
							{region.geographisch.length + region.faunaFlora.length + (region.architektur ? 1 : 0)}
						</span>
					{/if}
				</button>
			{/each}
		</div>
	</section>

	<!-- Info & Actions -->
	<section class="actions-section">
		<div class="info-row">
			<div class="info-text">
				{#if aktiveHexmap}
					{aktiveHexmap.hexe.length} Hex{aktiveHexmap.hexe.length !== 1 ? 'e' : ''} auf der Karte
					{#if isWorldHexmap}
						&middot; Seed: {aktiveHexmap.worldSeed}
					{:else if verfuegbareOrte.length > 0}
						&middot; {verfuegbareOrte.length} Ort{verfuegbareOrte.length !== 1 ? 'e' : ''} nicht zugewiesen
					{/if}
				{:else}
					Keine Karte vorhanden
				{/if}
			</div>
			<div class="action-buttons">
				<button
					class="btn btn-world"
					onclick={handleGenerateNewWorld}
					disabled={isGeneratingWorld}
					title="Generiert eine neue prozedurale Welt mit Kontinenten, Meeren und verschiedenen Biomen"
				>
					{#if isGeneratingWorld}
						Generiere...
					{:else}
						Neue Welt generieren
					{/if}
				</button>
				{#if isWorldHexmap}
					<button
						class="btn btn-debug"
						class:active={showBiomeOverlay}
						onclick={toggleBiomeOverlay}
						title="Zeigt Biom-Farben und Temperatur/Feuchtigkeit-Daten"
					>
						{showBiomeOverlay ? 'Biome ausblenden' : 'Biome anzeigen'}
					</button>
				{/if}
			</div>
		</div>
		{#if !isWorldHexmap}
			<p class="hint">Doppelklicke auf ein <strong>+</strong> um einen Ort hinzuzufügen. Ziehen zum Verschieben der Karte.</p>
		{:else}
			<p class="hint">Doppelklicke auf ein Land-Hex um einen Ort zuzuweisen. Ziehen zum Verschieben der Karte.</p>
		{/if}
	</section>

	<!-- Hex Grid -->
	<section class="grid-section">
		{#if aktiveHexmap}
			<HexGrid
				hexmap={aktiveHexmap}
				orte={gespeicherteOrte}
				hexSize={isWorldHexmap ? 80 : 70}
				onHexClick={handleHexClick}
				onPlaceholderClick={handlePlaceholderClick}
				onRevealHex={handleRevealHex}
				selectedHexId={selectedHex?.id}
				{generatingHexId}
				{showBiomeOverlay}
			/>
		{:else}
			<div class="empty-state">
				<p>Lade Karte...</p>
			</div>
		{/if}
	</section>
</main>

<!-- Hex Detail Modal -->
{#if showModal && selectedHex}
	<HexOrtModal
		hex={selectedHex}
		ort={selectedOrt ?? undefined}
		regionInfo={aktiveRegionInfo}
		onClose={closeModal}
		onOpenHexBildGenerator={handleOpenHexBildGenerator}
		onUpdateOrt={handleUpdateOrt}
		onSelectHexBild={handleSelectHexBild}
	/>
{/if}

<!-- Placeholder Modal (Assign or Create) -->
{#if showPlaceholderModal && selectedPlaceholderPosition}
	<HexPlaceholderModal
		position={selectedPlaceholderPosition}
		{verfuegbareOrte}
		onClose={closePlaceholderModal}
		onAssignOrt={handleAssignOrtToPlaceholder}
		onCreateNewOrt={handleCreateNewOrt}
	/>
{/if}

<!-- Ort Generator Modal -->
{#if showOrtGeneratorModal}
	<OrtGeneratorModal
		regionId={aktiveRegionId}
		regionInfo={aktiveRegionInfo}
		position={selectedPlaceholderPosition ?? undefined}
		onClose={closeOrtGeneratorModal}
		onSave={handleOrtCreated}
	/>
{/if}

<!-- Hex Bild Generator Modal -->
{#if showHexBildGeneratorModal && newlyCreatedOrt && selectedPlaceholderPosition}
	<HexBildGeneratorModal
		ort={newlyCreatedOrt}
		position={selectedPlaceholderPosition}
		regionInfo={aktiveRegionInfo}
		hexmap={aktiveHexmap}
		orte={gespeicherteOrte}
		onClose={closeHexBildGeneratorModal}
		onSave={handleHexBildSaved}
	/>
{/if}

<style>
	.hexkarte-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-lg);
	}

	.page-header {
		text-align: center;
		margin-bottom: var(--space-xl);
	}

	.page-header h1 {
		font-size: 2.5rem;
		color: var(--color-bark);
		margin-bottom: var(--space-xs);
	}

	.subtitle {
		color: var(--color-bark);
		opacity: 0.7;
	}

	section {
		margin-bottom: var(--space-xl);
	}

	section h2 {
		font-size: 1.25rem;
		color: var(--color-bark);
		margin-bottom: var(--space-md);
	}

	/* Region Selection */
	.region-cards {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.region-btn {
		padding: var(--space-sm) var(--space-md);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		background: var(--color-cream);
		color: var(--color-bark);
		cursor: pointer;
		transition: all 0.2s;
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
	}

	.region-btn:hover {
		border-color: var(--color-leaf);
	}

	.region-btn.active {
		background: var(--color-leaf);
		color: white;
		border-color: var(--color-leaf);
	}

	.region-features {
		font-size: 0.75rem;
		background: rgba(0, 0, 0, 0.1);
		padding: 2px 6px;
		border-radius: 10px;
	}

	/* Actions */
	.actions-section {
		margin-bottom: var(--space-lg);
	}

	.info-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-bottom: var(--space-xs);
	}

	.info-text {
		color: var(--color-bark);
		font-size: 0.9375rem;
	}

	.action-buttons {
		display: flex;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.btn {
		padding: var(--space-xs) var(--space-sm);
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.8125rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-world {
		background: var(--color-leaf);
		color: white;
	}

	.btn-world:hover:not(:disabled) {
		background: var(--color-leaf-dark, #4a7a3a);
	}

	.btn-debug {
		background: var(--color-earth-light);
		color: var(--color-bark);
	}

	.btn-debug:hover:not(:disabled) {
		background: var(--color-earth);
		color: white;
	}

	.btn-debug.active {
		background: var(--color-bark);
		color: white;
	}

	.hint {
		color: var(--color-bark);
		opacity: 0.6;
		font-size: 0.8125rem;
		text-align: center;
	}

	.hint strong {
		background: var(--color-earth);
		color: var(--color-cream);
		padding: 0 4px;
		border-radius: 3px;
	}

	/* Grid Section */
	.grid-section {
		min-height: 400px;
	}

	.empty-state {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 300px;
		background: var(--color-earth-light);
		border-radius: var(--radius-lg);
		color: var(--color-bark);
		opacity: 0.7;
	}

	@media (max-width: 640px) {
		.hexkarte-page {
			padding: var(--space-md);
		}

		.page-header h1 {
			font-size: 1.75rem;
		}
	}
</style>
