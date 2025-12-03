<script lang="ts">
	import BekannterCard from '$lib/components/BekannterCard.svelte';
	import {
		generiereBekanntenData,
		alleKategorien,
		traumaKategorie,
		type GenerierterBekannter
	} from '$lib/data/merkmale';

	// State
	let erlaubeMagisch = $state(true);
	let erlaubeTrauma = $state(true);
	let generierterBekannter = $state<GenerierterBekannter | null>(null);

	function generiereBekannten() {
		generierterBekannter = generiereBekanntenData(erlaubeMagisch, erlaubeTrauma);
	}
</script>

<svelte:head>
	<title>Bekannte - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Bekannte erschaffen</h1>
	<p class="intro">
		Bekannte sind die Figuren, denen ihr auf eurer Wanderung begegnet.
	</p>

	<div class="generator-row">
		<button class="btn btn-primary generate-btn" onclick={generiereBekannten}>
			Bekannte*n erschaffen
		</button>

		<label class="compact-toggle" class:active={erlaubeMagisch} title="Gottheiten, Geistwesen, übernatürliche Fähigkeiten">
			<input type="checkbox" bind:checked={erlaubeMagisch} />
			<span class="symbol-btn magic">✧</span>
			<span class="toggle-text">Magisch</span>
		</label>

		<label class="compact-toggle" class:active={erlaubeTrauma} title="Bekannte mit schwierigen Hintergründen und Verletzungen">
			<input type="checkbox" bind:checked={erlaubeTrauma} />
			<span class="symbol-btn trauma">‡</span>
			<span class="toggle-text">Trauma</span>
		</label>
	</div>

	{#if generierterBekannter}
		<div class="result-wrapper">
			<BekannterCard bekannter={generierterBekannter} />
		</div>
		<div class="result-footer">
			<button class="btn btn-secondary" onclick={generiereBekannten}>
				Neue*n Bekannte*n erschaffen
			</button>
		</div>
	{/if}

	<div class="divider"></div>

	<section class="kategorien-uebersicht">
		<h2>Merkmal-Kategorien</h2>
		<div class="kategorien-grid">
			<div class="kategorie-info-card">
				<h3>Bodenständig</h3>
				<p>Ehrlich, Still, Wachsam, Weise</p>
				<p class="magisch-hint"><span class="sym-magic">✧</span>Unsichtbar, <span class="sym-magic">✧</span>Verflochten</p>
			</div>
			<div class="kategorie-info-card">
				<h3>Charakter</h3>
				<p>Entspannt, Frohgemut, Grüblerisch, Selbstsicher</p>
				<p class="magisch-hint"><span class="sym-magic">✧</span>Ehrwürdig, <span class="sym-magic">✧</span>Leuchtend</p>
			</div>
			<div class="kategorie-info-card">
				<h3>Intellektuell</h3>
				<p>Ehrgeizig, Gelehrt, Listig, Wissbegierig</p>
				<p class="magisch-hint"><span class="sym-magic">✧</span>Hexenhaft, <span class="sym-magic">✧</span>Prophetisch</p>
			</div>
			<div class="kategorie-info-card">
				<h3>Körperlich</h3>
				<p>Abenteuerlustig, Entschlossen, Leidenschaftlich, Stark</p>
				<p class="magisch-hint"><span class="sym-magic">✧</span>Machtvoll, <span class="sym-magic">✧</span>Wild</p>
			</div>
			<div class="kategorie-info-card">
				<h3>Künstlerisch</h3>
				<p>Dramatisch, Fantasievoll, Gewieft, Poetisch</p>
				<p class="magisch-hint"><span class="sym-magic">✧</span>Glamourös, <span class="sym-magic">✧</span>Wundertätig</p>
			</div>
			<div class="kategorie-info-card">
				<h3>Sozial</h3>
				<p>Ausgelassen, Freundlich, Fürsorglich, Korrekt</p>
				<p class="magisch-hint"><span class="sym-magic">✧</span>Empathisch, <span class="sym-magic">✧</span>Vielgesichtig</p>
			</div>
			<div class="kategorie-info-card trauma-card">
				<h3><span class="sym-trauma">‡</span> Trauma</h3>
				<p><span class="sym-trauma">‡</span>Darbend, <span class="sym-trauma">‡</span>Hektisch, <span class="sym-trauma">‡</span>Heroisch, <span class="sym-trauma">‡</span>Königlich, <span class="sym-trauma">‡</span>Leer, <span class="sym-trauma">‡</span>Nervös, <span class="sym-trauma">‡</span>Trauernd, <span class="sym-trauma">‡</span>Tot, <span class="sym-trauma">‡</span>Verloren, <span class="sym-trauma">‡</span>Versehrt, <span class="sym-trauma">‡</span>Vorsichtig, <span class="sym-trauma">‡</span>Wütend</p>
			</div>
		</div>
	</section>
</div>

<style>
	.intro {
		font-size: 1.1rem;
		max-width: 700px;
		margin-bottom: var(--space-md);
	}

	/* Compact Generator Row */
	.generator-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
		margin-bottom: var(--space-xl);
		padding: var(--space-md);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
	}

	.generate-btn {
		padding: var(--space-sm) var(--space-lg);
		font-size: 1rem;
	}

	.compact-toggle {
		display: flex;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		cursor: pointer;
		user-select: none;
		transition: all 0.2s ease;
		opacity: 0.5;
		border: 2px solid transparent;
	}

	.compact-toggle input {
		display: none;
	}

	.compact-toggle.active {
		opacity: 1;
	}

	.compact-toggle:hover {
		opacity: 0.8;
	}

	.compact-toggle.active:hover {
		opacity: 1;
	}

	.symbol-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		font-weight: bold;
		font-size: 1.1rem;
		transition: transform 0.2s ease;
	}

	.compact-toggle.active .symbol-btn {
		transform: scale(1.1);
	}

	.symbol-btn.magic {
		background: linear-gradient(135deg, #9c7c38, #c9a227);
		color: white;
	}

	.symbol-btn.trauma {
		background: linear-gradient(135deg, #8e7cc3, #6a5acd);
		color: white;
	}

	.toggle-text {
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-earth-dark);
	}

	/* Result */
	.result-wrapper {
		max-width: 600px;
		margin-bottom: var(--space-md);
	}

	.result-footer {
		max-width: 600px;
		padding-top: var(--space-md);
		margin-bottom: var(--space-xl);
	}

	/* Kategorien Übersicht */
	.kategorien-uebersicht h2 {
		margin-bottom: var(--space-lg);
	}

	.kategorien-grid {
		display: grid;
		gap: var(--space-md);
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	}

	.kategorie-info-card {
		background: var(--color-parchment);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-left: 3px solid var(--color-earth);
	}

	.kategorie-info-card h3 {
		margin: 0 0 var(--space-sm) 0;
		font-size: 1rem;
	}

	.kategorie-info-card p {
		margin: 0;
		font-size: 0.9rem;
		color: var(--color-earth-dark);
	}

	.kategorie-info-card .magisch-hint {
		margin-top: var(--space-xs);
	}

	.kategorie-info-card.trauma-card {
		border-left-color: #8e7cc3;
	}

	.sym-magic {
		color: #9c7c38;
		font-weight: bold;
	}

	.sym-trauma {
		color: #8e7cc3;
		font-weight: bold;
	}

	@media (max-width: 600px) {
		.generator-row {
			justify-content: center;
		}
	}
</style>
