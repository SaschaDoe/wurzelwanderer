<script lang="ts">
	import type { GespeicherterOrt } from '$lib/data/ort';
	import type { HexPosition, GespeicherteHexmap, HexOrt } from '$lib/data/hexmap';
	import { getHexNeighborsWithDirections } from '$lib/data/hexmap';
	import { generateHexTileImage, hasApiKey, type RegionInfo, type NeighborHexInfo } from '$lib/services/geminiService';
	import { BIOME_NAMES } from '$lib/services/worldGenerator';

	interface Props {
		ort: GespeicherterOrt;
		position: HexPosition;
		regionInfo?: RegionInfo;
		hexmap?: GespeicherteHexmap;
		orte?: GespeicherterOrt[];
		onClose: () => void;
		onSave: (hexBild: string | null) => void;
	}

	let { ort, position, regionInfo, hexmap, orte, onClose, onSave }: Props = $props();

	// State
	let customDescription = $state('');
	let isGenerating = $state(false);
	let generatedImage = $state<string | null>(null);
	let error = $state<string | null>(null);
	let useNeighborContext = $state(true);
	let showFullscreenImage = $state(false);

	// Derived info display
	let naturelleNames = $derived(ort.naturelle.map(n => n.name).join(', '));
	let hauptNaturell = $derived(ort.hauptNaturell || ort.naturelle[0]?.name || 'Unbekannt');

	// Get the current hex to access biome data
	let currentHex = $derived(
		hexmap?.hexe.find(h => h.position.q === position.q && h.position.r === position.r)
	);

	// Get biome name for display
	let biomeName = $derived(currentHex?.biome ? BIOME_NAMES[currentHex.biome] : undefined);

	// Find neighbor hexes with images
	let neighborHexes = $derived.by(() => {
		if (!hexmap || !orte) return [];

		const neighbors = getHexNeighborsWithDirections(position);
		const result: Array<{
			direction: NeighborHexInfo['direction'];
			hex: HexOrt;
			ortName: string;
		}> = [];

		for (const neighbor of neighbors) {
			const hex = hexmap.hexe.find(
				h => h.position.q === neighbor.position.q && h.position.r === neighbor.position.r
			);
			if (hex?.hexBild && hex.aufgedeckt) {
				const hexOrt = orte.find(o => o.id === hex.ortId);
				result.push({
					direction: neighbor.direction,
					hex,
					ortName: hexOrt?.name || 'Unbekannt'
				});
			}
		}

		return result;
	});

	let hasNeighborsWithImages = $derived(neighborHexes.length > 0);

	async function handleGenerate() {
		if (!hasApiKey()) {
			error = 'Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.';
			return;
		}

		isGenerating = true;
		error = null;

		try {
			// Collect neighbor images if enabled
			let neighbors: NeighborHexInfo[] | undefined;
			if (useNeighborContext && hasNeighborsWithImages) {
				neighbors = neighborHexes.map(n => ({
					direction: n.direction,
					imageData: n.hex.hexBild!,
					ortName: n.ortName
				}));
				console.log(`[HexBild] Generiere mit ${neighbors.length} Nachbar-Bildern`);
			}

			const hexBild = await generateHexTileImage({
				name: ort.name,
				hauptNaturell: hauptNaturell,
				naturelle: ort.naturelle.map(n => ({
					name: n.name,
					beschreibung: n.beschreibung,
					metaphorisch: n.metaphorisch
				})),
				region: regionInfo,
				customDescription: customDescription.trim() || undefined,
				neighbors,
				biome: currentHex?.biome // Pass biome from world generation
			});

			if (hexBild) {
				generatedImage = hexBild;
			} else {
				error = 'Bildgenerierung fehlgeschlagen. Bitte erneut versuchen.';
			}
		} catch (err) {
			console.error('Hex-Bild Generierung fehlgeschlagen:', err);
			error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			isGenerating = false;
		}
	}

	function handleSave() {
		onSave(generatedImage);
	}

	function handleSkip() {
		onSave(null);
	}

	// Handle close - save generated image if not yet saved
	function handleClose() {
		if (generatedImage) {
			// Auto-save the generated image when closing
			console.log('[HexBild] Auto-save bei Schließen');
			onSave(generatedImage);
		} else {
			onClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (showFullscreenImage) {
				showFullscreenImage = false;
			} else {
				handleClose();
			}
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			handleClose();
		}
	}

	function openFullscreen() {
		showFullscreenImage = true;
	}

	function closeFullscreen() {
		showFullscreenImage = false;
	}

	const directionLabels: Record<string, string> = {
		'N': 'Nord',
		'NE': 'Nordost',
		'SE': 'Südost',
		'S': 'Süd',
		'SW': 'Südwest',
		'NW': 'Nordwest'
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal-content">
		<button class="close-button" onclick={handleClose} aria-label="Schliessen">
			&times;
		</button>

		<div class="modal-header">
			<h2>Hex-Bild generieren</h2>
			<p class="subtitle">Für "{ort.name}" an Position ({position.q}, {position.r})</p>
		</div>

		<div class="modal-body">
			<!-- Ort Summary -->
			<div class="ort-summary">
				<h3>Ort-Informationen</h3>
				<div class="summary-grid">
					<div class="summary-item">
						<span class="label">Name:</span>
						<span class="value">{ort.name}</span>
					</div>
					<div class="summary-item">
						<span class="label">Haupt-Naturell:</span>
						<span class="value">{hauptNaturell}</span>
					</div>
					<div class="summary-item full-width">
						<span class="label">Naturelle:</span>
						<span class="value">{naturelleNames}</span>
					</div>
					{#if biomeName}
						<div class="summary-item">
							<span class="label">Biom:</span>
							<span class="value biome-value">{biomeName}</span>
						</div>
					{/if}
					{#if regionInfo}
						<div class="summary-item">
							<span class="label">Region:</span>
							<span class="value">{regionInfo.name}</span>
						</div>
					{/if}
				</div>
			</div>

			<!-- Neighbor Context -->
			{#if hasNeighborsWithImages}
				<div class="neighbor-section">
					<label class="neighbor-toggle">
						<input type="checkbox" bind:checked={useNeighborContext} />
						<span class="toggle-text">
							Nachbar-Kontext verwenden
							<span class="toggle-hint">({neighborHexes.length} Nachbar{neighborHexes.length !== 1 ? 'n' : ''} mit Bild)</span>
						</span>
					</label>
					{#if useNeighborContext}
						<div class="neighbor-preview">
							{#each neighborHexes as neighbor}
								<div class="neighbor-item">
									<img src={neighbor.hex.hexBild} alt={neighbor.ortName} />
									<span class="neighbor-direction">{directionLabels[neighbor.direction]}</span>
								</div>
							{/each}
						</div>
						<p class="neighbor-hint">
							Die Nachbar-Bilder werden an die KI gesendet, um smoothere Übergänge zu erzeugen.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Custom Description -->
			<div class="description-section">
				<label for="custom-description">
					<h3>Zusätzliche Bildbeschreibung</h3>
					<p class="hint">Beschreibe, wie das Hex-Feld aussehen soll (optional). Die Ort-Informationen werden automatisch verwendet.</p>
				</label>
				<textarea
					id="custom-description"
					bind:value={customDescription}
					placeholder="z.B. Ein kleines Dorf umgeben von Weizenfeldern, mit einem Bach der durchfließt..."
					rows="4"
				></textarea>
			</div>

			<!-- Generate Button -->
			<div class="generate-section">
				<button
					class="btn btn-primary btn-large"
					onclick={handleGenerate}
					disabled={isGenerating || !hasApiKey()}
				>
					{#if isGenerating}
						<span class="spinner"></span>
						Generiere Hex-Bild...
					{:else if generatedImage}
						Neu generieren
					{:else}
						Hex-Bild generieren
					{/if}
				</button>
				{#if !hasApiKey()}
					<p class="warning">Kein API Key vorhanden. Bitte in den Einstellungen hinterlegen.</p>
				{/if}
			</div>

			<!-- Error -->
			{#if error}
				<div class="error-message">
					<p>{error}</p>
				</div>
			{/if}

			<!-- Preview -->
			{#if generatedImage}
				<div class="preview-section">
					<h3>Vorschau</h3>
					<div class="hex-preview-container">
						<button class="hex-preview-button" onclick={openFullscreen} title="Klicken zum Vergrößern">
							<div class="hex-preview">
								<img src={generatedImage} alt="Hex-Bild Vorschau" />
							</div>
							<span class="zoom-hint">Klicken zum Vergrößern</span>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={handleSkip}>
				Überspringen
			</button>
			<button
				class="btn btn-primary"
				onclick={handleSave}
				disabled={!generatedImage}
			>
				Hex-Bild speichern
			</button>
		</div>
	</div>
</div>

<!-- Fullscreen Image Viewer -->
{#if showFullscreenImage && generatedImage}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fullscreen-backdrop" onclick={closeFullscreen}>
		<button class="fullscreen-close" onclick={closeFullscreen} aria-label="Schließen">
			&times;
		</button>
		<div class="fullscreen-image-container">
			<img src={generatedImage} alt="Hex-Bild Vollansicht" class="fullscreen-image" />
		</div>
		<p class="fullscreen-hint">Klicken oder ESC zum Schließen</p>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
		overflow-y: auto;
	}

	.modal-content {
		background: var(--color-cream);
		border-radius: var(--radius-lg);
		max-width: 650px;
		width: 100%;
		position: relative;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		margin: var(--space-lg) 0;
	}

	.close-button {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		background: var(--color-cream);
		border: 2px solid var(--color-earth-light);
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-bark);
		opacity: 0.8;
		transition: opacity 0.2s;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		z-index: 10;
	}

	.close-button:hover {
		opacity: 1;
		background: var(--color-earth-light);
	}

	.modal-header {
		padding: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-earth-light);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.5rem;
		color: var(--color-bark);
	}

	.subtitle {
		margin: var(--space-xs) 0 0;
		font-size: 0.875rem;
		color: var(--color-bark);
		opacity: 0.7;
	}

	.modal-body {
		padding: var(--space-lg);
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	/* Ort Summary */
	.ort-summary {
		background: var(--color-earth-light);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.ort-summary h3 {
		margin: 0 0 var(--space-sm) 0;
		font-size: 0.875rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-bark);
		opacity: 0.7;
	}

	.summary-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-sm);
	}

	.summary-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.summary-item.full-width {
		grid-column: 1 / -1;
	}

	.summary-item .label {
		font-size: 0.75rem;
		color: var(--color-bark);
		opacity: 0.6;
	}

	.summary-item .value {
		font-size: 0.9375rem;
		color: var(--color-bark);
	}

	.summary-item .value.biome-value {
		background: var(--color-leaf);
		color: white;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.8125rem;
		font-weight: 500;
	}

	/* Neighbor Section */
	.neighbor-section {
		background: var(--color-cream);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.neighbor-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		cursor: pointer;
	}

	.neighbor-toggle input[type="checkbox"] {
		width: 18px;
		height: 18px;
		accent-color: var(--color-leaf);
	}

	.toggle-text {
		font-size: 0.9375rem;
		color: var(--color-bark);
		font-weight: 500;
	}

	.toggle-hint {
		font-weight: 400;
		opacity: 0.6;
	}

	.neighbor-preview {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-top: var(--space-md);
	}

	.neighbor-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.neighbor-item img {
		width: 60px;
		height: 60px;
		object-fit: cover;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		border: 2px solid var(--color-earth-light);
	}

	.neighbor-direction {
		font-size: 0.625rem;
		color: var(--color-bark);
		opacity: 0.7;
		text-transform: uppercase;
	}

	.neighbor-hint {
		margin: var(--space-sm) 0 0;
		font-size: 0.75rem;
		color: var(--color-bark);
		opacity: 0.6;
		font-style: italic;
	}

	/* Description Section */
	.description-section h3 {
		margin: 0;
		font-size: 1rem;
		color: var(--color-bark);
	}

	.description-section .hint {
		margin: var(--space-xs) 0 var(--space-sm);
		font-size: 0.8125rem;
		color: var(--color-bark);
		opacity: 0.6;
	}

	.description-section textarea {
		width: 100%;
		padding: var(--space-sm);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 0.9375rem;
		resize: vertical;
		min-height: 100px;
		background: white;
	}

	.description-section textarea:focus {
		outline: none;
		border-color: var(--color-leaf);
	}

	/* Generate Section */
	.generate-section {
		text-align: center;
	}

	.btn-large {
		padding: var(--space-md) var(--space-xl);
		font-size: 1rem;
	}

	.warning {
		margin-top: var(--space-sm);
		font-size: 0.8125rem;
		color: #c44;
	}

	/* Error Message */
	.error-message {
		background: #fee;
		border: 1px solid #c44;
		border-radius: var(--radius-md);
		padding: var(--space-sm) var(--space-md);
	}

	.error-message p {
		margin: 0;
		color: #c44;
		font-size: 0.875rem;
	}

	/* Preview Section */
	.preview-section {
		text-align: center;
	}

	.preview-section h3 {
		margin: 0 0 var(--space-md) 0;
		font-size: 1rem;
		color: var(--color-bark);
	}

	.hex-preview-container {
		display: flex;
		justify-content: center;
	}

	.hex-preview {
		width: 200px;
		height: 200px;
		overflow: hidden;
	}

	.hex-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}

	/* Modal Footer */
	.modal-footer {
		padding: var(--space-md) var(--space-lg);
		border-top: 1px solid var(--color-earth-light);
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
		background: var(--color-cream);
	}

	.btn {
		padding: var(--space-sm) var(--space-md);
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		cursor: pointer;
		transition: background-color 0.2s, opacity 0.2s;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--color-leaf);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-leaf-dark, #3a7a3a);
	}

	.btn-secondary {
		background: var(--color-earth-light);
		color: var(--color-bark);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-earth);
		color: white;
	}

	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 640px) {
		.modal-content {
			margin: var(--space-sm) 0;
		}

		.summary-grid {
			grid-template-columns: 1fr;
		}

		.summary-item.full-width {
			grid-column: auto;
		}
	}

	/* Clickable Preview Button */
	.hex-preview-button {
		background: none;
		border: none;
		padding: 0;
		cursor: zoom-in;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		transition: transform 0.2s;
	}

	.hex-preview-button:hover {
		transform: scale(1.05);
	}

	.hex-preview-button:hover .zoom-hint {
		opacity: 1;
	}

	.zoom-hint {
		font-size: 0.75rem;
		color: var(--color-bark);
		opacity: 0.5;
		transition: opacity 0.2s;
	}

	/* Fullscreen Image Viewer */
	.fullscreen-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		cursor: zoom-out;
	}

	.fullscreen-close {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		background: rgba(255, 255, 255, 0.1);
		border: 2px solid rgba(255, 255, 255, 0.3);
		font-size: 2rem;
		cursor: pointer;
		color: white;
		width: 50px;
		height: 50px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		transition: background-color 0.2s;
	}

	.fullscreen-close:hover {
		background: rgba(255, 255, 255, 0.2);
	}

	.fullscreen-image-container {
		max-width: 90vw;
		max-height: 80vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.fullscreen-image {
		max-width: 100%;
		max-height: 80vh;
		object-fit: contain;
		border-radius: var(--radius-md);
		box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
	}

	.fullscreen-hint {
		margin-top: var(--space-md);
		font-size: 0.875rem;
		color: rgba(255, 255, 255, 0.5);
	}
</style>
