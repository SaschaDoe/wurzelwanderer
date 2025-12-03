<script lang="ts">
	function scrollToMonat(name: string) {
		const id = name.toLowerCase().replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe');
		const element = document.getElementById(`monat-${id}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			element.classList.add('highlight');
			setTimeout(() => element.classList.remove('highlight'), 1500);
		}
	}

	const monate = [
		{
			name: 'Frühling',
			jahreszeit: 'Springwochen',
			katastrophe: { name: 'Kalter Frühling', slug: 'kalter-fruehling' },
			feste: [
				{ name: 'Waschung', slug: 'waschung' },
				{ name: 'Karneval', slug: 'karneval' }
			],
			farbe: 'spring',
			beschreibung: 'Die Erde taut auf, die Saat wird gelegt. Zeit für Neuanfänge und frische Hoffnung.',
			fragen: [
				'Kennst du irgendwen hier?',
				'Was wächst zum ersten Mal aus dem Boden?',
				'Wer bereitet die Felder vor?'
			],
			aktivitaeten: ['Samen säen', 'Felder pflügen', 'Frühlingslieder singen', 'Karneval feiern'],
			bild: '/images/jahreskreis/fruehling.png'
		},
		{
			name: 'Regenmond',
			jahreszeit: 'Springwochen',
			katastrophe: { name: 'Die Große Flut', slug: 'grosse-flut' },
			feste: [{ name: 'Sonnenparade', slug: 'sonnenparade' }],
			farbe: 'spring',
			beschreibung: 'Starker Regen fällt unaufhörlich. Die Welt wird grün und nass.',
			fragen: [
				'Suchst du einen Unterschlupf?',
				'Was versteckt sich im Nebel?',
				'Wer tanzt im Regen?'
			],
			aktivitaeten: ['Im Regen tanzen', 'Tee trinken', 'Geschichten erzählen', 'Parade vorbereiten'],
			bild: '/images/jahreskreis/regenmond.png'
		},
		{
			name: 'Wiesenblühen',
			jahreszeit: 'Leuchtzeit',
			katastrophe: { name: 'Majestätisches Blühen', slug: 'majestaetisches-bluehen' },
			feste: [{ name: 'Hummel Rummel', slug: 'hummel-rummel' }],
			farbe: 'summer',
			beschreibung: 'Alle Blumen blühen, Pollen erfüllen die Luft. Die Welt ist voller Farben.',
			fragen: [
				'Hegst du irgendeinen Groll?',
				'Welche Blumen blühen hier?',
				'Wem möchtest du deine Gefühle gestehen?'
			],
			aktivitaeten: ['Blumenkränze binden', 'Hummeln beobachten', 'Honig probieren', 'Im Gras liegen'],
			bild: '/images/jahreskreis/wiesenbluehen.png'
		},
		{
			name: 'Hitze',
			jahreszeit: 'Leuchtzeit',
			katastrophe: { name: 'Meteorschauer', slug: 'meteorschauer' },
			feste: [{ name: 'Tag der Lieder', slug: 'tag-der-lieder' }],
			farbe: 'summer',
			beschreibung: 'Die Sonne brennt fast unerträglich. Zeit für Schatten, Ruhe und Sternschnuppen.',
			fragen: [
				'Gibt es etwas, das dir nicht aus dem Kopf geht?',
				'Wo findest du Schatten?',
				'Welchen Wunsch sprichst du zu den Sternen?'
			],
			aktivitaeten: ['Mittagsschlaf halten', 'Sternschnuppen zählen', 'Lieder singen', 'Im Bach schwimmen'],
			bild: '/images/jahreskreis/hitze.png'
		},
		{
			name: 'Schwärmerei',
			jahreszeit: 'Atempause',
			katastrophe: { name: 'Geistertanz', slug: 'geistertanz' },
			feste: [{ name: 'Besinnungstag', slug: 'besinnungstag' }],
			farbe: 'late-summer',
			beschreibung: 'Die Luft summt von Käfern und Glühwürmchen. Eine Zeit der Freundschaft und Magie.',
			fragen: [
				'Hast du in letzter Zeit eine neue Freundschaft geschlossen?',
				'Was summt in der Dämmerung?',
				'Wem möchtest du vergeben?'
			],
			aktivitaeten: ['Glühwürmchen beobachten', 'Abendspaziergänge', 'Steinhügel bauen', 'Tanzen'],
			bild: '/images/jahreskreis/schwaermerei.png'
		},
		{
			name: 'Gatterling',
			jahreszeit: 'Atempause',
			katastrophe: { name: 'Flüchtiger Gatterling', slug: 'fluechtiger-gatterling' },
			feste: [],
			farbe: 'late-summer',
			beschreibung: 'Der kürzeste Monat. Heiße Tage, kühle Nächte. Er geht schnell vorbei.',
			fragen: [
				'Bist du verwurzelt?',
				'Was wolltest du noch tun, bevor der Monat vorbei ist?',
				'Wer sitzt mit dir am Lagerfeuer?'
			],
			aktivitaeten: ['Am Lagerfeuer sitzen', 'Sterne beobachten', 'Süßes essen', 'Zelten gehen'],
			bild: '/images/jahreskreis/gatterling.png'
		},
		{
			name: 'Feuerkron',
			jahreszeit: 'Schlickspanne',
			katastrophe: { name: 'Namenloser Tag', slug: 'namenloser-tag' },
			feste: [{ name: 'Drachenfest', slug: 'drachenfest' }],
			farbe: 'autumn',
			beschreibung: 'Die Bäume leuchten rot und orange. Zeit für Ernte, Kürbisse und Lagerfeuer.',
			fragen: [
				'Hast du Pläne für die Zukunft?',
				'Was wird geerntet?',
				'Welcher Drache wartet auf mutige Herzen?'
			],
			aktivitaeten: ['Drachen steigen lassen', 'Äpfel ernten', 'Kürbisse schnitzen', 'Erntedank feiern'],
			bild: '/images/jahreskreis/feuerkron.png'
		},
		{
			name: 'Klauengriff',
			jahreszeit: 'Schlickspanne',
			katastrophe: { name: 'Der Große Sturm', slug: 'sturm' },
			feste: [{ name: 'Kerzenfest', slug: 'kerzenfest' }],
			farbe: 'autumn',
			beschreibung: 'Die Blätter fallen, Nebel zieht auf. Ein kalter, mühseliger Monat vor dem Winter.',
			fragen: [
				'Gibt es etwas, das du vor allen anderen verbirgst?',
				'Wer braucht Hilfe in der Dunkelheit?',
				'Welches Licht leuchtet im Fenster?'
			],
			aktivitaeten: ['Kerzen anzünden', 'Suppe kochen', 'Vorräte anlegen', 'Zusammenrücken'],
			bild: '/images/jahreskreis/klauengriff.png'
		},
		{
			name: 'Schneebett',
			jahreszeit: 'Frostmonde',
			katastrophe: { name: 'Tiefschnee', slug: 'tiefschnee' },
			feste: [{ name: 'Sonnenfinsternis', slug: 'sonnenfinsternis' }],
			farbe: 'winter',
			beschreibung: 'Tiefer Schnee bedeckt die Welt. Eine friedliche Stille liegt über allem.',
			fragen: [
				'Hast du von zu Hause geträumt?',
				'Was schläft unter dem Schnee?',
				'Wie vertreibt ihr euch die Zeit?'
			],
			aktivitaeten: ['Schneemänner bauen', 'Am Feuer wärmen', 'Geschichten erzählen', 'Heißen Tee trinken'],
			bild: '/images/jahreskreis/schneebett.png'
		},
		{
			name: 'Frost',
			jahreszeit: 'Frostmonde',
			katastrophe: { name: 'Blutnacht', slug: 'blutnacht' },
			feste: [{ name: 'Neujahrswoche', slug: 'neujahrswoche' }],
			farbe: 'winter',
			beschreibung: 'Bitterlich kalt. Ein harter Monat, aber am Ende wartet die Hoffnung des neuen Jahres.',
			fragen: [
				'Bist du zufrieden?',
				'Was hast du dieses Jahr gelernt?',
				'Welches Versprechen gibst du dir für das neue Jahr?'
			],
			aktivitaeten: ['Neujahr feiern', 'Feuerwerk schauen', 'Briefe schreiben', 'Einen neuen Namen ausprobieren'],
			bild: '/images/jahreskreis/frost.png'
		}
	];

	const jahreszeiten = [
		{ name: 'Springwochen', farbe: 'spring', monate: ['Frühling', 'Regenmond'], bild: '/images/jahreskreis/springwochen.png' },
		{ name: 'Leuchtzeit', farbe: 'summer', monate: ['Wiesenblühen', 'Hitze'], bild: '/images/jahreskreis/leuchtzeit.png' },
		{ name: 'Atempause', farbe: 'late-summer', monate: ['Schwärmerei', 'Gatterling'], bild: '/images/jahreskreis/atempause.png' },
		{ name: 'Schlickspanne', farbe: 'autumn', monate: ['Feuerkron', 'Klauengriff'], bild: '/images/jahreskreis/schlickspanne.png' },
		{ name: 'Frostmonde', farbe: 'winter', monate: ['Schneebett', 'Frost'], bild: '/images/jahreskreis/frostmonde.png' }
	];
</script>

<svelte:head>
	<title>Der Große Jahreskreis - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Der Große Jahreskreis</h1>
	<p class="intro">
		Eure Wanderung folgt dem Rhythmus der 10 Monate. Jeder Monat bringt eigene
		Stimmungen, eine mögliche <strong>Katastrophe</strong> und ein <strong>Fest</strong> mit sich.
		Ihr spielt so lange in einem Monat, bis ihr entweder die Katastrophe oder das Fest erlebt habt.
	</p>

	<div class="divider"></div>

	<!-- Monate-Rad (gruppiert nach Jahreszeit) -->
	<div class="monate-rad-gruppiert">
		{#each jahreszeiten as js}
			<div class="rad-gruppe" data-farbe={js.farbe}>
				<span class="rad-gruppe-label">{js.name}</span>
				<div class="rad-gruppe-monate">
					{#each js.monate as monatName}
						{@const monat = monate.find(m => m.name === monatName)}
						{#if monat}
							<button class="rad-segment" data-farbe={js.farbe} on:click={() => scrollToMonat(monat.name)}>
								<img src={monat.bild} alt={monat.name} class="rad-bild" />
								<span class="rad-name">{monat.name}</span>
							</button>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<p class="text-center" style="margin-top: var(--space-md);">
		→ Nach <strong>Frost</strong>: <em>Sonnenaufgang</em> (Neues Jahr beginnt)
	</p>

	<div class="divider"></div>

	<!-- Monate-Liste -->
	<div class="monate-liste">
		{#each monate as monat}
			<article
				class="monat-card card"
				data-farbe={monat.farbe}
				id="monat-{monat.name.toLowerCase().replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe')}"
			>
				<header>
					<img src={monat.bild} alt={monat.name} class="monat-bild" />
					<div>
						<h2>{monat.name}</h2>
						<p class="jahreszeit-label">{monat.jahreszeit}</p>
					</div>
				</header>

				<div class="ereignisse">
					<a href="/jahreskreis/ereignisse/{monat.katastrophe.slug}" class="ereignis katastrophe" title="Katastrophe/Phänomen">
						⚡ {monat.katastrophe.name}
					</a>
					{#each monat.feste as fest}
						<a href="/jahreskreis/ereignisse/{fest.slug}" class="ereignis fest" title="Fest">
							🎉 {fest.name}
						</a>
					{/each}
				</div>

				<p class="beschreibung">{monat.beschreibung}</p>

				<div class="fragen">
					<h3>Fragen für diese Zeit</h3>
					<ul>
						{#each monat.fragen as frage}
							<li>{frage}</li>
						{/each}
					</ul>
				</div>

				<div class="aktivitaeten">
					<h3>Aktivitäten</h3>
					<div class="tags">
						{#each monat.aktivitaeten as aktivitaet}
							<span class="tag">{aktivitaet}</span>
						{/each}
					</div>
				</div>
			</article>
		{/each}
	</div>

	<div class="divider"></div>

	<section class="text-center">
		<h2>Bereit für eure Wanderung?</h2>
		<p>Folgt dem Lauf der Monate und erlebt die Jahreszeiten gemeinsam!</p>
		<a href="/spielanleitung" class="btn btn-primary mt-md">Zur Spielanleitung</a>
	</section>
</div>

<style>
	.intro {
		font-size: 1.25rem;
		max-width: 700px;
	}

	.rad-segment:focus-visible {
		outline: 2px solid var(--color-earth);
		outline-offset: 2px;
	}

	/* Monate-Rad gruppiert */
	.monate-rad-gruppiert {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-md);
		padding: var(--space-lg);
	}

	.rad-gruppe {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-lg);
		border: 2px solid var(--color-earth-light);
		border-top: 4px solid var(--color-earth);
	}

	.rad-gruppe[data-farbe="spring"] { border-top-color: var(--color-spring); }
	.rad-gruppe[data-farbe="summer"] { border-top-color: var(--color-summer); }
	.rad-gruppe[data-farbe="late-summer"] { border-top-color: var(--color-late-summer); }
	.rad-gruppe[data-farbe="autumn"] { border-top-color: var(--color-autumn); }
	.rad-gruppe[data-farbe="winter"] { border-top-color: var(--color-winter); }

	.rad-gruppe-label {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-earth-dark);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-earth-light);
		width: 100%;
		text-align: center;
	}

	.rad-gruppe-monate {
		display: flex;
		gap: var(--space-xs);
	}

	.rad-segment {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--space-xs);
		padding: var(--space-sm);
		background: var(--color-parchment);
		border-radius: var(--radius-md);
		min-width: 70px;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		border: none;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
	}

	.rad-segment:hover {
		transform: scale(1.08);
		box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
	}

	.rad-bild {
		width: 70px;
		height: 70px;
		object-fit: cover;
		border-radius: 50%;
		border: 2px solid var(--color-earth-light);
	}

	.rad-name {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.85rem;
		color: var(--color-earth-dark);
	}

	/* Monate-Liste */
	.monate-liste {
		display: grid;
		gap: var(--space-lg);
	}

	.monat-card {
		border-left: 4px solid var(--color-earth);
		scroll-margin-top: var(--space-lg);
		transition: box-shadow 0.3s ease;
	}

	.monat-card.highlight {
		animation: highlight-pulse 1.5s ease;
	}

	@keyframes highlight-pulse {
		0%, 100% { box-shadow: none; }
		20%, 80% { box-shadow: 0 0 0 3px var(--color-earth-light), 0 4px 16px rgba(0, 0, 0, 0.15); }
	}

	.monat-card[data-farbe="spring"] { border-left-color: var(--color-spring); }
	.monat-card[data-farbe="summer"] { border-left-color: var(--color-summer); }
	.monat-card[data-farbe="late-summer"] { border-left-color: var(--color-late-summer); }
	.monat-card[data-farbe="autumn"] { border-left-color: var(--color-autumn); }
	.monat-card[data-farbe="winter"] { border-left-color: var(--color-winter); }

	.monat-card header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		margin-bottom: var(--space-sm);
	}

	.monat-bild {
		width: 100px;
		height: 100px;
		object-fit: cover;
		border-radius: 50%;
		border: 3px solid var(--color-earth-light);
		flex-shrink: 0;
	}

	.monat-card h2 {
		margin: 0;
	}

	.jahreszeit-label {
		margin: 0;
		color: var(--color-earth);
		font-style: italic;
		font-size: 0.9rem;
	}

	.ereignisse {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-sm);
		margin-bottom: var(--space-md);
	}

	.ereignis {
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-md);
		font-size: 0.9rem;
		font-weight: 600;
		text-decoration: none;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
		display: inline-block;
	}

	.ereignis:hover {
		transform: translateY(-2px);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		text-decoration: none;
	}

	.katastrophe {
		background: #f8d7da;
		color: #721c24;
	}

	.katastrophe:hover {
		background: #f1c1c6;
		color: #721c24;
	}

	.fest {
		background: #d4edda;
		color: #155724;
	}

	.fest:hover {
		background: #c3e6cb;
		color: #155724;
	}

	.beschreibung {
		font-size: 1.1rem;
		margin-bottom: var(--space-md);
	}

	.fragen, .aktivitaeten {
		margin-top: var(--space-md);
	}

	.fragen h3, .aktivitaeten h3 {
		font-size: 1rem;
		margin-bottom: var(--space-sm);
		color: var(--color-leaf-dark);
	}

	.fragen ul {
		padding-left: var(--space-lg);
		margin: 0;
	}

	.fragen li {
		margin-bottom: var(--space-xs);
		font-style: italic;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
	}

	.tag {
		background: var(--color-earth-light);
		color: var(--color-bark);
		padding: var(--space-xs) var(--space-sm);
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
	}

	@media (min-width: 768px) {
		.monate-liste {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
