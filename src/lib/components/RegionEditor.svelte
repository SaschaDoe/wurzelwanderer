<script lang="ts">
	import {
		type GespeicherteRegion,
		type Besonderheit,
		geographischeBesonderheiten,
		faunaFloraBesonderheiten,
		architekturBesonderheiten,
		generiereRegionsname,
		getRandomElements,
		getRandomElement
	} from '$lib/data/regionen';

	interface Props {
		region?: GespeicherteRegion;
		onSave: (region: GespeicherteRegion) => void;
		onCancel: () => void;
	}

	let { region, onSave, onCancel }: Props = $props();

	// Form state
	let name = $state(region?.name || generiereRegionsname());
	let anzahlGeo = $state(region?.geographisch.length || 2);
	let anzahlFlora = $state(region?.faunaFlora.length || 1);
	let hatArchitektur = $state(!!region?.architektur);

	// Selection mode: 'random' or 'manual'
	let geoMode = $state<'random' | 'manual'>('random');
	let floraMode = $state<'random' | 'manual'>('random');
	let archMode = $state<'random' | 'manual'>('random');

	// Selected items
	let selectedGeo = $state<Besonderheit[]>(
		region?.geographisch || getRandomElements(geographischeBesonderheiten, anzahlGeo)
	);
	let selectedFlora = $state<Besonderheit[]>(
		region?.faunaFlora || getRandomElements(faunaFloraBesonderheiten, anzahlFlora)
	);
	let selectedArch = $state<Besonderheit | undefined>(
		region?.architektur || (hatArchitektur ? getRandomElement(architekturBesonderheiten) : undefined)
	);

	// Generate new random name
	function rollName() {
		name = generiereRegionsname();
	}

	// Re-roll random selections
	function rollGeo() {
		selectedGeo = getRandomElements(geographischeBesonderheiten, anzahlGeo);
	}

	function rollFlora() {
		selectedFlora = getRandomElements(faunaFloraBesonderheiten, anzahlFlora);
	}

	function rollArch() {
		selectedArch = getRandomElement(architekturBesonderheiten);
	}

	// Handle slider changes
	function handleGeoCountChange() {
		if (geoMode === 'random') {
			rollGeo();
		} else {
			// Adjust selection to match new count
			if (selectedGeo.length > anzahlGeo) {
				selectedGeo = selectedGeo.slice(0, anzahlGeo);
			}
		}
	}

	function handleFloraCountChange() {
		if (floraMode === 'random') {
			rollFlora();
		} else {
			if (selectedFlora.length > anzahlFlora) {
				selectedFlora = selectedFlora.slice(0, anzahlFlora);
			}
		}
	}

	function handleArchToggle() {
		if (hatArchitektur && !selectedArch) {
			selectedArch = getRandomElement(architekturBesonderheiten);
		} else if (!hatArchitektur) {
			selectedArch = undefined;
		}
	}

	// Manual selection handlers
	function toggleGeoSelection(item: Besonderheit) {
		const index = selectedGeo.findIndex(g => g.name === item.name);
		if (index >= 0) {
			selectedGeo = selectedGeo.filter(g => g.name !== item.name);
		} else if (selectedGeo.length < anzahlGeo) {
			selectedGeo = [...selectedGeo, item];
		}
	}

	function toggleFloraSelection(item: Besonderheit) {
		const index = selectedFlora.findIndex(f => f.name === item.name);
		if (index >= 0) {
			selectedFlora = selectedFlora.filter(f => f.name !== item.name);
		} else if (selectedFlora.length < anzahlFlora) {
			selectedFlora = [...selectedFlora, item];
		}
	}

	function selectArch(item: Besonderheit) {
		selectedArch = item;
	}

	// Save handler
	function handleSave() {
		const newRegion: GespeicherteRegion = {
			id: region?.id || crypto.randomUUID(),
			name: name.trim() || generiereRegionsname(),
			geographisch: selectedGeo,
			faunaFlora: selectedFlora,
			architektur: hatArchitektur ? selectedArch : undefined,
			erstelltAm: region?.erstelltAm || new Date().toISOString()
		};
		onSave(newRegion);
	}

	// Check if form is valid
	let isValid = $derived(
		name.trim().length > 0 &&
		selectedGeo.length >= 1 &&
		selectedGeo.length <= 3 &&
		selectedFlora.length >= 1 &&
		selectedFlora.length <= 2 &&
		(!hatArchitektur || selectedArch !== undefined)
	);
</script>

<div class="modal-backdrop" onclick={onCancel} role="presentation">
	<div class="modal-content" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
		<header class="modal-header">
			<h2>{region ? 'Region bearbeiten' : 'Neue Region erstellen'}</h2>
			<button class="close-btn" onclick={onCancel} type="button">×</button>
		</header>

		<div class="modal-body">
			<!-- Name Section -->
			<section class="form-section">
				<label class="section-label">Regionsname</label>
				<div class="name-input-row">
					<input
						type="text"
						bind:value={name}
						placeholder="Name der Region"
						class="name-input"
					/>
					<button class="roll-btn" onclick={rollName} type="button" title="Zufälliger Name">
						🎲
					</button>
				</div>
			</section>

			<!-- Geographische Besonderheiten -->
			<section class="form-section">
				<div class="section-header">
					<label class="section-label">
						Geographische Besonderheiten
						<span class="count-badge">{selectedGeo.length}/{anzahlGeo}</span>
					</label>
					<div class="mode-toggle">
						<button
							class:active={geoMode === 'random'}
							onclick={() => { geoMode = 'random'; rollGeo(); }}
							type="button"
						>Zufällig</button>
						<button
							class:active={geoMode === 'manual'}
							onclick={() => geoMode = 'manual'}
							type="button"
						>Manuell</button>
					</div>
				</div>

				<div class="slider-row">
					<span>Anzahl:</span>
					<input
						type="range"
						min="1"
						max="3"
						bind:value={anzahlGeo}
						onchange={handleGeoCountChange}
					/>
					<span class="slider-value">{anzahlGeo}</span>
				</div>

				{#if geoMode === 'random'}
					<div class="selected-items">
						{#each selectedGeo as item}
							<div class="selected-item">
								<strong>{item.name}</strong>
								<span class="item-desc">{item.beschreibung}</span>
							</div>
						{/each}
						<button class="roll-btn-inline" onclick={rollGeo} type="button">🎲 Neu würfeln</button>
					</div>
				{:else}
					<div class="selection-grid">
						{#each geographischeBesonderheiten as item}
							<button
								class="selection-item"
								class:selected={selectedGeo.some(g => g.name === item.name)}
								class:disabled={selectedGeo.length >= anzahlGeo && !selectedGeo.some(g => g.name === item.name)}
								onclick={() => toggleGeoSelection(item)}
								type="button"
								title={item.beschreibung}
							>
								{item.name}
							</button>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Fauna & Flora Besonderheiten -->
			<section class="form-section">
				<div class="section-header">
					<label class="section-label">
						Fauna & Flora Besonderheiten
						<span class="count-badge">{selectedFlora.length}/{anzahlFlora}</span>
					</label>
					<div class="mode-toggle">
						<button
							class:active={floraMode === 'random'}
							onclick={() => { floraMode = 'random'; rollFlora(); }}
							type="button"
						>Zufällig</button>
						<button
							class:active={floraMode === 'manual'}
							onclick={() => floraMode = 'manual'}
							type="button"
						>Manuell</button>
					</div>
				</div>

				<div class="slider-row">
					<span>Anzahl:</span>
					<input
						type="range"
						min="1"
						max="2"
						bind:value={anzahlFlora}
						onchange={handleFloraCountChange}
					/>
					<span class="slider-value">{anzahlFlora}</span>
				</div>

				{#if floraMode === 'random'}
					<div class="selected-items">
						{#each selectedFlora as item}
							<div class="selected-item">
								<strong>{item.name}</strong>
								<span class="item-desc">{item.beschreibung}</span>
							</div>
						{/each}
						<button class="roll-btn-inline" onclick={rollFlora} type="button">🎲 Neu würfeln</button>
					</div>
				{:else}
					<div class="selection-grid">
						{#each faunaFloraBesonderheiten as item}
							<button
								class="selection-item"
								class:selected={selectedFlora.some(f => f.name === item.name)}
								class:disabled={selectedFlora.length >= anzahlFlora && !selectedFlora.some(f => f.name === item.name)}
								onclick={() => toggleFloraSelection(item)}
								type="button"
								title={item.beschreibung}
							>
								{item.name}
							</button>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Architektur Besonderheit -->
			<section class="form-section">
				<div class="section-header">
					<label class="section-label checkbox-label">
						<input
							type="checkbox"
							bind:checked={hatArchitektur}
							onchange={handleArchToggle}
						/>
						Architektur Besonderheit
						{#if hatArchitektur}
							<span class="count-badge">1/1</span>
						{/if}
					</label>
					{#if hatArchitektur}
						<div class="mode-toggle">
							<button
								class:active={archMode === 'random'}
								onclick={() => { archMode = 'random'; rollArch(); }}
								type="button"
							>Zufällig</button>
							<button
								class:active={archMode === 'manual'}
								onclick={() => archMode = 'manual'}
								type="button"
							>Manuell</button>
						</div>
					{/if}
				</div>

				{#if hatArchitektur}
					{#if archMode === 'random'}
						<div class="selected-items">
							{#if selectedArch}
								<div class="selected-item">
									<strong>{selectedArch.name}</strong>
									<span class="item-desc">{selectedArch.beschreibung}</span>
								</div>
							{/if}
							<button class="roll-btn-inline" onclick={rollArch} type="button">🎲 Neu würfeln</button>
						</div>
					{:else}
						<div class="selection-grid">
							{#each architekturBesonderheiten as item}
								<button
									class="selection-item"
									class:selected={selectedArch?.name === item.name}
									onclick={() => selectArch(item)}
									type="button"
									title={item.beschreibung}
								>
									{item.name}
								</button>
							{/each}
						</div>
					{/if}
				{/if}
			</section>
		</div>

		<footer class="modal-footer">
			<button class="btn-secondary" onclick={onCancel} type="button">Abbrechen</button>
			<button class="btn-primary" onclick={handleSave} disabled={!isValid} type="button">
				{region ? 'Speichern' : 'Region erstellen'}
			</button>
		</footer>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--space-md);
		z-index: 1000;
	}

	.modal-content {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-lg);
		border-bottom: 2px solid var(--color-earth-light);
		background: var(--color-cream);
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.3rem;
	}

	.close-btn {
		width: 32px;
		height: 32px;
		border: none;
		border-radius: 50%;
		background: transparent;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-earth);
	}

	.close-btn:hover {
		background: var(--color-earth-light);
	}

	.modal-body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-lg);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-md);
		padding: var(--space-lg);
		border-top: 2px solid var(--color-earth-light);
		background: var(--color-cream);
	}

	.form-section {
		margin-bottom: var(--space-xl);
	}

	.section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-sm);
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.section-label {
		font-weight: 600;
		color: var(--color-bark);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.checkbox-label {
		cursor: pointer;
	}

	.checkbox-label input[type="checkbox"] {
		width: 18px;
		height: 18px;
		cursor: pointer;
	}

	.count-badge {
		font-size: 0.8rem;
		background: var(--color-leaf-dark);
		color: var(--color-cream);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-weight: normal;
	}

	.name-input-row {
		display: flex;
		gap: var(--space-sm);
	}

	.name-input {
		flex: 1;
		padding: var(--space-sm) var(--space-md);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		font-size: 1rem;
		font-family: var(--font-display);
		background: var(--color-cream);
	}

	.name-input:focus {
		outline: none;
		border-color: var(--color-leaf-dark);
	}

	.roll-btn {
		padding: var(--space-sm) var(--space-md);
		background: var(--color-earth-light);
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-size: 1.2rem;
		transition: all 0.2s ease;
	}

	.roll-btn:hover {
		background: var(--color-earth);
		transform: rotate(20deg);
	}

	.mode-toggle {
		display: flex;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-earth-light);
	}

	.mode-toggle button {
		padding: var(--space-xs) var(--space-sm);
		border: none;
		background: var(--color-cream);
		cursor: pointer;
		font-size: 0.85rem;
		transition: all 0.2s ease;
	}

	.mode-toggle button:first-child {
		border-right: 1px solid var(--color-earth-light);
	}

	.mode-toggle button.active {
		background: var(--color-leaf-dark);
		color: var(--color-cream);
	}

	.slider-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.slider-row input[type="range"] {
		flex: 1;
		accent-color: var(--color-leaf-dark);
	}

	.slider-value {
		font-weight: 600;
		min-width: 24px;
		text-align: center;
	}

	.selected-items {
		background: var(--color-cream);
		border-radius: var(--radius-md);
		padding: var(--space-md);
	}

	.selected-item {
		padding: var(--space-sm) 0;
		border-bottom: 1px solid var(--color-earth-light);
	}

	.selected-item:last-of-type {
		border-bottom: none;
	}

	.selected-item strong {
		display: block;
		color: var(--color-bark);
	}

	.item-desc {
		font-size: 0.85rem;
		color: var(--color-earth);
		font-style: italic;
	}

	.roll-btn-inline {
		margin-top: var(--space-md);
		padding: var(--space-xs) var(--space-md);
		background: var(--color-earth-light);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 0.9rem;
		transition: all 0.2s ease;
	}

	.roll-btn-inline:hover {
		background: var(--color-earth);
		color: var(--color-cream);
	}

	.selection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--space-xs);
		max-height: 200px;
		overflow-y: auto;
		padding: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-md);
	}

	.selection-item {
		padding: var(--space-sm);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-sm);
		background: var(--color-parchment);
		cursor: pointer;
		font-size: 0.85rem;
		text-align: left;
		transition: all 0.2s ease;
	}

	.selection-item:hover:not(.disabled) {
		border-color: var(--color-leaf);
		background: rgba(107, 142, 78, 0.1);
	}

	.selection-item.selected {
		border-color: var(--color-leaf-dark);
		background: rgba(107, 142, 78, 0.2);
	}

	.selection-item.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.btn-primary, .btn-secondary {
		padding: var(--space-sm) var(--space-lg);
		border-radius: var(--radius-md);
		font-size: 1rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: var(--color-leaf-dark);
		color: var(--color-cream);
		border: none;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--color-leaf);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: transparent;
		border: 2px solid var(--color-earth-light);
		color: var(--color-bark);
	}

	.btn-secondary:hover {
		background: var(--color-earth-light);
	}

	@media (max-width: 500px) {
		.modal-content {
			max-height: 100vh;
			border-radius: 0;
		}

		.section-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.selection-grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		}
	}
</style>
