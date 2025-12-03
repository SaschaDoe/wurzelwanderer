<script lang="ts">
	const features = [
		{
			title: 'Charaktere',
			description: 'Wähle deinen Charakter aus fünf einzigartigen Charakter Klassen.',
			icon: '📖',
			href: '/wurzelbuecher'
		},
		{
			title: 'Naturelle',
			description: 'Entdecke märchenhafte Orte und kombiniere sie zu neuen Welten.',
			icon: '🏡',
			href: '/naturelle'
		},
		{
			title: 'Jahreskreis',
			description: 'Erlebe die sechs Jahreszeiten mit ihren Festen und Ritualen.',
			icon: '🌸',
			href: '/jahreskreis'
		},
		{
			title: 'Spielanleitung',
			description: 'Lerne die einfachen Regeln für Kinder ab 5 Jahren.',
			icon: '🎲',
			href: '/spielanleitung'
		}
	];
</script>

<svelte:head>
	<title>Wurzelwanderer - Ein Waldorf-inspiriertes Tischrollenspiel</title>
</svelte:head>

<div class="hero">
	<div class="container">
		<h1>Wurzelwanderer</h1>
		<p class="subtitle">Ein sanftes Erzählspiel für die ganze Familie</p>
		<p class="intro">
			Begib dich auf eine Reise durch eine märchenhafte Welt voller Naturwesen,
			Jahreszeiten und Gemeinschaft. Inspiriert von Waldorf-Pädagogik und dem
			Erzählspiel Wanderhome.
		</p>
		<div class="hero-actions">
			<a href="/spielanleitung" class="btn btn-primary">Jetzt starten</a>
			<a href="/wurzelbuecher" class="btn btn-secondary">Charaktere entdecken</a>
		</div>
	</div>
</div>

<div class="divider"></div>

<section class="container">
	<h2 class="text-center">Was ist Wurzelwanderer?</h2>
	<div class="grid grid-2 mt-lg">
		<div class="card">
			<h3>🌱 Verwurzelt & Wandernd</h3>
			<p>
				Wurzelwanderer verbindet das Gefühl von Geborgenheit und Heimat
				mit dem Abenteuer des Reisens. Wie die Wurzelkinder aus dem
				berühmten Bilderbuch erwachst du mit den Jahreszeiten und
				entdeckst die Welt.
			</p>
		</div>
		<div class="card">
			<h3>🎭 Erzählen statt Kämpfen</h3>
			<p>
				Es gibt keine Würfel, keine Kämpfe, keine Verlierer. Stattdessen
				erzählt ihr gemeinsam Geschichten, stellt Fragen und entdeckt
				zusammen, was als nächstes passiert.
			</p>
		</div>
		<div class="card">
			<h3>👨‍👩‍👧‍👦 Für alle ab 5 Jahren</h3>
			<p>
				Die Regeln sind so einfach, dass schon Kinder ab 5 Jahren
				mitspielen können. Aber auch Erwachsene finden in der
				poetischen Welt der Wurzelwanderer Freude und Entspannung.
			</p>
		</div>
		<div class="card">
			<h3>🍂 Jahreszeiten erleben</h3>
			<p>
				Sechs Jahreszeiten mit ihren Festen strukturieren eure Reise:
				Von Ostern über Johanni und Michaeli bis zum Laternenfest
				und der stillen Winterzeit.
			</p>
		</div>
	</div>
</section>

<div class="divider"></div>

<section class="container">
	<h2 class="text-center">Entdecke die Welt</h2>
	<div class="grid grid-2 mt-lg">
		{#each features as feature}
			<a href={feature.href} class="feature-card card">
				<span class="feature-icon">{feature.icon}</span>
				<h3>{feature.title}</h3>
				<p>{feature.description}</p>
			</a>
		{/each}
	</div>
</section>

<div class="divider"></div>

<section class="container text-center">
	<h2>Bereit für die Reise?</h2>
	<p class="mt-md">
		Schnapp dir deine Freunde und Familie, vielleicht ein paar Kerzen
		und gemütliche Kissen, und beginnt eure erste Wanderung.
	</p>
	<a href="/spielanleitung" class="btn btn-primary mt-lg">Zur Spielanleitung</a>
</section>

<style>
	.hero {
		text-align: center;
		padding: var(--space-xl) 0;
		background: linear-gradient(
			to bottom,
			var(--color-parchment),
			var(--color-cream)
		);
	}

	.hero h1 {
		font-size: 3.5rem;
		color: var(--color-earth-dark);
		margin-bottom: var(--space-sm);
	}

	.subtitle {
		font-family: var(--font-display);
		font-size: 1.5rem;
		font-style: italic;
		color: var(--color-earth);
		margin-bottom: var(--space-lg);
	}

	.intro {
		max-width: 600px;
		margin: 0 auto var(--space-lg);
		font-size: 1.125rem;
	}

	.hero-actions {
		display: flex;
		gap: var(--space-md);
		justify-content: center;
		flex-wrap: wrap;
	}

	.feature-card {
		display: block;
		text-align: center;
		color: inherit;
	}

	.feature-card:hover {
		text-decoration: none;
	}

	.feature-icon {
		font-size: 3rem;
		display: block;
		margin-bottom: var(--space-md);
	}

	.feature-card h3 {
		color: var(--color-leaf-dark);
	}

	@media (max-width: 768px) {
		.hero h1 {
			font-size: 2.5rem;
		}

		.subtitle {
			font-size: 1.25rem;
		}
	}
</style>
