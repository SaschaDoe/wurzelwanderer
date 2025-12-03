<script lang="ts">
	let markerCount = $state(3);
	let markerAnimation = $state<'erhalten' | 'ausgeben' | null>(null);

	const erhaltenOptionen = [
		'Du gibst etwas her, das dir wichtig ist',
		'Du bringst den Naturwesen ein Geschenk',
		'Du beschreibst etwas Schönes',
		'Du hilfst jemandem (wenn er dankbar ist)'
	];

	const ausgebenOptionen = [
		'Du bekommst etwas, das dir wichtig ist',
		'Du bekommst Rat von einem Naturwesen',
		'Du erfährst etwas, das du wissen möchtest',
		'Dir hilft jemand'
	];

	function erhalteMarker() {
		markerCount++;
		markerAnimation = 'erhalten';
		setTimeout(() => markerAnimation = null, 600);
	}

	function gebeMarkerAus() {
		if (markerCount > 0) {
			markerCount--;
			markerAnimation = 'ausgeben';
			setTimeout(() => markerAnimation = null, 600);
		}
	}

	const werkzeuge = [
		{
			name: 'Ich möchte unbedingt sprechen!',
			beschreibung: 'Kann man einmal pro Runde machen, um sicherzustellen, dass man gehört wird.'
		},
		{
			name: 'Was denkst du dazu?',
			beschreibung: 'Beziehe jemanden ein, der gerade still ist. Du bekommst einen Marker dafür.'
		},
		{
			name: 'Lass uns lieber etwas anderes machen',
			beschreibung: 'Schlage eine andere Richtung vor, wenn dir etwas unangenehm ist.'
		},
		{
			name: 'Wartet mal',
			beschreibung: 'Mach eine Pause, spring zurück oder ergänze etwas.'
		},
		{
			name: 'Nein',
			beschreibung: 'Du kannst jeden Aspekt der Reise ändern. Deine Grenzen werden respektiert.'
		}
	];

</script>

<svelte:head>
	<title>Spielanleitung - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<header class="page-header">
		<h1>Spielanleitung</h1>
		<p class="intro">
			Wurzelwanderer ist ein Erzählspiel ohne Gewinner und Verlierer.
			Gemeinsam erzählt ihr Geschichten über eure Wanderung durch eine
			märchenhafte Welt.
		</p>
	</header>

	<!-- Was ihr braucht -->
	<section class="section">
		<h2>Was ihr braucht</h2>
		<div class="needs-grid">
			<div class="need-item">
				<span class="need-label">Spieler</span>
				<span class="need-value">2–5 Personen</span>
				<span class="need-detail">Am besten mit einem Erwachsenen als Wanderleiter</span>
			</div>
			<div class="need-item">
				<span class="need-label">Marker</span>
				<span class="need-value">Kleine Schätze</span>
				<span class="need-detail">Steine, Murmeln, Kastanien oder Bohnen</span>
			</div>
			<div class="need-item">
				<span class="need-label">Stimmung</span>
				<span class="need-value">Gemütlichkeit</span>
				<span class="need-detail">Kissen, Kerzen, vielleicht Tee und Kekse</span>
			</div>
		</div>
	</section>

	<!-- Der Wanderleiter -->
	<section class="section wanderleiter-section">
		<div class="section-with-image">
			<div class="section-content">
				<h2>Der Wanderleiter</h2>
				<p class="section-intro">Eine Person übernimmt die Rolle des Wanderleiters – meist ein Erwachsener, der gut vorlesen kann.</p>

				<div class="aufgaben-liste">
					<div class="aufgabe-item">
						<strong>Rahmen setzen</strong>
						<span>Bestimmt wann und wo die Geschichte spielt</span>
					</div>
					<div class="aufgabe-item">
						<strong>Fragen stellen</strong>
						<span>Hilft die Geschichte weiterzuführen</span>
					</div>
					<div class="aufgabe-item">
						<strong>Bekannte spielen</strong>
						<span>Gibt Wesen und Personen eine Stimme</span>
					</div>
					<div class="aufgabe-item">
						<strong>Naturwesen verkörpern</strong>
						<span>Spricht für Gnome, Elfen, Wasserwesen</span>
					</div>
				</div>
			</div>
			<img src="/images/wanderleiter.png?v=2" alt="Wanderleiter" class="section-image" />
		</div>
	</section>

	<!-- Die Werkzeuge -->
	<section class="section">
		<h2>Die Werkzeuge</h2>
		<p class="section-intro">Diese Sätze helfen euch, gut miteinander zu spielen. Jeder darf sie jederzeit benutzen.</p>

		<div class="werkzeuge-grid">
			{#each werkzeuge as werkzeug, i}
				<div class="werkzeug-item">
					<span class="werkzeug-nummer">{i + 1}</span>
					<div class="werkzeug-content">
						<strong>„{werkzeug.name}"</strong>
						<span>{werkzeug.beschreibung}</span>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Marker -->
	<section class="section marker-section">
		<h2>Marker</h2>
		<p class="section-intro">Marker zeigen, wie eure Wandernden geben und nehmen. Das Grundprinzip ist einfach:</p>

		<div class="marker-prinzip">
			<span class="prinzip-text">Geben bringt Marker — Bekommen kostet Marker</span>
		</div>

		<div class="marker-grid">
			<div class="marker-spalte erhalten">
				<h3>Marker erhalten</h3>
				<p class="marker-hinweis">Du bekommst einen Marker, wenn du gibst:</p>
				<div class="marker-buttons">
					{#each erhaltenOptionen as option}
						<button class="marker-btn erhalten" onclick={erhalteMarker}>{option}</button>
					{/each}
				</div>
			</div>
			<div class="marker-spalte ausgeben">
				<h3>Marker ausgeben</h3>
				<p class="marker-hinweis">Du gibst einen Marker aus, wenn du bekommst:</p>
				<div class="marker-buttons">
					{#each ausgebenOptionen as option}
						<button class="marker-btn ausgeben" onclick={gebeMarkerAus} disabled={markerCount === 0}>{option}</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Marker Animation -->
		<div class="marker-display">
			<div class="marker-pool" class:animating-erhalten={markerAnimation === 'erhalten'} class:animating-ausgeben={markerAnimation === 'ausgeben'}>
				{#each Array(markerCount) as _, i}
					<span class="marker-token">●</span>
				{/each}
				{#if markerCount === 0}
					<span class="marker-empty">Keine Marker</span>
				{/if}
			</div>
			<span class="marker-count">{markerCount} Marker</span>
		</div>

		<p class="marker-hinweis-charakter">Jeder Charakter hat zusätzlich individuelle Möglichkeiten, Marker zu erhalten, auszugeben oder anderen zu geben. Schau in die <a href="/wurzelbuecher">Charakter Klassen</a>!</p>
	</section>

	<!-- Eine Runde spielen -->
	<section class="section runde-section">
		<h2>Eine Runde spielen</h2>
		<p class="section-intro">Jede Runde ist wie eine kleine Episode. Ihr kommt an einem Ort an, erlebt etwas und zieht weiter.</p>

		<!-- Zu Beginn -->
		<div class="runde-phase phase-beginn">
			<div class="phase-banner">
				<img src="/images/runde-beginn.png?v=4" alt="" />
				<div class="phase-title">
					<span class="phase-nummer">1</span>
					<h3>Zu Beginn</h3>
				</div>
			</div>
			<div class="phase-body">
				<p class="phase-intro">Bevor die Geschichte beginnt, stimmt ihr euch ein.</p>
				<div class="fragen-zweispaltig">
					<div class="fragen-spalte spieler">
						<span class="spalte-label">Alle Wandernden</span>
						<ul>
							<li><strong>„Wie geht es mir?"</strong> — Stimmung</li>
							<li><strong>„Woran denke ich?"</strong> — Erinnerung, Wunsch, Sorge</li>
							<li><strong>„Warum wandere ich?"</strong> — Motivation</li>
						</ul>
					</div>
					<div class="fragen-spalte leiter">
						<span class="spalte-label">Der Wanderleiter</span>
						<ul>
							<li><strong>„Wann ist gerade?"</strong> — Jahreszeit, Monat, Fest</li>
							<li><strong>„Wo sind wir?"</strong> — Drei Naturelle wählen</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<!-- Während der Runde -->
		<div class="runde-phase phase-mitte">
			<div class="phase-banner">
				<img src="/images/runde-mitte.png?v=4" alt="" />
				<div class="phase-title">
					<span class="phase-nummer">2</span>
					<h3>Während der Runde</h3>
				</div>
			</div>
			<div class="phase-body">
				<p class="phase-intro">Der Wanderleiter stellt Fragen und beschreibt die Welt. Die Wandernden entscheiden, was sie tun.</p>
				<p class="phase-ziel">Ihr spielt, bis ihr das <strong>Fest</strong> oder die <strong>Katastrophe</strong> des Monats erlebt habt.</p>
			</div>
		</div>

		<!-- Montage -->
		<div class="runde-phase phase-montage">
			<div class="phase-banner">
				<img src="/images/montage.png?v=4" alt="" />
				<div class="phase-title">
					<span class="phase-nummer">3</span>
					<h3>Montage</h3>
				</div>
			</div>
			<div class="phase-body">
				<p class="phase-intro">Wenn ihr einen Ort verlasst, haltet kurz inne.</p>
				<div class="fragen-spalte montage-fragen">
					<span class="spalte-label">Alle Wandernden</span>
					<ul>
						<li><strong>„Was lasse ich hinter mir?"</strong> — Vor allem: wen?</li>
						<li><strong>„Wie habe ich mich verändert?"</strong> — Was gelernt?</li>
						<li><strong>„Was passiert, nachdem wir gehen?"</strong> — Die Welt lebt weiter</li>
					</ul>
				</div>
			</div>
		</div>
	</section>

	<!-- Bereit -->
	<section class="section cta-section">
		<h2>Bereit für die Wanderung?</h2>
		<p>Wählt eure Charaktere und erkundet die Welt!</p>
		<div class="cta-buttons">
			<a href="/wurzelbuecher" class="btn-cta primary">Charaktere</a>
			<a href="/jahreskreis" class="btn-cta">Jahreskreis</a>
			<a href="/naturelle" class="btn-cta">Naturelle</a>
		</div>
	</section>
</div>

<style>
	/* Page Header */
	.page-header {
		margin-bottom: var(--space-lg);
	}

	.intro {
		font-size: 1.1rem;
		color: var(--color-earth);
		max-width: 650px;
	}

	/* Sections */
	.section {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-lg);
		border-bottom: 1px solid var(--color-earth-light);
	}

	.section:last-of-type {
		border-bottom: none;
	}

	.section h2 {
		margin-bottom: var(--space-xs);
	}

	.section-intro {
		color: var(--color-earth);
		margin-bottom: var(--space-md);
		max-width: 650px;
	}

	/* Was ihr braucht */
	.needs-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--space-md);
	}

	.need-item {
		display: flex;
		flex-direction: column;
		padding: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border-top: 3px solid var(--color-leaf);
	}

	.need-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-earth);
		margin-bottom: var(--space-xs);
	}

	.need-value {
		font-family: var(--font-display);
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-earth-dark);
		margin-bottom: var(--space-xs);
	}

	.need-detail {
		font-size: 0.85rem;
		color: var(--color-earth);
	}

	/* Wanderleiter Section */
	.section-with-image {
		display: flex;
		gap: var(--space-lg);
		align-items: flex-start;
	}

	.section-content {
		flex: 1;
	}

	.section-image {
		width: 180px;
		height: auto;
		flex-shrink: 0;
		border-radius: var(--radius-md);
	}

	.aufgaben-liste {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-xs);
	}

	.aufgabe-item {
		display: flex;
		flex-direction: column;
		padding: var(--space-xs) var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-sm);
		border-left: 3px solid var(--color-leaf);
	}

	.aufgabe-item strong {
		color: var(--color-earth-dark);
		font-size: 0.9rem;
	}

	.aufgabe-item span {
		font-size: 0.8rem;
		color: var(--color-earth);
	}

	/* Werkzeuge */
	.werkzeuge-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-sm);
	}

	.werkzeug-item {
		display: flex;
		align-items: flex-start;
		gap: var(--space-sm);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
	}

	.werkzeug-item:last-child {
		grid-column: 1 / -1;
		background: var(--color-parchment);
		justify-content: center;
	}

	.werkzeug-item:last-child .werkzeug-content {
		text-align: center;
	}

	.werkzeug-nummer {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 26px;
		height: 26px;
		background: var(--color-earth-light);
		color: var(--color-earth-dark);
		border-radius: 50%;
		font-size: 0.8rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.werkzeug-item:last-child .werkzeug-nummer {
		background: var(--color-autumn);
		color: white;
	}

	.werkzeug-content {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.werkzeug-content strong {
		color: var(--color-earth-dark);
		font-size: 0.95rem;
	}

	.werkzeug-content span {
		font-size: 0.85rem;
		color: var(--color-earth);
	}

	/* Marker */
	.marker-prinzip {
		background: var(--color-parchment);
		padding: var(--space-sm) var(--space-md);
		border-radius: var(--radius-md);
		text-align: center;
		margin-bottom: var(--space-md);
	}

	.prinzip-text {
		font-family: var(--font-display);
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-earth-dark);
	}

	.marker-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--space-md);
	}

	.marker-spalte {
		padding: var(--space-md);
		border-radius: var(--radius-md);
		border-top: 4px solid var(--color-earth);
	}

	.marker-spalte.erhalten {
		background: linear-gradient(180deg, #f0f7e6 0%, var(--color-cream) 100%);
		border-top-color: var(--color-leaf);
	}

	.marker-spalte.ausgeben {
		background: linear-gradient(180deg, #fef3e6 0%, var(--color-cream) 100%);
		border-top-color: var(--color-autumn);
	}

	.marker-spalte h3 {
		font-size: 0.95rem;
		margin-bottom: 2px;
	}

	.marker-hinweis {
		font-size: 0.8rem;
		color: var(--color-earth);
		margin-bottom: var(--space-sm);
	}

	.marker-buttons {
		display: flex;
		flex-direction: column;
		gap: var(--space-xs);
	}

	.marker-btn {
		padding: var(--space-xs) var(--space-sm);
		border: none;
		border-radius: var(--radius-sm);
		font-size: 0.85rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.2s ease;
		font-family: var(--font-body);
	}

	.marker-btn.erhalten {
		background: var(--color-cream);
		color: var(--color-earth-dark);
		border-left: 3px solid var(--color-leaf);
	}

	.marker-btn.erhalten:hover {
		background: var(--color-leaf-light);
		color: var(--color-bark);
	}

	.marker-btn.ausgeben {
		background: var(--color-cream);
		color: var(--color-earth-dark);
		border-left: 3px solid var(--color-autumn);
	}

	.marker-btn.ausgeben:hover:not(:disabled) {
		background: var(--color-sunset);
		color: var(--color-bark);
	}

	.marker-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Marker Display */
	.marker-display {
		margin-top: var(--space-lg);
		padding: var(--space-md);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		text-align: center;
	}

	.marker-pool {
		display: flex;
		justify-content: center;
		gap: var(--space-xs);
		flex-wrap: wrap;
		min-height: 40px;
		align-items: center;
		transition: transform 0.3s ease;
	}

	.marker-pool.animating-erhalten {
		animation: pulse-green 0.6s ease;
	}

	.marker-pool.animating-ausgeben {
		animation: pulse-orange 0.6s ease;
	}

	@keyframes pulse-green {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	@keyframes pulse-orange {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(0.9); }
	}

	.marker-token {
		font-size: 1.8rem;
		color: var(--color-autumn);
		text-shadow: 0 2px 4px rgba(0,0,0,0.2);
		animation: pop-in 0.3s ease;
	}

	@keyframes pop-in {
		0% { transform: scale(0); opacity: 0; }
		100% { transform: scale(1); opacity: 1; }
	}

	.marker-empty {
		color: var(--color-earth);
		font-style: italic;
		font-size: 0.9rem;
	}

	.marker-count {
		display: block;
		margin-top: var(--space-sm);
		font-weight: 600;
		color: var(--color-earth-dark);
		font-size: 0.9rem;
	}

	.marker-hinweis-charakter {
		margin-top: var(--space-md);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		font-size: 0.85rem;
		color: var(--color-earth);
		text-align: center;
		border: 1px dashed var(--color-earth-light);
	}

	.marker-hinweis-charakter a {
		font-weight: 600;
	}

	/* Runde Section */
	.runde-phase {
		margin-bottom: var(--space-lg);
		border-radius: var(--radius-lg);
		overflow: hidden;
		background: var(--color-cream);
	}

	.runde-phase:last-child {
		margin-bottom: 0;
	}

	.phase-banner {
		position: relative;
		height: 140px;
		overflow: hidden;
	}

	.phase-banner img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 30%;
	}

	.phase-banner::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 60%);
	}

	.phase-title {
		position: absolute;
		bottom: var(--space-md);
		left: var(--space-md);
		display: flex;
		align-items: center;
		gap: var(--space-sm);
		z-index: 1;
	}

	.phase-nummer {
		width: 32px;
		height: 32px;
		background: var(--color-leaf);
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1rem;
	}

	.phase-title h3 {
		margin: 0;
		color: white;
		font-size: 1.3rem;
		text-shadow: 0 1px 3px rgba(0,0,0,0.3);
	}

	.phase-body {
		padding: var(--space-md);
	}

	.phase-intro {
		margin: 0 0 var(--space-md) 0;
		color: var(--color-earth);
		font-size: 0.95rem;
	}

	.phase-ziel {
		margin: 0;
		padding: var(--space-sm) var(--space-md);
		background: var(--color-parchment);
		border-radius: var(--radius-md);
		border-left: 3px solid var(--color-autumn);
		font-size: 0.9rem;
	}

	/* Fragen Spalten */
	.fragen-zweispaltig {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-md);
	}

	.fragen-spalte {
		padding-left: var(--space-md);
		border-left: 3px solid var(--color-earth-light);
	}

	.fragen-spalte.spieler {
		border-left-color: var(--color-leaf);
	}

	.fragen-spalte.leiter {
		border-left-color: var(--color-autumn);
	}

	.fragen-spalte.montage-fragen {
		border-left-color: #8e7cc3;
	}

	.spalte-label {
		display: block;
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-earth);
		margin-bottom: var(--space-xs);
		font-weight: 600;
	}

	.fragen-spalte ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.fragen-spalte li {
		margin-bottom: var(--space-xs);
		font-size: 0.9rem;
		color: var(--color-earth-dark);
	}

	.fragen-spalte li strong {
		color: var(--color-bark);
	}

	/* Phase Colors */
	.phase-beginn .phase-nummer { background: var(--color-leaf); }
	.phase-mitte .phase-nummer { background: var(--color-autumn); }
	.phase-montage .phase-nummer { background: #8e7cc3; }
	.phase-montage { background: linear-gradient(180deg, #f5f3fa 0%, var(--color-cream) 100%); }

	/* CTA Section */
	.cta-section {
		text-align: center;
		padding: var(--space-lg);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		border-bottom: none;
	}

	.cta-section h2 {
		margin-bottom: var(--space-xs);
		font-size: 1.3rem;
	}

	.cta-section p {
		color: var(--color-earth);
		margin-bottom: var(--space-md);
		font-size: 0.95rem;
	}

	.cta-buttons {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: var(--space-sm);
	}

	.btn-cta {
		padding: var(--space-xs) var(--space-md);
		border-radius: var(--radius-md);
		font-weight: 600;
		font-size: 0.9rem;
		text-decoration: none;
		transition: all 0.2s ease;
		background: white;
		color: var(--color-earth-dark);
		border: 2px solid var(--color-earth-light);
	}

	.btn-cta:hover {
		background: var(--color-cream);
		border-color: var(--color-earth);
		text-decoration: none;
	}

	.btn-cta.primary {
		background: var(--color-leaf);
		color: white;
		border-color: var(--color-leaf);
	}

	.btn-cta.primary:hover {
		background: var(--color-leaf-dark);
		border-color: var(--color-leaf-dark);
	}

	/* Responsive */
	@media (max-width: 768px) {
		.section-with-image {
			flex-direction: column;
		}

		.section-image {
			width: 120px;
			margin: 0 auto var(--space-md);
		}

		.aufgaben-liste {
			grid-template-columns: 1fr;
		}

		.werkzeuge-grid {
			grid-template-columns: 1fr;
		}

		.phase-banner {
			height: 100px;
		}

		.fragen-zweispaltig {
			grid-template-columns: 1fr;
		}
	}
</style>
