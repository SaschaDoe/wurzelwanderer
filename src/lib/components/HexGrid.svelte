<script lang="ts">
	import type { HexOrt, GespeicherteHexmap, HexPosition } from '$lib/data/hexmap';
	import type { GespeicherterOrt } from '$lib/data/ort';
	import { hexToPixel, getHexNeighbors } from '$lib/data/hexmap';
	import HexTile from './HexTile.svelte';

	interface Props {
		hexmap: GespeicherteHexmap;
		orte: GespeicherterOrt[];
		hexSize?: number;
		onHexClick?: (hex: HexOrt, ort: GespeicherterOrt | undefined) => void;
		onPlaceholderClick?: (position: HexPosition) => void;
		onRevealHex?: (hex: HexOrt) => void; // For world hexmaps: reveal a hidden neighbor
		selectedHexId?: string | null;
		generatingHexId?: string | null;
		showBiomeOverlay?: boolean; // Debug: zeigt Biom-Farben
	}

	let {
		hexmap,
		orte,
		hexSize: initialHexSize = 70,
		onHexClick,
		onPlaceholderClick,
		onRevealHex,
		selectedHexId = null,
		generatingHexId = null,
		showBiomeOverlay = false
	}: Props = $props();

	// Check if this is a generated world hexmap
	let isWorldHexmap = $derived(hexmap.isGeneratedWorld ?? false);

	// Debug: Track hexmap changes
	$effect(() => {
		const hexWithImages = hexmap.hexe.filter(h => !!h.hexBild).length;
		const hexAufgedeckt = hexmap.hexe.filter(h => h.aufgedeckt).length;
		console.log('[HexGrid] hexmap updated', { hexCount: hexmap.hexe.length, hexWithImages, hexAufgedeckt });
	});

	// Zoom state - world hexmaps need wider zoom range
	const MIN_ZOOM = isWorldHexmap ? 20 : 40;
	const MAX_ZOOM = isWorldHexmap ? 150 : 120;
	const ZOOM_STEP = isWorldHexmap ? 10 : 15;
	let currentHexSize = $state(initialHexSize);

	function zoomIn() {
		currentHexSize = Math.min(MAX_ZOOM, currentHexSize + ZOOM_STEP);
	}

	function zoomOut() {
		currentHexSize = Math.max(MIN_ZOOM, currentHexSize - ZOOM_STEP);
	}

	function resetZoom() {
		currentHexSize = initialHexSize;
		panOffsetX = 0;
		panOffsetY = 0;
	}

	// Create a lookup map for orte by ID
	let orteMap = $derived(new Map(orte.map(o => [o.id, o])));

	// Get ort for a hex
	function getOrtForHex(hex: HexOrt): GespeicherterOrt | undefined {
		return orteMap.get(hex.ortId);
	}

	// Set of occupied positions (as strings for easy lookup)
	let occupiedPositions = $derived(
		new Set(hexmap.hexe.map(h => `${h.position.q},${h.position.r}`))
	);

	// Map of hex by position key for quick lookup
	let hexByPosition = $derived(
		new Map(hexmap.hexe.map(h => [`${h.position.q},${h.position.r}`, h]))
	);

	// Calculate placeholder positions (neighbors of revealed hexes that don't have a hex yet)
	// For generated worlds: find neighbors that exist but aren't revealed yet
	let placeholderPositions = $derived.by(() => {
		if (isWorldHexmap) {
			// World hexmaps don't have empty positions - skip this
			return [];
		}

		const placeholders = new Map<string, HexPosition>();

		for (const hex of hexmap.hexe) {
			// Only show neighbors for revealed hexes
			if (!hex.aufgedeckt) continue;

			const neighbors = getHexNeighbors(hex.position);
			for (const neighbor of neighbors) {
				const key = `${neighbor.q},${neighbor.r}`;
				// Only add if not already occupied by a hex
				if (!occupiedPositions.has(key) && !placeholders.has(key)) {
					placeholders.set(key, neighbor);
				}
			}
		}

		return Array.from(placeholders.values());
	});

	// For world hexmaps: find revealable hexes (neighbors of revealed that aren't revealed yet)
	let revealableHexes = $derived.by(() => {
		if (!isWorldHexmap) return [];

		const revealable = new Map<string, HexOrt>();

		for (const hex of hexmap.hexe) {
			if (!hex.aufgedeckt) continue;

			const neighbors = getHexNeighbors(hex.position);
			for (const neighbor of neighbors) {
				const key = `${neighbor.q},${neighbor.r}`;
				const neighborHex = hexByPosition.get(key);
				// Add if hex exists but isn't revealed yet
				if (neighborHex && !neighborHex.aufgedeckt && !revealable.has(key)) {
					revealable.set(key, neighborHex);
				}
			}
		}

		return Array.from(revealable.values());
	});

	// Calculate positions for hexes to display
	// World hexmaps: only show revealed hexes
	// Regular hexmaps: show all hexes
	let hexPositions = $derived.by(() => {
		const hexesToShow = isWorldHexmap
			? hexmap.hexe.filter(h => h.aufgedeckt)
			: hexmap.hexe;

		return hexesToShow.map(hex => {
			const pixel = hexToPixel(hex.position.q, hex.position.r, currentHexSize);
			return {
				hex,
				x: pixel.x,
				y: pixel.y
			};
		});
	});

	// Calculate positions for revealable hexes (world hexmaps only)
	let revealableHexPositions = $derived(
		revealableHexes.map(hex => {
			const pixel = hexToPixel(hex.position.q, hex.position.r, currentHexSize);
			return {
				hex,
				x: pixel.x,
				y: pixel.y
			};
		})
	);

	// Calculate positions for placeholders
	let placeholderPixelPositions = $derived(
		placeholderPositions.map(pos => {
			const pixel = hexToPixel(pos.q, pos.r, currentHexSize);
			return {
				position: pos,
				x: pixel.x,
				y: pixel.y
			};
		})
	);

	// Calculate grid bounds for centering (include placeholders and revealable hexes)
	let gridBounds = $derived.by(() => {
		const allPositions = [
			...hexPositions.map(h => ({ x: h.x, y: h.y })),
			...placeholderPixelPositions.map(p => ({ x: p.x, y: p.y })),
			...revealableHexPositions.map(h => ({ x: h.x, y: h.y }))
		];

		if (allPositions.length === 0) {
			return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 300, height: 300 };
		}

		const hexWidth = currentHexSize * Math.sqrt(3);
		const hexHeight = currentHexSize * 2;

		let minX = Infinity, maxX = -Infinity;
		let minY = Infinity, maxY = -Infinity;

		for (const { x, y } of allPositions) {
			minX = Math.min(minX, x - hexWidth / 2);
			maxX = Math.max(maxX, x + hexWidth / 2);
			minY = Math.min(minY, y - hexHeight / 2);
			maxY = Math.max(maxY, y + hexHeight / 2);
		}

		// Add padding
		const padding = currentHexSize;
		return {
			minX: minX - padding,
			maxX: maxX + padding,
			minY: minY - padding,
			maxY: maxY + padding,
			width: maxX - minX + padding * 2,
			height: maxY - minY + padding * 2
		};
	});

	// Zoom percentage for display
	let zoomPercent = $derived(Math.round((currentHexSize / initialHexSize) * 100));

	// Pan/Drag state - using transform-based panning
	let isPanning = $state(false);
	let panStartX = $state(0);
	let panStartY = $state(0);
	let panOffsetX = $state(0);
	let panOffsetY = $state(0);
	let panOffsetStartX = $state(0);
	let panOffsetStartY = $state(0);

	function handleMouseDown(e: MouseEvent) {
		// Only pan with left mouse button
		if (e.button !== 0) return;

		// Don't start panning if clicking on zoom controls
		const target = e.target as HTMLElement;
		if (target.closest('.zoom-controls')) {
			return;
		}

		isPanning = true;
		panStartX = e.clientX;
		panStartY = e.clientY;
		panOffsetStartX = panOffsetX;
		panOffsetStartY = panOffsetY;

		// Prevent text selection while dragging
		e.preventDefault();
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isPanning) return;

		const deltaX = e.clientX - panStartX;
		const deltaY = e.clientY - panStartY;

		panOffsetX = panOffsetStartX + deltaX;
		panOffsetY = panOffsetStartY + deltaY;
	}

	function handleMouseUp() {
		isPanning = false;
	}

	function handleMouseLeave() {
		isPanning = false;
	}

	// Touch support for mobile
	function handleTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;

		const target = e.target as HTMLElement;
		if (target.closest('.zoom-controls')) {
			return;
		}

		isPanning = true;
		panStartX = e.touches[0].clientX;
		panStartY = e.touches[0].clientY;
		panOffsetStartX = panOffsetX;
		panOffsetStartY = panOffsetY;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isPanning || e.touches.length !== 1) return;

		const deltaX = e.touches[0].clientX - panStartX;
		const deltaY = e.touches[0].clientY - panStartY;

		panOffsetX = panOffsetStartX + deltaX;
		panOffsetY = panOffsetStartY + deltaY;
	}

	function handleTouchEnd() {
		isPanning = false;
	}

	function resetPan() {
		panOffsetX = 0;
		panOffsetY = 0;
	}
</script>

<div class="hex-grid-wrapper">
	<!-- Zoom Controls -->
	<div class="zoom-controls">
		<button
			class="zoom-btn"
			onclick={zoomOut}
			disabled={currentHexSize <= MIN_ZOOM}
			title="Verkleinern"
		>
			−
		</button>
		<button
			class="zoom-label"
			onclick={resetZoom}
			title="Zoom zurücksetzen"
		>
			{zoomPercent}%
		</button>
		<button
			class="zoom-btn"
			onclick={zoomIn}
			disabled={currentHexSize >= MAX_ZOOM}
			title="Vergrössern"
		>
			+
		</button>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="hex-grid-container"
		class:panning={isPanning}
		onmousedown={handleMouseDown}
		onmousemove={handleMouseMove}
		onmouseup={handleMouseUp}
		onmouseleave={handleMouseLeave}
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
	>
		{#if hexmap.hexe.length === 0}
			<!-- Empty state with one clickable placeholder in center -->
			<div class="empty-state">
				<button class="placeholder-hex center" ondblclick={() => onPlaceholderClick?.({ q: 0, r: 0 })}>
					<div class="placeholder-content" style="--hex-size: {currentHexSize}px;">
						<span class="placeholder-icon">+</span>
						<span class="placeholder-text">Doppelklick zum Hinzufügen</span>
					</div>
				</button>
			</div>
		{:else}
			<div
				class="hex-grid"
				style="width: {gridBounds.width}px; height: {gridBounds.height + 40}px; transform: translate({panOffsetX}px, {panOffsetY}px);"
			>
				<!-- Placeholders for regular hexmaps (behind real hexes) -->
				{#each placeholderPixelPositions as { position, x, y }}
					<button
						class="hex-position placeholder-hex"
						style="
							left: {x - gridBounds.minX}px;
							top: {y - gridBounds.minY}px;
						"
						ondblclick={() => onPlaceholderClick?.(position)}
					>
						<div class="placeholder-content" style="--hex-size: {currentHexSize}px;">
							<span class="placeholder-icon">+</span>
						</div>
					</button>
				{/each}

				<!-- Revealable hexes for world hexmaps (fog of war) -->
				{#each revealableHexPositions as { hex, x, y }}
					<button
						class="hex-position revealable-hex"
						style="
							left: {x - gridBounds.minX}px;
							top: {y - gridBounds.minY}px;
						"
						ondblclick={() => onRevealHex?.(hex)}
						disabled={hex.isWater}
						title={hex.isWater ? 'Wasser kann nicht erkundet werden' : 'Doppelklick zum Aufdecken'}
					>
						<div class="revealable-content" style="--hex-size: {currentHexSize}px;">
							{#if hex.isWater}
								<span class="revealable-icon water">~</span>
							{:else}
								<span class="revealable-icon">?</span>
							{/if}
						</div>
					</button>
				{/each}

				<!-- Real hexes (revealed) -->
				{#each hexPositions as { hex, x, y }}
					{@const ort = getOrtForHex(hex)}
					<div
						class="hex-position"
						style="
							left: {x - gridBounds.minX}px;
							top: {y - gridBounds.minY}px;
						"
					>
						<HexTile
							{hex}
							ortName={ort?.name ?? 'Unbekannt'}
							size={currentHexSize}
							onClick={() => onHexClick?.(hex, ort)}
							isSelected={selectedHexId === hex.id}
							isGenerating={generatingHexId === hex.id}
							{showBiomeOverlay}
							isWorldHex={isWorldHexmap}
						/>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.hex-grid-wrapper {
		position: relative;
	}

	/* Zoom Controls */
	.zoom-controls {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 2px;
		background: var(--color-cream);
		border-radius: var(--radius-md);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		overflow: hidden;
	}

	.zoom-btn {
		width: 32px;
		height: 32px;
		border: none;
		background: var(--color-cream);
		color: var(--color-bark);
		font-size: 1.25rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
	}

	.zoom-btn:hover:not(:disabled) {
		background: var(--color-earth-light);
	}

	.zoom-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.zoom-label {
		min-width: 50px;
		height: 32px;
		border: none;
		background: var(--color-earth-light);
		color: var(--color-bark);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background-color 0.2s;
	}

	.zoom-label:hover {
		background: var(--color-earth);
		color: white;
	}

	.hex-grid-container {
		width: 100%;
		overflow: hidden;
		padding: var(--space-md);
		padding-top: calc(var(--space-md) + 44px);
		background: linear-gradient(135deg, var(--color-earth-light) 0%, var(--color-cream) 100%);
		border-radius: var(--radius-lg);
		min-height: 400px;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: grab;
	}

	.hex-grid-container.panning {
		cursor: grabbing;
		user-select: none;
	}

	.hex-grid {
		position: relative;
		will-change: transform;
	}

	.hex-position {
		position: absolute;
		transform: translate(-50%, -50%);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--space-xl);
		min-height: 300px;
	}

	/* Placeholder hex styles */
	.placeholder-hex {
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		z-index: 1;
	}

	.placeholder-hex:not(.center) {
		opacity: 0.4;
		transition: opacity 0.2s, transform 0.2s;
	}

	.placeholder-hex:not(.center):hover {
		opacity: 0.8;
		transform: translate(-50%, -50%) scale(1.05);
	}

	.placeholder-hex.center {
		position: relative;
	}

	.placeholder-hex.center:hover {
		transform: scale(1.05);
	}

	.placeholder-content {
		--hex-size: 70px;
		width: calc(var(--hex-size) * 1.732);
		height: calc(var(--hex-size) * 2);
		background: var(--color-earth);
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		color: var(--color-cream);
		border: 2px dashed var(--color-bark);
	}

	.placeholder-icon {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.placeholder-text {
		font-size: 0.75rem;
		text-align: center;
		padding: 0 var(--space-sm);
	}

	/* Revealable hex styles (world hexmaps fog of war) */
	.revealable-hex {
		background: transparent;
		border: none;
		padding: 0;
		cursor: pointer;
		z-index: 1;
		opacity: 0.6;
		transition: opacity 0.2s, transform 0.2s;
	}

	.revealable-hex:hover:not(:disabled) {
		opacity: 0.9;
		transform: translate(-50%, -50%) scale(1.05);
	}

	.revealable-hex:disabled {
		cursor: not-allowed;
		opacity: 0.4;
	}

	.revealable-content {
		--hex-size: 70px;
		width: calc(var(--hex-size) * 1.732);
		height: calc(var(--hex-size) * 2);
		background: linear-gradient(135deg, var(--color-bark) 0%, var(--color-earth) 100%);
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-cream);
	}

	.revealable-icon {
		font-size: 1.5rem;
		font-weight: bold;
		opacity: 0.7;
	}

	.revealable-icon.water {
		color: #5B8DB8;
	}
</style>
