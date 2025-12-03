<script lang="ts">
	import BekannterCard from '$lib/components/BekannterCard.svelte';
	import {
		generiereBekanntenData,
		type GenerierterBekannter,
		type CharakterKlasse
	} from '$lib/data/merkmale';
	import { browser } from '$app/environment';

	// LocalStorage key
	const STORAGE_KEY = 'wurzelwanderer-held';

	// State
	let ausgewaehlteKlasse = $state<typeof charaktere[0] | null>(null);
	let generierterHeld = $state<GenerierterBekannter | null>(null);
	let gespeicherterHeld = $state<GenerierterBekannter | null>(null);

	// Load saved hero on mount
	$effect(() => {
		if (browser) {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				try {
					gespeicherterHeld = JSON.parse(saved);
				} catch (e) {
					console.error('Fehler beim Laden des gespeicherten Helden:', e);
				}
			}
		}
	});

	function generiereHeld(klasse: typeof charaktere[0]) {
		ausgewaehlteKlasse = klasse;
		const bekannter = generiereBekanntenData(true, false);

		// Add character class data
		const charakterKlasse: CharakterKlasse = {
			name: klasse.name,
			frage: klasse.frage,
			tokens: klasse.tokens,
			besonders: klasse.besonders,
			warnung: klasse.warnung
		};

		generierterHeld = {
			...bekannter,
			charakterKlasse
		};
	}

	function speichereHeld() {
		if (generierterHeld && browser) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(generierterHeld));
			gespeicherterHeld = generierterHeld;
			generierterHeld = null;
			ausgewaehlteKlasse = null;
		}
	}

	function ladeGespeichertenHeld() {
		if (gespeicherterHeld) {
			generierterHeld = gespeicherterHeld;
			if (generierterHeld.charakterKlasse) {
				ausgewaehlteKlasse = charaktere.find(c => c.name === generierterHeld!.charakterKlasse!.name) || null;
			}
		}
	}

	function loescheGespeichertenHeld() {
		if (browser) {
			localStorage.removeItem(STORAGE_KEY);
			gespeicherterHeld = null;
		}
	}

	function handleHeldUpdate(updated: GenerierterBekannter) {
		generierterHeld = updated;
	}

	function abbrechenGenerieren() {
		generierterHeld = null;
		ausgewaehlteKlasse = null;
	}

	function getKlasseSlug(name: string): string {
		return name.toLowerCase()
			.replace(/\*/g, '')
			.replace(/ü/g, 'ue')
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ß/g, 'ss');
	}

	const charaktere = [
		{
			name: 'Beschützer*in',
			bild: '/images/charaktere/beschuetzer.png',
			beschreibung: 'Du hast jemanden, für den du sorgst - dein Mündel. Du passt auf, lehrst und lernst dabei selbst.',
			frage: 'Was sind meine Aufgaben meinem Mündel gegenüber?',
			tokens: {
				anderer: 'Frage: „Wo ist mein Mündel?"',
				selbst: 'Befolge einen Ratschlag deines Mündels',
				ausgeben: 'Lass dein Mündel etwas selbst machen'
			},
			besonders: 'Eine Lektion ableiten',
			farbe: 'earth'
		},
		{
			name: 'Exilant*in',
			bild: '/images/charaktere/exilant.png',
			beschreibung: 'Du bist fern von deiner Heimat. Du trägst Erinnerungen und Melodien mit dir, die du teilen kannst.',
			frage: 'Wie war mein Zuhause?',
			tokens: {
				anderer: 'Frage: „Kann ich dir von meiner Heimat erzählen?"',
				selbst: 'Singe oder spiele eine Melodie von Zuhause',
				ausgeben: 'Erinnere dich an etwas Vergessenes von früher'
			},
			besonders: 'Etwas Andersartiges machen',
			farbe: 'sunset'
		},
		{
			name: 'Springinsfeld',
			bild: '/images/charaktere/springinsfeld.png',
			beschreibung: 'Du bist voller Energie und Neugier! Du hast immer neue Ideen und manchmal geht etwas schief.',
			frage: 'Was war mein letztes Missgeschick?',
			tokens: {
				anderer: 'Frage: „Willst du mit mir rumhängen?"',
				selbst: 'Denk dir ein neues Interesse aus und geh ihm nach',
				ausgeben: '„Schaut mal her, was ich kann!"'
			},
			besonders: 'Eine Übertreibung erzählen',
			farbe: 'summer'
		},
		{
			name: 'Vagabund*in',
			bild: '/images/charaktere/vagabund.png',
			beschreibung: 'Du bist geheimnisvoll und wandelbar. Nicht alles, was du sagst, ist wahr - aber es ist immer interessant.',
			frage: 'Wie habt ihr mich aufgenommen?',
			tokens: {
				anderer: 'Frage: „Vertraust du mir?"',
				selbst: 'Lüge, und wenn sie es glauben, sag die Wahrheit',
				ausgeben: 'Werde etwas, was du vorher nicht warst'
			},
			besonders: 'Etwas haben, was man nicht haben sollte',
			farbe: 'berry'
		},
		{
			name: 'Veteran*in',
			bild: '/images/charaktere/veteran.png',
			beschreibung: 'Du hast viel erlebt, vielleicht zu viel. Du versuchst, einen friedlichen Weg zu finden.',
			frage: 'Was muss ich akzeptieren?',
			tokens: {
				anderer: 'Frage: „Was versteckst du?"',
				selbst: 'Sage: „Das tue ich nicht mehr"',
				ausgeben: 'Zieh dein Schwert und beende etwas mit einem Streich'
			},
			besonders: 'Über deine Gefühle reden',
			warnung: 'Wenn du dein Schwert ziehst, darfst du nie wieder Veteran*in spielen!',
			farbe: 'winter'
		}
	];
</script>

<svelte:head>
	<title>Charakter Klassen - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Charakter Klassen</h1>
	<p class="intro">
		Wähle einen Charakter für deine Reise. Jede Klasse beschreibt
		eine besondere Art von Wanderer*in mit eigenen Stärken und Fragen.
	</p>

	{#if gespeicherterHeld && !generierterHeld}
		<div class="gespeicherter-held-banner">
			<div class="banner-content">
				<span class="banner-text">
					Gespeicherter Held: <strong>{gespeicherterHeld.name}</strong>
					{#if gespeicherterHeld.charakterKlasse}
						({gespeicherterHeld.charakterKlasse.name})
					{/if}
				</span>
				<div class="banner-actions">
					<button class="btn btn-secondary btn-sm" onclick={ladeGespeichertenHeld}>
						Anzeigen / Bearbeiten
					</button>
					<button class="btn btn-danger btn-sm" onclick={loescheGespeichertenHeld}>
						Löschen
					</button>
				</div>
			</div>
		</div>
	{/if}

	{#if generierterHeld}
		<div class="generator-result">
			<h2>Dein generierter Held</h2>
			<p class="hint">Doppelklick auf Text-Felder zum Bearbeiten. Änderungen werden beim Speichern übernommen.</p>
			<BekannterCard
				bekannter={generierterHeld}
				editable={true}
				onUpdate={handleHeldUpdate}
			/>
			<div class="generator-actions">
				<button class="btn btn-primary" onclick={speichereHeld}>
					Held speichern
				</button>
				<button class="btn btn-secondary" onclick={() => generiereHeld(ausgewaehlteKlasse!)}>
					Neu generieren
				</button>
				<button class="btn btn-outline" onclick={abbrechenGenerieren}>
					Abbrechen
				</button>
			</div>
		</div>

		<div class="divider"></div>
	{/if}

	<div class="divider"></div>

	<div class="charaktere-liste">
		{#each charaktere as char}
			<article class="charakter-card card" data-farbe={char.farbe} id={getKlasseSlug(char.name)}>
				<div class="char-image">
					<img src={char.bild} alt={char.name} />
				</div>
				<div class="char-content">
					<h2>{char.name}</h2>
					<p class="beschreibung">{char.beschreibung}</p>

					<div class="frage-box">
						<strong>Deine Frage:</strong>
						<p><em>{char.frage}</em></p>
					</div>

					<div class="tokens">
						<h3>Marker</h3>
						<ul>
							<li><span class="token-label">Anderer verdient:</span> {char.tokens.anderer}</li>
							<li><span class="token-label">Selbst verdienen:</span> {char.tokens.selbst}</li>
							<li><span class="token-label">Ausgeben:</span> {char.tokens.ausgeben}</li>
						</ul>
					</div>

					<div class="besonders">
						<strong>Besonderes:</strong> {char.besonders}
					</div>

					{#if char.warnung}
						<div class="warnung">⚠️ {char.warnung}</div>
					{/if}

					<div class="generate-btn-wrapper">
						<button class="btn btn-primary" onclick={() => generiereHeld(char)}>
							Held generieren
						</button>
					</div>
				</div>
			</article>
		{/each}
	</div>

	<div class="divider"></div>

	<section class="text-center">
		<h2>Charakter gewählt?</h2>
		<p>Entdeckt als nächstes die Orte, die ihr bereisen könnt!</p>
		<a href="/naturelle" class="btn btn-primary mt-md">Zu den Naturellen</a>
	</section>
</div>

<style>
	.intro {
		font-size: 1.25rem;
		max-width: 700px;
	}

	/* Gespeicherter Held Banner */
	.gespeicherter-held-banner {
		background: linear-gradient(135deg, var(--color-leaf-dark), var(--color-leaf));
		color: var(--color-cream);
		padding: var(--space-md);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
	}

	.banner-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-md);
	}

	.banner-text {
		font-size: 1rem;
	}

	.banner-actions {
		display: flex;
		gap: var(--space-sm);
	}

	.btn-sm {
		padding: var(--space-xs) var(--space-sm);
		font-size: 0.85rem;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
		border: none;
	}

	.btn-danger:hover {
		background: #c82333;
	}

	.btn-outline {
		background: transparent;
		border: 2px solid var(--color-earth);
		color: var(--color-earth-dark);
	}

	.btn-outline:hover {
		background: var(--color-earth-light);
	}

	/* Generator Result */
	.generator-result {
		background: var(--color-parchment);
		padding: var(--space-lg);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-lg);
		border: 2px solid var(--color-leaf-dark);
	}

	.generator-result h2 {
		margin-top: 0;
		color: var(--color-leaf-dark);
	}

	.generator-result .hint {
		font-size: 0.9rem;
		color: var(--color-earth);
		margin-bottom: var(--space-md);
	}

	.generator-actions {
		display: flex;
		gap: var(--space-md);
		margin-top: var(--space-lg);
		flex-wrap: wrap;
	}

	/* Generate Button in Card */
	.generate-btn-wrapper {
		margin-top: var(--space-lg);
		padding-top: var(--space-md);
		border-top: 1px solid var(--color-earth-light);
	}

	.charaktere-liste {
		display: flex;
		flex-direction: column;
		gap: var(--space-xl);
	}

	.charakter-card {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: var(--space-lg);
		border-left: 4px solid var(--color-earth);
	}

	.charakter-card[data-farbe="earth"] { border-left-color: var(--color-earth); }
	.charakter-card[data-farbe="sunset"] { border-left-color: var(--color-sunset); }
	.charakter-card[data-farbe="summer"] { border-left-color: var(--color-summer); }
	.charakter-card[data-farbe="berry"] { border-left-color: var(--color-berry); }
	.charakter-card[data-farbe="winter"] { border-left-color: var(--color-winter); }

	.char-image {
		display: flex;
		align-items: flex-start;
		justify-content: center;
	}

	.char-image img {
		max-width: 100%;
		height: auto;
		max-height: 380px;
		object-fit: contain;
		border-radius: var(--radius-md);
	}

	.charakter-card h2 {
		margin-bottom: var(--space-sm);
	}

	.beschreibung {
		font-size: 1.1rem;
	}

	.frage-box {
		background: rgba(107, 142, 78, 0.1);
		padding: var(--space-md);
		border-radius: var(--radius-md);
		margin: var(--space-md) 0;
	}

	.frage-box strong {
		color: var(--color-leaf-dark);
	}

	.frage-box p {
		margin: var(--space-xs) 0 0;
		font-size: 1.1rem;
	}

	.tokens h3 {
		font-size: 1rem;
		margin-bottom: var(--space-sm);
	}

	.tokens ul {
		list-style: none;
		padding: 0;
	}

	.tokens li {
		padding: var(--space-xs) 0;
		border-bottom: 1px solid var(--color-earth-light);
	}

	.tokens li:last-child {
		border-bottom: none;
	}

	.token-label {
		font-weight: 600;
		color: var(--color-earth-dark);
	}

	.besonders {
		margin-top: var(--space-md);
		padding: var(--space-sm);
		background: var(--color-cream);
		border-radius: var(--radius-sm);
	}

	.warnung {
		margin-top: var(--space-md);
		padding: var(--space-sm);
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: var(--radius-sm);
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.charakter-card {
			grid-template-columns: 1fr;
		}
		.char-image {
			justify-content: center;
		}
		.char-image img {
			max-height: 200px;
		}
	}
</style>
