<script lang="ts">
	import { onMount } from 'svelte';
	import {
		type Gottheit,
		erstelleGottheit,
		generiereGottheitData,
		domänen,
		erscheinungen,
		fähigkeitenTemplates,
		opferwege
	} from '$lib/data/gottheiten';
	import { STORAGE_KEYS, getStoredItem, setStoredItem } from '$lib/utils/storage';
	import { hasApiKey, initApiKey, generateGottheitVorgeschichte, generateGottheitBild } from '$lib/services/geminiService';
	import GottheitCard from '$lib/components/GottheitCard.svelte';

	// State
	let gottheiten = $state<Gottheit[]>([]);
	let selectedGottheit = $state<Gottheit | null>(null);
	let isCreating = $state(false);

	// LLM generation state
	let isGeneratingVorgeschichte = $state(false);
	let isGeneratingBild = $state(false);

	// Load saved data
	onMount(async () => {
		await initApiKey();
		const saved = await getStoredItem<Gottheit[]>(STORAGE_KEYS.GOTTHEITEN);
		if (saved) {
			gottheiten = saved;
		}
	});

	// Save to storage
	async function speichereGottheiten() {
		await setStoredItem(STORAGE_KEYS.GOTTHEITEN, gottheiten);
	}

	// Create new Gottheit
	function neueGottheit() {
		const gottheit = erstelleGottheit();
		gottheiten = [...gottheiten, gottheit];
		selectedGottheit = gottheit;
		isCreating = true;
		speichereGottheiten();
	}

	// Re-roll random data
	function würfleNeu() {
		if (!selectedGottheit) return;
		const neueDaten = generiereGottheitData();
		selectedGottheit = {
			...selectedGottheit,
			...neueDaten,
		};
		updateGottheit(selectedGottheit);
	}

	// Update Gottheit
	function updateGottheit(updated: Gottheit) {
		gottheiten = gottheiten.map(g => g.id === updated.id ? updated : g);
		if (selectedGottheit?.id === updated.id) {
			selectedGottheit = updated;
		}
		speichereGottheiten();
	}

	// Delete Gottheit
	function löscheGottheit(id: string) {
		gottheiten = gottheiten.filter(g => g.id !== id);
		if (selectedGottheit?.id === id) {
			selectedGottheit = null;
			isCreating = false;
		}
		speichereGottheiten();
	}

	// Select Gottheit for editing
	function selectGottheit(gottheit: Gottheit) {
		selectedGottheit = gottheit;
		isCreating = true;
	}

	// Close editor
	function schließeEditor() {
		selectedGottheit = null;
		isCreating = false;
	}

	// Generate Vorgeschichte using LLM
	async function generiereVorgeschichte() {
		if (!selectedGottheit) return;

		isGeneratingVorgeschichte = true;

		try {
			const result = await generateGottheitVorgeschichte({
				name: selectedGottheit.name,
				beiname: selectedGottheit.beiname,
				domäne: selectedGottheit.domäne,
				erscheinung: selectedGottheit.erscheinung,
				fähigkeiten: selectedGottheit.fähigkeiten,
				opferweg: selectedGottheit.opferweg
			});

			if (result.success && result.vorgeschichte) {
				updateGottheit({
					...selectedGottheit,
					vorgeschichte: result.vorgeschichte
				});
			} else {
				console.error('Vorgeschichte-Generierung fehlgeschlagen:', result.error);
			}
		} catch (error) {
			console.error('Fehler bei Vorgeschichte-Generierung:', error);
		} finally {
			isGeneratingVorgeschichte = false;
		}
	}

	// Generate Bild using image generation
	async function generiereBild() {
		if (!selectedGottheit) return;

		isGeneratingBild = true;

		try {
			const bildData = await generateGottheitBild({
				name: selectedGottheit.name,
				beiname: selectedGottheit.beiname,
				domäne: selectedGottheit.domäne,
				erscheinung: selectedGottheit.erscheinung,
				fähigkeiten: selectedGottheit.fähigkeiten,
				opferweg: selectedGottheit.opferweg
			});

			if (bildData) {
				updateGottheit({
					...selectedGottheit,
					bild: bildData
				});
			}
		} catch (error) {
			console.error('Fehler bei Bild-Generierung:', error);
		} finally {
			isGeneratingBild = false;
		}
	}

	// Filter gottheiten by type
	let unabhängigeGottheiten = $derived(gottheiten.filter(g => !g.ortId));
	let ortsgebundeneGottheiten = $derived(gottheiten.filter(g => g.ortId));
</script>

<svelte:head>
	<title>Gottheiten - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Gottheiten</h1>
	<p class="intro">
		Vergessene Götter und kleine Geister, die in der Welt wandeln.
		Inspiriert von Shintoismus, Studio Ghibli und Märchen aus aller Welt.
	</p>

	<div class="gottheiten-layout">
		<!-- Liste der Gottheiten -->
		<section class="gottheiten-liste">
			<div class="liste-header">
				<h2>Deine Gottheiten</h2>
				<button class="btn btn-primary" onclick={neueGottheit}>
					+ Neue Gottheit
				</button>
			</div>

			{#if gottheiten.length === 0}
				<div class="empty-state">
					<p class="empty-icon">🌟</p>
					<p>Noch keine Gottheiten erschaffen.</p>
					<p class="empty-hint">Erschaffe deine erste vergessene Gottheit!</p>
				</div>
			{:else}
				{#if unabhängigeGottheiten.length > 0}
					<div class="gottheiten-gruppe">
						<h3 class="gruppe-titel">Unabhängige Gottheiten</h3>
						<div class="gottheiten-grid">
							{#each unabhängigeGottheiten as gottheit}
								<button
									class="gottheit-preview"
									class:selected={selectedGottheit?.id === gottheit.id}
									onclick={() => selectGottheit(gottheit)}
								>
									{#if gottheit.bild}
										<img src={gottheit.bild} alt={gottheit.name} class="preview-bild" />
									{:else}
										<div class="preview-placeholder">🌟</div>
									{/if}
									<div class="preview-info">
										<span class="preview-name">{gottheit.name}</span>
										<span class="preview-domäne">{gottheit.domäne}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#if ortsgebundeneGottheiten.length > 0}
					<div class="gottheiten-gruppe">
						<h3 class="gruppe-titel">Ortsgebundene Gottheiten</h3>
						<div class="gottheiten-grid">
							{#each ortsgebundeneGottheiten as gottheit}
								<button
									class="gottheit-preview ortsgebunden"
									class:selected={selectedGottheit?.id === gottheit.id}
									onclick={() => selectGottheit(gottheit)}
								>
									{#if gottheit.bild}
										<img src={gottheit.bild} alt={gottheit.name} class="preview-bild" />
									{:else}
										<div class="preview-placeholder">📍</div>
									{/if}
									<div class="preview-info">
										<span class="preview-name">{gottheit.name}</span>
										<span class="preview-domäne">{gottheit.domäne}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</section>

		<!-- Editor / Detail-Ansicht -->
		{#if selectedGottheit}
			<section class="gottheit-editor">
				<div class="editor-header">
					<h2>{isCreating ? 'Gottheit bearbeiten' : 'Details'}</h2>
					<div class="editor-actions">
						<button class="btn btn-secondary" onclick={würfleNeu} title="Neu würfeln">
							🎲 Neu würfeln
						</button>
						<button class="btn btn-ghost" onclick={schließeEditor}>
							✕
						</button>
					</div>
				</div>

				<GottheitCard
					gottheit={selectedGottheit}
					editable={true}
					onUpdate={updateGottheit}
					onRemove={() => löscheGottheit(selectedGottheit!.id)}
					onGenerateBild={generiereBild}
					onGenerateVorgeschichte={generiereVorgeschichte}
					{isGeneratingBild}
					{isGeneratingVorgeschichte}
				/>
			</section>
		{:else}
			<section class="gottheit-placeholder">
				<div class="placeholder-content">
					<span class="placeholder-icon">✨</span>
					<p>Wähle eine Gottheit aus oder erschaffe eine neue.</p>
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.intro {
		color: var(--color-earth);
		margin-bottom: var(--space-xl);
		font-size: 1.1rem;
	}

	.gottheiten-layout {
		display: grid;
		grid-template-columns: 1fr 1.5fr;
		gap: var(--space-xl);
		align-items: start;
	}

	@media (max-width: 900px) {
		.gottheiten-layout {
			grid-template-columns: 1fr;
		}
	}

	/* Liste */
	.gottheiten-liste {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		border: 2px solid var(--color-earth-light);
	}

	.liste-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-lg);
	}

	.liste-header h2 {
		margin: 0;
		font-size: 1.25rem;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-earth);
	}

	.empty-icon {
		font-size: 3rem;
		margin-bottom: var(--space-md);
	}

	.empty-hint {
		font-size: 0.9rem;
		font-style: italic;
		margin-top: var(--space-sm);
	}

	/* Gruppen */
	.gottheiten-gruppe {
		margin-bottom: var(--space-lg);
	}

	.gruppe-titel {
		font-size: 0.9rem;
		color: var(--color-earth);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: var(--space-sm);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-earth-light);
	}

	.gottheiten-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-md);
	}

	/* Preview Cards */
	.gottheit-preview {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-sm);
		background: var(--color-cream);
		border: 2px solid #c9a227;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.gottheit-preview:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(201, 162, 39, 0.2);
	}

	.gottheit-preview.selected {
		border-color: #8b6914;
		background: linear-gradient(135deg, #f5e6c8 0%, #e8d5a3 100%);
	}

	.gottheit-preview.ortsgebunden {
		border-color: var(--color-leaf);
	}

	.preview-bild {
		width: 60px;
		height: 60px;
		border-radius: var(--radius-sm);
		object-fit: cover;
		margin-bottom: var(--space-xs);
	}

	.preview-placeholder {
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		background: rgba(201, 162, 39, 0.1);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-xs);
	}

	.preview-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.preview-name {
		font-weight: 600;
		color: #5c4a1f;
		font-size: 0.9rem;
	}

	.preview-domäne {
		font-size: 0.75rem;
		color: #8b6914;
	}

	/* Editor */
	.gottheit-editor {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		border: 2px solid #c9a227;
	}

	.editor-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid #c9a22744;
	}

	.editor-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #5c4a1f;
	}

	.editor-actions {
		display: flex;
		gap: var(--space-sm);
	}

	/* Placeholder */
	.gottheit-placeholder {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		border: 2px dashed var(--color-earth-light);
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 400px;
	}

	.placeholder-content {
		text-align: center;
		color: var(--color-earth);
	}

	.placeholder-content .placeholder-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-md);
	}

	/* Buttons */
	.btn {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.btn-primary {
		background: linear-gradient(135deg, #c9a227 0%, #a07d1c 100%);
		color: white;
	}

	.btn-primary:hover {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(201, 162, 39, 0.3);
	}

	.btn-secondary {
		background: var(--color-cream);
		color: #5c4a1f;
		border: 1px solid #c9a227;
	}

	.btn-secondary:hover {
		background: #f5e6c8;
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-earth);
		font-size: 1.2rem;
		padding: var(--space-xs) var(--space-sm);
	}

	.btn-ghost:hover {
		background: rgba(0, 0, 0, 0.05);
	}
</style>
