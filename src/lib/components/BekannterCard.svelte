<script lang="ts">
	import type { GenerierterBekannter, VerbundenerBekannter, Muendel, Hummel } from '$lib/data/merkmale';
	import { generiereHummel, generiereMuendel } from '$lib/data/merkmale';
	import { charaktere, type VerbundeneBekannteConfig } from '$lib/data/charaktere';
	import { hasApiKey, generateHummelImage, generateCharakterZitate, type OrtContext, type RegionInfo } from '$lib/services/geminiService';
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
		ortContext?: OrtContext;
		regionContext?: RegionInfo;
	}

	let { bekannter, compact = false, editable = false, onRemove, onUpdate, ortContext, regionContext }: Props = $props();

	let showImageModal = $state(false);

	// Zitat generation state
	let isGeneratingZitat = $state(false);
	let zitatError = $state<string | null>(null);
	const MAX_ZITATE = 3;

	// Get verbundene Bekannte config if this character has a charakterKlasse
	let verbundeneConfig = $derived.by(() => {
		if (!bekannter.charakterKlasse) return undefined;
		const charKlasse = charaktere.find(c => c.name === bekannter.charakterKlasse?.name);
		return charKlasse?.verbundeneBekannte;
	});

	// Helper to check if we can add more verbundene
	function kannHinzufuegen(): boolean {
		const config = verbundeneConfig;
		if (!config) return false;
		if (config.maxAnzahl === undefined) return true;
		const aktuelleAnzahl = bekannter.verbundeneBekannte?.length || 0;
		return aktuelleAnzahl < config.maxAnzahl;
	}

	// Add a new verbundener Bekannter
	function addVerbundener() {
		if (!onUpdate) return;
		const config = verbundeneConfig;
		if (!config) return;

		let neuer: VerbundenerBekannter;
		if (config.typ === 'hummel') {
			neuer = generiereHummel();
		} else if (config.typ === 'muendel') {
			neuer = generiereMuendel();
		} else {
			return;
		}

		const updated = {
			...bekannter,
			verbundeneBekannte: [...(bekannter.verbundeneBekannte || []), neuer]
		};
		onUpdate(updated);
	}

	// Remove a verbundener Bekannter by id
	function removeVerbundener(id: string) {
		if (!onUpdate) return;
		const updated = {
			...bekannter,
			verbundeneBekannte: bekannter.verbundeneBekannte?.filter(v => v.id !== id) || []
		};
		onUpdate(updated);
	}

	// Type guards
	function isHummel(v: VerbundenerBekannter): v is Hummel {
		return v.typ === 'hummel';
	}

	function isMuendel(v: VerbundenerBekannter): v is Muendel {
		return v.typ === 'muendel';
	}

	// State for hummel image generation
	let generatingHummelId = $state<string | null>(null);
	let hummelImageError = $state<string | null>(null);

	// Update a verbundener Bekannter
	function updateVerbundener(id: string, updates: Partial<Hummel> | Partial<Muendel>) {
		if (!onUpdate || !bekannter.verbundeneBekannte) return;

		const updatedVerbundene = bekannter.verbundeneBekannte.map(v => {
			if (v.id === id) {
				return { ...v, ...updates };
			}
			return v;
		});

		onUpdate({
			...bekannter,
			verbundeneBekannte: updatedVerbundene
		});
	}

	// Handle editable field blur for Hummel
	function handleHummelEdit(hummelId: string, field: 'name' | 'aussehen' | 'persoenlichkeit', event: Event) {
		if (!editable) return;
		const target = event.target as HTMLElement;
		const newValue = target.innerText.trim();
		updateVerbundener(hummelId, { [field]: newValue });
	}

	// Generate image for a Hummel
	async function generateHummelBild(hummel: Hummel) {
		if (!onUpdate || generatingHummelId) return;

		generatingHummelId = hummel.id;
		hummelImageError = null;

		try {
			const imageData = await generateHummelImage({
				name: hummel.name,
				aussehen: hummel.aussehen,
				persoenlichkeit: hummel.persoenlichkeit
			});

			if (imageData) {
				updateVerbundener(hummel.id, { bild: imageData });
			}
		} catch (error) {
			hummelImageError = error instanceof Error ? error.message : 'Fehler bei der Bildgenerierung';
		} finally {
			generatingHummelId = null;
		}
	}

	// Remove hummel image
	function removeHummelBild(hummelId: string) {
		updateVerbundener(hummelId, { bild: undefined });
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
			geschlecht: bekannter.geschlecht,
			ortContext,
			regionContext
		};
	}

	// Zitat functions
	async function handleGenerateZitate() {
		if (isGeneratingZitat || !onUpdate) return;

		isGeneratingZitat = true;
		zitatError = null;

		try {
			const result = await generateCharakterZitate(
				bekannter.name,
				bekannter.tier,
				bekannter.geschlecht,
				bekannter.berufe,
				bekannter.merkmal.name,
				bekannter.merkmal.beschreibung
			);
			if (result.success && result.zitate) {
				onUpdate({ ...bekannter, zitate: result.zitate });
			} else {
				zitatError = result.error || 'Zitate konnten nicht generiert werden';
			}
		} catch (err) {
			zitatError = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			isGeneratingZitat = false;
		}
	}

	function handleDeleteZitat(index: number) {
		if (!onUpdate) return;
		const neueZitate = (bekannter.zitate || []).filter((_, i) => i !== index);
		onUpdate({ ...bekannter, zitate: neueZitate });
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

			<!-- Zitate Section -->
			<div class="zitat-section">
				<h4>Zitate ({bekannter.zitate?.length || 0}/{MAX_ZITATE})</h4>
				{#if bekannter.zitate && bekannter.zitate.length > 0}
					<div class="zitate-liste">
						{#each bekannter.zitate as zitatText, index}
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
					{#if !bekannter.zitate || bekannter.zitate.length === 0}
						<button
							class="btn btn-primary btn-sm"
							onclick={handleGenerateZitate}
							disabled={isGeneratingZitat}
						>
							{#if isGeneratingZitat}
								<span class="zitat-spinner"></span>
								Generiere 3 Zitate...
							{:else}
								Zitate generieren
							{/if}
						</button>
						<p class="zitat-hint">Generiert 3 unterschiedliche Zitate aus verschiedenen Situationen</p>
					{:else}
						<p class="zitat-info">Lösche alle Zitate um neue zu generieren</p>
					{/if}
				{:else if !hasApiKey()}
					<p class="zitat-no-api">Kein API Key - Zitate nicht verfügbar</p>
				{/if}

				{#if zitatError}
					<p class="zitat-error">{zitatError}</p>
				{/if}
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

			<!-- Verbundene Bekannte Section -->
			{#if verbundeneConfig}
				<div class="verbundene-section">
					<div class="verbundene-header">
						<h4>{verbundeneConfig.labelPlural || 'Verbundene'}</h4>
						{#if editable && kannHinzufuegen()}
							<button class="btn-add-verbundener" onclick={addVerbundener}>
								+ {verbundeneConfig.buttonText || 'Hinzufügen'}
							</button>
						{/if}
					</div>

					{#if bekannter.verbundeneBekannte && bekannter.verbundeneBekannte.length > 0}
						<div class="verbundene-liste">
							{#each bekannter.verbundeneBekannte as verbundener}
								<div class="verbundener-card" data-typ={verbundener.typ}>
									{#if isHummel(verbundener)}
										<!-- Hummel Anzeige -->
										<div class="hummel-card">
											<!-- Hummel Bild-Bereich -->
											<div class="hummel-image-area">
												{#if verbundener.bild}
													<div class="hummel-image-container">
														<img src={verbundener.bild} alt={verbundener.name} class="hummel-image" />
														{#if editable}
															<button
																class="hummel-regenerate-btn"
																onclick={() => generateHummelBild(verbundener)}
																disabled={generatingHummelId === verbundener.id}
																title="Neues Bild generieren"
															>🔄</button>
														{/if}
													</div>
												{:else if hasApiKey() && editable}
													<button
														class="hummel-image-placeholder"
														onclick={() => generateHummelBild(verbundener)}
														disabled={generatingHummelId === verbundener.id}
														title="Klicken um Bild zu generieren"
													>
														{#if generatingHummelId === verbundener.id}
															<span class="hummel-spinner"></span>
														{:else}
															<span class="hummel-placeholder-icon">🐝</span>
															<span class="hummel-placeholder-text">Bild</span>
														{/if}
													</button>
												{:else}
													<div class="hummel-icon">🐝</div>
												{/if}
											</div>
											<div class="hummel-info">
												<strong
													class="hummel-name"
													contenteditable={editable}
													onblur={(e) => handleHummelEdit(verbundener.id, 'name', e)}
													onkeydown={handleKeyDown}
													class:editable-field={editable}
												>{verbundener.name}</strong>
												<p
													class="hummel-aussehen"
													contenteditable={editable}
													onblur={(e) => handleHummelEdit(verbundener.id, 'aussehen', e)}
													onkeydown={handleKeyDown}
													class:editable-field={editable}
												>{verbundener.aussehen}</p>
												<p
													class="hummel-persoenlichkeit"
													contenteditable={editable}
													onblur={(e) => handleHummelEdit(verbundener.id, 'persoenlichkeit', e)}
													onkeydown={handleKeyDown}
													class:editable-field={editable}
												><em>{verbundener.persoenlichkeit}</em></p>
											</div>
											{#if editable}
												<button
													class="btn-remove-verbundener"
													onclick={() => removeVerbundener(verbundener.id)}
													title="Entfernen"
												>×</button>
											{/if}
										</div>
										{#if hummelImageError && generatingHummelId === null}
											<p class="hummel-error">{hummelImageError}</p>
										{/if}
									{:else if isMuendel(verbundener)}
										<!-- Mündel Anzeige -->
										<div class="muendel-card">
											<div class="muendel-avatar">
												{#if verbundener.bild}
													<img src={verbundener.bild} alt={verbundener.name} />
												{:else}
													<span class="muendel-placeholder">👶</span>
												{/if}
											</div>
											<div class="muendel-info">
												<strong class="muendel-name">{verbundener.name}</strong>
												<p class="muendel-tier">{verbundener.beschreibung}</p>
												<div class="muendel-merkmal">
													<MerkmalBadge
														name={verbundener.merkmal.name}
														magisch={verbundener.merkmal.magisch}
														trauma={verbundener.merkmal.trauma}
													/>
												</div>
												<p class="muendel-beruf">{verbundener.berufe[0]}</p>
											</div>
											{#if editable}
												<button
													class="btn-remove-verbundener"
													onclick={() => removeVerbundener(verbundener.id)}
													title="Entfernen"
												>×</button>
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{:else}
						<p class="keine-verbundene">
							{#if verbundeneConfig.typ === 'hummel'}
								Noch keine Hummeln im Schwarm.
							{:else if verbundeneConfig.typ === 'muendel'}
								Noch kein Mündel vorhanden.
							{:else}
								Keine verbundenen Bekannten.
							{/if}
						</p>
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

	/* Verbundene Bekannte Section */
	.verbundene-section {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 2px solid var(--color-earth-light);
	}

	.verbundene-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.verbundene-header h4 {
		margin: 0;
		font-family: var(--font-display);
		color: var(--color-leaf-dark);
	}

	.btn-add-verbundener {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-leaf);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 600;
		transition: all 0.2s ease;
	}

	.btn-add-verbundener:hover {
		background: var(--color-leaf-dark);
		transform: translateY(-1px);
	}

	.verbundene-liste {
		display: flex;
		flex-direction: column;
		gap: var(--space-sm);
	}

	.verbundener-card {
		position: relative;
	}

	/* Hummel Card Styles */
	.hummel-card {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: linear-gradient(135deg, rgba(255, 193, 7, 0.1), rgba(255, 152, 0, 0.1));
		border: 2px solid rgba(255, 193, 7, 0.3);
		border-radius: var(--radius-md);
		align-items: flex-start;
	}

	.hummel-image-area {
		flex-shrink: 0;
	}

	.hummel-image-container {
		position: relative;
		width: 80px;
		height: 80px;
	}

	.hummel-image {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-md);
		object-fit: cover;
		border: 2px solid rgba(255, 193, 7, 0.5);
	}

	.hummel-regenerate-btn {
		position: absolute;
		bottom: -4px;
		right: -4px;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 50%;
		background: var(--color-leaf);
		color: white;
		font-size: 0.75rem;
		cursor: pointer;
		opacity: 0.8;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hummel-regenerate-btn:hover:not(:disabled) {
		opacity: 1;
		transform: scale(1.1);
	}

	.hummel-regenerate-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.hummel-image-placeholder {
		width: 80px;
		height: 80px;
		border-radius: var(--radius-md);
		background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 152, 0, 0.2));
		border: 2px dashed rgba(255, 193, 7, 0.5);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.hummel-image-placeholder:hover:not(:disabled) {
		background: linear-gradient(135deg, rgba(255, 193, 7, 0.3), rgba(255, 152, 0, 0.3));
		border-color: rgba(255, 193, 7, 0.8);
	}

	.hummel-image-placeholder:disabled {
		cursor: wait;
	}

	.hummel-placeholder-icon {
		font-size: 1.5rem;
	}

	.hummel-placeholder-text {
		font-size: 0.7rem;
		color: var(--color-earth);
		margin-top: 2px;
	}

	.hummel-spinner {
		width: 24px;
		height: 24px;
		border: 3px solid rgba(255, 193, 7, 0.3);
		border-top-color: #ffc107;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.hummel-icon {
		font-size: 2rem;
		flex-shrink: 0;
		width: 80px;
		height: 80px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 193, 7, 0.1);
		border-radius: var(--radius-md);
	}

	.hummel-info {
		flex: 1;
		min-width: 0;
	}

	.hummel-name {
		font-family: var(--font-display);
		font-size: 1.1rem;
		color: var(--color-bark);
		display: block;
	}

	.hummel-aussehen {
		font-size: 0.9rem;
		color: var(--color-earth-dark);
		margin: var(--space-xs) 0;
	}

	.hummel-persoenlichkeit {
		font-size: 0.85rem;
		color: var(--color-earth);
		margin: 0;
	}

	.hummel-error {
		color: #c0392b;
		font-size: 0.8rem;
		margin-top: var(--space-xs);
		padding: var(--space-xs);
		background: rgba(192, 57, 43, 0.1);
		border-radius: var(--radius-sm);
	}

	/* Mündel Card Styles */
	.muendel-card {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: linear-gradient(135deg, rgba(139, 119, 101, 0.1), rgba(107, 142, 78, 0.1));
		border: 2px solid rgba(139, 119, 101, 0.3);
		border-radius: var(--radius-md);
		align-items: flex-start;
	}

	.muendel-avatar {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		overflow: hidden;
		flex-shrink: 0;
		background: var(--color-cream);
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--color-earth-light);
	}

	.muendel-avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.muendel-placeholder {
		font-size: 1.5rem;
	}

	.muendel-info {
		flex: 1;
		min-width: 0;
	}

	.muendel-name {
		font-family: var(--font-display);
		font-size: 1.1rem;
		color: var(--color-bark);
	}

	.muendel-tier {
		font-size: 0.9rem;
		color: var(--color-earth-dark);
		margin: var(--space-xs) 0;
		font-style: italic;
	}

	.muendel-merkmal {
		margin: var(--space-xs) 0;
	}

	.muendel-beruf {
		font-size: 0.85rem;
		color: var(--color-earth);
		margin: 0;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-earth-light);
		border-radius: var(--radius-sm);
		display: inline-block;
	}

	.btn-remove-verbundener {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.1);
		color: var(--color-earth-dark);
		font-size: 1.1rem;
		cursor: pointer;
		opacity: 0.6;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.btn-remove-verbundener:hover {
		opacity: 1;
		background: #c0392b;
		color: white;
	}

	.keine-verbundene {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
		padding: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
	}

	/* Zitat Section Styles */
	.zitat-section {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-leaf);
	}

	.zitat-section h4 {
		margin: 0 0 var(--space-sm);
		color: var(--color-leaf-dark);
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

	.zitat-no-api {
		font-size: 0.8rem;
		color: var(--color-earth);
		margin: 0;
		font-style: italic;
	}

	.zitat-error {
		color: #dc3545;
		font-size: 0.85rem;
		margin: var(--space-sm) 0 0 0;
	}

	.zitat-spinner {
		display: inline-block;
		width: 14px;
		height: 14px;
		border: 2px solid white;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		margin-right: var(--space-xs);
	}

	.btn-sm {
		font-size: 0.85rem;
		padding: var(--space-xs) var(--space-sm);
	}
</style>
