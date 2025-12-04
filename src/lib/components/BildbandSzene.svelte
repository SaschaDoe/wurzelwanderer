<script lang="ts">
	import type { BildbandSzene } from '$lib/data/bildband';

	interface Props {
		szene: BildbandSzene;
		isGenerating?: boolean;
		generatingPhase?: 'reim' | 'bild' | null;
		onRegenerate?: (anmerkung?: string) => void;
		onRetryReim?: (anmerkung?: string) => void;
		onGenerateNewImage?: () => void;
		onRetryImage?: () => void;
		onWeiter?: () => void;
		showActions?: boolean;
	}

	let {
		szene,
		isGenerating = false,
		generatingPhase = null,
		onRegenerate,
		onRetryReim,
		onGenerateNewImage,
		onRetryImage,
		onWeiter,
		showActions = true
	}: Props = $props();

	let anmerkung = $state('');
	let showAnmerkungInput = $state(false);

	// Local image index for navigation
	let bildIndex = $state(szene.aktivBildIndex);

	// Update when szene changes
	$effect(() => {
		bildIndex = szene.aktivBildIndex;
	});

	function prevBild() {
		if (bildIndex > 0) {
			bildIndex--;
		}
	}

	function nextBild() {
		if (bildIndex < szene.bilder.length - 1) {
			bildIndex++;
		}
	}

	function handleRegenerate() {
		if (onRegenerate) {
			onRegenerate(anmerkung || undefined);
			anmerkung = '';
			showAnmerkungInput = false;
		}
	}

	function handleRetryReim() {
		if (onRetryReim) {
			onRetryReim(anmerkung || undefined);
			anmerkung = '';
			showAnmerkungInput = false;
		}
	}

	let aktuellesBild = $derived(szene.bilder[bildIndex] || null);
	let hatMehrereBilder = $derived(szene.bilder.length > 1);
</script>

<div class="szene-container">
	<!-- Scene Header -->
	<div class="szene-header">
		<span class="szene-nummer">Szene {szene.nummer}</span>
		<h3 class="szene-titel">{szene.titel}</h3>
	</div>

	<!-- Image Area -->
	<div class="bild-bereich">
		{#if isGenerating && generatingPhase === 'bild'}
			<div class="bild-placeholder loading">
				<div class="spinner"></div>
				<span>Bild wird generiert...</span>
			</div>
		{:else if szene.bildFehler && szene.bilder.length === 0}
			<div class="bild-placeholder error">
				<span class="error-icon">!</span>
				<span>Bild konnte nicht generiert werden</span>
				{#if onRetryImage}
					<button class="btn btn-secondary btn-sm" onclick={onRetryImage}>
						Erneut versuchen
					</button>
				{/if}
			</div>
		{:else if aktuellesBild}
			<div class="bild-wrapper">
				<img src={aktuellesBild} alt="Szene {szene.nummer}: {szene.titel}" />

				{#if hatMehrereBilder}
					<div class="bild-nav">
						<button class="nav-btn" onclick={prevBild} disabled={bildIndex === 0}>
							&#8592;
						</button>
						<span class="bild-counter">{bildIndex + 1} / {szene.bilder.length}</span>
						<button class="nav-btn" onclick={nextBild} disabled={bildIndex >= szene.bilder.length - 1}>
							&#8594;
						</button>
					</div>
				{/if}

				{#if onGenerateNewImage && showActions}
					<button class="btn-generate-more" onclick={onGenerateNewImage} title="Weiteres Bild generieren">
						+
					</button>
				{/if}
			</div>
		{:else}
			<div class="bild-placeholder">
				<span>Kein Bild</span>
			</div>
		{/if}
	</div>

	<!-- Rhyme Text -->
	<div class="reim-bereich">
		{#if isGenerating && generatingPhase === 'reim'}
			<div class="reim-loading">
				<div class="spinner small"></div>
				<span>Reim wird geschrieben...</span>
			</div>
		{:else if szene.reim}
			<p class="reim-text">{szene.reim}</p>
		{:else}
			<p class="reim-placeholder">Noch kein Text...</p>
		{/if}
	</div>

	<!-- Actions -->
	{#if showActions && !isGenerating}
		<div class="szene-actions">
			{#if showAnmerkungInput}
				<div class="anmerkung-area">
					<textarea
						bind:value={anmerkung}
						placeholder="Anmerkung fuer die Regenerierung..."
						rows="2"
					></textarea>
					<div class="anmerkung-buttons">
						<button class="btn btn-secondary btn-sm" onclick={() => showAnmerkungInput = false}>
							Abbrechen
						</button>
						{#if onRetryReim}
							<button class="btn btn-primary btn-sm" onclick={handleRetryReim}>
								Reim neu
							</button>
						{/if}
						{#if onRegenerate}
							<button class="btn btn-primary btn-sm" onclick={handleRegenerate}>
								Alles neu
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="action-buttons">
					{#if onRetryReim}
						<button class="btn btn-secondary" onclick={() => showAnmerkungInput = true}>
							Reim neu
						</button>
					{/if}
					{#if onRegenerate}
						<button class="btn btn-secondary" onclick={handleRegenerate}>
							Alles neu
						</button>
					{/if}
					{#if onWeiter}
						<button class="btn btn-primary" onclick={onWeiter}>
							Weiter &#8594;
						</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.szene-container {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		padding: var(--space-lg);
		border: 1px solid var(--color-earth-light);
	}

	.szene-header {
		text-align: center;
		margin-bottom: var(--space-md);
	}

	.szene-nummer {
		font-size: 0.85rem;
		color: var(--color-earth);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.szene-titel {
		margin: var(--space-xs) 0 0;
		color: var(--color-leaf-dark);
	}

	/* Image Area */
	.bild-bereich {
		margin-bottom: var(--space-lg);
	}

	.bild-wrapper {
		position: relative;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.bild-wrapper img {
		width: 100%;
		height: auto;
		display: block;
		border-radius: var(--radius-md);
	}

	.bild-placeholder {
		aspect-ratio: 16 / 10;
		background: var(--color-cream);
		border: 2px dashed var(--color-earth-light);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		color: var(--color-earth);
	}

	.bild-placeholder.loading {
		border-style: solid;
		border-color: var(--color-leaf);
	}

	.bild-placeholder.error {
		border-color: #dc3545;
		color: #dc3545;
	}

	.error-icon {
		font-size: 2rem;
		font-weight: bold;
		width: 3rem;
		height: 3rem;
		border: 3px solid currentColor;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Image Navigation */
	.bild-nav {
		position: absolute;
		bottom: var(--space-md);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		background: rgba(0, 0, 0, 0.6);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
	}

	.nav-btn {
		background: transparent;
		border: none;
		color: white;
		font-size: 1.2rem;
		cursor: pointer;
		padding: var(--space-xs);
		opacity: 0.8;
		transition: opacity 0.2s;
	}

	.nav-btn:hover:not(:disabled) {
		opacity: 1;
	}

	.nav-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.bild-counter {
		color: white;
		font-size: 0.9rem;
	}

	.btn-generate-more {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		background: var(--color-leaf);
		color: white;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.8;
		transition: opacity 0.2s, transform 0.2s;
	}

	.btn-generate-more:hover {
		opacity: 1;
		transform: scale(1.1);
	}

	/* Rhyme Area */
	.reim-bereich {
		text-align: center;
		margin-bottom: var(--space-lg);
	}

	.reim-text {
		font-size: 1.1rem;
		line-height: 1.8;
		font-style: italic;
		color: var(--color-earth-dark);
		white-space: pre-line;
		margin: 0;
	}

	.reim-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
		color: var(--color-earth);
		padding: var(--space-lg);
	}

	.reim-placeholder {
		color: var(--color-earth);
		font-style: italic;
	}

	/* Actions */
	.szene-actions {
		border-top: 1px solid var(--color-earth-light);
		padding-top: var(--space-md);
	}

	.action-buttons {
		display: flex;
		justify-content: center;
		gap: var(--space-md);
	}

	.anmerkung-area {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.anmerkung-area textarea {
		width: 100%;
		padding: var(--space-sm);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		font-family: inherit;
		font-size: 1rem;
		resize: vertical;
	}

	.anmerkung-area textarea:focus {
		outline: none;
		border-color: var(--color-leaf);
	}

	.anmerkung-buttons {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-sm);
	}

	/* Spinner */
	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid var(--color-earth-light);
		border-top-color: var(--color-leaf);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.spinner.small {
		width: 20px;
		height: 20px;
		border-width: 2px;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	/* Button Sizes */
	.btn-sm {
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.9rem;
	}
</style>
