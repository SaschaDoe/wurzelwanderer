<script lang="ts">
	/**
	 * Character image area component that handles:
	 * - Displaying existing image with click-to-enlarge
	 * - Image generation button with loading state
	 * - Static placeholder when no API key is available
	 * - Remove image functionality
	 */

	import { generateBekannterImage, hasApiKey } from '$lib/services/geminiService';

	interface Chimaere {
		oben: string;
		unten: string;
	}

	interface CharacterInfo {
		name: string;
		tier: string;
		berufe: string[];
		merkmalName: string;
		merkmalBeschreibung: string;
		kategorie: string;
		geschlecht: string;
	}

	interface Props {
		/** Current image source (optional) */
		src?: string;
		/** Character name for alt text */
		name: string;
		/** Animal type for placeholder */
		tier: string;
		/** Chimaere data for hybrid creatures */
		chimaere?: Chimaere;
		/** Full character info needed for image generation */
		characterInfo: CharacterInfo;
		/** Whether image can be modified (generate/remove) */
		editable?: boolean;
		/** Callback when image is clicked (to open modal) */
		onImageClick?: () => void;
		/** Callback when new image is generated */
		onImageGenerated?: (imageData: string) => void;
		/** Callback when image is removed */
		onImageRemoved?: () => void;
	}

	let {
		src,
		name,
		tier,
		chimaere,
		characterInfo,
		editable = false,
		onImageClick,
		onImageGenerated,
		onImageRemoved
	}: Props = $props();

	let isGenerating = $state(false);
	let error = $state<string | null>(null);

	async function handleGenerate() {
		if (isGenerating || !onImageGenerated) return;

		isGenerating = true;
		error = null;

		try {
			const imageData = await generateBekannterImage(characterInfo);
			if (imageData) {
				onImageGenerated(imageData);
			} else {
				error = 'Kein Bild erhalten';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unbekannter Fehler';
		} finally {
			isGenerating = false;
		}
	}

	function getPlaceholderLetters(): string {
		if (chimaere) {
			return `${chimaere.oben.charAt(0)}${chimaere.unten.charAt(0)}`;
		}
		return tier.charAt(0);
	}
</script>

<div class="image-area">
	{#if src}
		<!-- Existing image -->
		<button class="image-button" onclick={onImageClick} title="Bild vergrößern">
			<img {src} alt={name} class="generated-image" />
		</button>
		{#if editable && onImageRemoved}
			<button class="remove-image-btn" onclick={onImageRemoved} title="Bild entfernen">×</button>
		{/if}
	{:else if editable && hasApiKey()}
		<!-- Generate button -->
		<button
			class="image-placeholder"
			onclick={handleGenerate}
			disabled={isGenerating}
			title="Klicken um Bild zu generieren"
		>
			{#if isGenerating}
				<span class="placeholder-spinner"></span>
				<span class="placeholder-text">Generiere...</span>
			{:else}
				<span class="placeholder-icon">🎨</span>
				<span class="placeholder-text">Bild generieren</span>
			{/if}
		</button>
	{:else}
		<!-- Static placeholder -->
		<div class="image-placeholder-static">
			<span class="placeholder-letter" class:chimaere>
				{getPlaceholderLetters()}
			</span>
		</div>
	{/if}
	{#if error}
		<p class="image-error">{error}</p>
	{/if}
</div>

<style>
	.image-area {
		position: relative;
		width: 140px;
		height: 190px;
		flex-shrink: 0;
	}

	.image-button {
		width: 100%;
		height: 100%;
		padding: 0;
		border: none;
		background: none;
		cursor: zoom-in;
		border-radius: var(--radius-lg);
		overflow: hidden;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
	}

	.image-button:hover {
		transform: scale(1.02);
		box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
	}

	.generated-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--radius-lg);
		border: 3px solid var(--color-earth-light);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.image-placeholder,
	.image-placeholder-static {
		width: 100%;
		height: 100%;
		border-radius: var(--radius-lg);
		border: 3px dashed var(--color-earth-light);
		background: var(--color-cream);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--space-sm);
	}

	.image-placeholder {
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.image-placeholder:hover:not(:disabled) {
		border-color: var(--color-leaf);
		background: rgba(107, 142, 78, 0.1);
	}

	.image-placeholder:disabled {
		cursor: wait;
	}

	.placeholder-icon {
		font-size: 2rem;
	}

	.placeholder-text {
		font-size: 0.8rem;
		color: var(--color-earth);
		font-weight: 500;
		text-align: center;
	}

	.placeholder-letter {
		font-size: 3rem;
		font-weight: bold;
		color: var(--color-earth);
		text-transform: uppercase;
		opacity: 0.5;
	}

	.placeholder-letter.chimaere {
		font-size: 2rem;
		background: linear-gradient(135deg, #9c7c38 50%, #c9a227 50%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.placeholder-spinner {
		width: 24px;
		height: 24px;
		border: 3px solid var(--color-earth-light);
		border-top-color: var(--color-leaf);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.image-error {
		position: absolute;
		bottom: -24px;
		left: 0;
		right: 0;
		font-size: 0.75rem;
		color: #dc3545;
		text-align: center;
		margin: 0;
	}

	.remove-image-btn {
		position: absolute;
		top: -8px;
		right: -8px;
		width: 24px;
		height: 24px;
		border: none;
		border-radius: 50%;
		background: #dc3545;
		color: white;
		font-size: 1.2rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease;
	}

	.image-area:hover .remove-image-btn {
		opacity: 1;
	}

	.remove-image-btn:hover {
		background: #c82333;
	}

	@media (max-width: 600px) {
		.image-area {
			width: 120px;
			height: 160px;
		}
	}
</style>
