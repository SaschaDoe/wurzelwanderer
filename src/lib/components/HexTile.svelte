<script lang="ts">
	import type { HexOrt } from '$lib/data/hexmap';
	import { BIOME_COLORS, BIOME_NAMES, type BiomeType } from '$lib/services/worldGenerator';

	interface Props {
		hex: HexOrt;
		ortName?: string;
		size?: number;
		onClick?: () => void;
		isSelected?: boolean;
		isGenerating?: boolean;
		showBiomeOverlay?: boolean; // Debug: zeigt Biom-Farben
		isWorldHex?: boolean; // true wenn aus generierter Welt
	}

	let {
		hex,
		ortName = 'Unbekannt',
		size = 80,
		onClick,
		isSelected = false,
		isGenerating = false,
		showBiomeOverlay = false,
		isWorldHex = false
	}: Props = $props();

	// Compute hex dimensions
	let width = $derived(size * Math.sqrt(3));
	let height = $derived(size * 2);

	// Get biome color for world hexes
	let biomeColor = $derived(hex.biome ? BIOME_COLORS[hex.biome] : undefined);
	let biomeName = $derived(hex.biome ? BIOME_NAMES[hex.biome] : undefined);

	// Only show biome colors when debug overlay is active
	// By default, hidden hexes show as "verdeckt" (brown)
	let showBiomeColor = $derived(isWorldHex && biomeColor && showBiomeOverlay);

	// Hide labels when zoomed out - only show when zoomed in close
	let showLabel = $derived(size >= 65);
</script>

<button
	class="hex-tile"
	class:aufgedeckt={hex.aufgedeckt}
	class:selected={isSelected}
	class:generating={isGenerating}
	class:has-image={hex.hexBild && hex.aufgedeckt}
	class:is-water={hex.isWater}
	class:world-hex={isWorldHex}
	style="--hex-width: {width}px; --hex-height: {height}px; {showBiomeColor ? `--biome-color: ${biomeColor};` : ''}"
	ondblclick={onClick}
	disabled={isGenerating || (isWorldHex && hex.isWater && !hex.ortId)}
	title={showBiomeOverlay && biomeName ? `${biomeName} (T: ${(hex.temperature ?? 0).toFixed(2)}, H: ${(hex.humidity ?? 0).toFixed(2)})` : undefined}
>
	<div class="hex-content">
		{#if hex.hexBild && hex.aufgedeckt}
			<img src={hex.hexBild} alt={ortName} class="hex-image" />
			<!-- Label overlay inside the hex (hidden when zoomed out) -->
			{#if showLabel}
				<div class="hex-label-overlay">
					<span class="hex-label-text">{ortName}</span>
				</div>
			{/if}
		{:else if hex.aufgedeckt && hex.ortId}
			<div class="hex-placeholder aufgedeckt">
				{#if showLabel}
					<span class="hex-name">{ortName}</span>
				{/if}
			</div>
		{:else if showBiomeColor}
			<!-- World hex with biome color -->
			<div class="hex-placeholder biome-colored">
				{#if showBiomeOverlay && showLabel}
					<span class="biome-label">{biomeName}</span>
				{/if}
			</div>
		{:else}
			<div class="hex-placeholder verdeckt">
				{#if isGenerating}
					<span class="loading-spinner"></span>
				{:else if showLabel}
					<span class="hex-icon">?</span>
				{/if}
			</div>
		{/if}
	</div>
</button>

<style>
	.hex-tile {
		--hex-width: 138px;
		--hex-height: 160px;

		width: var(--hex-width);
		height: var(--hex-height);
		padding: 0;
		border: none;
		background: transparent;
		cursor: pointer;
		position: relative;
		transition: transform 0.2s ease, filter 0.2s ease;
	}

	.hex-tile:hover:not(:disabled) {
		transform: scale(1.05);
		z-index: 10;
	}

	.hex-tile:disabled {
		cursor: wait;
	}

	.hex-tile.selected {
		filter: drop-shadow(0 0 8px var(--color-leaf));
	}

	.hex-content {
		width: 100%;
		height: 100%;
		clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
		overflow: hidden;
		position: relative;
	}

	.hex-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Label overlay inside the hex (for hexes with images) */
	.hex-label-overlay {
		position: absolute;
		bottom: 12%;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(255, 252, 245, 0.92);
		padding: 3px 8px;
		border-radius: var(--radius-sm);
		max-width: 85%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.hex-label-text {
		font-size: 0.55rem;
		font-weight: 600;
		color: var(--color-bark);
		text-align: center;
		line-height: 1.25;
		/* Allow up to 2 lines only when needed */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		white-space: normal;
		word-break: break-word;
		hyphens: auto;
	}

	.hex-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.hex-placeholder.verdeckt {
		background: linear-gradient(135deg, var(--color-bark) 0%, var(--color-earth) 100%);
		border: 2px solid var(--color-bark-dark, #5a4a3a);
	}

	.hex-placeholder.aufgedeckt {
		background: linear-gradient(135deg, var(--color-cream) 0%, var(--color-earth-light) 100%);
	}

	/* Biome-colored hex (world generation) */
	.hex-placeholder.biome-colored {
		background: var(--biome-color, var(--color-earth));
		position: relative;
	}

	.biome-label {
		font-size: 0.5rem;
		color: white;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
		text-align: center;
		padding: 2px 4px;
		background: rgba(0, 0, 0, 0.3);
		border-radius: 2px;
	}

	/* Water hex styling */
	.hex-tile.is-water:not(.aufgedeckt) {
		opacity: 0.85;
	}

	.hex-tile.is-water:disabled {
		cursor: not-allowed;
	}

	.hex-icon {
		font-size: 2rem;
		color: var(--color-cream);
		opacity: 0.7;
	}

	.hex-name {
		font-size: 0.6rem;
		color: var(--color-bark);
		text-align: center;
		padding: var(--space-xs);
		max-width: 90%;
		/* Allow up to 2 lines only when needed */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		white-space: normal;
		word-break: break-word;
		line-height: 1.25;
	}

	.loading-spinner {
		width: 24px;
		height: 24px;
		border: 3px solid var(--color-cream);
		border-top-color: var(--color-leaf);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.hex-tile.generating .hex-content {
		opacity: 0.7;
	}
</style>
