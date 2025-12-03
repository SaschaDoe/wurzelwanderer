<script lang="ts">
	import '../app.css';

	let { children } = $props();
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
				<li><a href="/bekannte">Bekannte</a></li>
				<li><a href="/jahreskreis">Jahreskreis</a></li>
			</ul>
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
	}
</style>
