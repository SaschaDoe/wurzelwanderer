<script lang="ts">
	/**
	 * Modal to show character details in the Bildband wizard.
	 * Shows portrait, name, profession, and traits.
	 * Allows generating a portrait if none exists.
	 */

	import type { GenerierterBekannter } from '$lib/data/merkmale';
	import { generiereCharakterPortrait } from '$lib/services/bildbandService';
	import { hasApiKey, generateCharakterZitate } from '$lib/services/geminiService';
	import CharacterAvatar from './CharacterAvatar.svelte';
	import MerkmalBadge from './MerkmalBadge.svelte';

	interface Props {
		charakter: GenerierterBekannter;
		onClose: () => void;
		onUpdate?: (charakter: GenerierterBekannter) => void;
	}

	let { charakter, onClose, onUpdate }: Props = $props();

	let isGenerating = $state(false);
	let isGeneratingZitat = $state(false);
	let error = $state<string | null>(null);

	// Max 3 quotes per character
	const MAX_ZITATE = 3;

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	async function handleGeneratePortrait() {
		if (isGenerating || !onUpdate) return;

		isGenerating = true;
		error = null;

		try {
			const result = await generiereCharakterPortrait(charakter);
			if (result.success && result.imageData) {
				onUpdate({ ...charakter, bild: result.imageData });
			} else {
				error = result.error || 'Portrait konnte nicht generiert werden';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			isGenerating = false;
		}
	}

	async function handleGenerateZitate() {
		if (isGeneratingZitat || !onUpdate) return;

		isGeneratingZitat = true;
		error = null;

		try {
			const result = await generateCharakterZitate(
				charakter.name,
				charakter.tier,
				charakter.geschlecht,
				charakter.berufe,
				charakter.merkmal.name,
				charakter.merkmal.beschreibung
			);
			if (result.success && result.zitate) {
				onUpdate({ ...charakter, zitate: result.zitate });
			} else {
				error = result.error || 'Zitate konnten nicht generiert werden';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingZitat = false;
		}
	}

	function handleDeleteZitat(index: number) {
		if (!onUpdate) return;
		const neueZitate = (charakter.zitate || []).filter((_, i) => i !== index);
		onUpdate({ ...charakter, zitate: neueZitate });
	}

	function getTierBezeichnung(): string {
		if (charakter.geschlecht === 'weiblich') {
			return `Eine ${charakter.tier}`;
		}
		return `Ein ${charakter.tier}`;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<button class="close-btn" onclick={onClose} title="Schliessen">×</button>

		<div class="character-header">
			<div class="portrait-area">
				{#if charakter.bild}
					<img src={charakter.bild} alt={charakter.name} class="portrait-image" />
				{:else}
					<div class="portrait-placeholder">
						<CharacterAvatar
							name={charakter.name}
							tier={charakter.tier}
							chimaere={charakter.chimaere}
							size="large"
						/>
					</div>
				{/if}

				{#if onUpdate && hasApiKey() && !charakter.bild}
					<button
						class="btn btn-primary generate-btn"
						onclick={handleGeneratePortrait}
						disabled={isGenerating}
					>
						{#if isGenerating}
							<span class="spinner"></span>
							Generiere...
						{:else}
							Portrait generieren
						{/if}
					</button>
				{/if}

				{#if !charakter.bild && !hasApiKey()}
					<p class="no-api-hint">Kein API Key - Portrait nicht verfuegbar</p>
				{/if}

				{#if error}
					<p class="error-message">{error}</p>
				{/if}
			</div>

			<div class="character-info">
				<h2 id="modal-title">{charakter.name}</h2>
				<p class="tier-text">{getTierBezeichnung()}</p>

				<div class="badges">
					<MerkmalBadge
						name={charakter.merkmal.name}
						magisch={charakter.merkmal.magisch}
						trauma={charakter.merkmal.trauma}
					/>
					<span class="kategorie-badge">{charakter.kategorie}</span>
				</div>

				{#if charakter.charakterKlasse}
					<span class="charakter-klasse-badge">{charakter.charakterKlasse.name}</span>
				{/if}
			</div>
		</div>

		<div class="character-body">
			<div class="info-section">
				<h4>Beruf{charakter.berufe.length > 1 ? 'e' : ''}</h4>
				<div class="berufe-list">
					{#each charakter.berufe as beruf}
						<span class="beruf-tag">{beruf}</span>
					{/each}
				</div>
			</div>

			<div class="info-section">
				<h4>Beschreibung</h4>
				<p class="beschreibung">{charakter.merkmal.beschreibung}</p>
			</div>

			<div class="info-section">
				<h4>Faehigkeiten</h4>
				<ul class="aktionen-liste">
					{#each charakter.merkmal.aktionen as aktion}
						<li>{aktion}</li>
					{/each}
				</ul>
			</div>

			<div class="info-section zitat-section">
				<h4>Zitate ({charakter.zitate?.length || 0}/{MAX_ZITATE})</h4>
				{#if charakter.zitate && charakter.zitate.length > 0}
					<div class="zitate-liste">
						{#each charakter.zitate as zitatText, index}
							<div class="zitat-item">
								<blockquote class="zitat-text">"{zitatText}"</blockquote>
								{#if onUpdate}
									<button
										class="zitat-delete-btn"
										onclick={() => handleDeleteZitat(index)}
										title="Zitat entfernen"
									>×</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				{#if hasApiKey() && onUpdate}
					{#if !charakter.zitate || charakter.zitate.length === 0}
						<button
							class="btn btn-primary btn-sm"
							onclick={handleGenerateZitate}
							disabled={isGeneratingZitat}
						>
							{#if isGeneratingZitat}
								<span class="spinner"></span>
								Generiere 3 Zitate...
							{:else}
								Zitate generieren
							{/if}
						</button>
					<p class="zitat-hint">Generiert 3 unterschiedliche Zitate aus verschiedenen Situationen</p>
				{:else}
					<p class="zitat-info">Loesche alle Zitate um neue zu generieren</p>
				{/if}
			{:else if !hasApiKey()}
				<p class="no-api-hint">Kein API Key - Zitate nicht verfuegbar</p>
			{/if}
			</div>
		</div>

		{#if !charakter.bild}
			<div class="portrait-warning">
				<strong>Hinweis:</strong> Ohne Portrait wird der Charakter in den Bildband-Bildern moeglicherweise anders dargestellt.
			</div>
		{/if}
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
	}

	.modal-content {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		max-width: 500px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		position: relative;
		padding: var(--space-lg);
	}

	.close-btn {
		position: absolute;
		top: var(--space-md);
		right: var(--space-md);
		width: 32px;
		height: 32px;
		border: none;
		background: var(--color-earth-light);
		color: var(--color-earth-dark);
		font-size: 1.5rem;
		border-radius: 50%;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: var(--color-earth);
		color: white;
	}

	.character-header {
		display: flex;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-lg);
		border-bottom: 2px solid var(--color-earth-light);
	}

	.portrait-area {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-sm);
	}

	.portrait-image {
		width: 140px;
		height: 180px;
		object-fit: cover;
		border-radius: var(--radius-lg);
		border: 3px solid var(--color-leaf);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.portrait-placeholder {
		width: 140px;
		height: 180px;
		background: var(--color-cream);
		border: 3px dashed var(--color-earth-light);
		border-radius: var(--radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.generate-btn {
		font-size: 0.85rem;
		padding: var(--space-xs) var(--space-sm);
	}

	.no-api-hint {
		font-size: 0.75rem;
		color: var(--color-earth);
		margin: 0;
		text-align: center;
	}

	.error-message {
		font-size: 0.75rem;
		color: #dc3545;
		margin: 0;
		text-align: center;
	}

	.character-info {
		flex: 1;
		min-width: 0;
	}

	.character-info h2 {
		margin: 0 0 var(--space-xs);
		color: var(--color-earth-dark);
	}

	.tier-text {
		margin: 0 0 var(--space-md);
		font-style: italic;
		color: var(--color-earth);
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-bottom: var(--space-sm);
	}

	.kategorie-badge {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-earth-light);
		color: var(--color-bark);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
	}

	.charakter-klasse-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-leaf-dark);
		color: white;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		font-weight: 600;
	}

	.character-body {
		display: flex;
		flex-direction: column;
		gap: var(--space-lg);
	}

	.info-section h4 {
		margin: 0 0 var(--space-sm);
		color: var(--color-leaf-dark);
	}

	.berufe-list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.beruf-tag {
		padding: var(--space-xs) var(--space-md);
		background: var(--color-leaf-dark);
		color: white;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
	}

	.beschreibung {
		margin: 0;
		line-height: 1.6;
		color: var(--color-earth-dark);
	}

	.aktionen-liste {
		margin: 0;
		padding-left: var(--space-lg);
	}

	.aktionen-liste li {
		margin-bottom: var(--space-xs);
		line-height: 1.5;
	}

	.portrait-warning {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
	}

	.spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid white;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-right: var(--space-xs);
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.zitat-section {
		background: var(--color-cream);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-leaf);
	}

	.zitate-liste {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.zitat-item {
		position: relative;
		padding-right: var(--space-lg);
	}

	.zitat-text {
		margin: 0;
		font-style: italic;
		font-size: 1rem;
		color: var(--color-earth-dark);
		line-height: 1.5;
	}

	.zitat-delete-btn {
		position: absolute;
		top: 0;
		right: 0;
		width: 20px;
		height: 20px;
		border: none;
		background: var(--color-earth-light);
		color: var(--color-earth-dark);
		border-radius: 50%;
		font-size: 1rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.6;
		transition: all 0.2s;
	}

	.zitat-delete-btn:hover {
		opacity: 1;
		background: #dc3545;
		color: white;
	}

	.zitat-hint {
		font-size: 0.8rem;
		color: var(--color-earth);
		margin: var(--space-sm) 0 0 0;
		font-style: italic;
	}

	.zitat-info {
		font-size: 0.85rem;
		color: var(--color-earth);
		margin: 0;
		font-style: italic;
	}

	@media (max-width: 500px) {
		.character-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.badges {
			justify-content: center;
		}
	}
</style>
