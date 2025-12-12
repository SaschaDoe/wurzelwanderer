<script lang="ts">
	import type { GespeicherterOrt } from '$lib/data/ort';
	import type { HexPosition, GespeicherteHexmap, HexOrt, HexDirection } from '$lib/data/hexmap';
	import { getHexNeighborsWithDirections, hexToPixel } from '$lib/data/hexmap';
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
	let showDebugOverlay = $state(false);

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

	// Hex size for the preview
	const PREVIEW_HEX_SIZE = 45;

	// Calculate hex dimensions
	const hexWidth = PREVIEW_HEX_SIZE * Math.sqrt(3);
	const hexHeight = PREVIEW_HEX_SIZE * 2;

	// For pointy-top hexagons, the neighbor positions from getHexNeighborsWithDirections are:
	// N:  q=0, r=-1  → directly above
	// NE: q=1, r=-1  → upper-right diagonal
	// SE: q=1, r=0   → RIGHT (not lower-right!)
	// S:  q=0, r=1   → directly below
	// SW: q=-1, r=1  → lower-left diagonal
	// NW: q=-1, r=0  → LEFT (not upper-left!)
	//
	// The hexToPixel formula gives:
	// x = size * (sqrt(3) * q + sqrt(3)/2 * r)
	// y = size * (3/2 * r)
	//
	// So SE (q=1,r=0) → x = size*sqrt(3), y = 0 (directly right!)
	// And NW (q=-1,r=0) → x = -size*sqrt(3), y = 0 (directly left!)

	// Calculate pixel position for a hex offset
	function getPixelOffset(q: number, r: number): { x: number; y: number } {
		return hexToPixel(q, r, PREVIEW_HEX_SIZE);
	}

	// Pre-calculate all positions using the SAME offsets as getHexNeighborsWithDirections
	const centerPixel = { x: 0, y: 0 };
	const neighborPixels: Record<HexDirection, { x: number; y: number }> = {
		N: getPixelOffset(0, -1),
		NE: getPixelOffset(1, -1),
		SE: getPixelOffset(1, 0),
		S: getPixelOffset(0, 1),
		SW: getPixelOffset(-1, 1),
		NW: getPixelOffset(-1, 0)
	};

	// Calculate preview container bounds
	const allPixels = [centerPixel, ...Object.values(neighborPixels)];
	const minX = Math.min(...allPixels.map(p => p.x)) - hexWidth / 2;
	const maxX = Math.max(...allPixels.map(p => p.x)) + hexWidth / 2;
	const minY = Math.min(...allPixels.map(p => p.y)) - hexHeight / 2;
	const maxY = Math.max(...allPixels.map(p => p.y)) + hexHeight / 2;
	const previewWidth = maxX - minX;
	const previewHeight = maxY - minY;
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
					<div class="neighbor-controls">
						<label class="neighbor-toggle">
							<input type="checkbox" bind:checked={useNeighborContext} />
							<span class="toggle-text">
								Nachbar-Kontext verwenden
								<span class="toggle-hint">({neighborHexes.length} Nachbar{neighborHexes.length !== 1 ? 'n' : ''} mit Bild)</span>
							</span>
						</label>
						{#if useNeighborContext}
							<label class="neighbor-toggle debug-toggle">
								<input type="checkbox" bind:checked={showDebugOverlay} />
								<span class="toggle-text">Crop-Zonen anzeigen</span>
							</label>
						{/if}
					</div>
					{#if useNeighborContext}
						{@const nNeighbor = neighborHexes.find(n => n.direction === 'N')}
						{@const neNeighbor = neighborHexes.find(n => n.direction === 'NE')}
						{@const seNeighbor = neighborHexes.find(n => n.direction === 'SE')}
						{@const sNeighbor = neighborHexes.find(n => n.direction === 'S')}
						{@const swNeighbor = neighborHexes.find(n => n.direction === 'SW')}
						{@const nwNeighbor = neighborHexes.find(n => n.direction === 'NW')}
						<!-- Hex map layout - uses same hexToPixel logic as HexGrid -->
						<div class="hex-map-preview" style="width: {previewWidth}px; height: {previewHeight}px;">
							<!-- NW neighbor -->
							<div class="hex-pos" style="left: {neighborPixels.NW.x - minX}px; top: {neighborPixels.NW.y - minY}px;">
								{#if nwNeighbor}
									<div class="map-hex">
										<img src={nwNeighbor.hex.hexBild} alt={nwNeighbor.ortName} />
										{#if showDebugOverlay}
											<div class="crop-zone crop-se"></div>
										{/if}
									</div>
									<span class="hex-name-label">{nwNeighbor.ortName}</span>
								{:else}
									<div class="map-hex empty-hex"></div>
								{/if}
							</div>
							<!-- N neighbor -->
							<div class="hex-pos" style="left: {neighborPixels.N.x - minX}px; top: {neighborPixels.N.y - minY}px;">
								{#if nNeighbor}
									<div class="map-hex">
										<img src={nNeighbor.hex.hexBild} alt={nNeighbor.ortName} />
										{#if showDebugOverlay}
											<div class="crop-zone crop-s"></div>
										{/if}
									</div>
									<span class="hex-name-label">{nNeighbor.ortName}</span>
								{:else}
									<div class="map-hex empty-hex"></div>
								{/if}
							</div>
							<!-- NE neighbor -->
							<div class="hex-pos" style="left: {neighborPixels.NE.x - minX}px; top: {neighborPixels.NE.y - minY}px;">
								{#if neNeighbor}
									<div class="map-hex">
										<img src={neNeighbor.hex.hexBild} alt={neNeighbor.ortName} />
										{#if showDebugOverlay}
											<div class="crop-zone crop-sw"></div>
										{/if}
									</div>
									<span class="hex-name-label">{neNeighbor.ortName}</span>
								{:else}
									<div class="map-hex empty-hex"></div>
								{/if}
							</div>
							<!-- SW neighbor -->
							<div class="hex-pos" style="left: {neighborPixels.SW.x - minX}px; top: {neighborPixels.SW.y - minY}px;">
								{#if swNeighbor}
									<div class="map-hex">
										<img src={swNeighbor.hex.hexBild} alt={swNeighbor.ortName} />
										{#if showDebugOverlay}
											<div class="crop-zone crop-ne"></div>
										{/if}
									</div>
									<span class="hex-name-label">{swNeighbor.ortName}</span>
								{:else}
									<div class="map-hex empty-hex"></div>
								{/if}
							</div>
							<!-- S neighbor -->
							<div class="hex-pos" style="left: {neighborPixels.S.x - minX}px; top: {neighborPixels.S.y - minY}px;">
								{#if sNeighbor}
									<div class="map-hex">
										<img src={sNeighbor.hex.hexBild} alt={sNeighbor.ortName} />
										{#if showDebugOverlay}
											<div class="crop-zone crop-n"></div>
										{/if}
									</div>
									<span class="hex-name-label">{sNeighbor.ortName}</span>
								{:else}
									<div class="map-hex empty-hex"></div>
								{/if}
							</div>
							<!-- SE neighbor -->
							<div class="hex-pos" style="left: {neighborPixels.SE.x - minX}px; top: {neighborPixels.SE.y - minY}px;">
								{#if seNeighbor}
									<div class="map-hex">
										<img src={seNeighbor.hex.hexBild} alt={seNeighbor.ortName} />
										{#if showDebugOverlay}
											<div class="crop-zone crop-nw"></div>
										{/if}
									</div>
									<span class="hex-name-label">{seNeighbor.ortName}</span>
								{:else}
									<div class="map-hex empty-hex"></div>
								{/if}
							</div>
							<!-- CENTER (new tile) -->
							<div class="hex-pos" style="left: {centerPixel.x - minX}px; top: {centerPixel.y - minY}px;">
								<div class="map-hex center-hex">
									<span class="center-label">?</span>
								</div>
							</div>
						</div>
						{#if showDebugOverlay}
							<p class="neighbor-hint">
								🟢 Grün = Bereich der an die KI gesendet wird für Kanten-Matching
							</p>
						{:else}
							<p class="neighbor-hint">
								Die Nachbar-Bilder werden an die KI gesendet, um smoothere Übergänge zu erzeugen.
							</p>
						{/if}
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
							<div class="hex-preview" class:with-debug={showDebugOverlay}>
								<img src={generatedImage} alt="Hex-Bild Vorschau" />
								{#if showDebugOverlay}
									<!-- viewBox matches 3:4 aspect ratio (75:100) -->
									<svg class="debug-overlay" viewBox="0 0 75 100" preserveAspectRatio="none">
										<!-- Red overlay for cropped areas -->
										<rect x="0" y="0" width="75" height="100" fill="rgba(255,0,0,0.3)" />
										<!-- Clear the hex area -->
										<polygon points="37.5,0 75,25 75,75 37.5,100 0,75 0,25" fill="rgba(0,255,0,0.15)" />
										<!-- Hex border -->
										<polygon points="37.5,0 75,25 75,75 37.5,100 0,75 0,25" fill="none" stroke="lime" stroke-width="1.5" />
									</svg>
								{/if}
							</div>
							<span class="zoom-hint">Klicken zum Vergrößern</span>
						</button>
					</div>
					{#if showDebugOverlay}
						<p class="debug-hint">
							🟢 Grün = sichtbarer Hex-Bereich | 🔴 Rot = wird abgeschnitten
						</p>
					{/if}
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

	.neighbor-controls {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm) var(--space-lg);
		margin-bottom: var(--space-md);
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

	.debug-toggle .toggle-text {
		font-size: 0.8125rem;
		font-weight: 400;
	}

	/* Hex Map Preview - positioned layout using hexToPixel coordinates */
	.hex-map-preview {
		position: relative;
		margin: var(--space-md) auto;
	}

	.hex-pos {
		position: absolute;
		transform: translate(-50%, -50%);
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* Hex dimensions based on PREVIEW_HEX_SIZE = 45 */
	/* width = size * sqrt(3) ≈ 78px, height = size * 2 = 90px */
	.map-hex {
		position: relative;
		width: 78px;
		height: 90px;
		/* Clip the entire hex container including crop zones */
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		overflow: hidden;
	}

	.map-hex img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		background: var(--color-earth, #8b7355);
	}

	.map-hex.empty-hex {
		background: var(--color-earth-light);
		opacity: 0.3;
		/* clip-path inherited from .map-hex */
	}

	.map-hex.center-hex {
		background: var(--color-leaf);
		/* clip-path inherited from .map-hex */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.center-label {
		font-size: 1.5rem;
		color: white;
		font-weight: bold;
	}

	.hex-name-label {
		position: absolute;
		bottom: -2px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 252, 245, 0.92);
		padding: 1px 4px;
		border-radius: 2px;
		font-size: 0.5rem;
		font-weight: 600;
		color: var(--color-bark);
		white-space: nowrap;
		max-width: 70px;
		overflow: hidden;
		text-overflow: ellipsis;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
	}

	/* Crop zone overlays - show which part gets sent to AI */
	/*
	 * hexToPixel positions for size=45:
	 * - N (0,-1):   x=-39, y=-68  → oben-links vom Center
	 * - NE (1,-1):  x=+39, y=-68  → oben-rechts vom Center
	 * - SE (1,0):   x=+78, y=0    → rechts vom Center
	 * - S (0,1):    x=+39, y=+68  → unten-rechts vom Center
	 * - SW (-1,1):  x=-39, y=+68  → unten-links vom Center
	 * - NW (-1,0):  x=-78, y=0    → links vom Center
	 *
	 * Crop = the edge/corner of neighbor that TOUCHES center
	 */
	.crop-zone {
		position: absolute;
		background: rgba(0, 255, 100, 0.5);
		border: 3px solid #00ff00;
		pointer-events: none;
		box-sizing: border-box;
	}

	/* N neighbor (oben-links) → UNTEN-RECHTS berührt Center */
	.crop-s {
		left: 50%;
		top: 50%;
		width: 50%;
		height: 50%;
	}

	/* NE neighbor (oben-rechts) → UNTEN-LINKS berührt Center */
	.crop-sw {
		left: 0;
		top: 50%;
		width: 50%;
		height: 50%;
	}

	/* SE neighbor (rechts) → LINKS-MITTE berührt Center */
	.crop-nw {
		left: 0;
		top: 25%;
		width: 50%;
		height: 50%;
	}

	/* S neighbor (unten-rechts) → OBEN-LINKS berührt Center */
	.crop-n {
		left: 0;
		top: 0;
		width: 50%;
		height: 50%;
	}

	/* SW neighbor (unten-links) → OBEN-RECHTS berührt Center */
	.crop-ne {
		left: 50%;
		top: 0;
		width: 50%;
		height: 50%;
	}

	/* NW neighbor (links) → RECHTS-MITTE berührt Center */
	.crop-se {
		left: 50%;
		top: 25%;
		width: 50%;
		height: 50%;
	}

	.neighbor-hint {
		margin: var(--space-sm) 0 0;
		font-size: 0.75rem;
		color: var(--color-bark);
		opacity: 0.6;
		font-style: italic;
		text-align: center;
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
		/* Hex proportions: width = size * sqrt(3), height = size * 2 */
		/* For size=115: width ≈ 200px, height = 230px */
		width: 200px;
		height: 230px;
		overflow: hidden;
		background: var(--color-earth, #8b7355);
		position: relative;
	}

	.hex-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
	}

	.hex-preview.with-debug img {
		clip-path: none;
	}

	.debug-overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.debug-hint {
		margin-top: var(--space-sm);
		font-size: 0.75rem;
		color: var(--color-bark);
		opacity: 0.7;
		line-height: 1.4;
		text-align: center;
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
