<script lang="ts">
	import type { Gottheit } from '$lib/data/gottheiten';
	import { hasApiKey } from '$lib/services/geminiService';
	import ImageModal from './ImageModal.svelte';

	interface Props {
		gottheit: Gottheit;
		compact?: boolean;
		editable?: boolean;
		onRemove?: () => void;
		onUpdate?: (gottheit: Gottheit) => void;
		onGenerateBild?: () => void;
		onGenerateVorgeschichte?: () => void;
		onGenerateFähigkeiten?: () => void;
		onGenerateOpferweg?: () => void;
		isGeneratingBild?: boolean;
		isGeneratingVorgeschichte?: boolean;
		isGeneratingFähigkeiten?: boolean;
		isGeneratingOpferweg?: boolean;
	}

	let {
		gottheit,
		compact = false,
		editable = false,
		onRemove,
		onUpdate,
		onGenerateBild,
		onGenerateVorgeschichte,
		onGenerateFähigkeiten,
		onGenerateOpferweg,
		isGeneratingBild = false,
		isGeneratingVorgeschichte = false,
		isGeneratingFähigkeiten = false,
		isGeneratingOpferweg = false
	}: Props = $props();

	let showImageModal = $state(false);
	let editingVorgeschichte = $state(false);

	function updateField(field: keyof Gottheit, value: string) {
		if (!onUpdate) return;
		onUpdate({ ...gottheit, [field]: value });
	}

	function updateFähigkeit(index: number, field: string, value: string) {
		if (!onUpdate) return;
		const newFähigkeiten = [...gottheit.fähigkeiten];
		newFähigkeiten[index] = { ...newFähigkeiten[index], [field]: value };
		onUpdate({ ...gottheit, fähigkeiten: newFähigkeiten });
	}
</script>

<article class="gottheit-card" class:compact class:editable id="gottheit-{gottheit.id}">
	<!-- Bild-Bereich -->
	<div class="gottheit-bild-section">
		{#if gottheit.bild}
			<button class="gottheit-bild-button" onclick={() => showImageModal = true}>
				<img src={gottheit.bild} alt={gottheit.name} class="gottheit-bild" />
			</button>
			{#if editable && onGenerateBild}
				<button
					class="gottheit-regenerate-btn"
					onclick={onGenerateBild}
					disabled={isGeneratingBild}
					title="Neues Bild generieren"
				>
					{isGeneratingBild ? '⏳' : '🔄'}
				</button>
			{/if}
		{:else if editable && hasApiKey() && onGenerateBild}
			<button
				class="gottheit-bild-placeholder"
				onclick={onGenerateBild}
				disabled={isGeneratingBild}
			>
				{#if isGeneratingBild}
					<span class="spinner"></span>
					<span>Generiere...</span>
				{:else}
					<span class="placeholder-icon">✨</span>
					<span>Bild generieren</span>
				{/if}
			</button>
		{:else}
			<div class="gottheit-bild-placeholder-static">
				<span class="placeholder-icon">🌟</span>
			</div>
		{/if}
	</div>

	<!-- Inhalt -->
	<div class="gottheit-content">
		<!-- Header -->
		<header class="gottheit-header">
			{#if editable}
				<input
					type="text"
					class="gottheit-name-input"
					value={gottheit.name}
					oninput={(e) => updateField('name', (e.target as HTMLInputElement).value)}
				/>
			{:else}
				<h3 class="gottheit-name">{gottheit.name}</h3>
			{/if}

			{#if gottheit.beiname}
				{#if editable}
					<input
						type="text"
						class="gottheit-beiname-input"
						value={gottheit.beiname}
						oninput={(e) => updateField('beiname', (e.target as HTMLInputElement).value)}
						placeholder="Beiname..."
					/>
				{:else}
					<p class="gottheit-beiname">{gottheit.beiname}</p>
				{/if}
			{/if}

			{#if editable && onRemove}
				<button class="remove-btn" onclick={onRemove} title="Gottheit entfernen">×</button>
			{/if}
		</header>

		{#if !compact}
			<!-- Domäne -->
			<div class="gottheit-section">
				<span class="section-label">Domäne:</span>
				{#if editable}
					<input
						type="text"
						class="section-input"
						value={gottheit.domäne}
						oninput={(e) => updateField('domäne', (e.target as HTMLInputElement).value)}
					/>
				{:else}
					<span class="section-value domäne">{gottheit.domäne}</span>
				{/if}
			</div>

			<!-- Erscheinung -->
			<div class="gottheit-section">
				<span class="section-label">Erscheinung:</span>
				{#if editable}
					<input
						type="text"
						class="section-input"
						value={gottheit.erscheinung}
						oninput={(e) => updateField('erscheinung', (e.target as HTMLInputElement).value)}
					/>
				{:else}
					<span class="section-value">{gottheit.erscheinung}</span>
				{/if}
			</div>

			<!-- Fähigkeiten -->
			<div class="gottheit-fähigkeiten">
				<div class="section-header-row">
					<span class="section-label">Übernatürliche Fähigkeiten:</span>
					{#if editable && onGenerateFähigkeiten && hasApiKey()}
						<button
							class="generate-inline-btn"
							onclick={onGenerateFähigkeiten}
							disabled={isGeneratingFähigkeiten}
							title="Fähigkeiten mit KI generieren"
						>
							{isGeneratingFähigkeiten ? '⏳' : '✨'}
						</button>
					{/if}
				</div>
				<ul class="fähigkeiten-list">
					{#each gottheit.fähigkeiten as fähigkeit, i}
						<li class="fähigkeit-item">
							{#if editable}
								<input
									type="text"
									class="fähigkeit-name-input"
									value={fähigkeit.name}
									oninput={(e) => updateFähigkeit(i, 'name', (e.target as HTMLInputElement).value)}
								/>
								<textarea
									class="fähigkeit-beschreibung-input"
									value={fähigkeit.beschreibung}
									oninput={(e) => updateFähigkeit(i, 'beschreibung', (e.target as HTMLTextAreaElement).value)}
								></textarea>
								{#if fähigkeit.kosten}
									<input
										type="text"
										class="fähigkeit-kosten-input"
										value={fähigkeit.kosten}
										oninput={(e) => updateFähigkeit(i, 'kosten', (e.target as HTMLInputElement).value)}
										placeholder="Kosten..."
									/>
								{/if}
							{:else}
								<strong class="fähigkeit-name">{fähigkeit.name}</strong>
								<p class="fähigkeit-beschreibung">{fähigkeit.beschreibung}</p>
								{#if fähigkeit.kosten}
									<p class="fähigkeit-kosten">{fähigkeit.kosten}</p>
								{/if}
							{/if}
						</li>
					{/each}
				</ul>
			</div>

			<!-- Opferweg -->
			<div class="gottheit-section opferweg-section">
				<div class="section-header-row">
					<span class="section-label">Opferweg:</span>
					{#if editable && onGenerateOpferweg && hasApiKey()}
						<button
							class="generate-inline-btn"
							onclick={onGenerateOpferweg}
							disabled={isGeneratingOpferweg}
							title="Opferweg mit KI generieren"
						>
							{isGeneratingOpferweg ? '⏳' : '✨'}
						</button>
					{/if}
				</div>
				{#if editable}
					<textarea
						class="section-textarea"
						value={gottheit.opferweg}
						oninput={(e) => updateField('opferweg', (e.target as HTMLTextAreaElement).value)}
					></textarea>
				{:else}
					<p class="section-value opferweg">{gottheit.opferweg}</p>
				{/if}
			</div>

			<!-- Vorgeschichte -->
			{#if gottheit.vorgeschichte || editable}
				<div class="gottheit-vorgeschichte">
					<span class="section-label">Vorgeschichte:</span>
					{#if editable || editingVorgeschichte}
						<textarea
							class="vorgeschichte-textarea"
							value={gottheit.vorgeschichte || ''}
							oninput={(e) => updateField('vorgeschichte', (e.target as HTMLTextAreaElement).value)}
							placeholder="Die Geschichte dieser Gottheit..."
							rows="4"
						></textarea>
						{#if onGenerateVorgeschichte && hasApiKey()}
							<button
								class="generate-vorgeschichte-btn"
								onclick={onGenerateVorgeschichte}
								disabled={isGeneratingVorgeschichte}
							>
								{isGeneratingVorgeschichte ? '⏳ Generiere...' : '✨ Vorgeschichte generieren'}
							</button>
						{/if}
					{:else}
						<p class="vorgeschichte-text">{gottheit.vorgeschichte}</p>
					{/if}
				</div>
			{:else if editable && onGenerateVorgeschichte && hasApiKey()}
				<button
					class="generate-vorgeschichte-btn full-width"
					onclick={onGenerateVorgeschichte}
					disabled={isGeneratingVorgeschichte}
				>
					{isGeneratingVorgeschichte ? '⏳ Vorgeschichte wird generiert...' : '✨ Vorgeschichte generieren'}
				</button>
			{/if}
		{/if}
	</div>
</article>

{#if showImageModal && gottheit.bild}
	<ImageModal
		src={gottheit.bild}
		alt={gottheit.name}
		onClose={() => showImageModal = false}
	/>
{/if}

<style>
	.gottheit-card {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: linear-gradient(135deg, var(--color-cream) 0%, #f5f0e1 100%);
		border: 2px solid #c9a227;
		border-radius: var(--radius-lg);
		position: relative;
		box-shadow: 0 2px 8px rgba(201, 162, 39, 0.15);
	}

	.gottheit-card.compact {
		padding: var(--space-sm);
	}

	.gottheit-card.editable {
		border-style: dashed;
	}

	/* Bild-Bereich */
	.gottheit-bild-section {
		flex-shrink: 0;
		width: 120px;
		position: relative;
	}

	.compact .gottheit-bild-section {
		width: 80px;
	}

	.gottheit-bild-button {
		width: 100%;
		aspect-ratio: 1;
		border: none;
		padding: 0;
		background: none;
		cursor: pointer;
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.gottheit-bild {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-md);
		border: 2px solid #c9a227;
	}

	.gottheit-bild-placeholder,
	.gottheit-bild-placeholder-static {
		width: 100%;
		aspect-ratio: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-xs);
		background: linear-gradient(135deg, #f5e6c8 0%, #e8d5a3 100%);
		border: 2px dashed #c9a227;
		border-radius: var(--radius-md);
		color: #8b6914;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.gottheit-bild-placeholder-static {
		cursor: default;
	}

	.gottheit-bild-placeholder:hover:not(:disabled) {
		background: linear-gradient(135deg, #e8d5a3 0%, #d4c088 100%);
	}

	.gottheit-bild-placeholder:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.placeholder-icon {
		font-size: 2rem;
	}

	.gottheit-regenerate-btn {
		position: absolute;
		bottom: var(--space-xs);
		right: var(--space-xs);
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: none;
		background: rgba(201, 162, 39, 0.9);
		color: white;
		font-size: 0.9rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.gottheit-regenerate-btn:hover:not(:disabled) {
		background: #a07d1c;
	}

	.gottheit-regenerate-btn:disabled {
		opacity: 0.6;
	}

	/* Content */
	.gottheit-content {
		flex: 1;
		min-width: 0;
	}

	.gottheit-header {
		margin-bottom: var(--space-sm);
		position: relative;
	}

	.gottheit-name {
		margin: 0;
		font-size: 1.25rem;
		color: #5c4a1f;
		font-family: var(--font-display);
	}

	.gottheit-name-input {
		width: 100%;
		font-size: 1.25rem;
		font-family: var(--font-display);
		font-weight: bold;
		color: #5c4a1f;
		background: transparent;
		border: none;
		border-bottom: 2px dashed #c9a227;
		padding: var(--space-xs) 0;
	}

	.gottheit-beiname {
		margin: var(--space-xs) 0 0;
		font-size: 0.9rem;
		font-style: italic;
		color: #8b6914;
	}

	.gottheit-beiname-input {
		width: 100%;
		font-size: 0.9rem;
		font-style: italic;
		color: #8b6914;
		background: transparent;
		border: none;
		border-bottom: 1px dashed #c9a227;
		padding: var(--space-xs) 0;
	}

	.remove-btn {
		position: absolute;
		top: 0;
		right: 0;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: none;
		background: rgba(220, 53, 69, 0.8);
		color: white;
		font-size: 1.1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.remove-btn:hover {
		background: #c82333;
	}

	/* Sections */
	.gottheit-section {
		margin-bottom: var(--space-sm);
	}

	.section-label {
		display: block;
		font-size: 0.8rem;
		font-weight: 600;
		color: #8b6914;
		margin-bottom: 2px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.section-value {
		color: var(--color-earth-dark);
		font-size: 0.95rem;
	}

	.section-value.domäne {
		font-weight: 600;
		color: #5c4a1f;
	}

	.section-input,
	.section-textarea {
		width: 100%;
		font-size: 0.95rem;
		color: var(--color-earth-dark);
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid #c9a227;
		border-radius: var(--radius-sm);
		padding: var(--space-xs);
	}

	.section-textarea {
		min-height: 60px;
		resize: vertical;
	}

	/* Section Header Row */
	.section-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-sm);
	}

	.generate-inline-btn {
		width: 26px;
		height: 26px;
		border-radius: 50%;
		border: 1px solid #c9a227;
		background: linear-gradient(135deg, #f5e6c8 0%, #e8d5a3 100%);
		color: #8b6914;
		font-size: 0.9rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.generate-inline-btn:hover:not(:disabled) {
		background: linear-gradient(135deg, #c9a227 0%, #a07d1c 100%);
		color: white;
		transform: scale(1.1);
	}

	.generate-inline-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Fähigkeiten */
	.gottheit-fähigkeiten {
		margin-bottom: var(--space-md);
	}

	.fähigkeiten-list {
		list-style: none;
		padding: 0;
		margin: var(--space-xs) 0 0;
	}

	.fähigkeit-item {
		padding: var(--space-sm);
		background: rgba(201, 162, 39, 0.1);
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-xs);
		border-left: 3px solid #c9a227;
	}

	.fähigkeit-name {
		color: #5c4a1f;
		font-size: 0.95rem;
	}

	.fähigkeit-name-input {
		width: 100%;
		font-weight: bold;
		color: #5c4a1f;
		background: transparent;
		border: none;
		border-bottom: 1px dashed #c9a227;
		margin-bottom: var(--space-xs);
	}

	.fähigkeit-beschreibung {
		margin: var(--space-xs) 0;
		font-size: 0.9rem;
		color: var(--color-earth);
	}

	.fähigkeit-beschreibung-input {
		width: 100%;
		font-size: 0.9rem;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid #c9a22766;
		border-radius: var(--radius-sm);
		padding: var(--space-xs);
		min-height: 40px;
		resize: vertical;
	}

	.fähigkeit-kosten {
		margin: var(--space-xs) 0 0;
		font-size: 0.85rem;
		color: #8b6914;
		font-style: italic;
	}

	.fähigkeit-kosten-input {
		width: 100%;
		font-size: 0.85rem;
		font-style: italic;
		color: #8b6914;
		background: transparent;
		border: none;
		border-bottom: 1px dashed #c9a22766;
	}

	/* Opferweg */
	.opferweg-section {
		background: rgba(201, 162, 39, 0.08);
		padding: var(--space-sm);
		border-radius: var(--radius-sm);
	}

	.opferweg {
		margin: 0;
		font-style: italic;
	}

	/* Vorgeschichte */
	.gottheit-vorgeschichte {
		margin-top: var(--space-md);
		padding-top: var(--space-md);
		border-top: 1px solid #c9a22744;
	}

	.vorgeschichte-text {
		margin: var(--space-xs) 0 0;
		font-size: 0.9rem;
		color: var(--color-earth-dark);
		line-height: 1.6;
		font-style: italic;
	}

	.vorgeschichte-textarea {
		width: 100%;
		min-height: 100px;
		font-size: 0.9rem;
		font-style: italic;
		background: rgba(255, 255, 255, 0.5);
		border: 1px solid #c9a227;
		border-radius: var(--radius-sm);
		padding: var(--space-sm);
		resize: vertical;
		line-height: 1.6;
	}

	.generate-vorgeschichte-btn {
		margin-top: var(--space-sm);
		padding: var(--space-xs) var(--space-md);
		background: linear-gradient(135deg, #c9a227 0%, #a07d1c 100%);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.generate-vorgeschichte-btn.full-width {
		width: 100%;
		padding: var(--space-sm);
	}

	.generate-vorgeschichte-btn:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 2px 8px rgba(201, 162, 39, 0.3);
	}

	.generate-vorgeschichte-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	/* Spinner */
	.spinner {
		width: 16px;
		height: 16px;
		border: 2px solid rgba(139, 105, 20, 0.3);
		border-top-color: #8b6914;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
