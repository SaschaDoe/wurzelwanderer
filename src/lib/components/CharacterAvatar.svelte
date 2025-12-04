<script lang="ts">
	/**
	 * Character avatar component that displays either an image or a letter fallback.
	 * Handles both normal animals and chimaere (two-animal hybrids).
	 */

	interface Chimaere {
		oben: string;
		unten: string;
	}

	interface Props {
		/** Image source (optional - shows letter fallback if not provided) */
		src?: string;
		/** Character/animal name for alt text and letter fallback */
		name: string;
		/** Animal type - first letter used for fallback avatar */
		tier: string;
		/** Optional chimaere data for hybrid creatures */
		chimaere?: Chimaere;
		/** Size variant */
		size?: 'small' | 'medium' | 'large';
	}

	let { src, name, tier, chimaere, size = 'small' }: Props = $props();

	function getLetters(): string {
		if (chimaere) {
			return `${chimaere.oben.charAt(0)}${chimaere.unten.charAt(0)}`;
		}
		return tier.charAt(0);
	}
</script>

{#if src}
	<img {src} alt={name} class="avatar-image" class:small={size === 'small'} class:medium={size === 'medium'} class:large={size === 'large'} />
{:else}
	<div class="avatar" class:chimaere class:small={size === 'small'} class:medium={size === 'medium'} class:large={size === 'large'}>
		{#if chimaere}
			<span class="chimaere-letters">{getLetters()}</span>
		{:else}
			{getLetters()}
		{/if}
	</div>
{/if}

<style>
	.avatar-image {
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 2px solid var(--color-earth-light);
	}

	.avatar-image.small {
		width: 40px;
		height: 40px;
	}

	.avatar-image.medium {
		width: 60px;
		height: 60px;
	}

	.avatar-image.large {
		width: 80px;
		height: 80px;
	}

	.avatar {
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

	.avatar.small {
		width: 40px;
		height: 40px;
		font-size: 1rem;
	}

	.avatar.medium {
		width: 60px;
		height: 60px;
		font-size: 1.5rem;
	}

	.avatar.large {
		width: 80px;
		height: 80px;
		font-size: 2rem;
	}

	.avatar.chimaere {
		background: linear-gradient(135deg, #9c7c38 50%, #c9a227 50%);
	}

	.chimaere-letters {
		letter-spacing: 1px;
	}

	.avatar.small .chimaere-letters {
		font-size: 0.75rem;
	}

	.avatar.medium .chimaere-letters {
		font-size: 1rem;
		letter-spacing: 2px;
	}

	.avatar.large .chimaere-letters {
		font-size: 1.25rem;
		letter-spacing: 2px;
	}
</style>
