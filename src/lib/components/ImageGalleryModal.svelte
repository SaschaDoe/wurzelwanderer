<script lang="ts">
	/**
	 * Image gallery modal with navigation for multiple images.
	 * Supports keyboard navigation (Escape, Arrow keys) and action buttons.
	 */

	interface Props {
		/** Array of image sources */
		images: string[];
		/** Current image index */
		currentIndex?: number;
		/** Alt text for images */
		alt: string;
		/** Optional caption shown below the image */
		caption?: string;
		/** Callback when modal should close */
		onClose: () => void;
		/** Callback when index changes */
		onIndexChange?: (index: number) => void;
		/** Callback for regenerate action */
		onRegenerate?: () => void;
		/** Callback for delete action with current index */
		onDelete?: (index: number) => void;
	}

	let {
		images,
		currentIndex = 0,
		alt,
		caption,
		onClose,
		onIndexChange,
		onRegenerate,
		onDelete
	}: Props = $props();

	function goToNext() {
		if (images.length <= 1) return;
		const newIndex = (currentIndex + 1) % images.length;
		onIndexChange?.(newIndex);
	}

	function goToPrevious() {
		if (images.length <= 1) return;
		const newIndex = (currentIndex - 1 + images.length) % images.length;
		onIndexChange?.(newIndex);
	}

	function handleKeyDown(event: KeyboardEvent) {
		switch (event.key) {
			case 'Escape':
				onClose();
				break;
			case 'ArrowLeft':
				goToPrevious();
				break;
			case 'ArrowRight':
				goToNext();
				break;
		}
	}

	function handleOverlayClick() {
		onClose();
	}

	function handleContentClick(event: MouseEvent) {
		event.stopPropagation();
	}

	function handleRegenerate() {
		onRegenerate?.();
		onClose();
	}

	function handleDelete() {
		onDelete?.(currentIndex);
	}
</script>

<svelte:window onkeydown={handleKeyDown} />

<div
	class="gallery-modal-overlay"
	onclick={handleOverlayClick}
	onkeydown={handleKeyDown}
	role="dialog"
	aria-modal="true"
	aria-label={caption || alt}
	tabindex="-1"
>
	<div class="gallery-modal-content" onclick={handleContentClick} onkeydown={handleKeyDown} role="document">
		<img src={images[currentIndex]} {alt} class="modal-image" />

		<!-- Navigation -->
		{#if images.length > 1}
			<button class="modal-nav-btn modal-nav-prev" onclick={goToPrevious} title="Vorheriges Bild" aria-label="Vorheriges Bild">
				‹
			</button>
			<button class="modal-nav-btn modal-nav-next" onclick={goToNext} title="Nächstes Bild" aria-label="Nächstes Bild">
				›
			</button>
			<div class="modal-counter">{currentIndex + 1} / {images.length}</div>
		{/if}

		<!-- Actions -->
		{#if onRegenerate || onDelete}
			<div class="modal-actions">
				{#if onRegenerate}
					<button class="modal-action-btn" onclick={handleRegenerate} title="Neues Bild generieren">
						🔄 Neu generieren
					</button>
				{/if}
				{#if onDelete}
					<button class="modal-action-btn modal-action-delete" onclick={handleDelete} title="Bild löschen">
						🗑️ Löschen
					</button>
				{/if}
			</div>
		{/if}

		<button class="modal-close-btn" onclick={onClose} aria-label="Schließen">×</button>
		{#if caption}
			<p class="modal-caption">{caption}</p>
		{/if}
	</div>
</div>

<style>
	.gallery-modal-overlay {
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

	.gallery-modal-content {
		position: relative;
		max-width: 90vw;
		max-height: 90vh;
		cursor: default;
	}

	.modal-image {
		max-width: 100%;
		max-height: 75vh;
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
	}

	.modal-nav-btn {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		width: 48px;
		height: 48px;
		border: none;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.2);
		color: white;
		font-size: 2rem;
		cursor: pointer;
		transition: background 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-nav-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.modal-nav-prev {
		left: -60px;
	}

	.modal-nav-next {
		right: -60px;
	}

	.modal-counter {
		position: absolute;
		bottom: -30px;
		left: 50%;
		transform: translateX(-50%);
		color: white;
		font-size: 0.9rem;
		opacity: 0.8;
	}

	.modal-actions {
		position: absolute;
		bottom: -70px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: var(--space-md);
	}

	.modal-action-btn {
		padding: var(--space-sm) var(--space-md);
		border: none;
		border-radius: var(--radius-md);
		background: rgba(255, 255, 255, 0.2);
		color: white;
		font-size: 0.9rem;
		cursor: pointer;
		transition: background 0.2s ease;
		white-space: nowrap;
	}

	.modal-action-btn:hover {
		background: rgba(255, 255, 255, 0.3);
	}

	.modal-action-delete:hover {
		background: rgba(220, 53, 69, 0.8);
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

	@media (max-width: 768px) {
		.modal-nav-prev {
			left: 10px;
		}

		.modal-nav-next {
			right: 10px;
		}

		.modal-nav-btn {
			width: 40px;
			height: 40px;
			font-size: 1.5rem;
			background: rgba(0, 0, 0, 0.5);
		}

		.modal-actions {
			bottom: -60px;
			flex-direction: column;
			gap: var(--space-sm);
		}
	}
</style>
