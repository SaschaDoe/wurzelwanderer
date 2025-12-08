<script lang="ts">
	import type { HexPosition } from '$lib/data/hexmap';
	import type { GespeicherterOrt } from '$lib/data/ort';

	interface Props {
		position: HexPosition;
		verfuegbareOrte: GespeicherterOrt[];
		onClose: () => void;
		onAssignOrt: (ort: GespeicherterOrt) => void;
		onCreateNewOrt: () => void;
	}

	let {
		position,
		verfuegbareOrte,
		onClose,
		onAssignOrt,
		onCreateNewOrt
	}: Props = $props();

	let searchQuery = $state('');

	let filteredOrte = $derived(
		searchQuery.trim()
			? verfuegbareOrte.filter(o =>
				o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				o.naturelle.some(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()))
			)
			: verfuegbareOrte
	);

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
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={handleBackdropClick}>
	<div class="modal-content">
		<button class="close-button" onclick={onClose} aria-label="Schließen">
			&times;
		</button>

		<div class="modal-header">
			<h2>Hex-Feld belegen</h2>
			<p class="position-info">Position: ({position.q}, {position.r})</p>
		</div>

		<div class="modal-body">
			<!-- Create new option -->
			<button class="create-new-btn" onclick={onCreateNewOrt}>
				<span class="create-icon">+</span>
				<span class="create-text">
					<strong>Neuen Ort erstellen</strong>
					<small>Generiere einen neuen Ort für dieses Hex-Feld</small>
				</span>
			</button>

			{#if verfuegbareOrte.length > 0}
				<div class="divider">
					<span>oder bestehenden Ort zuweisen</span>
				</div>

				<!-- Search -->
				<input
					type="text"
					class="search-input"
					placeholder="Orte durchsuchen..."
					bind:value={searchQuery}
				/>

				<!-- Available orte list -->
				<div class="orte-list">
					{#each filteredOrte as ort}
						<button class="ort-item" onclick={() => onAssignOrt(ort)}>
							<div class="ort-info">
								<span class="ort-name">{ort.name}</span>
								<span class="ort-naturelle">
									{ort.naturelle.map(n => n.name).slice(0, 3).join(', ')}
								</span>
							</div>
							{#if ort.bilder && ort.bilder.length > 0}
								<img src={ort.bilder[0]} alt={ort.name} class="ort-thumbnail" />
							{/if}
						</button>
					{:else}
						<p class="no-results">Keine passenden Orte gefunden</p>
					{/each}
				</div>
			{:else}
				<div class="no-orte-info">
					<p>Keine unzugewiesenen Orte vorhanden.</p>
					<p class="hint">Erstelle einen neuen Ort oder füge Orte auf der Naturelle-Seite hinzu.</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-md);
	}

	.modal-content {
		background: var(--color-cream);
		border-radius: var(--radius-lg);
		max-width: 480px;
		width: 100%;
		max-height: 80vh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		position: relative;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
	}

	.close-button {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--color-bark);
		opacity: 0.6;
		transition: opacity 0.2s;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	.close-button:hover {
		opacity: 1;
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
		padding: var(--space-lg);
		overflow-y: auto;
		flex: 1;
	}

	.create-new-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-leaf);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		transition: background-color 0.2s;
	}

	.create-new-btn:hover {
		background: var(--color-leaf-dark, #3a7a3a);
	}

	.create-icon {
		font-size: 1.5rem;
		font-weight: bold;
		width: 40px;
		height: 40px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.create-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.create-text strong {
		font-size: 1rem;
	}

	.create-text small {
		font-size: 0.75rem;
		opacity: 0.8;
	}

	.divider {
		display: flex;
		align-items: center;
		margin: var(--space-lg) 0;
		color: var(--color-bark);
		opacity: 0.5;
		font-size: 0.75rem;
	}

	.divider::before,
	.divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-earth-light);
	}

	.divider span {
		padding: 0 var(--space-md);
	}

	.search-input {
		width: 100%;
		padding: var(--space-sm) var(--space-md);
		border: 1px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		margin-bottom: var(--space-md);
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-leaf);
	}

	.orte-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
		max-height: 250px;
		overflow-y: auto;
	}

	.ort-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: white;
		border: 1px solid var(--color-earth-light);
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		transition: border-color 0.2s, background-color 0.2s;
	}

	.ort-item:hover {
		border-color: var(--color-leaf);
		background: var(--color-earth-light);
	}

	.ort-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}

	.ort-name {
		font-weight: 600;
		color: var(--color-bark);
	}

	.ort-naturelle {
		font-size: 0.75rem;
		color: var(--color-bark);
		opacity: 0.6;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ort-thumbnail {
		width: 48px;
		height: 48px;
		object-fit: cover;
		border-radius: var(--radius-sm);
		flex-shrink: 0;
	}

	.no-results {
		text-align: center;
		color: var(--color-bark);
		opacity: 0.5;
		padding: var(--space-md);
	}

	.no-orte-info {
		text-align: center;
		padding: var(--space-lg);
		color: var(--color-bark);
	}

	.no-orte-info p {
		margin: var(--space-xs) 0;
	}

	.hint {
		font-size: 0.875rem;
		opacity: 0.6;
	}
</style>
