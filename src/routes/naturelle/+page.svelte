<script lang="ts">
	import BekannterCard from '$lib/components/BekannterCard.svelte';
	import { generiereBekanntenData, type GenerierterBekannter } from '$lib/data/merkmale';

	// Type definitions
	type StimmungItem = string | { text: string; magisch?: boolean; trauma?: boolean };

	// Generator State
	let erlaubeMagisch = $state(true);
	let erlaubeTrauma = $state(true);
	let anzahlNaturelle = $state(3);
	let anzahlBekannte = $state(2);
	let aktiveKategorien = $state<string[]>(['Gemütlich', 'Lebendig', 'Verbindend', 'Weitläufig', 'Einsam', 'Verlassen']);

	let generierterOrt = $state<{
		name: string;
		naturelle: Array<{
			name: string;
			bild: string;
			beschreibung: string;
			kannImmer: string[];
			stimmung: StimmungItem[];
			volkssagen: StimmungItem[];
			kategorie: string;
			farbe: string;
		}>;
		bekannte: GenerierterBekannter[];
	} | null>(null);

	// Helper functions
	function getRandomElement<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	function getRandomElements<T>(arr: T[], count: number): T[] {
		const shuffled = [...arr].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, Math.min(count, arr.length));
	}


	function generiereOrt() {
		// Filter categories by active selection
		const aktiveKats = kategorien.filter(k => aktiveKategorien.includes(k.name));
		if (aktiveKats.length === 0) return;

		// Collect all naturelle from active categories
		const alleNaturelleRaw = aktiveKats.flatMap(k =>
			k.naturelle.map(n => ({ ...n, kategorie: k.name, farbe: k.farbe }))
		);

		// Filter stimmung based on magic/trauma settings
		const alleNaturelle = alleNaturelleRaw.map(n => ({
			...n,
			stimmung: (n.stimmung as StimmungItem[]).filter(s => {
				if (!erlaubeMagisch && isMagisch(s)) return false;
				if (!erlaubeTrauma && isTrauma(s)) return false;
				return true;
			}),
			volkssagen: (n.volkssagen as StimmungItem[]).filter(v => {
				if (!erlaubeMagisch && isMagisch(v)) return false;
				return true;
			})
		}));

		// Select random naturelle
		const gewaehlteNaturelle = getRandomElements(alleNaturelle, anzahlNaturelle);

		// Generate Bekannte with full data
		const bekannte = Array.from({ length: anzahlBekannte }, () =>
			generiereBekanntenData(erlaubeMagisch, erlaubeTrauma)
		);

		// Generate place name from one of the selected Naturelle
		const naturellMitNamen = gewaehlteNaturelle.filter(n => n.ortsnamen && n.ortsnamen.length > 0);
		const ortsname = naturellMitNamen.length > 0
			? getRandomElement(getRandomElement(naturellMitNamen).ortsnamen)
			: gewaehlteNaturelle[0].name;

		generierterOrt = {
			name: ortsname,
			naturelle: gewaehlteNaturelle,
			bekannte
		};
	}

	function toggleKategorie(name: string) {
		if (aktiveKategorien.includes(name)) {
			if (aktiveKategorien.length > 1) {
				aktiveKategorien = aktiveKategorien.filter(k => k !== name);
			}
		} else {
			aktiveKategorien = [...aktiveKategorien, name];
		}
	}

	function addBekannter() {
		if (!generierterOrt) return;
		const neuerBekannter = generiereBekanntenData(erlaubeMagisch, erlaubeTrauma);
		generierterOrt = {
			...generierterOrt,
			bekannte: [...generierterOrt.bekannte, neuerBekannter]
		};
	}

	function removeBekannter() {
		if (!generierterOrt || generierterOrt.bekannte.length === 0) return;
		generierterOrt = {
			...generierterOrt,
			bekannte: generierterOrt.bekannte.slice(0, -1)
		};
	}

	function removeBekannterAt(index: number) {
		if (!generierterOrt) return;
		generierterOrt = {
			...generierterOrt,
			bekannte: generierterOrt.bekannte.filter((_, i) => i !== index)
		};
	}

	// Helper to get text from string or object format
	function getText(item: StimmungItem): string {
		return typeof item === 'string' ? item : item.text;
	}
	function isMagisch(item: StimmungItem): boolean {
		return typeof item === 'object' && !!item.magisch;
	}
	function isTrauma(item: StimmungItem): boolean {
		return typeof item === 'object' && !!item.trauma;
	}

	function scrollToNaturell(name: string) {
		const id = name.toLowerCase()
			.replace(/ü/g, 'ue')
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ß/g, 'ss')
			.replace(/ /g, '-');
		const element = document.getElementById(`naturell-${id}`);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
			element.classList.add('highlight');
			setTimeout(() => element.classList.remove('highlight'), 1500);
		}
	}

	const kategorien = [
		{
			name: 'Gemütlich',
			farbe: 'warm',
			beschreibung: 'Orte der Wärme, Geborgenheit und des alltäglichen Lebens',
			naturelle: [
				{
					name: 'Bauernhof',
					bild: '/images/naturelle/bauernhof.png',
					beschreibung: 'Ein Ort, an dem Leute ein unauffälliges Leben führen, tief verwurzelt in den Lauf der Jahreszeiten.',
					ortsnamen: ['Ährenhof', 'Mühlental', 'Kornweiler', 'Saathausen', 'Erntegut', 'Feldheim', 'Pflugstein', 'Halmgrund', 'Hühnerstall', 'Scheunendach', 'Kartoffelacker', 'Mistgabel', 'Heuboden', 'Kuhweide', 'Ziegenstube', 'Apfelkeller'],
					kannImmer: [
						'Die ruhige Gewöhnlichkeit des alltäglichen Lebens beschreiben',
						'Deutlich machen, wie knapp die Mittel sind',
						'Fragen: „Hey, willst du mithelfen?"'
					],
					stimmung: ['Tunichtgute und feierndes Volk', 'Getreide, so weit das Auge reicht', 'Friedliche Nutztiere', 'Rostige Kriegswaffen', 'Der Geruch von frischem Heu', 'Kinder, die über den Hof rennen', 'Ein alter Hund auf der Veranda', 'Rauch aus dem Schornstein', 'Wäsche, die im Wind flattert', { text: 'Ein ‡darbender Wanderer bittet um Hilfe', trauma: true }],
					volkssagen: ['Die Vogelscheuche, die fortging', 'Der Regen, der hundert Tage anhielt', 'Das Apfelmädchen und ihre liebenden Eltern']
				},
				{
					name: 'Garten',
					bild: '/images/naturelle/garten.png',
					beschreibung: 'Ein Ort, an dem alle genug haben und die Welt vor Geschenken nur so überfließt.',
					ortsnamen: ['Blütenhain', 'Obstgarten Eden', 'Grüntal', 'Blumenwiese', 'Rankenhof', 'Früchteland', 'Rosenheim', 'Kürbisgrund', 'Beerenstrauch', 'Kirschbaum', 'Honigstock', 'Nusslager', 'Weinrebe', 'Pilzwald', 'Kräuterbeet', 'Brombeerzaun', 'Pflaumenhang', 'Erdbeerhügel'],
					kannImmer: [
						'Den Überfluss um uns herum beschreiben',
						'Die Gesundheit dieses Überflusses bedrohen',
						'Fragen: „Was brauchst du jetzt gerade am meisten?"'
					],
					stimmung: ['Bäume, die sich vor Früchten biegen', 'Unfassbar riesige Kürbisse', 'Schillernde Schmetterlinge', 'Sorgfältig gestutzte Hecken', 'Summende Bienen zwischen Blüten', 'Ein plätschernder Brunnen', 'Windspiele aus Glas', 'Versteckte Nischen zum Ausruhen', 'Ranken, die über alles wachsen', { text: 'Eine ✧alte Gottheit im Herzen des Gartens', magisch: true }],
					volkssagen: ['Die prophetische Blüte des Pfirsichbaums', 'Die alte Gottheit in dem alten Baum', 'Das Verbrennen der Mais-Frau']
				},
				{
					name: 'Kloster',
					bild: '/images/naturelle/kloster.png',
					beschreibung: 'Ein Ort, an dem sich eine Gemeinschaft versammelt, um aus der Vergangenheit zu lernen.',
					ortsnamen: ['Stille Abtei', 'Glockenhof', 'Ordensheim', 'Gebetsberg', 'Kerzenschein', 'Andachtstal', 'Weihrauchklause', 'Ewige Ruh', 'Kreuzgang', 'Schreibstube', 'Kräutergarten', 'Kellergewölbe', 'Chorgestühl', 'Kapitelsaal', 'Pilgerzelle', 'Bibliothek'],
					kannImmer: [
						'Den Rhythmus des täglichen Lebens beschreiben',
						'Spannungen durch Generationskonflikte zeigen',
						'Fragen: „Bist du bereit, auf die Antwort zu warten?"'
					],
					stimmung: ['Das Dröhnen der Glocken', 'Ein einfacher Kräutergarten', 'Schreibstube voller Wissen', 'Unterirdische Katakomben', 'Gesang aus einer fernen Halle', 'Der Duft von Weihrauch', 'Mönche, die schweigend vorbeigehen', 'Uralte Bücher in staubigen Regalen', 'Kerzenlicht, das Schatten wirft', { text: 'Ein ‡trauernder Novize, der zweifelt', trauma: true }],
					volkssagen: ['Die großzügige Mentorin und ihr Verrat', 'Der Hausmeister und die geheimen Lektionen', 'Der alabasterne Mönch']
				},
				{
					name: 'Markt',
					bild: '/images/naturelle/markt.png',
					beschreibung: 'Ein Ort, an dem beinahe alles gehandelt und getauscht werden kann.',
					ortsnamen: ['Handelsplatz', 'Krämereck', 'Tauschwinkel', 'Marktstadt', 'Goldwaage', 'Kaufhallen', 'Warenkreuz', 'Silbermarkt', 'Gewürzbude', 'Stoffzelt', 'Antiquariat', 'Schmuckstand', 'Fischmarkt', 'Töpfergasse', 'Lederhändler', 'Münzwechsler'],
					kannImmer: [
						'Beschreiben, was du hier finden kannst',
						'Die Konsequenzen von Diebstahl aufzeigen',
						'Etwas zu einem erschwinglichen Preis anbieten'
					],
					stimmung: ['Präsentable Nutztiere', 'Fremdartige Waren', 'Verwirrende Währungen', 'Antike Relikte', 'Das Feilschen der Händler', 'Der Duft exotischer Gewürze', 'Bunte Stoffe im Wind', 'Ein Taschendieb im Gedränge', 'Straßenmusikanten', { text: 'Ein ✧mysteriöser Händler mit unmöglichen Waren', magisch: true }],
					volkssagen: ['Der Aal-Daemon und die Lautenspielerin', 'Die Krähe und die dreiunddreißig Diebe', 'Der Goldene König und sein Herz']
				},
				{
					name: 'Turm',
					bild: '/images/naturelle/turm.png',
					beschreibung: 'Ein Ort, der so hoch in den Himmel reicht, dass es sich anfühlt, als würde er an den Wolken kratzen.',
					ortsnamen: ['Himmelsspitze', 'Wolkenwacht', 'Sterngucker', 'Leuchtfeuer', 'Windspiel', 'Hoher Blick', 'Mottenturm', 'Nebelhorn', 'Glockenturm', 'Wetterfahne', 'Taubenschlag', 'Observatorium', 'Wachstube', 'Turmzimmer', 'Signalfeuer', 'Wendeltreppe'],
					kannImmer: [
						'Etwas beschreiben, das sehr klein und weit weg ist',
						'Besorgnis wegen der baulichen Stabilität verbreiten',
						'Eine Person desorientiert oder schwindelig werden lassen'
					],
					stimmung: [
						'Schmaler und instabiler Eingang',
						'Gewundene Treppe nach oben',
						'Glänzendes Warnlicht',
						'Motten im Dachgebälk',
						'Wind, der durch die Fenster pfeift',
						'Ein atemberaubender Blick',
						'Tauben, die in den Balken nisten',
						'Spinnweben in den Ecken',
						{ text: 'Ein ✧prophetischer Sternendeuter', magisch: true },
						{ text: 'Eine ‡trauernde Seele, die dafür verantwortlich ist, dass hier alles funktioniert', trauma: true }
					],
					volkssagen: [{ text: 'Das Observatorium der Gewittertanzenden' }, { text: 'Der erste der Motten-Türme' }, { text: 'Der Geist, der über die Treppe wandelte' }]
				},
				{
					name: 'Werkstatt',
					bild: '/images/naturelle/werkstatt.png',
					beschreibung: 'Ein Ort, wo feines Handwerk und gute Waren erschaffen und zum Leben erweckt werden.',
					ortsnamen: ['Hammerschlag', 'Weberstube', 'Töpferei', 'Schmiedefeuer', 'Fleißige Hände', 'Werkbank', 'Meisterhof', 'Spindelhaus', 'Drechslerei', 'Färberei', 'Gerberei', 'Glasbläserei', 'Korbflechter', 'Seilerei', 'Böttcherei', 'Schreinerei'],
					kannImmer: [
						'Beschreiben, wie etwas erschaffen wird',
						'Einen Konflikt zwischen Erwartung und Nachfrage zeigen',
						'Wenn jemand hart arbeitet, bekommt er einen Marker'
					],
					stimmung: ['Ein surrender Webstuhl', 'Eine tuckernde Fabrikanlage', 'Ein Arbeitslied', 'Eine wichtige Nachschubkette', 'Der Geruch von frisch geschnittenem Holz', 'Hände voller Schwielen', 'Ein Meisterwerk, halb vollendet', 'Lehrlinge bei der Arbeit', 'Werkzeuge an der Wand', { text: 'Ein ✧wundertätiges Werk, das niemand erklären kann', magisch: true }],
					volkssagen: ['Die Kunsthandwerkerin, die sich eine Braut erschuf', 'Der Töpfer und die Göttin', 'Der niemals endende Wandteppich']
				}
			]
		},
		{
			name: 'Lebendig',
			farbe: 'nature',
			beschreibung: 'Orte voller Natur, Leben und wilder Schönheit',
			naturelle: [
				{
					name: 'Bergschlucht',
					bild: '/images/naturelle/bergschlucht.png',
					beschreibung: 'Ein Ort, der von Kreaturen und Insekten beinahe überquillt, erfüllt von Bewegung und Leben.',
					ortsnamen: ['Käfertal', 'Zirpengrund', 'Krabbelklamm', 'Schwärmhöhle', 'Insektenschlucht', 'Libellenbach', 'Summendes Tal', 'Flügelklamm', 'Ameisenhügel', 'Bienenstock', 'Spinnennest', 'Glühwürmchenlicht', 'Heuschreckenfels', 'Raupenpfad', 'Wespenturm', 'Schmetterlingswiese'],
					kannImmer: [
						'Eine Welt beschreiben, die vor Leben wimmelt',
						'Einen Konflikt zwischen wilden Kreaturen zeigen',
						'Eine neue insektenartige Kreatur einführen'
					],
					stimmung: ['Zirpende Heuschrecken', 'Vorsichtige Kugelasseln', 'Riesige Käfer', 'Schwebende Libellen', 'Ein Ameisenheer bei der Arbeit', 'Glitzernde Spinnweben im Morgentau', 'Schmetterlinge in allen Farben', 'Der Geruch von feuchter Erde', 'Pilze, die aus dem Boden sprießen', { text: 'Eine ‡wilde und merkwürdige Kreatur, die seit Hunderten von Jahren niemand gesehen hat', trauma: true }],
					volkssagen: ['Die Wiese der Gewittertanzenden', 'Der letzte der Monarchfalter', 'Der Tag, an dem die Wälder wanderten']
				},
				{
					name: 'Feld',
					bild: '/images/naturelle/feld.png',
					beschreibung: 'Ein Ort, um sich hinzulegen, den Wind zu spüren und in den Himmel zu schauen.',
					ortsnamen: ['Windwiese', 'Grasheim', 'Wolkenblick', 'Sanftes Tal', 'Wiesengrund', 'Hügelland', 'Findlingsfeld', 'Träumeraue', 'Schäferbaum', 'Sonnenfleck', 'Grashüpfersprung', 'Kleeblatt', 'Löwenzahnmeer', 'Maulwurfshügel', 'Heuduft', 'Schattenplatz'],
					kannImmer: [
						'Einen gemütlichen Ort zum Ausruhen beschreiben',
						'Auf jemanden hinweisen, der etwas Verlorenes sucht',
						'Fragen: „Können wir zusammen die Wolken beobachten?"'
					],
					stimmung: ['Raschelndes Gras', 'Ein plätscherndes Bächlein', 'Ein einzelner Baum', 'Moosbedeckte Findlinge', 'Wolken, die Geschichten erzählen', 'Der Duft von wilden Blumen', 'Ein Hase, der davonhoppelt', 'Warme Sonnenstrahlen', 'Grashüpfer, die springen', { text: 'Ein ✧Geist, der über die Wiese schwebt', magisch: true }],
					volkssagen: ['Der vom Glück begünstigte Schäfer', 'Die Geister im Hügelgrab', 'Der Tanz der Blütengöttin']
				},
				{
					name: 'Heiligtum',
					bild: '/images/naturelle/heiligtum.png',
					beschreibung: 'Ein heiliger Ort, an dem Gottheiten und Sterbliche sich untereinander mischen.',
					ortsnamen: ['Schrein der Stille', 'Götterstein', 'Heiliger Hain', 'Segensbrunnen', 'Tempelgrund', 'Wunderstätte', 'Opferhügel', 'Geweihte Erde', 'Räucherschale', 'Maskenaltar', 'Orakelgrotte', 'Priesterhaus', 'Pilgerpfad', 'Gebetsstein', 'Weihestätte', 'Götterbildnis'],
					kannImmer: [
						'Die hier lebenden Gottheiten beschreiben',
						'Die Chance anbieten, die Regeln zu brechen',
						'Wenn jemand die Regeln respektiert, bekommt er einen Marker'
					],
					stimmung: ['Ein gut gepflegter Schrein', 'Eine abgenutzte Maske', 'Wachsame Augen in den Schatten', 'Ein unerklärliches Wunder', 'Der Duft von Räucherwerk', 'Pilger, die flüstern', 'Opfergaben am Altar', 'Gebetsfahnen im Wind', { text: 'Eine ✧Gottheit, die kurz erscheint', magisch: true }, { text: 'Ein ‡zweifelnder Priester', trauma: true }],
					volkssagen: [{ text: 'Die ✧wundertätigen Lehren des alten Priesters', magisch: true }, 'Die fünfzehn schlafenden Gottheiten', 'Die Jungfer und der Lachs-Daemon']
				},
				{
					name: 'Lagune',
					bild: '/images/naturelle/lagune.png',
					beschreibung: 'Ein Ort der Besinnung, Introspektion und Selbstreflexion.',
					ortsnamen: ['Stilles Wasser', 'Spiegelbucht', 'Grottenteich', 'Wasserfallbecken', 'Besinnungssee', 'Kristallquelle', 'Moosspiegel', 'Traumlagune', 'Seerosenteich', 'Felsenpool', 'Muschelgrund', 'Quellmündung', 'Tropfsteinsee', 'Libellenufer', 'Schilfinsel', 'Froschkonzert'],
					kannImmer: [
						'Das Wasser und die winzigen Kreaturen beschreiben',
						'Die Dinge schlimmer machen, weil Leute nicht handeln',
						'Fragen: „Worüber hast du in letzter Zeit nachgedacht?"'
					],
					stimmung: ['Moosige Steine', 'Eine versteckte Grotte', 'Ein beeindruckender Wasserfall', 'Eine seltene Blume', 'Kaulquappen im seichten Wasser', 'Das Plätschern einer Quelle', 'Spiegelungen im Wasser', 'Libellen, die über die Oberfläche tanzen', 'Frösche, die quaken', { text: 'Ein ✧Wasserwesen, das kurz auftaucht', magisch: true }],
					volkssagen: ['Die Schenkung der Himmelsklinge', 'Der in den Felsen lebende Lehrer', 'Das gebrochene Herz des Wasserfalls']
				},
				{
					name: 'Sumpf',
					bild: '/images/naturelle/sumpf.png',
					beschreibung: 'Ein Ort, an dem die Luft so dick wie der Schlamm ist.',
					ortsnamen: ['Morastgrund', 'Schlammwasser', 'Nebelsumpf', 'Irrlichter', 'Hexenmoor', 'Moderloch', 'Wurmtal', 'Stickige Senke', 'Sumpfhütte', 'Krötenteich', 'Aalgrube', 'Schilfmeer', 'Moorbirke', 'Blutegelbach', 'Torfstich', 'Nebelloch'],
					kannImmer: [
						'Die Schwere der Welt beschreiben',
						'Anspannung zeigen, die durch Stillstand entsteht',
						'Jemanden im Sumpf stecken bleiben lassen'
					],
					stimmung: ['Dreck und Morast', 'Ein strenger Geruch', 'Ein schwerer Nebel', 'Schlängelnde Würmer', 'Blubernde Gasblasen', 'Knorrige Baumstümpfe', 'Kröten, die im Schilf sitzen', 'Der Ruf eines Reihers', 'Mücken, die schwärmen', { text: 'Ein ✧Irrlicht, das in die Tiefe lockt', magisch: true }],
					volkssagen: ['Die trügerischen Lichter im tiefen Dunkel', 'Das wandernde Moor', 'Die zänkische Hexe und ihre Hütte']
				},
				{
					name: 'Vorgebirge',
					bild: '/images/naturelle/vorgebirge.png',
					beschreibung: 'Ein Ort in den Ausläufern einer großen und sich auftürmenden Präsenz.',
					ortsnamen: ['Schattenpass', 'Steinwächter', 'Klammtal', 'Felsentor', 'Bergfuß', 'Säulengrund', 'Gipfelblick', 'Ausläufer', 'Geröllhalde', 'Ziegenpfad', 'Adlerhorst', 'Schneegrenze', 'Murmeltierbau', 'Bergquelle', 'Grenzstein', 'Wanderhütte'],
					kannImmer: [
						'Beschreiben, was seinen Schatten auf diesen Ort wirft',
						'Eine bevorstehende Bedrohung zeigen',
						'Fragen: „Was befürchtest du, könnte uns bevorstehen?"'
					],
					stimmung: ['Ein geschütztes Tal', 'Seltsame Steinsäulen', 'Eine tiefe Klamm', 'Hinweise auf ferne Seltsamkeiten', 'Geröll, das unter den Füßen rutscht', 'Der Schrei eines Adlers', 'Wolken, die am Berg hängen', 'Eine kleine Berghütte', 'Murmeltiere, die pfeifen', { text: 'Ein ‡einsamer Wanderer, der den Weg sucht', trauma: true }],
					volkssagen: ['Die Ziege, die hundert Jahre lang schlief', 'Der Gefallene Stern', 'Der versteckte Schatz des Hyänen-Königs']
				}
			]
		},
		{
			name: 'Verbindend',
			farbe: 'connect',
			beschreibung: 'Orte der Begegnung, des Übergangs und der Verbindung',
			naturelle: [
				{
					name: 'Brücke',
					bild: '/images/naturelle/bruecke.png',
					beschreibung: 'Ein Übergang von einem Ort zum nächsten.',
					ortsnamen: ['Steinbogen', 'Übergang', 'Trollbrück', 'Zollsteg', 'Hängende Planken', 'Abgrundbrücke', 'Nebelsteg', 'Alte Furt', 'Seilbrücke', 'Wackelsteg', 'Fährstelle', 'Zollhaus', 'Brückenpfeiler', 'Flussquerung', 'Holzplanken', 'Sturmbrücke'],
					kannImmer: [
						'Die Entfernung zur anderen Seite beschreiben',
						'Etwas über den Rand schubsen',
						'Einen leichteren Weg anbieten'
					],
					stimmung: ['Uralte Konstruktionen', 'Wackelige Planken', 'Ein plötzlicher Abgrund', 'Ein Zollhäuschen', 'Der Wind, der über die Brücke pfeift', 'Schwalben unter dem Bogen', 'Verwitterte Geländer', 'Das Rauschen des Flusses darunter', { text: 'Eine ✧machtvolle Kreatur, die sich darunter versteckt', magisch: true }, { text: 'Ein ‡verzweifelter Springer am Rand', trauma: true }],
					volkssagen: ['Der Handel des Barsch-Daemon', 'Der Pfad des Königs der Riesen', 'Wie der Fuchs und die Kröte hinüberkamen']
				},
				{
					name: 'Gasthaus',
					bild: '/images/naturelle/gasthaus.png',
					beschreibung: 'Ein Ort schlichter Behaglichkeit, in dem man sich oft niederlässt.',
					ortsnamen: ['Zum Müden Wanderer', 'Metfass', 'Feuerstelle', 'Rast am Weg', 'Warme Stube', 'Pilgerheim', 'Zum Goldenen Krug', 'Herberge zur Eiche', 'Schankraum', 'Suppentopf', 'Strohbett', 'Stallplatz', 'Kaminecke', 'Dachkammer', 'Bierkeller', 'Wirtsstube'],
					kannImmer: [
						'Schlichte Behaglichkeit beschreiben',
						'Verwirrung unter den Orientierungslosen stiften',
						'Trost und Annehmlichkeiten gegen einen Preis anbieten'
					],
					stimmung: ['Ein trockenes Plätzchen zum Schlafen', 'Riesige Feuerstelle mit Suppe', 'Fässer voller Met', 'Eine Halle voller Reisender', 'Der Duft von frischem Brot', 'Ein Barde, der Lieder singt', 'Geschichten am Kamin', 'Eine mürrische Wirtin', 'Kartenspiele in der Ecke', { text: 'Ein ‡einsamer Trinker mit einer traurigen Geschichte', trauma: true }],
					volkssagen: ['Die Nacht, als der Alte König hier trank', 'Die Katze mit dem magischen Bier', 'Der Wombat und die Göttin']
				},
				{
					name: 'Hafen',
					bild: '/images/naturelle/hafen.png',
					beschreibung: 'Ein Tor, durch das sich dir die ganze Welt eröffnet.',
					ortsnamen: ['Ankerplatz', 'Seemannsruh', 'Wellentor', 'Schiffswerft', 'Fährstadt', 'Dockland', 'Ballonhafen', 'Nebelkai', 'Takelage', 'Kapitänshaus', 'Leuchtturm', 'Fischkutter', 'Lastenkran', 'Segelflicker', 'Tauwerk', 'Möwenfelsen'],
					kannImmer: [
						'Beschreiben, welche Schiffe es hier gibt',
						'Die Gefahren eines flüchtigen Lebenswandels zeigen',
						'Fragen: „Kann ich dich an einen neuen Ort bringen?"'
					],
					stimmung: ['Klobige Frachtkähne', 'Heißluftballons', 'Docks und Landungsbrücken', 'Selbstgefällige Kapitäne', 'Der Geruch von Salz und Teer', 'Möwen, die kreischen', 'Netze, die geflickt werden', 'Seemannslieder aus einer Taverne', 'Abschiedstränen am Kai', { text: 'Ein ✧Geisterschiff am Horizont', magisch: true }],
					volkssagen: ['Der kopflose Geist in der Schiffswerft', 'Das Boot, das nicht sinken wollte', 'Der Nebel aus dem Osten']
				},
				{
					name: 'Insel',
					bild: '/images/naturelle/insel.png',
					beschreibung: 'Ein Ort, der vor dem Rest der Welt geheim und getrennt gehalten wird.',
					ortsnamen: ['Verborgene Küste', 'Einsamkeit', 'Geheiminsel', 'Sturmfels', 'Versteck im Meer', 'Weißes Eiland', 'Nebelinsel', 'Weltenfern', 'Muschelstrand', 'Kokosnusshain', 'Riffkante', 'Schmugglerhöhle', 'Palmenbucht', 'Strandgut', 'Gezeitentümpel', 'Klippennest'],
					kannImmer: [
						'Die Annehmlichkeiten einer isolierten Welt beschreiben',
						'Zeigen, wie durch die Isolation Konflikt entsteht',
						'Wenn jemand respektiert, dass dieser Ort anders ist, bekommt er einen Marker'
					],
					stimmung: ['Ein verborgener Eingang', 'Ein verbotenes Geheimnis', 'Ein verstecktes Juwel', 'Eine bedrohliche Gottheit', 'Palmen, die sich im Wind wiegen', 'Muschelschalen am Strand', 'Ein Schiffswrack am Riff', 'Schildkröten, die nisten', 'Kokosnüsse, die fallen', { text: 'Ein ‡Gestrandeter, der jahrelang allein war', trauma: true }],
					volkssagen: ['Die Höhle, in der die Stürme übernachten', 'Die erste überlebende Person hier', 'Der Kult des Weißen Kleides']
				},
				{
					name: 'See',
					bild: '/images/naturelle/see.png',
					beschreibung: 'Ein großes Gewässer, das sich über eine überwältigende Fläche erstreckt.',
					ortsnamen: ['Wellenmeer', 'Tiefenwasser', 'Sandbucht', 'Krakensee', 'Spiegelflut', 'Schaumküste', 'Wunschsee', 'Treibholzufer', 'Tangwald', 'Quallenbucht', 'Krabbenriff', 'Flaschenpost', 'Schiffswrack', 'Seesterngrund', 'Walgesang', 'Salzwiese'],
					kannImmer: [
						'Die Schönheit des Wassers beschreiben',
						'Etwas Seltsames ans Ufer spülen',
						'Eine Person an einen unerwarteten Ort bringen'
					],
					stimmung: ['Riesige schäumende Wellen', 'Sandige Küste', 'Treibgut und Strandgut', 'Wasserläufer auf der Oberfläche', 'Boote, die in der Ferne schaukeln', 'Fische, die springen', 'Der Ruf der Möwen', 'Sonnenuntergang über dem Wasser', 'Eine Flaschenpost mit einer Nachricht', { text: 'Ein ✧Wesen aus der Tiefe', magisch: true }],
					volkssagen: ['Der Kraken aus der Tiefe', 'Der Lachs, der drei Wünsche gewährt', 'Der Hochmut des Warzenschwein-Kapitäns']
				},
				{
					name: 'Straße',
					bild: '/images/naturelle/strasse.png',
					beschreibung: 'Ein Ort, der für die Durchreise gemacht ist.',
					ortsnamen: ['Kreuzweg', 'Wanderpfad', 'Alte Handelsroute', 'Karawanenstraße', 'Meilenstein', 'Staubiger Weg', 'Pilgerstraße', 'Doppelgängerkreuz', 'Wegweiser', 'Rastplatz', 'Fuhrwerk', 'Wegschrein', 'Brunnenstopp', 'Kurvenreich', 'Staubwolke', 'Fußgängerbrücke'],
					kannImmer: [
						'Etwas beschreiben, das vorbeikommt',
						'Jemanden davon abhalten, das Ziel zu erreichen',
						'Jemanden vorantreiben'
					],
					stimmung: ['Steinhügel am Wegesrand', 'Müll in den Straßengräben', 'Eine lebhafte Wasserstraße', 'Eine freundliche Karawane', 'Staubwolken in der Ferne', 'Ein Händler mit seinem Karren', 'Pilger auf dem Weg', 'Wegweiser mit verblassten Buchstaben', 'Spuren im Staub', { text: 'Ein ‡Wegelagerer, der auf Beute wartet', trauma: true }],
					volkssagen: ['Der Tag, an dem der Jagdhund seinen Doppelgänger traf', 'Das Opossum aus Nebel', 'Der Pakt am Kreuzweg-Schrein']
				}
			]
		},
		{
			name: 'Weitläufig',
			farbe: 'grand',
			beschreibung: 'Orte der Größe, Macht und des Staunens',
			naturelle: [
				{
					name: 'Burg',
					bild: '/images/naturelle/burg.png',
					beschreibung: 'Ein Ort, der darauf angelegt ist, alles andere weit außerhalb seiner Mauern zu halten.',
					ortsnamen: ['Wehrfeste', 'Schattenwall', 'Eisentor', 'Wachturm', 'Grenzburg', 'Mauerstein', 'Festung Grimmzahn', 'Bollwerk', 'Zugbrücke', 'Schießscharte', 'Burggraben', 'Waffenkammer', 'Verlies', 'Pechnasen', 'Soldatenquartier', 'Burgfried'],
					kannImmer: [
						'Die Wände beschreiben, die uns umgeben',
						'Besorgnis über eine ferne Bedrohung verbreiten',
						'Eine Person davon abhalten, einzutreten'
					],
					stimmung: ['Lange Schatten', 'Trophäen vergessener Kriege', 'Wachtürme', 'Das Wappen einer fernen Monarchie', 'Rüstungen, die im Flur stehen', 'Das Klirren von Schlüsseln', 'Wächter auf Patrouille', 'Ein kalter Kerker', 'Tapestrien an den Wänden', { text: 'Eine ‡wütende Verwaltungsperson, die alles beaufsichtigt', trauma: true }],
					volkssagen: ['Der ermordete Bruder', 'Der Geist auf dem Wehrgang', 'Das verlorene Imperium der Maurer']
				},
				{
					name: 'Jahrmarkt',
					bild: '/images/naturelle/jahrmarkt.png',
					beschreibung: 'Ein Ort voller Feierlichkeiten, Dekadenz und Begeisterung.',
					ortsnamen: ['Maskenball', 'Lichterglanz', 'Festwiese', 'Tausend Wunder', 'Zeltstadt', 'Gauklerfest', 'Karnevalsplatz', 'Freudenfeuer', 'Riesenrad', 'Wahrsagerzelt', 'Zuckerwattenbude', 'Karussell', 'Feuerjongleur', 'Geisterbahn', 'Seiltänzer', 'Konfettiregen'],
					kannImmer: [
						'Die Lichter und die Menge beschreiben',
						'Aufmerksamkeit und Bewunderung einfordern',
						'Fragen: „Was wird dich tiefer ins Chaos locken?"'
					],
					stimmung: ['Fremdartige Schauspieler', 'Extravaganter Überfluss', 'Eine geheimnisvolle Darbietung', 'Eine hungrige Menge', 'Der Duft von gebrannten Mandeln', 'Lachende Kinder', 'Ein Akrobat auf dem Seil', 'Bunte Luftballons', 'Musik aus allen Richtungen', { text: 'Eine ✧glamouröse Person, die sich neu erfunden hat', magisch: true }],
					volkssagen: ['Das Mädchen mit den tausend Masken', 'Das nie endende Weinglas', 'Die Geifernde Göttin und das Fest']
				},
				{
					name: 'Metropole',
					bild: '/images/naturelle/metropole.png',
					beschreibung: 'Ein Ort, an dem viele Leute leben und viele Gemeinschaften nebeneinanderliegen.',
					ortsnamen: ['Vielvölkerstadt', 'Torbögen', 'Zinnoberstraße', 'Gewirr', 'Kanalisation', 'Tausend Gassen', 'Stimmengewirr', 'Pflasterstein', 'Marktviertel', 'Handwerksgasse', 'Tempelbezirk', 'Armenhaus', 'Brückenplatz', 'Wäscherei', 'Brunnenplatz', 'Rattengasse'],
					kannImmer: [
						'Die Diversität und Vielfalt der Leute beschreiben',
						'Konflikte zwischen verschiedenen Weltsichten aufzeigen',
						'Einer Person sagen, dass sie sich verirrt hat'
					],
					stimmung: ['Große heruntergekommene Wohnblöcke', 'Geschwungene Torbögen', 'Pflasterstraßen', 'Mehr Leute, als du je getroffen hast', 'Straßenhändler, die rufen', 'Wäsche zwischen den Häusern', 'Der Geruch von tausend Küchen', 'Tauben auf den Dächern', 'Stimmengewirr in fremden Sprachen', { text: 'Ein ‡verlorenes Kind, das seine Eltern sucht', trauma: true }],
					volkssagen: ['Der Waffenstillstand der drei Gottheiten', 'Die Nachtziege in der Zinnoberstraße', 'Die Skorpione in der Kanalisation']
				},
				{
					name: 'Palast',
					bild: '/images/naturelle/palast.png',
					beschreibung: 'Ein Ort, an dem die Macht regiert. Er ist wunderschön, aber leer.',
					ortsnamen: ['Kristallthron', 'Prachtgemächer', 'Königshalle', 'Goldene Zinnen', 'Thronsaal', 'Flaggenturm', 'Leere Pracht', 'Erbenlast', 'Spiegelsaal', 'Geheimgang', 'Kronschatz', 'Audienzzimmer', 'Hofgarten', 'Dienertrakt', 'Bankettsaal', 'Gemäldegalerie'],
					kannImmer: [
						'Die atemberaubende Pracht beschreiben',
						'Die Nachwehen eines Konflikts zwischen Regenten zeigen',
						'Fragen: „Was hier sorgt dafür, dass du dich klein fühlst?"'
					],
					stimmung: ['Prachtvolle Hallen', 'Viele bunte Flaggen', 'Schallende Trompeten', 'Ein schimmernder Thron', 'Portraits vergangener Herrscher', 'Flüsternde Höflinge', 'Ein Diener, der sich verbeugt', 'Goldverzierungen an jeder Ecke', 'Leere Säle, die auf Gäste warten', { text: 'Die junge und ‡königliche Person, auf der das Erbe lastet', trauma: true }],
					volkssagen: ['Der Kristallthron und seine Lügen', 'Der König, der einen Gott tötete', 'Die zerbröckelnde Dynastie']
				},
				{
					name: 'Schmelzöfen',
					bild: '/images/naturelle/schmelzoefen.png',
					beschreibung: 'Ein Ort, der heiß brennt, erfüllt von der Macht des wilden und kreativen Feuers.',
					ortsnamen: ['Ewige Flamme', 'Glutkessel', 'Himmelsschmiede', 'Feuerherz', 'Glühende Esse', 'Aschenwerk', 'Brennender Stahl', 'Funkenregen', 'Schmelztiegel', 'Blasebalghaus', 'Kohlelager', 'Amboss', 'Härtebecken', 'Rußkanal', 'Gießerei', 'Schlackenhalde'],
					kannImmer: [
						'Die erdrückende Hitze beschreiben',
						'Spannungen durch unzumutbare Bedingungen erhöhen',
						'Fragen: „Wirst du schmieden, was einst zerbrochen wurde?"'
					],
					stimmung: ['Eine brodelnde Schmiede', 'Wände voll Werkzeuge', 'Kunstvolle Glasarbeiten', 'Eine legendäre unvollendete Klinge', 'Funken, die durch die Luft fliegen', 'Schweißtriefende Arbeiter', 'Das Zischen von heißem Metall', 'Rußgeschwärzte Gesichter', 'Der Rhythmus der Hämmer', { text: 'Ein*e ✧machtvolle*r Schmied*in voll brennendem Groll', magisch: true }],
					volkssagen: ['Die Ewige Schmiede und ihre Diener', 'Die Himmelsklinge und wie sie gebaut wurde', 'Das Fesseln der Geifernden Göttin']
				},
				{
					name: 'Universität',
					bild: '/images/naturelle/universitaet.png',
					beschreibung: 'Ein Ort, an dem sich Viele versammeln, um aus uralten Texten zu lernen.',
					ortsnamen: ['Bibliotheksturm', 'Gelehrtenhof', 'Akademia', 'Wissensquelle', 'Pergamenthalle', 'Fakultät', 'Theatersaal', 'Gründerplatz', 'Hörsaal', 'Archiv', 'Laboratorium', 'Lesesaal', 'Studentenwohnheim', 'Debattierclub', 'Sternwarte', 'Alchemistenküche'],
					kannImmer: [
						'Die riesige Menge an Wissen beschreiben',
						'Konflikte zwischen Philosophien zeigen',
						'Fragen: „Willst du eine schmerzhafte Wahrheit lernen?"'
					],
					stimmung: ['Grasbewachsener Innenhof', 'Zu kleine Wohnheime', 'Große Banketthalle', 'Statuen der Gründer', 'Stapel von Büchern überall', 'Studenten, die debattieren', 'Das Kratzen von Federn', 'Eine Tafel voller Formeln', 'Der Geruch von altem Pergament', { text: 'Eine ✧hexenhafte Person, die hier unterrichtet', magisch: true }],
					volkssagen: ['Die Gründer und ihre Streitigkeiten', 'Die verbotene Gesellschaft im Theatersaal', 'Der Streich, der außer Kontrolle geriet']
				}
			]
		},
		{
			name: 'Einsam',
			farbe: 'lonely',
			beschreibung: 'Orte der Stille, Reflexion und des Unheimlichen',
			naturelle: [
				{
					name: 'Fata Morgana',
					bild: '/images/naturelle/fatamorgana.png',
					beschreibung: 'Ein Ort, den es nicht wirklich gibt.',
					ortsnamen: ['Traumstadt', 'Süßer Schein', 'Trugbild', 'Wunschpalast', 'Verheißung', 'Paradies-Illusion', 'Schimmernde Lüge', 'Ewiges Fest', 'Zuckerschloss', 'Goldener Brunnen', 'Perfekter Garten', 'Wunschbrunnen', 'Kristallpalast', 'Endlosbuffet', 'Samtpolster', 'Schlaraffenland'],
					kannImmer: [
						'Etwas beschreiben, das zu schön ist um wahr zu sein',
						'Eine Person beschreiben, die sich in Illusionen verloren hat',
						'Fragen: „Glaubst du, was du siehst?"'
					],
					stimmung: ['Zu bunte Blumen', 'Zu glänzende Fassaden', 'Zu befriedigendes Essen', 'Zu schöne Musik', 'Gesichter, die sich ändern', 'Türen, die nirgendwohin führen', 'Ein perfekter Sonnenuntergang, der nie endet', 'Gelächter ohne Quelle', { text: 'Ein ✧verführerischer Geist, der lockt', magisch: true }, { text: 'Eine ‡verlorene Seele, die den Ausweg sucht', trauma: true }],
					volkssagen: ['Der Palast der zuckersüßen Toten', 'Die Stadt der rastlosen Träume', 'Das falsche Versprechen des Kaisers']
				},
				{
					name: 'Friedhof',
					bild: '/images/naturelle/friedhof.png',
					beschreibung: 'Ein Ort, der dem Tod gehört. Hier sind die Verlorenen begraben.',
					ortsnamen: ['Letzte Ruhe', 'Kerzenlicht', 'Grabeshügel', 'Vergessene Seelen', 'Stille Erde', 'Steinfeld', 'Ahnengrund', 'Nebelgräber', 'Totengräberhaus', 'Engelstatue', 'Familienkrypta', 'Urnenmauer', 'Trauerweide', 'Grablaterne', 'Verwitterter Obelisk', 'Efeugruft'],
					kannImmer: [
						'Die Last der Vergangenheit beschreiben',
						'Eine Person in die Schranken weisen, die die Geschichte nicht respektiert',
						'Fragen: „Kannst du uns eine Geschichte erzählen, die niemand sonst kennt?"'
					],
					stimmung: ['Verstreute Steinhaufen', 'Geschmolzene Kerzen', 'Grabsteine', 'Tiefe Stille', 'Verwelkte Blumen auf einem Grab', 'Ein Rabe auf einem Kreuz', 'Nebel zwischen den Gräbern', 'Ein offenes Grab', 'Efeu, das alles überwuchert', { text: 'Ein*e vergessene*r alte*r Freund*in, inzwischen ‡tot', trauma: true }],
					volkssagen: ['Das Kerzenlicht-Konzil und seine Warnung', 'Der Tag, an dem die Toten tanzten', 'Die Nebelhäsin und ihr Grinsen']
				},
				{
					name: 'Höhle',
					bild: '/images/naturelle/hoehle.png',
					beschreibung: 'Ein Ort, der mit dem Kern der Erde und dessen Weisheit und dunklen Geheimnissen verbunden ist.',
					ortsnamen: ['Tiefenschlund', 'Pilzgrotte', 'Felszeichnungen', 'Schattenhöhle', 'Erdherz', 'Ewige Nacht', 'Tropfsteinhalle', 'Weltentiefe', 'Fledermausnest', 'Stalaktitenwald', 'Blindfischteich', 'Echogang', 'Kristallkammer', 'Einsiedlerwinkel', 'Glutwurmleuchten', 'Unterwassersee'],
					kannImmer: [
						'Die Schönheit der tiefsten Schatten beschreiben',
						'Etwas vom Dunkel verschlucken lassen',
						'Fragen: „Wirst du noch tiefer wandern?"'
					],
					stimmung: ['Dunkelheit, tiefer als erwartet', 'Eine Brücke zur nächsten Welt', 'Felszeichnungen', 'Zahllose Pilze', 'Tropfendes Wasser', 'Das Echo der eigenen Schritte', 'Fledermäuse, die flattern', 'Glitzernde Kristalle', 'Kalte, feuchte Luft', { text: 'Ein*e ‡vorsichtige*r Einsiedler*in', trauma: true }],
					volkssagen: ['Die aufgeschürften Wände', 'Die Erste Kunst und ihre Geschichten', 'Die schlafende Gottheit am Grund der Welt']
				},
				{
					name: 'Moor',
					bild: '/images/naturelle/moor.png',
					beschreibung: 'Ein stiller Ort, an dem ein scharfer Wind durch eine langgestreckte Landschaft saust.',
					ortsnamen: ['Windheide', 'Teufelshund', 'Nebelland', 'Wespengrund', 'Knorriger Hain', 'Sumpfheide', 'Schwermut', 'Graue Weite', 'Heidekraut', 'Krähenstein', 'Dornbusch', 'Fuchsbau', 'Moorhuhnruf', 'Schäferhütte', 'Hünengrab', 'Steinkreis'],
					kannImmer: [
						'Etwas beschreiben, das Einsamkeit hervorruft',
						'Auf etwas Unheimliches aufmerksam machen',
						'Fragen: „Was bedrückt deine Gedanken?"'
					],
					stimmung: ['Das ferne Schnarren von Wespen', 'Sumpfige Stellen', 'Ein dünner Nebel', 'Knorrige Bäume', 'Der heulende Wind', 'Heidekraut, das sich wiegt', 'Ein einsames Bauernhaus', 'Krähen, die krächzen', 'Ein alter Steinkreis', { text: 'Ein ‡nervöser Teenager, der sich davonstiehlt', trauma: true }],
					volkssagen: ['Der Teufelshund und seine Beute', 'Die Reiherin und ihre ermordete Liebe', 'Die verlorene Armee der Ersten Königin']
				},
				{
					name: 'Spiegel',
					bild: '/images/naturelle/spiegel.png',
					beschreibung: 'Ein Ort, der dich selbst widerspiegelt.',
					ortsnamen: ['Spiegelwasser', 'Salzebene', 'Stille Reflexion', 'Weltenrand', 'Namenloser See', 'Ewige Fläche', 'Schattenspiegel', 'Unendlichkeit', 'Salzkristall', 'Glasufer', 'Horizontlinie', 'Stiller Teich', 'Quecksilbersee', 'Gefrorenes Wasser', 'Mondspiegelung', 'Windstille'],
					kannImmer: [
						'Beschreiben, was zurückblickt',
						'Etwas widerspiegeln, das jemand nicht sehen wollte',
						'Fragen: „Was an deinem Spiegelbild verunsichert dich?"'
					],
					stimmung: ['Spiegelglattes Wasser', 'Salzwüste', 'Perfekte Stille', 'Kratzer in der Reflexion', 'Dein Spiegelbild, das einen Moment zu spät reagiert', 'Der Horizont, der in alle Richtungen gleich aussieht', 'Das Knirschen von Salz unter den Füßen', 'Ein Hauch von Wind, der alles verändert', { text: 'Ein ✧Schatten, der sich anders bewegt als du', magisch: true }, { text: 'Eine ‡Erinnerung an jemanden, den du verloren hast', trauma: true }],
					volkssagen: ['Der Marsch der ungezählten Schritte', 'Der Geist, dessen Name nicht gesprochen werden kann', 'Der Rand der Welt']
				},
				{
					name: 'Wildnis',
					bild: '/images/naturelle/wildnis.png',
					beschreibung: 'Ein Ort, dem die Natur am Herzen liegt – weit mehr als alle Sterblichen.',
					ortsnamen: ['Urwald', 'Waldgottheit', 'Grünes Herz', 'Uralter Hain', 'Wildwuchs', 'Unberührte Erde', 'Geisterwald', 'Naturgewalt', 'Mammutbaum', 'Wolfsrudel', 'Bärenhöhle', 'Wildschweinpfad', 'Adlerfels', 'Farntal', 'Moosdickicht', 'Wildbach'],
					kannImmer: [
						'Etwas Massives, Erhabenes und Gleichgültiges beschreiben',
						'Die Herausforderungen des Lebens in der Natur zeigen',
						'Sagen: „Aus dem Weg!" – alle, die folgen, bekommen einen Marker'
					],
					stimmung: ['Verwuchertes Unterholz', 'Uralte Bäume', 'Etwas unfassbar Großes', 'Ein unberührter Wasserfall', 'Der Ruf eines Wolfes', 'Spuren im Moos', 'Ein umgestürzter Baumriese', 'Rehe, die davonspringen', 'Das Rascheln im Unterholz', { text: 'Eine ✧Waldgottheit, die beobachtet', magisch: true }],
					volkssagen: ['Die Gottheit aller Wälder', 'Die Geistwesen des Waldes', 'Das Lied im Herzen aller Dinge']
				}
			]
		},
		{
			name: 'Verlassen',
			farbe: 'desolate',
			beschreibung: 'Orte der Gefahr, Vergänglichkeit und des Chaos',
			naturelle: [
				{
					name: 'Gebirge',
					bild: '/images/naturelle/gebirge.png',
					beschreibung: 'Ein Ort, an dem Erde und Himmel sich treffen.',
					ortsnamen: ['Wolkengipfel', 'Steinadler', 'Eiswind', 'Gipfelrast', 'Schneesturm', 'Felsenkliff', 'Höhenluft', 'Bergeinsamkeit', 'Gletscherspalte', 'Schneewächte', 'Steinbock', 'Gemsenpfad', 'Bergkristall', 'Lawinenhang', 'Gipfelkreuz', 'Schmelzwasser', 'Eiszapfen', 'Berghütte'],
					kannImmer: [
						'Beschreiben, was man von hier aus alles sehen kann',
						'Eine Person zeigen, die aus Verzweiflung zum Äußersten getrieben wurde',
						'Eine Person von allen anderen abschneiden'
					],
					stimmung: ['Steile Klippen', 'Ein trügerischer Pfad', 'Eine einsame Blume', 'Ein noch höherer Gipfel', 'Schnee, der alles bedeckt', 'Der eisige Wind', 'Ein Steinbock in der Ferne', 'Dünne Luft, die das Atmen erschwert', 'Ein Gletscher, der knackt', { text: 'Eine ‡vorsichtige Kreatur, die sich knapp außer Sicht versteckt', trauma: true }],
					volkssagen: ['Der Elchkönig unter den Hügeln', 'Der Gott des Nordwindes', 'Wo die sanften Riesen kämpften']
				},
				{
					name: 'Labyrinth',
					bild: '/images/naturelle/labyrinth.png',
					beschreibung: 'Ein verworrener Irrgarten, genutzt, um hereinzulegen, einzusperren und zu verwirren.',
					ortsnamen: ['Irrwege', 'Endlosgang', 'Kreidezeichen', 'Sackgasse', 'Verwirrung', 'Minotaurus-Herz', 'Wendepunkt', 'Ausweglos', 'Heckenwand', 'Falltür', 'Spiegelkorridor', 'Drehraum', 'Kreidefinger', 'Knochenweg', 'Echokammer', 'Rattenpfad'],
					kannImmer: [
						'Beschreiben, wie unglaublich weit sich das Labyrinth erstreckt',
						'Die Reisenden desorientieren und verwirren',
						'Zwei Optionen geben, von denen keine die richtige ist'
					],
					stimmung: ['Steinwände', 'Überwucherte Wege', 'Unerwartete Gefahren', 'Kreidezeichnungen, die die Richtung weisen', 'Gänge, die sich zu wiederholen scheinen', 'Das Gefühl, beobachtet zu werden', 'Ein ferner Schrei', 'Knochen von früheren Wanderern', { text: 'Eine ‡verlorene unschuldige Person im Herz des Irrgartens', trauma: true }, { text: 'Eine ‡heroische Person, die den Weg weisen will', trauma: true }],
					volkssagen: ['Die erfindungsreiche Krähe und ihre wächsernen Flügel', 'Die Wege, die von selbst wachsen', 'Die wimmernden Elritzen-Daemon']
				},
				{
					name: 'Mahlstrom',
					bild: '/images/naturelle/mahlstrom.png',
					beschreibung: 'Ein großer und chaotischer Sturm, voller Winde und bedrohlicher Kräfte.',
					ortsnamen: ['Sturmwirbel', 'Donnerschlag', 'Windbruch', 'Chaos-Auge', 'Zornhimmel', 'Trümmerwind', 'Wespenkreischen', 'Göttertoben', 'Blitzschlag', 'Hagelschauer', 'Orkanböe', 'Scherbenmeer', 'Sturmflut', 'Wirbelkern', 'Gewitterwand', 'Sturzregen'],
					kannImmer: [
						'Den Sturm beschreiben, der uns bedroht',
						'Etwas an den Felsen zerschellen lassen',
						'Einer Person etwas entreißen'
					],
					stimmung: ['Aufgewühlter Himmel', 'Heulender Wind', 'Kreischende Wespen', 'Herumfliegende Trümmer', 'Blitze, die den Himmel zerreißen', 'Regen, der wie Peitschenhiebe schlägt', 'Ein Augenblick der Stille im Auge des Sturms', 'Zerstörung, so weit das Auge reicht', { text: 'Eine ✧machtvolle Gottheit, die stets nur für einen Moment zu sehen ist', magisch: true }, { text: 'Ein ‡Schiffbrüchiger, der sich an Treibholz klammert', trauma: true }],
					volkssagen: ['Der Zorn des Nordwind-Gottes', 'Die Gewittertanzenden und ihr Krieg', 'Die Königin, die eine Lücke in die Welt riss']
				},
				{
					name: 'Ödland',
					bild: '/images/naturelle/oedland.png',
					beschreibung: 'Ein Ort, den das Leben verlassen hat.',
					ortsnamen: ['Karge Weite', 'Aschengrund', 'Letzte Hoffnung', 'Toter Baum', 'Verbrannte Erde', 'Staubland', 'Vergessenes Tal', 'Düstermoor', 'Skelettwald', 'Kraterfeld', 'Versiegter Brunnen', 'Rauchsäule', 'Kohlenstaub', 'Lehmrisse', 'Dornengestrüpp', 'Grauer Schössling'],
					kannImmer: [
						'Den kargen Erdboden beschreiben',
						'Etwas davon abhalten, zu wachsen oder sich zu verändern',
						'Fragen: „Was siehst du hier, das dir das Herz bricht?"'
					],
					stimmung: ['Tote Bäume', 'Kleine Schösslinge, die ums Überleben kämpfen', 'Trüber Himmel', 'Rauchfetzen', 'Gebleichte Knochen', 'Rissige, ausgetrocknete Erde', 'Ein einsamer Geier', 'Ruinen von etwas, das einst hier war', 'Stille, die in den Ohren dröhnt', { text: 'Ein ‡darbender Wanderer, der aufgegeben hat', trauma: true }],
					volkssagen: ['Der Fluch des einsamen Königs', 'Die Leiche der Geifernden Göttin', 'Wo sich der Weltuntergang entzünden wird']
				},
				{
					name: 'Ruine',
					bild: '/images/naturelle/ruine.png',
					beschreibung: 'Ein einstmals glanzvoller Ort, der in Verfall und Zusammenbruch versunken ist.',
					ortsnamen: ['Zerfallenes Reich', 'Trümmerstadt', 'Einstige Pracht', 'Vergessene Hallen', 'Schneebett-Ruine', 'Überwucherung', 'Gebrochener Thron', 'Stummer Tempel', 'Mosaikscherben', 'Rostiges Tor', 'Eingestürzter Turm', 'Zerbrochene Statue', 'Wildwachsender Efeu', 'Verschütteter Keller', 'Säulenstumpf', 'Verblasstes Fresko'],
					kannImmer: [
						'Beschreiben, was hier einmal war',
						'Konsequenzen für die Taten der Vergangenheit zeigen',
						'Fragen: „Weißt du, was hier einst von Bedeutung war?"'
					],
					stimmung: ['Zerbröckelnde Säulen', 'Ton- und Knochenstückchen', 'Zurückgelassene Klingen', 'Monumente des Hochmuts', 'Efeu, das durch Fenster wächst', 'Ein halb lesbares Schild', 'Verrostete Rüstungen', 'Ein zerbrochener Spiegel', 'Das Echo vergangener Stimmen', { text: 'Ein ‡Geist, der nicht loslassen kann', trauma: true }],
					volkssagen: ['Die Schneebett-Residenz der letzten Kaiserin', 'Die Gruft der Drachen', 'Der entweihte Tempel der Göttin']
				},
				{
					name: 'Wüste',
					bild: '/images/naturelle/wueste.png',
					beschreibung: 'Ein leerer Ort. Dort gibt es nichts von dem, was du willst oder brauchst.',
					ortsnamen: ['Endlose Dünen', 'Sandmeer', 'Hitzeflirrung', 'Durstige Weite', 'Karawanenrest', 'Sonnenglut', 'Verlorene Oase', 'Ewiger Sand', 'Kamelskelett', 'Sandsteinfels', 'Wasserloch', 'Nomadenzelt', 'Skorpionstein', 'Dünenspitze', 'Wüstenfuchs', 'Salzpfanne'],
					kannImmer: [
						'Die Leere der Welt beschreiben',
						'Eine verlorene, umherwandernde Person beschreiben',
						'Sagen, dass der Weg länger sein wird als gedacht'
					],
					stimmung: ['Sand, so weit das Auge reicht', 'Schwebende Steinsäulen', 'Bittere Kälte', 'Grelle Sonne', 'Ein Skorpion unter einem Stein', 'Fußspuren, die schnell verschwinden', 'Eine Oase, die sich als Trugbild entpuppt', 'Sterne, die nachts unglaublich hell leuchten', { text: 'Ein ✧Geist, der durch den Sandsturm wandert', magisch: true }, { text: 'Eine ‡verlorene Karawane, die verzweifelt Wasser sucht', trauma: true }],
					volkssagen: ['Der Geistersturm und die verlorene Karawane', 'Der Gotteslachs-Daemon und der Prophet', 'Der unmögliche Regen']
				}
			]
		}
	];
</script>

<svelte:head>
	<title>Naturelle - Wurzelwanderer</title>
</svelte:head>

<div class="container">
	<h1>Ort erschaffen</h1>
	<p class="intro">
		Erschaffe einen Ort aus Naturellen und füge Bekannte hinzu, die dort leben.
	</p>

	<!-- Generator Section -->
	<div class="generator-row">
		<button class="btn btn-primary generate-btn" onclick={generiereOrt}>
			Ort erschaffen
		</button>

		<label class="compact-toggle" class:active={erlaubeMagisch} title="Übernatürliche Elemente, Gottheiten, Geistwesen">
			<input type="checkbox" bind:checked={erlaubeMagisch} />
			<span class="symbol-btn magic">✧</span>
			<span class="toggle-text">Magisch</span>
		</label>

		<label class="compact-toggle" class:active={erlaubeTrauma} title="Dunklere Elemente mit schwierigen Hintergründen">
			<input type="checkbox" bind:checked={erlaubeTrauma} />
			<span class="symbol-btn trauma">‡</span>
			<span class="toggle-text">Trauma</span>
		</label>
	</div>

	<div class="generator-options">
		<div class="option-group">
			<span class="option-label">Naturelle: <strong>{anzahlNaturelle}</strong></span>
			<input type="range" min="1" max="5" bind:value={anzahlNaturelle} class="range-input" />
		</div>

		<div class="kategorie-filter">
			{#each kategorien as kat}
				<button
					class="filter-btn"
					class:active={aktiveKategorien.includes(kat.name)}
					data-farbe={kat.farbe}
					onclick={() => toggleKategorie(kat.name)}
				>
					{kat.name}
				</button>
			{/each}
		</div>
	</div>

	<!-- Generated Result -->
	{#if generierterOrt}
		<div class="result-section">
			<h2 class="result-title">{generierterOrt.name}</h2>

			<div class="result-naturelle">
				{#each generierterOrt.naturelle as nat}
					<div class="result-naturell-card" data-farbe={nat.farbe}>
						<img src={nat.bild} alt={nat.name} class="result-naturell-bild" />
						<div class="result-naturell-info">
							<h3>{nat.name}</h3>
							<p class="result-beschreibung">{nat.beschreibung}</p>
							<div class="result-stimmung">
								<strong>Stimmung:</strong>
								{#each getRandomElements(nat.stimmung, 2) as s}
									<span class="stimmung-tag" class:magisch={isMagisch(s)} class:trauma={isTrauma(s)}>
										{getText(s)}
									</span>
								{/each}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<div class="result-bekannte">
				<div class="bekannte-header">
					<h3>Bekannte in {generierterOrt.name}</h3>
					<div class="bekannte-controls">
						<button class="bekannte-ctrl-btn" onclick={removeBekannter} disabled={generierterOrt.bekannte.length === 0} title="Bekannte*n entfernen">−</button>
						<span class="bekannte-count">{generierterOrt.bekannte.length}</span>
						<button class="bekannte-ctrl-btn" onclick={addBekannter} title="Bekannte*n hinzufügen">+</button>
					</div>
				</div>
				{#if generierterOrt.bekannte.length > 0}
					<div class="bekannte-list">
						{#each generierterOrt.bekannte as b, i}
							<div class="bekannte-item">
								<BekannterCard bekannter={b} />
								<button class="bekannte-remove-btn" onclick={() => removeBekannterAt(i)} title="Entfernen">×</button>
							</div>
						{/each}
					</div>
				{:else}
					<p class="keine-bekannte">Keine Bekannte im Ort. Klicke +, um jemanden hinzuzufügen.</p>
				{/if}
			</div>

			<button class="btn btn-secondary mt-md" onclick={generiereOrt}>
				Neuen Ort erschaffen
			</button>
		</div>
	{/if}

	<div class="divider"></div>

	<!-- Naturelle-Rad (gruppiert nach Kategorie) -->
	<div class="naturelle-rad-gruppiert">
		{#each kategorien as kat}
			<div class="rad-gruppe" data-farbe={kat.farbe}>
				<span class="rad-gruppe-label">{kat.name}</span>
				<div class="rad-gruppe-naturelle">
					{#each kat.naturelle as naturell}
						<button class="rad-segment" data-farbe={kat.farbe} onclick={() => scrollToNaturell(naturell.name)}>
							<img src={naturell.bild} alt={naturell.name} class="rad-bild" />
							<span class="rad-name">{naturell.name}</span>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<div class="divider"></div>

	<!-- Detaillierte Kategorien -->
	{#each kategorien as kategorie}
		<section class="kategorie" data-farbe={kategorie.farbe}>
			<header class="kategorie-header">
				<h2>{kategorie.name}</h2>
				<p>{kategorie.beschreibung}</p>
			</header>

			<div class="naturelle-liste">
				{#each kategorie.naturelle as naturell}
					<article
						class="naturell-card card"
						data-farbe={kategorie.farbe}
						id="naturell-{naturell.name.toLowerCase().replace(/ü/g, 'ue').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ß/g, 'ss').replace(/ /g, '-')}"
					>
						<header>
							<img src={naturell.bild} alt={naturell.name} class="naturell-bild" />
							<div>
								<h3>{naturell.name}</h3>
								<p class="beschreibung">{naturell.beschreibung}</p>
							</div>
						</header>

						<div class="naturell-details">
							<div class="kann-immer">
								<h4>Dies kann der Ort immer tun:</h4>
								<ul>
									{#each naturell.kannImmer as aktion}
										<li>{aktion}</li>
									{/each}
								</ul>
							</div>

							<div class="stimmung">
								<h4>Stimmungselemente</h4>
								<div class="tags">
									{#each naturell.stimmung as element}
										<span class="tag" class:magisch={isMagisch(element)} class:trauma={isTrauma(element)}>{getText(element)}</span>
									{/each}
								</div>
							</div>

							<div class="volkssagen">
								<h4>Volkssagen</h4>
								<ul class="sagen-liste">
									{#each naturell.volkssagen as sage}
										<li class:magisch-text={isMagisch(sage)}>{getText(sage)}</li>
									{/each}
								</ul>
							</div>
						</div>
					</article>
				{/each}
			</div>
		</section>
	{/each}

	<div class="divider"></div>

	<section class="beispiel card">
		<h2>Beispiel: Die Nebelbrücke</h2>
		<p>
			<strong>Naturelle:</strong> Brücke + Moor + Höhle
		</p>
		<p>
			Eine uralte Steinbrücke führt über ein nebelverhangenes Moor.
			Unter der Brücke öffnet sich ein dunkler Höhleneingang.
			Im Nebel flüstern die Irrlichter Geschichten von früher.
		</p>
		<p>
			<strong>Bewohner:</strong> Frösche, Reiher, ein scheuer Dachs<br>
			<strong>Kleine Wesen:</strong> Nebel-Gnome, die im Moor leben
		</p>
	</section>

	<div class="divider"></div>

	<section class="text-center">
		<h2>Ort erschaffen?</h2>
		<p>Schaut euch an, in welcher Jahreszeit ihr spielt!</p>
		<a href="/jahreskreis" class="btn btn-primary mt-md">Zum Jahreskreis</a>
	</section>
</div>

<style>
	.intro {
		font-size: 1.25rem;
		max-width: 700px;
	}

	/* Generator styles - matching Bekannte */
	.generator-row {
		display: flex;
		align-items: center;
		gap: var(--space-md);
		flex-wrap: wrap;
		margin-bottom: var(--space-md);
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

	.generator-options {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-lg);
		margin-bottom: var(--space-lg);
		padding: var(--space-sm) var(--space-md);
		background: var(--color-parchment);
		border-radius: var(--radius-md);
	}

	.option-group {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.option-label {
		font-size: 0.9rem;
		color: var(--color-earth-dark);
	}

	.range-input {
		width: 100px;
		accent-color: var(--color-earth);
	}

	.kategorie-filter {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-xs);
		align-items: center;
	}

	.filter-btn {
		padding: var(--space-xs) var(--space-sm);
		border: 2px solid var(--color-earth-light);
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.8rem;
		font-weight: 600;
		transition: all 0.2s ease;
		opacity: 0.5;
	}

	.filter-btn:hover {
		opacity: 0.8;
	}

	.filter-btn.active {
		opacity: 1;
		border-color: var(--color-earth);
	}

	.filter-btn[data-farbe="warm"].active { border-color: #d4a574; background: rgba(212, 165, 116, 0.15); }
	.filter-btn[data-farbe="nature"].active { border-color: #7cb342; background: rgba(124, 179, 66, 0.15); }
	.filter-btn[data-farbe="connect"].active { border-color: #5c9ead; background: rgba(92, 158, 173, 0.15); }
	.filter-btn[data-farbe="grand"].active { border-color: #9c7c38; background: rgba(156, 124, 56, 0.15); }
	.filter-btn[data-farbe="lonely"].active { border-color: #8e7cc3; background: rgba(142, 124, 195, 0.15); }
	.filter-btn[data-farbe="desolate"].active { border-color: #8b4513; background: rgba(139, 69, 19, 0.15); }

	/* Result styles */
	.result-section {
		margin: var(--space-lg) 0;
		padding: var(--space-lg);
		background: var(--color-parchment);
		border-radius: var(--radius-lg);
		border-left: 4px solid var(--color-earth);
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.result-title {
		text-align: center;
		font-family: var(--font-display);
		font-size: 2rem;
		margin-bottom: var(--space-lg);
		color: var(--color-earth-dark);
	}

	.result-naturelle {
		display: flex;
		flex-direction: column;
		gap: var(--space-md);
	}

	.result-naturell-card {
		display: flex;
		gap: var(--space-md);
		padding: var(--space-md);
		background: var(--color-cream);
		border-radius: var(--radius-md);
		border-left: 4px solid var(--color-earth);
	}

	.result-naturell-card[data-farbe="warm"] { border-left-color: #d4a574; }
	.result-naturell-card[data-farbe="nature"] { border-left-color: #7cb342; }
	.result-naturell-card[data-farbe="connect"] { border-left-color: #5c9ead; }
	.result-naturell-card[data-farbe="grand"] { border-left-color: #9c7c38; }
	.result-naturell-card[data-farbe="lonely"] { border-left-color: #8e7cc3; }
	.result-naturell-card[data-farbe="desolate"] { border-left-color: #8b4513; }

	.result-naturell-bild {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 2px solid var(--color-earth-light);
	}

	.result-naturell-info h3 {
		margin-bottom: var(--space-xs);
		font-family: var(--font-display);
	}

	.result-beschreibung {
		font-size: 0.9rem;
		color: var(--color-earth);
		margin-bottom: var(--space-sm);
	}

	.result-stimmung {
		font-size: 0.85rem;
	}

	.stimmung-tag {
		display: inline-block;
		padding: 2px 8px;
		margin: 2px;
		background: var(--color-earth-light);
		border-radius: var(--radius-sm);
		font-size: 0.8rem;
	}

	.stimmung-tag.magisch {
		background: linear-gradient(135deg, rgba(156, 124, 56, 0.2), rgba(201, 162, 39, 0.2));
		border: 1px solid #c9a227;
	}

	.stimmung-tag.trauma {
		background: linear-gradient(135deg, rgba(142, 124, 195, 0.2), rgba(106, 90, 205, 0.2));
		border: 1px solid #8e7cc3;
	}

	/* Bekannte section */
	.result-bekannte {
		margin-top: var(--space-lg);
		padding-top: var(--space-lg);
		border-top: 1px solid var(--color-earth-light);
	}

	.bekannte-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-md);
	}

	.bekannte-header h3 {
		margin: 0;
		font-family: var(--font-display);
	}

	.bekannte-controls {
		display: flex;
		align-items: center;
		gap: var(--space-sm);
	}

	.bekannte-ctrl-btn {
		width: 32px;
		height: 32px;
		border: 2px solid var(--color-earth);
		border-radius: 50%;
		background: var(--color-cream);
		color: var(--color-earth-dark);
		font-size: 1.2rem;
		font-weight: bold;
		cursor: pointer;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bekannte-ctrl-btn:hover:not(:disabled) {
		background: var(--color-earth);
		color: var(--color-cream);
	}

	.bekannte-ctrl-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.bekannte-count {
		font-weight: 600;
		font-size: 1rem;
		min-width: 20px;
		text-align: center;
	}

	.bekannte-list {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-md);
	}

	@media (max-width: 900px) {
		.bekannte-list {
			grid-template-columns: 1fr;
		}
	}

	.bekannte-item {
		position: relative;
	}

	.bekannte-remove-btn {
		position: absolute;
		top: var(--space-sm);
		right: var(--space-sm);
		width: 32px;
		height: 32px;
		border: 2px solid var(--color-earth-light);
		border-radius: 50%;
		background: var(--color-cream);
		color: var(--color-earth);
		font-size: 1.2rem;
		cursor: pointer;
		opacity: 0.7;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.bekannte-remove-btn:hover {
		opacity: 1;
		background: #c0392b;
		border-color: #c0392b;
		color: white;
	}

	.keine-bekannte {
		text-align: center;
		color: var(--color-earth);
		font-style: italic;
		padding: var(--space-md);
	}

	/* Naturelle-Rad gruppiert */
	.naturelle-rad-gruppiert {
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

	.rad-gruppe[data-farbe="warm"] { border-top-color: #d4a574; background: linear-gradient(to bottom, rgba(212, 165, 116, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="nature"] { border-top-color: #7cb342; background: linear-gradient(to bottom, rgba(124, 179, 66, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="connect"] { border-top-color: #5c9ead; background: linear-gradient(to bottom, rgba(92, 158, 173, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="grand"] { border-top-color: #9c7c38; background: linear-gradient(to bottom, rgba(156, 124, 56, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="lonely"] { border-top-color: #8e7cc3; background: linear-gradient(to bottom, rgba(142, 124, 195, 0.15), var(--color-cream)); }
	.rad-gruppe[data-farbe="desolate"] { border-top-color: #8b4513; background: linear-gradient(to bottom, rgba(139, 69, 19, 0.15), var(--color-cream)); }

	.rad-gruppe-label {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 0.9rem;
		color: var(--color-earth-dark);
		padding-bottom: var(--space-xs);
		border-bottom: 1px solid var(--color-earth-light);
		width: 100%;
		text-align: center;
	}

	.rad-gruppe-naturelle {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
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
		min-width: 80px;
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

	.rad-segment:focus-visible {
		outline: 2px solid var(--color-earth);
		outline-offset: 2px;
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
		font-size: 0.8rem;
		color: var(--color-earth-dark);
		text-align: center;
	}

	/* Kategorien */
	.kategorie {
		margin-bottom: var(--space-xl);
	}

	.kategorie-header {
		margin-bottom: var(--space-lg);
		padding-bottom: var(--space-md);
		border-bottom: 2px solid var(--color-earth-light);
	}

	.kategorie-header h2 {
		margin: 0 0 var(--space-xs) 0;
	}

	.kategorie-header p {
		margin: 0;
		color: var(--color-earth);
		font-style: italic;
	}

	/* Naturelle-Liste */
	.naturelle-liste {
		display: grid;
		gap: var(--space-lg);
	}

	.naturell-card {
		border-left: 4px solid var(--color-earth);
		scroll-margin-top: var(--space-lg);
		transition: box-shadow 0.3s ease;
	}

	.naturell-card.highlight {
		animation: highlight-pulse 1.5s ease;
	}

	@keyframes highlight-pulse {
		0%, 100% { box-shadow: none; }
		20%, 80% { box-shadow: 0 0 0 3px var(--color-earth-light), 0 4px 16px rgba(0, 0, 0, 0.15); }
	}

	.naturell-card[data-farbe="warm"] { border-left-color: #d4a574; }
	.naturell-card[data-farbe="nature"] { border-left-color: #7cb342; }
	.naturell-card[data-farbe="connect"] { border-left-color: #5c9ead; }
	.naturell-card[data-farbe="grand"] { border-left-color: #9c7c38; }
	.naturell-card[data-farbe="lonely"] { border-left-color: #8e7cc3; }
	.naturell-card[data-farbe="desolate"] { border-left-color: #8b4513; }

	.naturell-card header {
		display: flex;
		align-items: flex-start;
		gap: var(--space-md);
		margin-bottom: var(--space-md);
	}

	.naturell-bild {
		width: 100px;
		height: 100px;
		object-fit: cover;
		border-radius: 50%;
		border: 3px solid var(--color-earth-light);
		flex-shrink: 0;
	}

	.naturell-card h3 {
		margin: 0 0 var(--space-xs) 0;
		font-size: 1.3rem;
	}

	.naturell-card .beschreibung {
		margin: 0;
		font-size: 1.05rem;
		color: var(--color-earth-dark);
	}

	.naturell-details {
		display: grid;
		gap: var(--space-md);
	}

	.kann-immer h4,
	.stimmung h4,
	.volkssagen h4 {
		font-size: 0.95rem;
		margin: 0 0 var(--space-sm) 0;
		color: var(--color-leaf-dark);
	}

	.kann-immer ul {
		padding-left: var(--space-lg);
		margin: 0;
	}

	.kann-immer li {
		margin-bottom: var(--space-xs);
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

	.tag.magisch {
		background: linear-gradient(135deg, rgba(123, 104, 238, 0.3), rgba(147, 112, 219, 0.3));
		border: 1px solid #9370db;
	}

	.tag.trauma {
		background: linear-gradient(135deg, rgba(205, 133, 63, 0.3), rgba(139, 69, 19, 0.3));
		border: 1px solid #cd853f;
	}

	.magisch-text {
		color: #7b68ee;
	}

	.sagen-liste {
		padding-left: var(--space-lg);
		margin: 0;
		font-style: italic;
	}

	.sagen-liste li {
		margin-bottom: var(--space-xs);
	}

	.beispiel {
		background: linear-gradient(135deg, var(--color-parchment), var(--color-cream));
	}

	.beispiel h2 {
		color: var(--color-leaf-dark);
	}


	@media (min-width: 768px) {
		.naturelle-liste {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1200px) {
		.naturelle-liste {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
