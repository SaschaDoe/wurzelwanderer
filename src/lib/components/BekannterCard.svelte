<script lang="ts">
	import type { GenerierterBekannter } from '$lib/data/merkmale';

	interface Props {
		bekannter: GenerierterBekannter;
		compact?: boolean;
		editable?: boolean;
		onRemove?: () => void;
		onUpdate?: (bekannter: GenerierterBekannter) => void;
	}

	let { bekannter, compact = false, editable = false, onRemove, onUpdate }: Props = $props();

	function getKategorieClass(kategorie: string): string {
		return kategorie.toLowerCase()
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/ä/g, 'ae');
	}

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

	function getKlasseSlug(name: string): string {
		return name.toLowerCase()
			.replace(/\*/g, '')
			.replace(/ü/g, 'ue')
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ß/g, 'ss');
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
</script>

{#if compact}
	<!-- Compact card for lists -->
	<div class="bekannte-card-compact" data-kategorie={getKategorieClass(bekannter.kategorie)}>
		<div class="avatar" class:chimaere={bekannter.chimaere}>
			{#if bekannter.chimaere}
				<span class="chimaere-letters">{bekannter.chimaere.oben.charAt(0)} {bekannter.chimaere.unten.charAt(0)}</span>
			{:else}
				{bekannter.tier.charAt(0)}
			{/if}
		</div>
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
		<div class="merkmal-badge" class:magisch={bekannter.merkmal.magisch} class:trauma={bekannter.merkmal.trauma}>
			{#if bekannter.merkmal.magisch}
				<span class="symbol">✧</span>
			{/if}
			{#if bekannter.merkmal.trauma}
				<span class="symbol">‡</span>
			{/if}
			{bekannter.merkmal.name}
		</div>
		{#if onRemove}
			<button class="remove-btn" onclick={onRemove} title="Entfernen">×</button>
		{/if}
	</div>
{:else}
	<!-- Full card with details -->
	<div class="bekannte-card-full card" data-kategorie={getKategorieClass(bekannter.kategorie)} class:editable>
		<header class="card-header">
			<div class="avatar large" class:chimaere={bekannter.chimaere}>
				{#if bekannter.chimaere}
					<span class="chimaere-letters">{bekannter.chimaere.oben.charAt(0)} {bekannter.chimaere.unten.charAt(0)}</span>
				{:else}
					{bekannter.tier.charAt(0)}
				{/if}
			</div>
			<div class="identity">
				<h2
					contenteditable={editable}
					onblur={(e) => handleEdit('name', e)}
					onkeydown={handleKeyDown}
					class:editable-field={editable}
					title={editable ? 'Doppelklick zum Bearbeiten' : ''}
				>{bekannter.name}</h2>
				{#if bekannter.chimaere}
					<p class="chimaere-details">{getChimaereBezeichnung()}</p>
				{:else}
					<p
						class="tier"
						contenteditable={editable}
						onblur={(e) => handleEdit('tier', e)}
						onkeydown={handleKeyDown}
						class:editable-field={editable}
						title={editable ? 'Doppelklick zum Bearbeiten' : ''}
					>{getTierBezeichnung(bekannter.tier, bekannter.geschlecht)}</p>
				{/if}
			</div>
			<div class="merkmal-badge" class:magisch={bekannter.merkmal.magisch} class:trauma={bekannter.merkmal.trauma}>
				{#if bekannter.merkmal.magisch}
					<span class="symbol">✧</span>
				{/if}
				{#if bekannter.merkmal.trauma}
					<span class="symbol">‡</span>
				{/if}
				{bekannter.merkmal.name}
			</div>
		</header>

		<div class="card-body">
			{#if bekannter.charakterKlasse}
				<a href="/wurzelbuecher#{getKlasseSlug(bekannter.charakterKlasse.name)}" class="charakter-klasse-tag">
					{bekannter.charakterKlasse.name}
				</a>
			{/if}

			<div class="kategorie-tag">{bekannter.kategorie}es Merkmal</div>

			<p
				class="beschreibung"
				contenteditable={editable}
				onblur={(e) => handleEdit('beschreibung', e)}
				onkeydown={handleKeyDown}
				class:editable-field={editable}
				title={editable ? 'Doppelklick zum Bearbeiten' : ''}
			>{bekannter.merkmal.beschreibung}</p>

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

			{#if bekannter.charakterKlasse}
				<div class="charakter-klasse-section">
					<div class="frage-box">
						<strong>Deine Frage:</strong>
						<p
							contenteditable={editable}
							onblur={(e) => handleEdit('frage', e)}
							onkeydown={handleKeyDown}
							class:editable-field={editable}
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

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: var(--color-earth);
		color: var(--color-cream);
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.avatar.large {
		width: 60px;
		height: 60px;
		font-size: 1.5rem;
	}

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

	.chimaere-details {
		font-size: 0.8rem;
		color: #9c7c38;
		margin: var(--space-xs) 0 0 0;
		font-style: normal;
		font-weight: 500;
	}

	.avatar.chimaere {
		background: linear-gradient(135deg, #9c7c38 50%, #c9a227 50%);
	}

	.chimaere-letters {
		font-size: 0.75rem;
		letter-spacing: 1px;
	}

	.avatar.large .chimaere-letters {
		font-size: 1rem;
		letter-spacing: 2px;
	}

	.merkmal-badge {
		background: var(--color-parchment);
		border: 2px solid var(--color-earth-light);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.85rem;
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		white-space: nowrap;
	}

	.merkmal-badge.magisch {
		border-color: #c9a227;
		background: linear-gradient(135deg, rgba(156, 124, 56, 0.1), rgba(201, 162, 39, 0.1));
	}

	.merkmal-badge.trauma {
		border-color: #8e7cc3;
		background: linear-gradient(135deg, rgba(142, 124, 195, 0.1), rgba(106, 90, 205, 0.1));
	}

	.symbol {
		font-weight: bold;
		font-size: 1rem;
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
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-lg);
		flex-wrap: wrap;
	}

	.card-header .identity {
		flex: 1;
		min-width: 150px;
	}

	.card-header .identity h2 {
		margin: 0;
		font-size: 1.5rem;
	}

	.card-header .merkmal-badge {
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-lg);
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
		margin-bottom: var(--space-md);
	}

	.beschreibung {
		font-size: 1.1rem;
		margin-bottom: var(--space-lg);
		line-height: 1.6;
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

	.bekannte-card-full.editable {
		position: relative;
	}

	.bekannte-card-full.editable::before {
		content: 'Doppelklick zum Bearbeiten';
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		font-size: 0.75rem;
		color: var(--color-earth);
		opacity: 0.6;
	}

	@media (max-width: 600px) {
		.card-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.card-header .merkmal-badge {
			align-self: flex-start;
		}

		.bekannte-card-compact {
			flex-wrap: wrap;
		}

		.bekannte-card-compact .merkmal-badge {
			order: 4;
			width: 100%;
			justify-content: center;
			margin-top: var(--space-xs);
		}
	}
</style>
