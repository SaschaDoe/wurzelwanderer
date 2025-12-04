<script lang="ts">
	/**
	 * Reusable image lightbox modal component.
	 * Displays an image in fullscreen overlay with close functionality.
	 * Supports keyboard navigation (Escape to close) and click-outside-to-close.
	 */

	interface Props {
		/** The image source URL or base64 data */
		src: string;
		/** Alt text for accessibility */
		alt: string;
		/** Optional caption shown below the image */
		caption?: string;
		/** Callback when modal should close */
		onClose: () => void;
	}

	let { src, alt, caption, onClose }: Props = $props();

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleOverlayClick() {
		onClose();
	}

	function handleContentClick(event: MouseEvent) {
		event.stopPropagation();
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	class="image-modal-overlay"
	onclick={handleOverlayClick}
	onkeydown={handleKeyDown}
	role="dialog"
	aria-modal="true"
	aria-label={caption || alt}
	tabindex="-1"
>
	<div class="image-modal-content" role="document">
		<img {src} {alt} class="modal-image" />
		<button class="modal-close-btn" onclick={onClose} aria-label="Schließen">×</button>
		{#if caption}
			<p class="modal-caption">{caption}</p>
		{/if}
	</div>
</div>

<style>
	.image-modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: var(--space-lg);
		cursor: zoom-out;
	}

	.image-modal-content {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		cursor: default;
	}

	.modal-image {
		max-width: 100%;
		max-height: 85vh;
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.modal-close-btn {
		position: absolute;
		top: -40px;
		right: 0;
		width: 36px;
		height: 36px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		font-size: 1.5rem;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.modal-close-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.modal-caption {
		text-align: center;
		color: white;
		font-family: var(--font-display);
		font-size: 1.2rem;
		margin-top: var(--space-md);
		opacity: 0.9;
	}
</style>
