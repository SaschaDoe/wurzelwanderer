<script lang="ts">
	/**
	 * Badge component for displaying character traits (Merkmale).
	 * Shows the trait name with optional magic (✧) or trauma (‡) symbols.
	 */

	interface Props {
		/** Name of the merkmal/trait */
		name: string;
		/** Whether this is a magical trait */
		magisch?: boolean;
		/** Whether this is a trauma-related trait */
		trauma?: boolean;
		/** Size variant */
		size?: 'small' | 'medium';
	}

	let { name, magisch = false, trauma = false, size = 'medium' }: Props = $props();
</script>

<span class="merkmal-badge" class:magisch class:trauma class:small={size === 'small'}>
	{#if magisch}
		<span class="symbol">✧</span>
	{/if}
	{#if trauma}
		<span class="symbol">‡</span>
	{/if}
	{name}
</span>

<style>
	.merkmal-badge {
		background: var(--color-parchment);
		border: 2px solid var(--color-earth-light);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.85rem;
		display: inline-flex;
		align-items: center;
		gap: var(--space-xs);
		white-space: nowrap;
	}

	.merkmal-badge.small {
		padding: calc(var(--space-xs) * 0.75) var(--space-xs);
		font-size: 0.8rem;
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

	.small .symbol {
		font-size: 0.9rem;
	}
</style>
