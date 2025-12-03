<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
	$: ereignis = data.ereignis;

	function getMonatSlug(monat: string): string {
		return monat.toLowerCase()
			.replace(/ü/g, 'ue')
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe');
	}
</script>

<svelte:head>
	<title>{ereignis.name} - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<nav class="breadcrumb">
		<a href="/jahreskreis">Jahreskreis</a>
		<span>→</span>
		<a href="/jahreskreis#{`monat-${getMonatSlug(ereignis.monat)}`}">{ereignis.monat}</a>
		<span>→</span>
		<span>{ereignis.name}</span>
	</nav>

	<article class="ereignis-detail" data-typ={ereignis.typ}>
		<header>
			<span class="typ-badge" data-typ={ereignis.typ}>
				{ereignis.typ === 'katastrophe' ? '⚡ Katastrophe' : '🎉 Fest'}
			</span>
			<h1>{ereignis.name}</h1>
			<p class="monat-info">Monat: <strong>{ereignis.monat}</strong></p>
		</header>

		<section class="beschreibung">
			<p>{ereignis.beschreibung}</p>
		</section>

		{#if ereignis.traditionen && ereignis.traditionen.length > 0}
			<section class="traditionen">
				<h2>Traditionen</h2>
				<ul>
					{#each ereignis.traditionen as tradition}
						<li>{tradition}</li>
					{/each}
				</ul>
			</section>
		{/if}

		{#if ereignis.effekte && ereignis.effekte.length > 0}
			<section class="effekte">
				<h2>{ereignis.typ === 'katastrophe' ? 'Auswirkungen' : 'Im Spiel'}</h2>
				<ul>
					{#each ereignis.effekte as effekt}
						<li>{effekt}</li>
					{/each}
				</ul>
			</section>
		{/if}
	</article>

	<div class="navigation">
		<a href="/jahreskreis" class="btn btn-secondary">← Zurück zum Jahreskreis</a>
	</div>
</div>

<style>
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		margin-bottom: var(--space-lg);
		font-size: 0.9rem;
		color: var(--color-earth);
	}

	.breadcrumb a {
		color: var(--color-leaf-dark);
	}

	.breadcrumb span:not(a) {
		color: var(--color-earth-light);
	}

	.ereignis-detail {
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		padding: var(--space-xl);
		border-left: 5px solid var(--color-earth);
	}

	.ereignis-detail[data-typ="katastrophe"] {
		border-left-color: #c0392b;
	}

	.ereignis-detail[data-typ="fest"] {
		border-left-color: #27ae60;
	}

	header {
		margin-bottom: var(--space-lg);
	}

	.typ-badge {
		display: inline-block;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		font-weight: 600;
		margin-bottom: var(--space-sm);
	}

	.typ-badge[data-typ="katastrophe"] {
		background: #f8d7da;
		color: #721c24;
	}

	.typ-badge[data-typ="fest"] {
		background: #d4edda;
		color: #155724;
	}

	h1 {
		margin-bottom: var(--space-xs);
	}

	.monat-info {
		color: var(--color-earth);
		font-style: italic;
		margin: 0;
	}

	.beschreibung {
		margin-bottom: var(--space-lg);
	}

	.beschreibung p {
		font-size: 1.15rem;
		line-height: 1.7;
		margin: 0;
	}

	.traditionen, .effekte {
		margin-bottom: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
	}

	.traditionen h2, .effekte h2 {
		font-size: 1.2rem;
		margin-bottom: var(--space-sm);
		color: var(--color-earth-dark);
	}

	.traditionen ul, .effekte ul {
		margin: 0;
		padding-left: var(--space-lg);
	}

	.traditionen li, .effekte li {
		margin-bottom: var(--space-xs);
		line-height: 1.5;
	}

	.navigation {
		margin-top: var(--space-xl);
	}
</style>
