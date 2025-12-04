<script lang="ts">
	import { onMount } from 'svelte';
	import type { GenerierterBekannter } from '$lib/data/merkmale';
	import type { GespeicherteRegion } from '$lib/data/regionen';
	import type { Naturell } from '$lib/data/naturelle';
	import { generiereBekanntenData } from '$lib/data/merkmale';
	import { generiereZufaelligeRegion, HEIMATGEFILDE, HEIMATGEFILDE_ID } from '$lib/data/regionen';
	import { kategorien } from '$lib/data/naturelle';
	import { STORAGE_KEYS, getStoredItem, setStoredItem } from '$lib/utils/storage';
	import { getRandomElement } from '$lib/utils/random';
	import CharakterDetailModal from './CharakterDetailModal.svelte';
	import CharacterAvatar from './CharacterAvatar.svelte';

	interface Props {
		onStart: (config: {
			charaktere: GenerierterBekannter[];
			startRegion: GespeicherteRegion;
			startOrt: Naturell;
			zweiterOrt?: { region: GespeicherteRegion; ort: Naturell };
		}) => void;
		onCancel: () => void;
	}

	let { onStart, onCancel }: Props = $props();

	// Available characters
	let gespeicherterHeld = $state<GenerierterBekannter | null>(null);
	let aktuellerBekannter = $state<GenerierterBekannter | null>(null);
	let generierteCharaktere = $state<GenerierterBekannter[]>([]);

	// Selected characters
	let ausgewaehlteCharaktere = $state<GenerierterBekannter[]>([]);

	// Modal state
	let showDetailModal = $state(false);
	let selectedCharakter = $state<GenerierterBekannter | null>(null);

	// Regions and locations
	let regionen = $state<GespeicherteRegion[]>([]);
	let gespeicherteOrte = $state<Array<{ regionId: string; name: string; naturelle: Array<{ name: string }> }>>([]);

	// Start location config
	let startOrtModus = $state<'auswaehlen' | 'generieren'>('generieren');
	let ausgewaehlteStartRegionId = $state<string>('');
	let ausgewaehlterStartOrtName = $state<string>('');

	// Second location config
	let zweiterOrtModus = $state<'automatisch' | 'auswaehlen'>('automatisch');
	let ausgewaehlteZweiteRegionId = $state<string>('');
	let ausgewaehlterZweiterOrtName = $state<string>('');

	// Derived values
	let alleNaturelle = $derived(kategorien.flatMap((k) => k.naturelle));
	let orteInStartRegion = $derived(
		gespeicherteOrte.filter((o) => o.regionId === ausgewaehlteStartRegionId)
	);
	let orteInZweiterRegion = $derived(
		gespeicherteOrte.filter((o) => o.regionId === ausgewaehlteZweiteRegionId)
	);

	let kannStarten = $derived(ausgewaehlteCharaktere.length > 0);

	onMount(async () => {
		// Load saved hero
		const held = await getStoredItem<GenerierterBekannter>(STORAGE_KEYS.HELD);
		if (held) {
			gespeicherterHeld = held;
		}

		// Load current bekannter
		const bekannter = await getStoredItem<GenerierterBekannter>(STORAGE_KEYS.CURRENT_BEKANNTER);
		if (bekannter) {
			aktuellerBekannter = bekannter;
		}

		// Load regions
		const savedRegionen = await getStoredItem<GespeicherteRegion[]>(STORAGE_KEYS.REGIONEN);
		if (savedRegionen && savedRegionen.length > 0) {
			const hasHeimat = savedRegionen.some((r) => r.id === HEIMATGEFILDE_ID);
			regionen = hasHeimat ? savedRegionen : [HEIMATGEFILDE, ...savedRegionen];
		} else {
			regionen = [HEIMATGEFILDE];
		}

		// Load saved orte
		const orte = await getStoredItem<Array<{ regionId: string; name: string; naturelle: Array<{ name: string }> }>>(STORAGE_KEYS.ORTE);
		if (orte) {
			gespeicherteOrte = orte;
		}

		// Load wizard-generated characters
		const wizardChars = await getStoredItem<GenerierterBekannter[]>(STORAGE_KEYS.WIZARD_CHARAKTERE);
		if (wizardChars && wizardChars.length > 0) {
			generierteCharaktere = wizardChars;
		}

		// Default to first region
		if (regionen.length > 0) {
			ausgewaehlteStartRegionId = regionen[0].id;
			ausgewaehlteZweiteRegionId = regionen[0].id;
		}
	});

	async function saveWizardCharaktere() {
		await setStoredItem(STORAGE_KEYS.WIZARD_CHARAKTERE, generierteCharaktere);
	}

	function toggleCharakter(charakter: GenerierterBekannter) {
		const index = ausgewaehlteCharaktere.findIndex((c) => c.name === charakter.name);
		if (index >= 0) {
			ausgewaehlteCharaktere = ausgewaehlteCharaktere.filter((_, i) => i !== index);
		} else {
			ausgewaehlteCharaktere = [...ausgewaehlteCharaktere, charakter];
		}
	}

	function istAusgewaehlt(charakter: GenerierterBekannter): boolean {
		return ausgewaehlteCharaktere.some((c) => c.name === charakter.name);
	}

	async function generiereNeuenCharakter() {
		const neuer = generiereBekanntenData(true, false);
		generierteCharaktere = [...generierteCharaktere, neuer];
		ausgewaehlteCharaktere = [...ausgewaehlteCharaktere, neuer];
		await saveWizardCharaktere();
	}

	function showCharakterDetails(charakter: GenerierterBekannter) {
		selectedCharakter = charakter;
		showDetailModal = true;
	}

	function closeDetailModal() {
		showDetailModal = false;
		selectedCharakter = null;
	}

	async function handleCharakterUpdate(updatedCharakter: GenerierterBekannter) {
		// Update in the appropriate list
		if (gespeicherterHeld && gespeicherterHeld.name === updatedCharakter.name) {
			gespeicherterHeld = updatedCharakter;
			await setStoredItem(STORAGE_KEYS.HELD, updatedCharakter);
		}
		if (aktuellerBekannter && aktuellerBekannter.name === updatedCharakter.name) {
			aktuellerBekannter = updatedCharakter;
			await setStoredItem(STORAGE_KEYS.CURRENT_BEKANNTER, updatedCharakter);
		}

		// Check if it's a wizard-generated character
		const isWizardChar = generierteCharaktere.some((c) => c.name === updatedCharakter.name);
		generierteCharaktere = generierteCharaktere.map((c) =>
			c.name === updatedCharakter.name ? updatedCharakter : c
		);
		if (isWizardChar) {
			await saveWizardCharaktere();
		}

		ausgewaehlteCharaktere = ausgewaehlteCharaktere.map((c) =>
			c.name === updatedCharakter.name ? updatedCharakter : c
		);

		// Update modal state
		selectedCharakter = updatedCharakter;
	}

	function handleStart() {
		if (!kannStarten) return;

		// Determine start location
		let startRegion: GespeicherteRegion;
		let startOrt: Naturell;

		if (startOrtModus === 'generieren') {
			startRegion = generiereZufaelligeRegion();
			startOrt = getRandomElement(alleNaturelle);
		} else {
			startRegion = regionen.find((r) => r.id === ausgewaehlteStartRegionId) || HEIMATGEFILDE;
			const gespeicherterOrt = orteInStartRegion.find((o) => o.name === ausgewaehlterStartOrtName);
			if (gespeicherterOrt && gespeicherterOrt.naturelle.length > 0) {
				const naturellName = gespeicherterOrt.naturelle[0].name;
				startOrt = alleNaturelle.find((n) => n.name === naturellName) || getRandomElement(alleNaturelle);
			} else {
				startOrt = getRandomElement(alleNaturelle);
			}
		}

		// Determine second location
		let zweiterOrt: { region: GespeicherteRegion; ort: Naturell } | undefined;

		if (zweiterOrtModus === 'auswaehlen') {
			const region = regionen.find((r) => r.id === ausgewaehlteZweiteRegionId) || generiereZufaelligeRegion();
			const gespeicherterOrt = orteInZweiterRegion.find((o) => o.name === ausgewaehlterZweiterOrtName);
			let ort: Naturell;
			if (gespeicherterOrt && gespeicherterOrt.naturelle.length > 0) {
				const naturellName = gespeicherterOrt.naturelle[0].name;
				ort = alleNaturelle.find((n) => n.name === naturellName) || getRandomElement(alleNaturelle);
			} else {
				ort = getRandomElement(alleNaturelle);
			}
			zweiterOrt = { region, ort };
		}
		// If 'automatisch', zweiterOrt stays undefined and will be generated by the service

		onStart({
			charaktere: ausgewaehlteCharaktere,
			startRegion,
			startOrt,
			zweiterOrt
		});
	}
</script>

<div class="wizard">
	<h2>Neuen Bildband erstellen</h2>

	<!-- Section 1: Characters -->
	<section class="wizard-section">
		<h3>1. Charaktere auswaehlen</h3>
		<p class="section-hint">Waehle die Charaktere, die in der Geschichte vorkommen sollen.</p>

		<div class="character-grid">
			{#if gespeicherterHeld}
				<div class="character-card-wrapper" class:selected={istAusgewaehlt(gespeicherterHeld)}>
					<button
						class="character-card"
						class:selected={istAusgewaehlt(gespeicherterHeld)}
						onclick={() => toggleCharakter(gespeicherterHeld!)}
					>
						<span class="hero-badge">Held</span>
						<div class="char-avatar">
							{#if gespeicherterHeld.bild}
								<img src={gespeicherterHeld.bild} alt={gespeicherterHeld.name} class="avatar-img" />
							{:else}
								<CharacterAvatar
									name={gespeicherterHeld.name}
									tier={gespeicherterHeld.tier}
									chimaere={gespeicherterHeld.chimaere}
									size="medium"
								/>
							{/if}
						</div>
						<span class="char-name">{gespeicherterHeld.name}</span>
						<span class="char-info">{gespeicherterHeld.tier}</span>
					</button>
					<button
						class="detail-btn"
						onclick={() => showCharakterDetails(gespeicherterHeld!)}
						title="Details anzeigen"
					>
						Details
					</button>
				</div>
			{/if}

			{#if aktuellerBekannter && (!gespeicherterHeld || aktuellerBekannter.name !== gespeicherterHeld.name)}
				<div class="character-card-wrapper" class:selected={istAusgewaehlt(aktuellerBekannter)}>
					<button
						class="character-card"
						class:selected={istAusgewaehlt(aktuellerBekannter)}
						onclick={() => toggleCharakter(aktuellerBekannter!)}
					>
						<div class="char-avatar">
							{#if aktuellerBekannter.bild}
								<img src={aktuellerBekannter.bild} alt={aktuellerBekannter.name} class="avatar-img" />
							{:else}
								<CharacterAvatar
									name={aktuellerBekannter.name}
									tier={aktuellerBekannter.tier}
									chimaere={aktuellerBekannter.chimaere}
									size="medium"
								/>
							{/if}
						</div>
						<span class="char-name">{aktuellerBekannter.name}</span>
						<span class="char-info">{aktuellerBekannter.tier}</span>
					</button>
					<button
						class="detail-btn"
						onclick={() => showCharakterDetails(aktuellerBekannter!)}
						title="Details anzeigen"
					>
						Details
					</button>
				</div>
			{/if}

			{#each generierteCharaktere as char}
				<div class="character-card-wrapper" class:selected={istAusgewaehlt(char)}>
					<button
						class="character-card"
						class:selected={istAusgewaehlt(char)}
						onclick={() => toggleCharakter(char)}
					>
						<div class="char-avatar">
							{#if char.bild}
								<img src={char.bild} alt={char.name} class="avatar-img" />
							{:else}
								<CharacterAvatar
									name={char.name}
									tier={char.tier}
									chimaere={char.chimaere}
									size="medium"
								/>
							{/if}
						</div>
						<span class="char-name">{char.name}</span>
						<span class="char-info">{char.tier}</span>
					</button>
					<button
						class="detail-btn"
						onclick={() => showCharakterDetails(char)}
						title="Details anzeigen"
					>
						Details
					</button>
				</div>
			{/each}

			<button class="character-card add-card" onclick={generiereNeuenCharakter}>
				<span class="add-icon">+</span>
				<span>Neuen Charakter generieren</span>
			</button>
		</div>

		{#if ausgewaehlteCharaktere.length > 0}
			<p class="selection-info">{ausgewaehlteCharaktere.length} Charakter(e) ausgewaehlt</p>
		{/if}
	</section>

	<!-- Section 2: Start Location -->
	<section class="wizard-section">
		<h3>2. Startort</h3>

		<div class="radio-group">
			<label class:active={startOrtModus === 'generieren'}>
				<input type="radio" bind:group={startOrtModus} value="generieren" />
				Zufaellig generieren
			</label>
			<label class:active={startOrtModus === 'auswaehlen'}>
				<input type="radio" bind:group={startOrtModus} value="auswaehlen" />
				Aus gespeicherten waehlen
			</label>
		</div>

		{#if startOrtModus === 'auswaehlen'}
			<div class="select-group">
				<select bind:value={ausgewaehlteStartRegionId}>
					{#each regionen as region}
						<option value={region.id}>{region.name}</option>
					{/each}
				</select>

				{#if orteInStartRegion.length > 0}
					<select bind:value={ausgewaehlterStartOrtName}>
						<option value="">-- Ort waehlen --</option>
						{#each orteInStartRegion as ort}
							<option value={ort.name}>{ort.name}</option>
						{/each}
					</select>
				{:else}
					<p class="no-orte-hint">Keine gespeicherten Orte in dieser Region.</p>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Section 3: Second Location -->
	<section class="wizard-section">
		<h3>3. Zweiter Ort (optional)</h3>
		<p class="section-hint">Die Reise fuehrt zu einem anderen Ort. Soll Gemini diesen waehlen?</p>

		<div class="radio-group">
			<label class:active={zweiterOrtModus === 'automatisch'}>
				<input type="radio" bind:group={zweiterOrtModus} value="automatisch" />
				Automatisch durch Gemini
			</label>
			<label class:active={zweiterOrtModus === 'auswaehlen'}>
				<input type="radio" bind:group={zweiterOrtModus} value="auswaehlen" />
				Selbst festlegen
			</label>
		</div>

		{#if zweiterOrtModus === 'auswaehlen'}
			<div class="select-group">
				<select bind:value={ausgewaehlteZweiteRegionId}>
					{#each regionen as region}
						<option value={region.id}>{region.name}</option>
					{/each}
				</select>

				{#if orteInZweiterRegion.length > 0}
					<select bind:value={ausgewaehlterZweiterOrtName}>
						<option value="">-- Ort waehlen --</option>
						{#each orteInZweiterRegion as ort}
							<option value={ort.name}>{ort.name}</option>
						{/each}
					</select>
				{:else}
					<p class="no-orte-hint">Keine gespeicherten Orte in dieser Region.</p>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Actions -->
	<div class="wizard-actions">
		<button class="btn btn-secondary" onclick={onCancel}>Abbrechen</button>
		<button class="btn btn-primary" onclick={handleStart} disabled={!kannStarten}>
			Bildband starten
		</button>
	</div>
</div>

{#if showDetailModal && selectedCharakter}
	<CharakterDetailModal
		charakter={selectedCharakter}
		onClose={closeDetailModal}
		onUpdate={handleCharakterUpdate}
	/>
{/if}

<style>
	.wizard {
		max-width: 700px;
		margin: 0 auto;
	}

	.wizard h2 {
		text-align: center;
		margin-bottom: var(--space-xl);
		color: var(--color-leaf-dark);
	}

	.wizard-section {
		background: var(--color-parchment);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
		border: 1px solid var(--color-earth-light);
	}

	.wizard-section h3 {
		margin-top: 0;
		margin-bottom: var(--space-sm);
		color: var(--color-earth-dark);
	}

	.section-hint {
		font-size: 0.9rem;
		color: var(--color-earth);
		margin-bottom: var(--space-md);
	}

	/* Character Grid */
	.character-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.character-card-wrapper {
		display: flex;
		flex-direction: column;
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		overflow: hidden;
		transition: all 0.2s;
	}

	.character-card-wrapper:hover {
		border-color: var(--color-leaf);
	}

	.character-card-wrapper.selected {
		border-color: var(--color-leaf-dark);
	}

	.character-card-wrapper .character-card {
		border: none;
		border-radius: 0;
	}

	.character-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-md);
		background: var(--color-cream);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.character-card:hover {
		border-color: var(--color-leaf);
		background: var(--color-cream);
	}

	.character-card.selected {
		border-color: var(--color-leaf-dark);
		background: rgba(107, 142, 78, 0.15);
	}

	.character-card.add-card {
		border-style: dashed;
		color: var(--color-earth);
	}

	.character-card.add-card:hover {
		color: var(--color-leaf-dark);
		border-color: var(--color-leaf);
	}

	.char-avatar {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		overflow: hidden;
		margin-bottom: var(--space-sm);
		border: 2px solid var(--color-earth-light);
	}

	.avatar-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.detail-btn {
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-earth-light);
		border: none;
		border-top: 1px solid var(--color-earth-light);
		color: var(--color-earth-dark);
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.detail-btn:hover {
		background: var(--color-leaf);
		color: white;
	}

	.hero-badge {
		background: var(--color-sunset);
		color: white;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: bold;
		margin-bottom: var(--space-xs);
	}

	.char-name {
		font-weight: 600;
		color: var(--color-earth-dark);
	}

	.char-info {
		font-size: 0.85rem;
		color: var(--color-earth);
	}

	.add-icon {
		font-size: 1.5rem;
		margin-bottom: var(--space-xs);
	}

	.selection-info {
		margin-top: var(--space-md);
		font-size: 0.9rem;
		color: var(--color-leaf-dark);
		font-weight: 500;
	}

	/* Radio Groups */
	.radio-group {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
		margin-bottom: var(--space-md);
	}

	.radio-group label {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-cream);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s;
	}

	.radio-group label:hover {
		border-color: var(--color-leaf);
	}

	.radio-group label.active {
		border-color: var(--color-leaf-dark);
		background: rgba(107, 142, 78, 0.15);
	}

	.radio-group input[type='radio'] {
		accent-color: var(--color-leaf-dark);
	}

	/* Select Groups */
	.select-group {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.select-group select {
		padding: var(--space-sm) var(--space-md);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		background: var(--color-cream);
		font-size: 1rem;
		min-width: 200px;
	}

	.select-group select:focus {
		outline: none;
		border-color: var(--color-leaf);
	}

	.no-orte-hint {
		font-size: 0.85rem;
		color: var(--color-earth);
		font-style: italic;
		margin: 0;
		align-self: center;
	}

	/* Actions */
	.wizard-actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-md);
		padding-top: var(--space-md);
	}

	.wizard-actions .btn {
		min-width: 140px;
	}

	.wizard-actions .btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
