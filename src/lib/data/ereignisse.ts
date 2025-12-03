export type EreignisTyp = 'katastrophe' | 'fest';

export interface Ereignis {
	slug: string;
	name: string;
	typ: EreignisTyp;
	monat: string;
	beschreibung: string;
	traditionen?: string[];
	effekte?: string[];
}

export const ereignisse: Ereignis[] = [
	// === FRÜHLING (Springwochen) ===
	{
		slug: 'kalter-fruehling',
		name: 'Kalter Frühling',
		typ: 'katastrophe',
		monat: 'Frühling',
		beschreibung: 'Wenn die Frostmonde länger dauern als üblich und der schlammige Boden zu kalt zum Pflanzen ist, dann sitzen die Ältesten auf der hinteren Veranda und grummeln, dass so etwas schon lange nicht mehr passiert ist. Die Kälte hält bis zum Ende des Regenmonds an, wenn die Sonnenparade die dringend benötigte Wärme bringt. Die Ernte ist dieses Jahr miserabel, und Feuerkron sollte übersprungen werden.',
		effekte: [
			'Die Kälte hält bis zum Ende des Regenmonds an',
			'Die Ernte ist miserabel',
			'Feuerkron wird übersprungen'
		]
	},
	{
		slug: 'waschung',
		name: 'Waschung',
		typ: 'fest',
		monat: 'Frühling',
		beschreibung: 'Die Waschung fällt meist auf das Ende der Springwochen, bevor die Leuchtzeit beginnt, mit wilder Freude über Neuanfänge. Es ist ein Tag der Reinigung — sowohl körperlich als auch seelisch.',
		traditionen: [
			'Rituelles Nacherzählen alter Geschichten',
			'Ein ganzer Tag des Putzens und Neuordnens',
			'Lieder der Freiheit und Hoffnung',
			'Zeremonielle Händewaschung',
			'Schwimmen und Baden',
			'Besondere Rollen für die jüngsten Kinder',
			'Schnitzeljagden'
		],
		effekte: [
			'Du kannst jederzeit Fragen stellen, um mehr über lokale Bräuche zu erfahren',
			'Gib einen Marker aus, um etwas loszulassen, das du mit dir trägst',
			'Höre geduldig zu'
		]
	},
	{
		slug: 'karneval',
		name: 'Karneval',
		typ: 'fest',
		monat: 'Frühling',
		beschreibung: 'In manchen Gegenden wird statt der Waschung der Karneval gefeiert — ein wildes, buntes Fest der Masken und der Verwandlung. Für einen Tag darf jeder sein, wer er möchte, und die Grenzen zwischen Realität und Fantasie verschwimmen.',
		traditionen: [
			'Aufwendige Masken und Kostüme',
			'Umzüge durch die Straßen',
			'Süße Leckereien und Gebäck',
			'Musik und Tanz bis in die Nacht',
			'Scherze und Streiche sind erlaubt',
			'Rätsel und Geschichten über verborgene Identitäten'
		],
		effekte: [
			'Du kannst eine Maske tragen und für einen Tag jemand anderes sein',
			'Geheimnisse können anonym geteilt werden',
			'Niemand wird für Scherze bestraft (solange sie freundlich sind)'
		]
	},

	// === REGENMOND (Springwochen) ===
	{
		slug: 'grosse-flut',
		name: 'Die Große Flut',
		typ: 'katastrophe',
		monat: 'Regenmond',
		beschreibung: 'Manchmal sind die Wolkenbrüche im Regenmond so heftig, dass sie eine gewaltige Flut verursachen. In diesen Momenten fühlt es sich an, als würde die ganze Welt weggespült. Die Welt kann einem Ozean gleichen, und sobald der Regen aufhört, setzt eine überwältigende Ruhe ein, während ihr auf Hügeln und in Bäumen sitzt, die jetzt Inseln sind.',
		effekte: [
			'Jeder Ort wird zusätzlich zu dem, was er vorher war, zu einem See',
			'Reisen kostet einen Marker',
			'Die Flut dauert bis zum Ende von Wiesenblühen'
		]
	},
	{
		slug: 'sonnenparade',
		name: 'Sonnenparade',
		typ: 'fest',
		monat: 'Regenmond',
		beschreibung: 'Die Sonnenparade feiert das Ende der Springwochen und den Beginn der Leuchtzeit mit einem Feiertag voller Jubel und Fröhlichkeit. Die Straßen füllen sich mit Farben, Musik und Lachen.',
		traditionen: [
			'Eine große Parade durch die Straßen',
			'Luftschlangen und Banner',
			'Die Wahl einer Blumenkönigin',
			'Falsche goldene Schlüssel als Geschenke',
			'Rituelle Gesichtsbemalung',
			'Blumenkränze',
			'Wunderschöne Kleidung'
		],
		effekte: [
			'Du kannst bei den Festlichkeiten helfen (verdiene einen Marker)',
			'Gib einen Marker aus, um ein schönes Kleid, kleinen Schmuck oder neue Freunde zu finden',
			'Kühle dich im Schatten ab'
		]
	},

	// === WIESENBLÜHEN (Leuchtzeit) ===
	{
		slug: 'majestaetisches-bluehen',
		name: 'Majestätisches Blühen',
		typ: 'katastrophe',
		monat: 'Wiesenblühen',
		beschreibung: 'Manchmal blüht das Wiesenblühen majestätisch. Die Blumen wachsen größer, als ihr es je gesehen habt, die Wälder verwandeln sich in ein Meer aus Rosa und Gelb, und es sind so viele Pollen in der Luft, dass ihr eine Maske tragen müsst. Ein Majestätisches Blühen gilt als Zeit, in der man seine Gefühle gesteht und die Schönheit der Welt feiert.',
		effekte: [
			'Jeder Ort wird zusätzlich zu einem Garten',
			'Das Phänomen dauert bis zum Beginn der Teufelstage',
			'Jeder beginnt mit einer Blume',
			'Ihr könnt jederzeit Blumen pflücken',
			'Gebt eine Blume aus, um jemanden von Herzen zu komplimentieren',
			'Gebt fünf Blumen aus, um einen besonders schönen Blumenkranz zu flechten'
		]
	},
	{
		slug: 'hummel-rummel',
		name: 'Hummel Rummel',
		typ: 'fest',
		monat: 'Wiesenblühen',
		beschreibung: 'Wenn die Wiesen in voller Blüte stehen und die Luft vom Summen unzähliger Hummeln erfüllt ist, feiern die Dörfer den Hummel Rummel. Es ist ein Fest zu Ehren der fleißigen Bestäuber und des süßen Honigs, den sie ermöglichen.',
		traditionen: [
			'Honigverkostungen aus verschiedenen Regionen',
			'Wettbewerbe im Blumenkranz-Binden',
			'Hummel-Beobachtungsspaziergänge',
			'Gelbe und schwarze Festkleidung',
			'Süße Honigkuchen und Met',
			'Geschichten über die Hummelkönigin',
			'Summ-Wettbewerbe für Kinder'
		],
		effekte: [
			'Honig heilt kleine Wunden und Sorgen',
			'Hummeln führen euch zu verborgenen Blumenwiesen',
			'Wer eine Hummel rettet, erhält Glück für den Tag'
		]
	},

	// === HITZE (Leuchtzeit) ===
	{
		slug: 'meteorschauer',
		name: 'Meteorschauer',
		typ: 'katastrophe',
		monat: 'Hitze',
		beschreibung: 'Es ist in der Tat ein seltener und glücklicher Teufelstag, wenn Meteore über den Nachthimmel ziehen und die Luft mit Funkenspuren füllen. Es ist unmöglich, dem Drang zu widerstehen, auf ein Dach zu klettern oder sich im Gras auszustrecken und das Himmelsspektakel zu beobachten.',
		effekte: [
			'Manche abergläubischen Leute sagen, dass diese Meteore die Seelen der Toten sind, endlich glücklich und umgeben von Freunden',
			'Andere behaupten, dass es Blitztänzer sind, die von oben herabsteigen, um Wünsche zu erfüllen',
			'Wünsche, die in dieser Nacht ausgesprochen werden, haben besondere Kraft'
		]
	},
	{
		slug: 'tag-der-lieder',
		name: 'Tag der Lieder',
		typ: 'fest',
		monat: 'Hitze',
		beschreibung: 'Der Tag der Lieder läutet die Leuchtzeit aus und begrüßt die Atempause, mit endloser Musik in der Luft als Erinnerung. Von Sonnenaufgang bis tief in die Nacht erklingen Melodien aus jedem Winkel.',
		traditionen: [
			'Aufwendige Orchesteraufführungen',
			'Amateur-Talentwettbewerbe',
			'Historische Darbietungen',
			'Tanzen und Singen bis tief in die Nacht',
			'Ein paar Lieder, die jeder zu kennen scheint',
			'Spezielle Getränke, die nur an diesem Feiertag serviert werden',
			'Alle gehen schwimmen'
		],
		effekte: [
			'Höre Musik und beschreibe, welche Gefühle sie weckt (verdiene einen Marker)',
			'Gib einen Marker aus, um Musik zu machen oder aus der Tiefe deines Herzens zu singen',
			'Übe ein Lied mit jemandem'
		]
	},

	// === SCHWÄRMEREI (Atempause) ===
	{
		slug: 'geistertanz',
		name: 'Geistertanz',
		typ: 'katastrophe',
		monat: 'Schwärmerei',
		beschreibung: 'In manchen Nächten, wenn die Glühwürmchen besonders zahlreich sind und der Nebel vom Fluss aufsteigt, beginnt der Geistertanz. Die Lichter bewegen sich in Mustern, die kein Tier erzeugen könnte, und manche schwören, dass sie Gestalten sehen — die Geister derer, die gegangen sind, die für eine Nacht zurückkehren, um mit den Lebenden zu tanzen.',
		effekte: [
			'Geister verstorbener Freunde und Familie können erscheinen',
			'Fragen an die Toten werden manchmal beantwortet',
			'Wer mit einem Geist tanzt, erhält eine Vision oder Erinnerung',
			'Der Schleier zwischen den Welten ist dünn — seid respektvoll'
		]
	},
	{
		slug: 'besinnungstag',
		name: 'Besinnungstag',
		typ: 'fest',
		monat: 'Schwärmerei',
		beschreibung: 'Der letzte Tag der Atempause ist hier der Besinnungstag, ein Tag, um über das vergangene Jahr nachzudenken, Wiedergutmachung zu leisten und anderen und sich selbst zu vergeben.',
		traditionen: [
			'Momente der Stille',
			'Fasten',
			'Ein riesiges Festmahl für alle',
			'Tagebuch schreiben',
			'Eine besondere Begrüßung',
			'Seine Sorgen in den Fluss werfen',
			'Gespräche mit Menschen, die man lange nicht gesehen hat'
		],
		effekte: [
			'Entschuldige dich, ohne etwas zu erwarten (verdiene einen Marker)',
			'Wünsche jemandem das Beste für die kommende Ernte und gib ihm einen deiner Marker',
			'Nimm dir einen ruhigen Moment für dich selbst'
		]
	},

	// === GATTERLING (Atempause) ===
	{
		slug: 'fluechtiger-gatterling',
		name: 'Flüchtiger Gatterling',
		typ: 'katastrophe',
		monat: 'Gatterling',
		beschreibung: 'Der Monat Gatterling ist kurz — manchmal so kurz, dass man das Gefühl hat, ihn völlig zu verpassen. Wenn dieses Phänomen auftritt, ist Gatterling gekommen und gegangen, während ihr nicht aufgepasst habt, und der Mondtanz beginnt unmittelbar danach.',
		effekte: [
			'Der Monat vergeht im Handumdrehen',
			'Wichtige Dinge können vergessen oder verpasst werden',
			'Die Zeit selbst scheint zu verschwimmen'
		]
	},

	// === FEUERKRON (Schlickspanne) ===
	{
		slug: 'namenloser-tag',
		name: 'Namenloser Tag',
		typ: 'katastrophe',
		monat: 'Feuerkron',
		beschreibung: 'An seltenen und verfluchten Orten spricht niemand vom letzten Tag der Schlickspanne. Die Knurrende Göttin mag schon lange tot sein, aber sie ist noch nicht vergessen. An diesem Tag bleiben die Türen verschlossen, die Fenster verhängt, und niemand spricht einen Namen aus — aus Angst, ihre Aufmerksamkeit zu erregen.',
		effekte: [
			'Niemand spricht Namen aus',
			'Türen und Fenster bleiben geschlossen',
			'Alte, vergessene Ängste können wieder auftauchen',
			'Seid still und wartet, bis der Tag vorüber ist'
		]
	},
	{
		slug: 'drachenfest',
		name: 'Drachenfest',
		typ: 'fest',
		monat: 'Feuerkron',
		beschreibung: 'Wenn die Herbstwinde auffrischen und die Blätter in Rot und Gold leuchten, ist es Zeit für das Drachenfest. Überall steigen bunte Drachen in den Himmel — manche kunstvoll gefertigt, manche von Kinderhand bemalt. Es heißt, die Drachen tragen Wünsche und Botschaften zu den Wolken hinauf.',
		traditionen: [
			'Drachenbau-Wettbewerbe',
			'Drachen steigen lassen auf den höchsten Hügeln',
			'Geschichten über die alten Drachen von Hæth',
			'Kürbis- und Apfelernte',
			'Laternenumzüge bei Einbruch der Dunkelheit',
			'Warmer Apfelwein und geröstete Kastanien'
		],
		effekte: [
			'Wünsche, die an Drachen gebunden werden, haben eine Chance, erhört zu werden',
			'Wer den höchsten Drachen steigen lässt, erhält eine kleine Segnung',
			'Verlorene Drachen finden manchmal ihren Weg zu denen, die sie am meisten brauchen'
		]
	},

	// === KLAUENGRIFF (Schlickspanne) ===
	{
		slug: 'sturm',
		name: 'Der Große Sturm',
		typ: 'katastrophe',
		monat: 'Klauengriff',
		beschreibung: 'Der Große Sturm, auch "Gieriger Sturm" oder "Nordsturm" genannt, ist eine erschreckende und seltene Erfahrung. Kalter Nordwind, Blitze, Donner, ein schwarzer Himmel — Bäume fallen und Gebäude stürzen ein. Und all das ohne Regen, manchmal mit Graupel oder Hagel.',
		effekte: [
			'Das Phänomen dauert die gesamte Dauer von Klauengriff',
			'Reisen ist gefährlich',
			'Sucht Schutz und bleibt beisammen',
			'Alte Strukturen können beschädigt werden'
		]
	},
	{
		slug: 'kerzenfest',
		name: 'Kerzenfest',
		typ: 'fest',
		monat: 'Klauengriff',
		beschreibung: 'Während alle sich von der Schlickspanne verabschieden und die eisigen Frostmonde willkommen heißen, ist das Kerzenfest eine Zeit, in der jeder seine Familie (sowohl die biologische als auch die gefundene) ehren und einander Hoffnung in einer dunklen Zeit geben kann.',
		traditionen: [
			'Kerzen in jedem Fenster',
			'Geschichten am Feuer erzählen',
			'Handgemachte Geschenke austauschen',
			'Gemeinsames Kochen und Essen',
			'Lieder der Hoffnung und des Lichts',
			'Jeder zündet eine Kerze für jemanden an, den er vermisst'
		],
		effekte: [
			'Das Licht der Kerzen vertreibt Dunkelheit und Furcht',
			'Familienbande werden gestärkt',
			'Erinnerungen an Verstorbene werden geteilt und geehrt'
		]
	},

	// === SCHNEEBETT (Frostmonde) ===
	{
		slug: 'tiefschnee',
		name: 'Tiefschnee',
		typ: 'katastrophe',
		monat: 'Schneebett',
		beschreibung: 'Wenn der Schnee zu fallen beginnt, kann er wirklich fallen. Es gibt Berichte von vergangenen Schneefällen, die ganze Häuser unter der weißen Decke begraben haben. Nur jemand wirklich Unvorsichtiges würde jetzt reisen. Wäre da nicht die Kultur der Gastfreundschaft in Hæth, wäre es ein Albtraum für euch Wanderer.',
		effekte: [
			'Ihr seid an eurem letzten Ort festgesetzt',
			'Ihr könnt erst wieder reisen, wenn Tiefschnee verschwindet',
			'Ihr müsst einen Marker ausgeben, um zwischen Orten zu reisen',
			'Tiefschnee dauert bis zur Neujahrswoche'
		]
	},
	{
		slug: 'sonnenfinsternis',
		name: 'Sonnenfinsternis',
		typ: 'fest',
		monat: 'Schneebett',
		beschreibung: 'Die Nachricht von den Astronomen des Schwebenden Berges hat selbst die entlegensten Winkel von Hæth erreicht. Wenn die eisige Sonne hoch in den kalten Himmel steigt, wird der Mond vor ihr tanzen und die Welt in Dunkelheit tauchen. Eine Sonnenfinsternis dauert nur einen Moment, kann aber die Vorstellungskraft der Menschen für Jahre fesseln.',
		traditionen: [
			'Alle verlassen ihre gemütlichen Decken, um das Spektakel zu sehen',
			'Geschichten über die Bedeutung der Finsternis',
			'Momente der Stille während der Totalität',
			'Wünsche werden im Moment der Dunkelheit ausgesprochen'
		],
		effekte: [
			'Jeder Ort wird zusätzlich zu einem Spiegel',
			'Visionen und Prophezeiungen sind möglich',
			'Der Moment der Finsternis ist heilig'
		]
	},

	// === FROST (Frostmonde) ===
	{
		slug: 'blutnacht',
		name: 'Blutnacht',
		typ: 'katastrophe',
		monat: 'Frost',
		beschreibung: 'In der kältesten Nacht des Jahres, wenn der Mond blutrot am Himmel steht, erzählen die Ältesten von der Blutnacht. Es ist eine Nacht, in der alte Schulden eingefordert werden, in der vergessene Versprechen zurückkehren, und in der die dunkelsten Geschichten von Hæth lebendig werden. Niemand geht in dieser Nacht allein nach draußen.',
		effekte: [
			'Alte Schulden und vergessene Versprechen können euch einholen',
			'Bleibt nicht allein — sucht Gesellschaft',
			'Geschichten, die in dieser Nacht erzählt werden, haben besondere Macht',
			'Der Morgen danach bringt Erleichterung und Neuanfang'
		]
	},
	{
		slug: 'neujahrswoche',
		name: 'Neujahrswoche',
		typ: 'fest',
		monat: 'Frost',
		beschreibung: 'Die Neujahrswoche ist das Ende des Jahres, eine ganze Woche voller Feiern, die eine Zeit des radikalen Wandels und der Transformation ist. Es ist eine Zeit der Hoffnung, des Abschieds vom Alten und der Begrüßung des Neuen.',
		traditionen: [
			'Eine Woche hoffnungsvoller Feiern',
			'Lautes Feuerwerk',
			'Marktstände mit vielen Snacks',
			'Geschenke geben',
			'Aufwendige und prächtige Kostüme',
			'Besondere Aufführungen',
			'Briefe an all deine Freunde'
		],
		effekte: [
			'Gib jemandem etwas, das er sich wirklich wünscht (verdiene einen Marker)',
			'Gib dir selbst ein Versprechen, das du unbedingt halten willst (gib einen Marker aus)',
			'Probiere einen neuen Namen, Stil oder ein neues Geschlecht aus'
		]
	}
];

export function getEreignisBySlug(slug: string): Ereignis | undefined {
	return ereignisse.find(e => e.slug === slug);
}

export function getEreignisseByMonat(monat: string): Ereignis[] {
	return ereignisse.filter(e => e.monat === monat);
}

export function getKatastrophen(): Ereignis[] {
	return ereignisse.filter(e => e.typ === 'katastrophe');
}

export function getFeste(): Ereignis[] {
	return ereignisse.filter(e => e.typ === 'fest');
}
