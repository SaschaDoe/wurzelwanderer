<script lang="ts">
	import type { HexPosition } from '$lib/data/hexmap';
	import type { GespeicherterOrt } from '$lib/data/ort';
	import type { RegionInfo } from '$lib/services/geminiService';
	import { generiereNeuenOrt, getAlleKategorien, getDefaultKategorien } from '$lib/services/ortGenerator';
	import { kategorien } from '$lib/data/naturelle';
	import OrtAnsicht from './OrtAnsicht.svelte';

	interface Props {
		regionId: string;
		regionInfo?: RegionInfo;
		position?: HexPosition;
		onClose: () => void;
		onSave: (ort: GespeicherterOrt) => void;
	}

	let { regionId, regionInfo, position, onClose, onSave }: Props = $props();

	// Generator settings
	let erlaubeMagisch = $state(true);
	let erlaubeTrauma = $state(true);
	let anzahlNaturelle = $state(3);
	let anzahlBekannte = $state(2);
	let aktiveKategorien = $state<string[]>(getDefaultKategorien());
	let showSettings = $state(false);

	// Generated ort
	let generierterOrt = $state<GespeicherterOrt | null>(null);

	// Generate on mount
	$effect(() => {
		if (!generierterOrt) {
			generiereNeu();
		}
	});

	function generiereNeu() {
		try {
			generierterOrt = generiereNeuenOrt({
				regionId,
				erlaubeMagisch,
				erlaubeTrauma,
				anzahlNaturelle,
				anzahlBekannte,
				aktiveKategorien
			});
		} catch (error) {
			console.error('Fehler beim Generieren:', error);
		}
	}

	function toggleKategorie(name: string) {
		if (aktiveKategorien.includes(name)) {
			if (aktiveKategorien.length > 1) {
				aktiveKategorien = aktiveKategorien.filter(k => k !== name);
			}
		} else {
			aktiveKategorien = [...aktiveKategorien, name];
		}
	}

	function handleSave() {
		if (generierterOrt) {
			onSave(generierterOrt);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleOrtUpdate(updatedOrt: GespeicherterOrt) {
		generierterOrt = updatedOrt;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal-content">
		<button class="close-button" onclick={onClose} aria-label="Schliessen">
			&times;
		</button>

		<div class="modal-header">
			<h2>Neuen Ort erstellen</h2>
			{#if position}
				<p class="position-info">Hex-Position: ({position.q}, {position.r})</p>
			{/if}
		</div>

		<div class="modal-body">
			{#if generierterOrt}
				<!-- Vollständige OrtAnsicht -->
				<OrtAnsicht
					bind:ort={generierterOrt}
					{regionInfo}
					onUpdate={handleOrtUpdate}
					showBildBereich={true}
					showBeschreibung={true}
					showNaturelle={true}
					showBekannte={true}
					showGottheiten={true}
					showDetails={true}
					showGeschichte={true}
					showSpielleiter={true}
					editable={true}
					compact={false}
					{erlaubeMagisch}
					{erlaubeTrauma}
				/>

				<!-- Settings Toggle -->
				<button class="settings-toggle" onclick={() => showSettings = !showSettings}>
					{showSettings ? 'Generator-Einstellungen ausblenden' : 'Generator-Einstellungen anzeigen'}
					<span class="toggle-icon">{showSettings ? '▲' : '▼'}</span>
				</button>

				{#if showSettings}
					<div class="settings-panel">
						<!-- Kategorien -->
						<div class="setting-group">
							<label>Kategorien</label>
							<div class="kategorie-buttons">
								{#each kategorien as kat}
									<button
										class="kategorie-btn"
										class:active={aktiveKategorien.includes(kat.name)}
										style="--kat-color: {kat.farbe}"
										onclick={() => toggleKategorie(kat.name)}
									>
										{kat.name}
									</button>
								{/each}
							</div>
						</div>

						<!-- Anzahl Naturelle -->
						<div class="setting-group">
							<label for="anzahl-naturelle">Anzahl Naturelle: {anzahlNaturelle}</label>
							<input
								id="anzahl-naturelle"
								type="range"
								min="1"
								max="5"
								bind:value={anzahlNaturelle}
							/>
						</div>

						<!-- Anzahl Bekannte -->
						<div class="setting-group">
							<label for="anzahl-bekannte">Anzahl Bekannte: {anzahlBekannte}</label>
							<input
								id="anzahl-bekannte"
								type="range"
								min="0"
								max="5"
								bind:value={anzahlBekannte}
							/>
						</div>

						<!-- Toggles -->
						<div class="setting-group toggles">
							<label class="toggle-label">
								<input type="checkbox" bind:checked={erlaubeMagisch} />
								Magische Elemente
							</label>
							<label class="toggle-label">
								<input type="checkbox" bind:checked={erlaubeTrauma} />
								Trauma-Elemente
							</label>
						</div>
					</div>
				{/if}
			{:else}
				<div class="loading">
					<p>Generiere Ort...</p>
				</div>
			{/if}
		</div>

		<div class="modal-footer">
			<button class="btn btn-secondary" onclick={generiereNeu}>
				Neu würfeln
			</button>
			<button class="btn btn-primary" onclick={handleSave} disabled={!generierterOrt}>
				Ort erstellen
			</button>
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
		overflow-y: auto;
	}

	.modal-content {
		background: var(--color-cream);
		border-radius: var(--radius-lg);
		max-width: 900px;
		width: 100%;
		max-height: none;
		overflow: visible;
		display: flex;
		flex-direction: column;
		position: relative;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
		margin: var(--space-lg) 0;
	}

	.close-button {
		position: sticky;
		top: var(--space-sm);
		float: right;
		margin-right: var(--space-sm);
		background: var(--color-cream);
		border: 2px solid var(--color-earth-light);
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-bark);
		opacity: 0.8;
		transition: opacity 0.2s;
		width: 36px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		z-index: 10;
	}

	.close-button:hover {
		opacity: 1;
		background: var(--color-earth-light);
	}

	.modal-header {
		padding: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 1px solid var(--color-earth-light);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--color-bark);
	}

	.position-info {
		font-size: 0.75rem;
		color: var(--color-bark);
		opacity: 0.5;
		margin-top: var(--space-xs);
	}

	.modal-body {
		padding: var(--space-md);
		overflow-y: auto;
		flex: 1;
	}

	/* Settings Toggle */
	.settings-toggle {
		width: 100%;
		padding: var(--space-sm);
		margin-top: var(--space-lg);
		background: var(--color-earth-light);
		border: none;
		border-radius: var(--radius-md);
		color: var(--color-bark);
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.settings-toggle:hover {
		background: var(--color-earth);
		color: white;
	}

	.toggle-icon {
		font-size: 0.625rem;
	}

	/* Settings Panel */
	.settings-panel {
		margin-top: var(--space-md);
		padding: var(--space-md);
		background: var(--color-earth-light);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.setting-group label {
		display: block;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-bark);
		margin-bottom: var(--space-xs);
	}

	.kategorie-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.kategorie-btn {
		--kat-color: var(--color-earth);
		padding: 4px 10px;
		border: 2px solid var(--kat-color);
		border-radius: var(--radius-sm);
		background: white;
		color: var(--color-bark);
		cursor: pointer;
		font-size: 0.75rem;
		transition: all 0.2s;
	}

	.kategorie-btn.active {
		background: var(--kat-color);
		color: white;
	}

	.kategorie-btn:hover:not(.active) {
		background: var(--color-earth-light);
	}

	input[type="range"] {
		width: 100%;
	}

	.toggles {
		display: flex;
		gap: var(--space-md);
		flex-wrap: wrap;
	}

	.toggle-label {
		display: flex !important;
		align-items: center;
		gap: var(--space-xs);
		font-size: 0.875rem !important;
		text-transform: none !important;
		letter-spacing: normal !important;
		cursor: pointer;
	}

	.toggle-label input[type="checkbox"] {
		width: 16px;
		height: 16px;
	}

	/* Footer */
	.modal-footer {
		padding: var(--space-md) var(--space-lg);
		border-top: 1px solid var(--color-earth-light);
		display: flex;
		gap: var(--space-sm);
		justify-content: flex-end;
		position: sticky;
		bottom: 0;
		background: var(--color-cream);
	}

	.btn {
		padding: var(--space-sm) var(--space-md);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 0.9375rem;
		transition: background-color 0.2s, opacity 0.2s;
	}

	.btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-primary {
		background: var(--color-leaf);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-leaf-dark, #3a7a3a);
	}

	.btn-secondary {
		background: var(--color-earth-light);
		color: var(--color-bark);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--color-earth);
		color: white;
	}

	.loading {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-bark);
		opacity: 0.6;
	}
</style>
