<script lang="ts">
	import type { GespeicherteRegion } from '$lib/data/regionen';

	interface Props {
		region: GespeicherteRegion;
		orteCount: number;
		isActive?: boolean;
		onSelect?: () => void;
		onEdit?: () => void;
		onDelete?: () => void;
	}

	let { region, orteCount, isActive = false, onSelect, onEdit, onDelete }: Props = $props();

	const canDelete = !region.istHeimat;
</script>

<div
	class="region-card"
	class:active={isActive}
	class:heimat={region.istHeimat}
>
	<button class="card-main" onclick={onSelect} type="button">
		<div class="region-info">
			<h3 class="region-name">
				{region.name}
				{#if region.istHeimat}
					<span class="heimat-badge">Standard</span>
				{/if}
			</h3>

			<div class="besonderheiten-icons">
				{#if region.geographisch.length > 0}
					<span class="icon-badge geo" title={region.geographisch.map(b => b.name).join(', ')}>
						<span class="icon">🏔️</span>
						<span class="count">{region.geographisch.length}</span>
					</span>
				{/if}

				{#if region.faunaFlora.length > 0}
					<span class="icon-badge flora" title={region.faunaFlora.map(b => b.name).join(', ')}>
						<span class="icon">🌿</span>
						<span class="count">{region.faunaFlora.length}</span>
					</span>
				{/if}

				{#if region.architektur}
					<span class="icon-badge arch" title={region.architektur.name}>
						<span class="icon">🏛️</span>
					</span>
				{/if}

				{#if region.istHeimat}
					<span class="icon-badge vanilla" title="Keine Besonderheiten">
						<span class="icon">🌾</span>
					</span>
				{/if}
			</div>
		</div>

		<div class="orte-count">
			<span class="count-number">{orteCount}</span>
			<span class="count-label">{orteCount === 1 ? 'Ort' : 'Orte'}</span>
		</div>
	</button>

	<div class="card-actions">
		{#if onEdit}
			<button
				class="action-btn edit"
				onclick={onEdit}
				title="Region bearbeiten"
				disabled={region.istHeimat}
			>
				✏️
			</button>
		{/if}
		{#if onDelete}
			<button
				class="action-btn delete"
				onclick={onDelete}
				title={canDelete ? 'Region löschen' : 'Standard-Region kann nicht gelöscht werden'}
				disabled={!canDelete}
			>
				🗑️
			</button>
		{/if}
	</div>
</div>

<style>
	.region-card {
		display: flex;
		align-items: stretch;
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border: 2px solid transparent;
		transition: all 0.2s ease;
		overflow: hidden;
	}

	.region-card:hover {
		border-color: var(--color-earth-light);
	}

	.region-card.active {
		border-color: var(--color-leaf-dark);
		background: linear-gradient(135deg, var(--color-cream) 0%, rgba(107, 142, 78, 0.1) 100%);
	}

	.region-card.heimat {
		border-style: dashed;
	}

	.card-main {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-md);
		padding: var(--space-md) var(--space-lg);
		background: transparent;
		border: none;
		cursor: pointer;
		text-align: left;
		min-width: 0;
	}

	.card-main:hover {
		background: rgba(107, 142, 78, 0.05);
	}

	.region-info {
		flex: 1;
		min-width: 0;
	}

	.region-name {
		font-family: var(--font-display);
		font-size: 1.1rem;
		margin: 0 0 var(--space-xs) 0;
		color: var(--color-bark);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		flex-wrap: wrap;
	}

	.heimat-badge {
		font-size: 0.7rem;
		background: var(--color-earth-light);
		color: var(--color-earth-dark);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-family: var(--font-body);
		font-weight: normal;
	}

	.besonderheiten-icons {
		display: flex;
		gap: var(--space-xs);
		flex-wrap: wrap;
	}

	.icon-badge {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		background: var(--color-earth-light);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
	}

	.icon-badge .icon {
		font-size: 0.9rem;
	}

	.icon-badge .count {
		font-weight: 600;
		color: var(--color-bark);
	}

	.icon-badge.geo {
		background: rgba(139, 119, 101, 0.2);
	}

	.icon-badge.flora {
		background: rgba(107, 142, 78, 0.2);
	}

	.icon-badge.arch {
		background: rgba(156, 124, 56, 0.2);
	}

	.icon-badge.vanilla {
		background: rgba(210, 180, 140, 0.3);
	}

	.orte-count {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-earth-light);
		border-radius: var(--radius-sm);
		min-width: 50px;
	}

	.count-number {
		font-family: var(--font-display);
		font-size: 1.3rem;
		font-weight: 700;
		color: var(--color-bark);
		line-height: 1;
	}

	.count-label {
		font-size: 0.7rem;
		color: var(--color-earth);
		text-transform: uppercase;
	}

	.card-actions {
		display: flex;
		flex-direction: column;
		border-left: 1px solid var(--color-earth-light);
	}

	.action-btn {
		padding: var(--space-sm);
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 0.9rem;
		opacity: 0.6;
		transition: all 0.2s ease;
	}

	.action-btn:hover:not(:disabled) {
		opacity: 1;
		background: var(--color-earth-light);
	}

	.action-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.action-btn.delete:hover:not(:disabled) {
		background: rgba(192, 57, 43, 0.1);
	}

	@media (max-width: 500px) {
		.card-main {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--space-sm);
		}

		.orte-count {
			flex-direction: row;
			gap: var(--space-xs);
		}

		.count-number {
			font-size: 1rem;
		}
	}
</style>
