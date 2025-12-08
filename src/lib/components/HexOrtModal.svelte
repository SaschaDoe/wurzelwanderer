<script lang="ts">
	import type { HexOrt, HexBildHistoryEntry } from '$lib/data/hexmap';
	import type { GespeicherterOrt } from '$lib/data/ort';
	import type { RegionInfo } from '$lib/services/geminiService';
	import { hasApiKey } from '$lib/services/geminiService';
	import OrtAnsicht from './OrtAnsicht.svelte';

	interface Props {
		hex: HexOrt;
		ort: GespeicherterOrt | undefined;
		regionInfo?: RegionInfo;
		onClose: () => void;
		onOpenHexBildGenerator: () => void; // Opens HexBildGeneratorModal for proper generation with neighbor context
		onUpdateOrt: (ort: GespeicherterOrt) => void;
		onSelectHexBild?: (bild: string) => void; // Select a different image from history
	}

	let {
		hex,
		ort,
		regionInfo,
		onClose,
		onOpenHexBildGenerator,
		onUpdateOrt,
		onSelectHexBild
	}: Props = $props();

	// Debug: Track hex changes
	$effect(() => {
		console.log('[HexOrtModal] hex prop changed', { hexId: hex.id, hasHexBild: !!hex.hexBild, historyLength: hex.hexBildHistory?.length });
	});

	// Fullscreen image state
	let showFullscreenImage = $state(false);

	// Check if there are multiple images in history
	let hasHistory = $derived((hex.hexBildHistory?.length ?? 0) > 1);

	// Format date for display
	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleSelectImage(entry: HexBildHistoryEntry) {
		if (onSelectHexBild && entry.bild !== hex.hexBild) {
			onSelectHexBild(entry.bild);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			if (showFullscreenImage) {
				showFullscreenImage = false;
			} else {
				onClose();
			}
		}
	}

	function openFullscreen() {
		showFullscreenImage = true;
	}

	function closeFullscreen() {
		showFullscreenImage = false;
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleOrtUpdate(updatedOrt: GespeicherterOrt) {
		onUpdateOrt(updatedOrt);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal-content">
		<button class="close-button" onclick={onClose} aria-label="Schliessen">
			&times;
		</button>

		{#if ort}
			<div class="modal-body">
				<OrtAnsicht
					{ort}
					{regionInfo}
					onUpdate={handleOrtUpdate}
					showBildBereich={true}
					showBeschreibung={true}
					showNaturelle={true}
					showBekannte={true}
					showGottheiten={true}
					showDetails={true}
					showGeschichte={true}
					showSpielleiter={true}
					editable={true}
					compact={false}
				/>

				<!-- Hex-Bild Sektion (speziell für Hexkarte) -->
				<div class="hex-bild-section">
					<h3>Hex-Bild</h3>
					{#if hex.hexBild}
						<button class="hex-bild-preview-btn" onclick={openFullscreen} title="Klicken zum Vergrößern">
							<div class="hex-bild-preview">
								<img src={hex.hexBild} alt={ort.name} />
							</div>
							<span class="zoom-hint">Klicken zum Vergrößern</span>
						</button>
					{:else}
						<p class="no-bild">Noch kein Hex-Bild für die Karte generiert.</p>
					{/if}

					<!-- History Gallery -->
					{#if hasHistory && hex.hexBildHistory}
						<div class="history-section">
							<h4>Frühere Versionen ({hex.hexBildHistory.length})</h4>
							<div class="history-gallery">
								{#each hex.hexBildHistory as entry, index}
									<button
										class="history-item"
										class:active={entry.bild === hex.hexBild}
										onclick={() => handleSelectImage(entry)}
										title={formatDate(entry.erstelltAm)}
									>
										<img src={entry.bild} alt="Version {index + 1}" />
										<span class="history-index">#{index + 1}</span>
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<button
						class="btn btn-primary hex-bild-btn"
						onclick={onOpenHexBildGenerator}
						disabled={!hasApiKey()}
					>
						{#if hex.hexBild}
							Hex-Bild neu generieren
						{:else}
							Hex-Bild generieren
						{/if}
					</button>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={onClose}>
					Schliessen
				</button>
			</div>
		{:else}
			<div class="modal-body">
				<p class="error">Ort nicht gefunden.</p>
			</div>
			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={onClose}>
					Schliessen
				</button>
			</div>
		{/if}
	</div>
</div>

<!-- Fullscreen Image Viewer -->
{#if showFullscreenImage && hex.hexBild}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="fullscreen-backdrop" onclick={closeFullscreen}>
		<button class="fullscreen-close" onclick={closeFullscreen} aria-label="Schließen">
			&times;
		</button>
		<div class="fullscreen-image-container">
			<img src={hex.hexBild} alt="Hex-Bild Vollansicht" class="fullscreen-image" />
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
		max-width: 900px;
		width: 100%;
		position: relative;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		margin: var(--space-lg) 0;
	}

	.close-button {
		position: sticky;
		top: var(--space-sm);
		float: right;
		margin-right: var(--space-sm);
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

	.modal-body {
		padding: var(--space-md);
	}

	/* Hex-Bild Section */
	.hex-bild-section {
		margin-top: var(--space-lg);
		padding: var(--space-lg);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border: 2px solid var(--color-earth-light);
	}

	.hex-bild-section h3 {
		font-size: 1rem;
		color: var(--color-bark);
		margin: 0 0 var(--space-md) 0;
		font-family: var(--font-display);
	}

	.hex-bild-preview {
		width: 100%;
		max-width: 200px;
		margin: 0 auto var(--space-md);
	}

	.hex-bild-preview img {
		width: 100%;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}

	.no-bild {
		color: var(--color-bark);
		opacity: 0.5;
		font-style: italic;
		text-align: center;
		margin-bottom: var(--space-md);
	}

	.hex-bild-btn {
		width: 100%;
	}

	/* History Section */
	.history-section {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-earth-light);
	}

	.history-section h4 {
		font-size: 0.875rem;
		color: var(--color-bark);
		margin: 0 0 var(--space-sm) 0;
		font-family: var(--font-display);
	}

	.history-gallery {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.history-item {
		position: relative;
		width: 60px;
		height: 60px;
		padding: 0;
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-sm);
		background: white;
		cursor: pointer;
		overflow: hidden;
		transition: border-color 0.2s, transform 0.2s;
	}

	.history-item:hover {
		border-color: var(--color-leaf);
		transform: scale(1.05);
	}

	.history-item.active {
		border-color: var(--color-leaf);
		box-shadow: 0 0 0 2px var(--color-leaf-light, rgba(74, 144, 74, 0.3));
	}

	.history-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.history-index {
		position: absolute;
		bottom: 2px;
		right: 2px;
		background: rgba(0, 0, 0, 0.6);
		color: white;
		font-size: 0.625rem;
		padding: 1px 4px;
		border-radius: 2px;
	}

	.modal-footer {
		padding: var(--space-md) var(--space-lg);
		border-top: 1px solid var(--color-earth-light);
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
		position: sticky;
		bottom: 0;
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

	.error {
		color: #c44;
		text-align: center;
	}

	/* Clickable Preview Button */
	.hex-bild-preview-btn {
		background: none;
		border: none;
		padding: 0;
		cursor: zoom-in;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		transition: transform 0.2s;
		width: 100%;
		max-width: 200px;
		margin: 0 auto var(--space-md);
	}

	.hex-bild-preview-btn:hover {
		transform: scale(1.05);
	}

	.hex-bild-preview-btn:hover .zoom-hint {
		opacity: 1;
	}

	.hex-bild-preview-btn .hex-bild-preview {
		margin: 0;
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
