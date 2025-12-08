<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { initApiKey } from '$lib/services/geminiService';
	import { initOpenAIKey } from '$lib/services/openaiService';

	let { children } = $props();

	// Initialize API keys on app startup
	onMount(async () => {
		if (browser) {
			await Promise.all([
				initApiKey(),
				initOpenAIKey()
			]);
			console.log('[App] API Keys initialisiert');
		}
	});
</script>

<svelte:head>
	<title>Wurzelwanderer</title>
</svelte:head>

<div class="app">
	<header>
		<nav class="container">
			<a href="/" class="logo">
				<span class="logo-icon">🌱</span>
				<span class="logo-text">Wurzelwanderer</span>
			</a>
			<ul class="nav-links">
				<li><a href="/spielanleitung">Spielanleitung</a></li>
				<li><a href="/wurzelbuecher">Charaktere</a></li>
				<li><a href="/naturelle">Naturelle</a></li>
				<li><a href="/hexkarte">Hexkarte</a></li>
				<li><a href="/bekannte">Bekannte</a></li>
				<li><a href="/gottheiten">Gottheiten</a></li>
				<li><a href="/bildband">Bildband</a></li>
				<li><a href="/jahreskreis">Jahreskreis</a></li>
			</ul>
			<a href="/einstellungen" class="settings-link" title="Einstellungen">
				<svg class="gear-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="3"/>
					<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
				</svg>
			</a>
		</nav>
	</header>

	<main>
		{@render children()}
	</main>

	<footer>
		<div class="container">
			<p>Wurzelwanderer - Ein Waldorf-inspiriertes Tischrollenspiel</p>
			<p class="text-muted">Inspiriert von Wanderhome und der Waldorf-Pädagogik</p>
		</div>
	</footer>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	header {
		background: var(--color-parchment);
		border-bottom: 2px solid var(--color-earth-light);
		padding: var(--space-md) 0;
		position: relative;
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.logo {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--color-earth-dark);
	}

	.logo:hover {
		text-decoration: none;
		color: var(--color-leaf-dark);
	}

	.logo-icon {
		font-size: 2rem;
	}

	.nav-links {
		display: flex;
		list-style: none;
		gap: var(--space-lg);
		flex-wrap: wrap;
	}

	.nav-links a {
		font-weight: 600;
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		transition: background-color 0.2s ease;
	}

	.nav-links a:hover {
		background-color: var(--color-earth-light);
		text-decoration: none;
	}

	.settings-link {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: var(--color-earth-light);
		color: var(--color-earth-dark);
		transition: all 0.3s ease;
		margin-left: var(--space-sm);
	}

	.settings-link:hover {
		background: var(--color-earth);
		color: var(--color-cream);
		transform: rotate(90deg);
		text-decoration: none;
	}

	.gear-icon {
		width: 20px;
		height: 20px;
	}

	main {
		flex: 1;
		padding: var(--space-xl) 0;
	}

	footer {
		background: var(--color-earth-dark);
		color: var(--color-cream);
		padding: var(--space-lg) 0;
		text-align: center;
	}

	footer .text-muted {
		color: var(--color-earth-light);
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		nav {
			flex-direction: column;
		}

		.nav-links {
			justify-content: center;
		}

		.settings-link {
			position: absolute;
			top: var(--space-md);
			right: var(--space-md);
		}
	}
</style>
