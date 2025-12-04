<script lang="ts">
	import type { GespeicherterBildband, BildbandSzene } from '$lib/data/bildband';

	interface Props {
		bildband: GespeicherterBildband;
		onClose: () => void;
	}

	let { bildband, onClose }: Props = $props();

	let aktuellerIndex = $state(0);
	let bildIndizes = $state<number[]>(bildband.szenen.map((s) => s.aktivBildIndex));

	let aktuelleSzene = $derived(bildband.szenen[aktuellerIndex]);
	let aktuellesBildIndex = $derived(bildIndizes[aktuellerIndex] || 0);
	let aktuellesBild = $derived(aktuelleSzene?.bilder[aktuellesBildIndex] || null);

	function goToPrev() {
		if (aktuellerIndex > 0) {
			aktuellerIndex--;
		}
	}

	function goToNext() {
		if (aktuellerIndex < bildband.szenen.length - 1) {
			aktuellerIndex++;
		}
	}

	function goToScene(index: number) {
		aktuellerIndex = index;
	}

	function prevBild() {
		if (aktuellesBildIndex > 0) {
			bildIndizes[aktuellerIndex]--;
		}
	}

	function nextBild() {
		if (aktuelleSzene && aktuellesBildIndex < aktuelleSzene.bilder.length - 1) {
			bildIndizes[aktuellerIndex]++;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		} else if (event.key === 'ArrowLeft') {
			goToPrev();
		} else if (event.key === 'ArrowRight') {
			goToNext();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal-content">
		<!-- Header -->
		<div class="modal-header">
			<h2>{bildband.titel}</h2>
			<button class="close-btn" onclick={onClose} title="Schliessen">&#10005;</button>
		</div>

		<!-- Scene Display -->
		<div class="scene-display">
			{#if aktuelleSzene}
				<!-- Image -->
				<div class="bild-container">
					{#if aktuellesBild}
						<img src={aktuellesBild} alt="Szene {aktuelleSzene.nummer}" />

						{#if aktuelleSzene.bilder.length > 1}
							<div class="bild-nav">
								<button
									class="bild-nav-btn"
									onclick={prevBild}
									disabled={aktuellesBildIndex === 0}
								>
									&#8592;
								</button>
								<span>{aktuellesBildIndex + 1} / {aktuelleSzene.bilder.length}</span>
								<button
									class="bild-nav-btn"
									onclick={nextBild}
									disabled={aktuellesBildIndex >= aktuelleSzene.bilder.length - 1}
								>
									&#8594;
								</button>
							</div>
						{/if}
					{:else}
						<div class="no-image">
							<span>Kein Bild</span>
						</div>
					{/if}
				</div>

				<!-- Rhyme -->
				<div class="reim-container">
					<h3 class="szene-titel">
						<span class="szene-nummer">{aktuelleSzene.nummer}.</span>
						{aktuelleSzene.titel}
					</h3>
					<p class="reim-text">{aktuelleSzene.reim}</p>
				</div>
			{/if}
		</div>

		<!-- Navigation -->
		<div class="scene-navigation">
			<button class="nav-arrow" onclick={goToPrev} disabled={aktuellerIndex === 0}>
				&#8592; Zurueck
			</button>

			<div class="scene-dots">
				{#each bildband.szenen as _, index}
					<button
						class="dot"
						class:active={index === aktuellerIndex}
						onclick={() => goToScene(index)}
						title="Szene {index + 1}"
					></button>
				{/each}
			</div>

			<button
				class="nav-arrow"
				onclick={goToNext}
				disabled={aktuellerIndex >= bildband.szenen.length - 1}
			>
				Weiter &#8594;
			</button>
		</div>

		<!-- Scene Counter -->
		<div class="scene-counter">
			{aktuellerIndex + 1} / {bildband.szenen.length}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
	}

	.modal-content {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		max-width: 900px;
		width: 100%;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		border-bottom: 1px solid var(--color-earth-light);
		background: var(--color-cream);
	}

	.modal-header h2 {
		margin: 0;
		color: var(--color-leaf-dark);
		font-size: 1.25rem;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-earth);
		padding: var(--space-xs);
		line-height: 1;
	}

	.close-btn:hover {
		color: var(--color-earth-dark);
	}

	.scene-display {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-lg);
	}

	.bild-container {
		position: relative;
		margin-bottom: var(--space-lg);
		border-radius: var(--radius-md);
		overflow: hidden;
		background: var(--color-cream);
	}

	.bild-container img {
		width: 100%;
		height: auto;
		display: block;
	}

	.no-image {
		aspect-ratio: 16 / 10;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-earth);
		font-style: italic;
	}

	.bild-nav {
		position: absolute;
		bottom: var(--space-sm);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: rgba(0, 0, 0, 0.7);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		color: white;
		font-size: 0.85rem;
	}

	.bild-nav-btn {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: var(--space-xs);
		font-size: 1rem;
	}

	.bild-nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.reim-container {
		text-align: center;
	}

	.szene-titel {
		margin: 0 0 var(--space-md);
		color: var(--color-earth-dark);
	}

	.szene-nummer {
		color: var(--color-leaf-dark);
	}

	.reim-text {
		font-size: 1.1rem;
		line-height: 1.8;
		font-style: italic;
		color: var(--color-earth-dark);
		white-space: pre-line;
		margin: 0;
	}

	.scene-navigation {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-md) var(--space-lg);
		border-top: 1px solid var(--color-earth-light);
		background: var(--color-cream);
	}

	.nav-arrow {
		background: none;
		border: none;
		color: var(--color-leaf-dark);
		font-size: 1rem;
		cursor: pointer;
		padding: var(--space-sm);
		min-width: 100px;
	}

	.nav-arrow:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.nav-arrow:hover:not(:disabled) {
		color: var(--color-leaf);
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

	.scene-counter {
		text-align: center;
		padding: var(--space-sm);
		font-size: 0.85rem;
		color: var(--color-earth);
		background: var(--color-cream);
		border-top: 1px solid var(--color-earth-light);
	}

	@media (max-width: 600px) {
		.modal-content {
			max-height: 95vh;
		}

		.scene-navigation {
			padding: var(--space-sm);
		}

		.nav-arrow {
			min-width: 60px;
			font-size: 0.9rem;
		}
	}
</style>
