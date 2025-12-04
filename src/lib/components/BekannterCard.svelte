<script lang="ts">
	import type { GenerierterBekannter } from '$lib/data/merkmale';
	import { hasApiKey } from '$lib/services/geminiService';
	import { kategorieToClass, germanSlugify } from '$lib/utils/slugify';
	import ImageModal from './ImageModal.svelte';
	import CharacterAvatar from './CharacterAvatar.svelte';
	import CharacterImageArea from './CharacterImageArea.svelte';
	import MerkmalBadge from './MerkmalBadge.svelte';

	interface Props {
		bekannter: GenerierterBekannter;
		compact?: boolean;
		editable?: boolean;
		onRemove?: () => void;
		onUpdate?: (bekannter: GenerierterBekannter) => void;
	}

	let { bekannter, compact = false, editable = false, onRemove, onUpdate }: Props = $props();

	let showImageModal = $state(false);

	function getTierBezeichnung(tier: string, geschlecht: string): string {
		if (geschlecht === 'weiblich') {
			return `Eine ${tier}`;
		}
		return `Ein ${tier}`;
	}

	function getChimaereBezeichnung(): string {
		if (!bekannter.chimaere) return '';
		return `Oben: ${bekannter.chimaere.oben} / Unten: ${bekannter.chimaere.unten}`;
	}

	function handleEdit(field: string, event: Event) {
		if (!editable || !onUpdate) return;
		const target = event.target as HTMLElement;
		const newValue = target.innerText.trim();

		let updated = { ...bekannter };

		switch (field) {
			case 'name':
				updated.name = newValue;
				break;
			case 'tier':
				updated.tier = newValue;
				break;
			case 'beruf':
				const index = parseInt(target.dataset.index || '0');
				updated.berufe = [...bekannter.berufe];
				updated.berufe[index] = newValue;
				break;
			case 'beschreibung':
				updated.merkmal = { ...bekannter.merkmal, beschreibung: newValue };
				break;
			case 'frage':
				if (updated.charakterKlasse) {
					updated.charakterKlasse = { ...updated.charakterKlasse, frage: newValue };
				}
				break;
			case 'besonders':
				if (updated.charakterKlasse) {
					updated.charakterKlasse = { ...updated.charakterKlasse, besonders: newValue };
				}
				break;
		}

		onUpdate(updated);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.target as HTMLElement).blur();
		}
	}

	function handleImageGenerated(imageData: string) {
		if (!onUpdate) return;
		onUpdate({ ...bekannter, bild: imageData });
	}

	function handleImageRemoved() {
		if (!onUpdate) return;
		const updated = { ...bekannter };
		delete updated.bild;
		onUpdate(updated);
	}

	// Build character info for image generation
	$effect(() => {
		// This is reactive to bekannter changes
	});

	function getCharacterInfo() {
		return {
			name: bekannter.name,
			tier: bekannter.tier,
			berufe: bekannter.berufe,
			merkmalName: bekannter.merkmal.name,
			merkmalBeschreibung: bekannter.merkmal.beschreibung,
			kategorie: bekannter.kategorie,
			geschlecht: bekannter.geschlecht
		};
	}
</script>

{#if compact}
	<!-- Compact card for lists -->
	<div class="bekannte-card-compact" data-kategorie={kategorieToClass(bekannter.kategorie)}>
		<CharacterAvatar
			src={bekannter.bild}
			name={bekannter.name}
			tier={bekannter.tier}
			chimaere={bekannter.chimaere}
			size="small"
		/>
		<div class="identity">
			<span class="name">{bekannter.name}</span>
			<span class="tier">
				{#if bekannter.chimaere}
					{getChimaereBezeichnung()}
				{:else}
					{getTierBezeichnung(bekannter.tier, bekannter.geschlecht)}
				{/if}
			</span>
		</div>
		<MerkmalBadge
			name={bekannter.merkmal.name}
			magisch={bekannter.merkmal.magisch}
			trauma={bekannter.merkmal.trauma}
		/>
		{#if onRemove}
			<button class="remove-btn" onclick={onRemove} title="Entfernen">×</button>
		{/if}
	</div>
{:else}
	<!-- Full card with details -->
	<div class="bekannte-card-full card" data-kategorie={kategorieToClass(bekannter.kategorie)}>
		<header class="card-header">
			<CharacterImageArea
				src={bekannter.bild}
				name={bekannter.name}
				tier={bekannter.tier}
				chimaere={bekannter.chimaere}
				characterInfo={getCharacterInfo()}
				editable={!!onUpdate}
				onImageClick={() => showImageModal = true}
				onImageGenerated={handleImageGenerated}
				onImageRemoved={handleImageRemoved}
			/>
			<div class="header-info">
				<h2
					contenteditable={editable}
					onblur={(e) => handleEdit('name', e)}
					onkeydown={handleKeyDown}
					class:editable-field={editable}
				>{bekannter.name}</h2>
				{#if bekannter.chimaere}
					<p class="tier-text">{getChimaereBezeichnung()}</p>
				{:else}
					<p
						class="tier-text"
						contenteditable={editable}
						onblur={(e) => handleEdit('tier', e)}
						onkeydown={handleKeyDown}
						class:editable-field={editable}
					>{getTierBezeichnung(bekannter.tier, bekannter.geschlecht)}</p>
				{/if}
				<div class="merkmal-row">
					<MerkmalBadge
						name={bekannter.merkmal.name}
						magisch={bekannter.merkmal.magisch}
						trauma={bekannter.merkmal.trauma}
					/>
					<span class="kategorie-tag">{bekannter.kategorie}</span>
				</div>
			</div>
		</header>

		<div class="card-body">
			<p
				class="beschreibung"
				contenteditable={editable}
				onblur={(e) => handleEdit('beschreibung', e)}
				onkeydown={handleKeyDown}
				class:editable-field={editable}
			>{bekannter.merkmal.beschreibung}</p>

			{#if bekannter.charakterKlasse}
				<a href="/wurzelbuecher#{germanSlugify(bekannter.charakterKlasse.name)}" class="charakter-klasse-tag">
					{bekannter.charakterKlasse.name}
				</a>
			{/if}

			<div class="berufe-section">
				<h4>Beruf{bekannter.berufe.length > 1 ? 'e' : ''}</h4>
				<div class="aktuelle-berufe">
					{#each bekannter.berufe as beruf, i}
						<span
							class="beruf-aktuell"
							contenteditable={editable}
							data-index={i}
							onblur={(e) => handleEdit('beruf', e)}
							onkeydown={handleKeyDown}
							class:editable-field={editable}
							role={editable ? 'textbox' : undefined}
							title={editable ? 'Doppelklick zum Bearbeiten' : ''}
						>{beruf}</span>
					{/each}
				</div>
				<details class="weitere-berufe">
					<summary>Weitere mögliche Berufe</summary>
					<div class="berufe-tags">
						{#each bekannter.merkmal.berufe.filter(b => !bekannter.berufe.includes(b)) as beruf}
							<span class="tag">{beruf}</span>
						{/each}
					</div>
				</details>
			</div>

			<div class="aktionen-section">
				<h4>Dies kann diese Figur immer tun:</h4>
				<ul class="aktionen-liste">
					{#each bekannter.merkmal.aktionen as aktion}
						<li>{aktion}</li>
					{/each}
				</ul>
			</div>

			{#if onUpdate && !hasApiKey()}
				<p class="api-key-hint">
					<a href="/einstellungen">API Key einrichten</a> um Bilder zu generieren.
				</p>
			{/if}

			{#if bekannter.charakterKlasse}
				<div class="charakter-klasse-section">
					<div class="frage-box">
						<strong>Deine Frage:</strong>
						<p
							contenteditable={editable}
							onblur={(e) => handleEdit('frage', e)}
							onkeydown={handleKeyDown}
							class:editable-field={editable}
							role={editable ? 'textbox' : undefined}
							title={editable ? 'Doppelklick zum Bearbeiten' : ''}
						><em>{bekannter.charakterKlasse.frage}</em></p>
					</div>

					<div class="tokens">
						<h4>Marker</h4>
						<ul>
							<li><span class="token-label">Anderer verdient:</span> {bekannter.charakterKlasse.tokens.anderer}</li>
							<li><span class="token-label">Selbst verdienen:</span> {bekannter.charakterKlasse.tokens.selbst}</li>
							<li><span class="token-label">Ausgeben:</span> {bekannter.charakterKlasse.tokens.ausgeben}</li>
						</ul>
					</div>

					<div class="besonders">
						<strong>Besonderes:</strong>
						<span
							contenteditable={editable}
							onblur={(e) => handleEdit('besonders', e)}
							onkeydown={handleKeyDown}
							class:editable-field={editable}
							role={editable ? 'textbox' : undefined}
							title={editable ? 'Doppelklick zum Bearbeiten' : ''}
						>{bekannter.charakterKlasse.besonders}</span>
					</div>

					{#if bekannter.charakterKlasse.warnung}
						<div class="warnung">⚠️ {bekannter.charakterKlasse.warnung}</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Image Modal -->
{#if showImageModal && bekannter.bild}
	<ImageModal
		src={bekannter.bild}
		alt={bekannter.name}
		caption={bekannter.name}
		onClose={() => showImageModal = false}
	/>
{/if}

<style>
	/* Compact card styles */
	.bekannte-card-compact {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border-left: 3px solid var(--color-earth);
	}

	.bekannte-card-compact[data-kategorie="bodenstaendig"] { border-left-color: #7cb342; }
	.bekannte-card-compact[data-kategorie="charakter"] { border-left-color: #5c9ead; }
	.bekannte-card-compact[data-kategorie="intellektuell"] { border-left-color: #9c7c38; }
	.bekannte-card-compact[data-kategorie="koerperlich"] { border-left-color: #d4a574; }
	.bekannte-card-compact[data-kategorie="kuenstlerisch"] { border-left-color: #e91e63; }
	.bekannte-card-compact[data-kategorie="sozial"] { border-left-color: #ff9800; }
	.bekannte-card-compact[data-kategorie="trauma"] { border-left-color: #8e7cc3; }

	.identity {
		flex: 1;
		min-width: 0;
	}

	.bekannte-card-compact .identity {
		display: flex;
		flex-direction: column;
	}

	.name {
		font-family: var(--font-display);
		font-weight: 600;
	}

	.tier {
		font-size: 0.85rem;
		color: var(--color-earth);
		font-style: italic;
		margin: 0;
	}

	.remove-btn {
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--color-earth);
		font-size: 1.2rem;
		cursor: pointer;
		opacity: 0.5;
		transition: all 0.2s ease;
		flex-shrink: 0;
	}

	.remove-btn:hover {
		opacity: 1;
		color: #c0392b;
	}

	/* Full card styles */
	.bekannte-card-full {
		border-left: 4px solid var(--color-earth);
		animation: fadeIn 0.3s ease;
		height: 100%;
		position: relative;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.bekannte-card-full[data-kategorie="bodenstaendig"] { border-left-color: #7cb342; }
	.bekannte-card-full[data-kategorie="charakter"] { border-left-color: #5c9ead; }
	.bekannte-card-full[data-kategorie="intellektuell"] { border-left-color: #9c7c38; }
	.bekannte-card-full[data-kategorie="koerperlich"] { border-left-color: #d4a574; }
	.bekannte-card-full[data-kategorie="kuenstlerisch"] { border-left-color: #e91e63; }
	.bekannte-card-full[data-kategorie="sozial"] { border-left-color: #ff9800; }
	.bekannte-card-full[data-kategorie="trauma"] { border-left-color: #8e7cc3; }

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-lg);
		padding-bottom: var(--space-lg);
		margin-bottom: var(--space-md);
		border-bottom: 2px solid var(--color-earth-light);
	}

	.header-info {
		flex: 1;
		min-width: 150px;
	}

	.header-info h2 {
		margin: 0 0 var(--space-xs) 0;
		font-size: 1.4rem;
		line-height: 1.2;
	}

	.tier-text {
		font-size: 0.95rem;
		color: var(--color-earth);
		font-style: italic;
		margin: 0 0 var(--space-md) 0;
	}

	.merkmal-row {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.merkmal-row .kategorie-tag {
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.8rem;
		margin: 0;
	}

	.card-body {
		margin-bottom: var(--space-lg);
	}

	.kategorie-tag {
		display: inline-block;
		background: var(--color-earth-light);
		color: var(--color-bark);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
	}

	.beschreibung {
		font-size: 1rem;
		margin: 0 0 var(--space-lg) 0;
		line-height: 1.6;
		color: var(--color-earth-dark);
	}

	.berufe-section h4,
	.aktionen-section h4 {
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-leaf-dark);
		font-size: 0.95rem;
	}

	.aktuelle-berufe {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.beruf-aktuell {
		background: var(--color-leaf-dark);
		color: var(--color-cream);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-weight: 600;
	}

	.weitere-berufe {
		margin-bottom: var(--space-lg);
	}

	.weitere-berufe summary {
		cursor: pointer;
		color: var(--color-earth);
		font-size: 0.85rem;
		margin-bottom: var(--space-sm);
	}

	.weitere-berufe summary:hover {
		color: var(--color-leaf-dark);
	}

	.berufe-tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tag {
		background: var(--color-earth-light);
		color: var(--color-bark);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
	}

	.aktionen-liste {
		padding-left: var(--space-lg);
		margin: 0;
	}

	.aktionen-liste li {
		margin-bottom: var(--space-sm);
		line-height: 1.5;
	}

	.api-key-hint {
		font-size: 0.9rem;
		color: var(--color-earth);
		margin: var(--space-md) 0 0 0;
		padding: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-sm);
	}

	.api-key-hint a {
		color: var(--color-leaf-dark);
		font-weight: 600;
	}

	/* Charakter Klasse Section */
	.charakter-klasse-tag {
		display: inline-block;
		background: var(--color-leaf-dark);
		color: var(--color-cream);
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 600;
		margin-bottom: var(--space-sm);
		margin-right: var(--space-sm);
		text-decoration: none;
		transition: background-color 0.2s ease, transform 0.2s ease;
	}

	.charakter-klasse-tag:hover {
		background: var(--color-leaf);
		transform: translateY(-1px);
	}

	.charakter-klasse-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 2px solid var(--color-earth-light);
	}

	.frage-box {
		background: rgba(107, 142, 78, 0.1);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		margin: var(--space-md) 0;
	}

	.frage-box strong {
		color: var(--color-leaf-dark);
	}

	.frage-box p {
		margin: var(--space-xs) 0 0;
		font-size: 1.1rem;
	}

	.tokens h4 {
		font-size: 1rem;
		margin-bottom: var(--space-sm);
	}

	.tokens ul {
		list-style: none;
		padding: 0;
	}

	.tokens li {
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-earth-light);
	}

	.tokens li:last-child {
		border-bottom: none;
	}

	.token-label {
		font-weight: 600;
		color: var(--color-earth-dark);
	}

	.besonders {
		margin-top: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-sm);
	}

	.warnung {
		margin-top: var(--space-md);
		padding: var(--space-sm);
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
	}

	/* Editable fields */
	.editable-field {
		cursor: text;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease, box-shadow 0.2s ease;
	}

	.editable-field:hover {
		background-color: rgba(107, 142, 78, 0.1);
	}

	.editable-field:focus {
		outline: none;
		background-color: rgba(107, 142, 78, 0.15);
		box-shadow: 0 0 0 2px var(--color-leaf-dark);
	}

	@media (max-width: 600px) {
		.card-header {
			flex-direction: column;
			align-items: center;
			text-align: center;
		}

		.header-info {
			display: flex;
			flex-direction: column;
			align-items: center;
		}

		.merkmal-row {
			justify-content: center;
		}

		.bekannte-card-compact {
			flex-wrap: wrap;
		}

	}
</style>
