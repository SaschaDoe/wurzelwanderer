<script lang="ts">
	import type { GespeicherterBildband } from '$lib/data/bildband';

	interface Props {
		bildbaende: GespeicherterBildband[];
		onSelect: (bildband: GespeicherterBildband) => void;
		onDelete?: (bildband: GespeicherterBildband) => void;
		onResume?: (bildband: GespeicherterBildband) => void;
	}

	let { bildbaende, onSelect, onDelete, onResume }: Props = $props();

	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function handleDelete(event: MouseEvent, bildband: GespeicherterBildband) {
		event.stopPropagation();
		if (onDelete) {
			onDelete(bildband);
		}
	}

	function handleResume(event: MouseEvent, bildband: GespeicherterBildband) {
		event.stopPropagation();
		if (onResume) {
			onResume(bildband);
		}
	}

	function handleCardKeydown(event: KeyboardEvent, bildband: GespeicherterBildband) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onSelect(bildband);
		}
	}

	function getProgressText(bildband: GespeicherterBildband): string {
		const scenes = bildband.szenen.length;
		if (scenes === 0) return 'Noch nicht begonnen';
		return `${scenes}/10 Szenen`;
	}
</script>

<div class="galerie">
	{#if bildbaende.length === 0}
		<div class="empty-state">
			<p>Noch keine Bildbaende erstellt.</p>
			<p class="hint">Erstelle deinen ersten Bildband!</p>
		</div>
	{:else}
		<div class="galerie-grid">
			{#each bildbaende as bildband}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<article
					class="bildband-card"
					class:incomplete={bildband.status === 'in_progress'}
					onclick={() => bildband.status === 'completed' ? onSelect(bildband) : null}
					onkeydown={(e) => bildband.status === 'completed' ? handleCardKeydown(e, bildband) : null}
					tabindex="0"
					role="button"
				>
					{#if bildband.status === 'in_progress'}
						<div class="status-badge">Unvollstaendig</div>
					{/if}
					<div class="cover-image">
						{#if bildband.coverBild}
							<img src={bildband.coverBild} alt={bildband.titel} />
						{:else}
							<div class="no-cover">
								<span>{bildband.status === 'in_progress' ? getProgressText(bildband) : 'Kein Bild'}</span>
							</div>
						{/if}
					</div>
					<div class="card-content">
						<h3 class="bildband-titel">{bildband.titel}</h3>
						{#if bildband.status === 'completed'}
							<p class="bildband-beschreibung">{bildband.beschreibung}</p>
						{:else}
							<p class="bildband-beschreibung progress-info">
								{getProgressText(bildband)}
							</p>
						{/if}
						<div class="card-meta">
							<span class="charaktere-count">
								{bildband.charaktere.length} Charakter{bildband.charaktere.length !== 1 ? 'e' : ''}
							</span>
							<span class="datum">{formatDate(bildband.letzteAktualisierung || bildband.erstelltAm)}</span>
						</div>
						{#if bildband.status === 'in_progress' && onResume}
							<button
								class="resume-btn"
								onclick={(e) => handleResume(e, bildband)}
							>
								Fortsetzen
							</button>
						{/if}
					</div>
					{#if onDelete}
						<button
							class="delete-btn"
							onclick={(e) => handleDelete(e, bildband)}
							title="Loeschen"
						>
							&#10005;
						</button>
					{/if}
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.galerie {
		width: 100%;
	}

	.empty-state {
		text-align: center;
		padding: var(--space-xl);
		color: var(--color-earth);
	}

	.empty-state .hint {
		font-size: 0.9rem;
		margin-top: var(--space-sm);
	}

	.galerie-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: var(--space-lg);
	}

	.bildband-card {
		position: relative;
		background: var(--color-parchment);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-lg);
		overflow: hidden;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
		padding: 0;
	}

	.bildband-card:hover {
		border-color: var(--color-leaf);
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
	}

	.bildband-card.incomplete {
		border-color: var(--color-sunset);
		cursor: default;
	}

	.bildband-card.incomplete:hover {
		border-color: var(--color-sunset);
		transform: none;
		box-shadow: none;
	}

	.status-badge {
		position: absolute;
		top: var(--space-sm);
		left: var(--space-sm);
		background: var(--color-sunset);
		color: white;
		padding: 2px 8px;
		border-radius: var(--radius-sm);
		font-size: 0.75rem;
		font-weight: bold;
		z-index: 1;
	}

	.cover-image {
		aspect-ratio: 16 / 10;
		overflow: hidden;
		background: var(--color-cream);
	}

	.cover-image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.no-cover {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-earth);
		font-style: italic;
	}

	.card-content {
		padding: var(--space-md);
	}

	.bildband-titel {
		margin: 0 0 var(--space-xs);
		font-size: 1.1rem;
		color: var(--color-earth-dark);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.bildband-beschreibung {
		margin: 0 0 var(--space-sm);
		font-size: 0.9rem;
		color: var(--color-earth);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.card-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.8rem;
		color: var(--color-earth);
	}

	.delete-btn {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 1.75rem;
		height: 1.75rem;
		border-radius: 50%;
		background: rgba(220, 53, 69, 0.9);
		color: white;
		border: none;
		font-size: 0.9rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s;
	}

	.bildband-card:hover .delete-btn {
		opacity: 1;
	}

	.delete-btn:hover {
		background: #c82333;
	}

	.progress-info {
		color: var(--color-sunset);
		font-weight: 500;
	}

	.resume-btn {
		width: 100%;
		margin-top: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-leaf);
		color: white;
		border: none;
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.resume-btn:hover {
		background: var(--color-leaf-dark);
	}
</style>
