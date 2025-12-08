/**
 * Gottheiten (Deities) data for Wurzelwanderer.
 * Inspired by Shintoism, Studio Ghibli, and fairy tales from around the world.
 */

import { getRandomElement, getRandomElements } from '$lib/utils/random';

// ==========================================
// Interfaces
// ==========================================

export interface GottheitFähigkeit {
	name: string;
	beschreibung: string;
	kosten?: string; // z.B. "Eine Erinnerung", "Ein Lied"
}

export interface Gottheit {
	id: string;
	name: string;
	beiname?: string; // z.B. "Hüterin der stillen Wasser"
	domäne: string; // Was sie beschützt/verkörpert
	erscheinung: string; // Wie sie sich zeigt
	fähigkeiten: GottheitFähigkeit[]; // 1-3 übernatürliche Fähigkeiten
	opferweg: string; // Wie man ihr opfern kann
	vorgeschichte?: string; // Backstory (LLM-generiert)
	bild?: string; // Generiertes Bild als Base64
	ortId?: string; // Optional: gebunden an einen Ort
	erstelltAm: string;
}

// ==========================================
// Domänen - Was die Gottheit beschützt/verkörpert
// ==========================================

export interface Domäne {
	name: string;
	beschreibung: string;
	kategorie: 'natur' | 'übergang' | 'emotion' | 'alltag' | 'abstrakt';
}

export const domänen: Domäne[] = [
	// Natur
	{ name: 'Vergessene Wälder', beschreibung: 'Orte, die niemand mehr betritt', kategorie: 'natur' },
	{ name: 'Erste Knospen', beschreibung: 'Der Moment bevor etwas erblüht', kategorie: 'natur' },
	{ name: 'Letzte Blätter', beschreibung: 'Der Abschied des Herbstes', kategorie: 'natur' },
	{ name: 'Stille Gewässer', beschreibung: 'Teiche und Seen die Geheimnisse bewahren', kategorie: 'natur' },
	{ name: 'Morgentau', beschreibung: 'Die Reinheit des ersten Lichts', kategorie: 'natur' },
	{ name: 'Alte Wurzeln', beschreibung: 'Was unter der Erde verbunden ist', kategorie: 'natur' },
	{ name: 'Wandernde Wolken', beschreibung: 'Träume die über den Himmel ziehen', kategorie: 'natur' },
	{ name: 'Verborgene Quellen', beschreibung: 'Wasser das aus der Tiefe kommt', kategorie: 'natur' },

	// Übergänge
	{ name: 'Türschwellen', beschreibung: 'Der Moment zwischen Kommen und Gehen', kategorie: 'übergang' },
	{ name: 'Kreuzwege', beschreibung: 'Orte der Entscheidung', kategorie: 'übergang' },
	{ name: 'Dämmerung', beschreibung: 'Weder Tag noch Nacht', kategorie: 'übergang' },
	{ name: 'Morgennebel', beschreibung: 'Wenn die Welt noch unscharf ist', kategorie: 'übergang' },
	{ name: 'Letzte Atemzüge', beschreibung: 'Der Übergang ins Unbekannte', kategorie: 'übergang' },
	{ name: 'Erste Schritte', beschreibung: 'Der Beginn jeder Reise', kategorie: 'übergang' },
	{ name: 'Brücken im Nebel', beschreibung: 'Verbindungen die man nicht sieht', kategorie: 'übergang' },

	// Emotionen
	{ name: 'Vergessene Träume', beschreibung: 'Was wir beim Aufwachen verlieren', kategorie: 'emotion' },
	{ name: 'Unausgesprochenes', beschreibung: 'Worte die nie gesagt wurden', kategorie: 'emotion' },
	{ name: 'Kindheitserinnerungen', beschreibung: 'Das Wunder der ersten Male', kategorie: 'emotion' },
	{ name: 'Stille Hoffnung', beschreibung: 'Das Licht das im Dunkeln wartet', kategorie: 'emotion' },
	{ name: 'Süße Melancholie', beschreibung: 'Die Schönheit im Vergehen', kategorie: 'emotion' },
	{ name: 'Heimweh', beschreibung: 'Die Sehnsucht nach einem Ort der vielleicht nie war', kategorie: 'emotion' },
	{ name: 'Versöhnung', beschreibung: 'Das Heilen alter Wunden', kategorie: 'emotion' },

	// Alltägliches
	{ name: 'Verlorene Gegenstände', beschreibung: 'Dinge die zwischen die Ritzen fallen', kategorie: 'alltag' },
	{ name: 'Hausarbeit', beschreibung: 'Die unsichtbare Arbeit die alles zusammenhält', kategorie: 'alltag' },
	{ name: 'Letzte Worte', beschreibung: 'Was am Ende gesagt wird', kategorie: 'alltag' },
	{ name: 'Kleine Freuden', beschreibung: 'Das Glück im Unscheinbaren', kategorie: 'alltag' },
	{ name: 'Gastfreundschaft', beschreibung: 'Das Willkommen für Fremde', kategorie: 'alltag' },
	{ name: 'Handwerk', beschreibung: 'Die Kunst der geschickten Hände', kategorie: 'alltag' },
	{ name: 'Gute Nächte', beschreibung: 'Der friedliche Schlaf', kategorie: 'alltag' },

	// Abstraktes
	{ name: 'Vergangene Zeit', beschreibung: 'Momente die nicht wiederkommen', kategorie: 'abstrakt' },
	{ name: 'Ungeborene Geschichten', beschreibung: 'Erzählungen die noch niemand kennt', kategorie: 'abstrakt' },
	{ name: 'Wartende Briefe', beschreibung: 'Nachrichten die nie ankamen', kategorie: 'abstrakt' },
	{ name: 'Verpasste Chancen', beschreibung: 'Wege die nicht gegangen wurden', kategorie: 'abstrakt' },
	{ name: 'Gebrochene Versprechen', beschreibung: 'Worte die nicht gehalten wurden', kategorie: 'abstrakt' },
	{ name: 'Glückliche Zufälle', beschreibung: 'Das Unerwartete das gut ausgeht', kategorie: 'abstrakt' },
	{ name: 'Ewige Augenblicke', beschreibung: 'Momente die sich ewig anfühlen', kategorie: 'abstrakt' },
];

// ==========================================
// Erscheinungsformen
// ==========================================

export interface Erscheinung {
	name: string;
	beschreibung: string;
	kategorie: 'natur' | 'tier' | 'objekt' | 'wesen';
}

export const erscheinungen: Erscheinung[] = [
	// Naturformen
	{ name: 'Ein uralter Baum mit Gesicht', beschreibung: 'Rinde formt sanfte Züge', kategorie: 'natur' },
	{ name: 'Flüsternder Wind', beschreibung: 'Stimmen im Rascheln der Blätter', kategorie: 'natur' },
	{ name: 'Tanzendes Licht', beschreibung: 'Sonnenstrahlen die Muster weben', kategorie: 'natur' },
	{ name: 'Lebendige Nebelschwaden', beschreibung: 'Dunst der sich wie atmend bewegt', kategorie: 'natur' },
	{ name: 'Glühende Pilze', beschreibung: 'Sanftes Leuchten in der Dunkelheit', kategorie: 'natur' },
	{ name: 'Singende Quelle', beschreibung: 'Wasser das Melodien plätschert', kategorie: 'natur' },
	{ name: 'Wandernde Wurzeln', beschreibung: 'Holz das sich langsam bewegt', kategorie: 'natur' },

	// Tierformen
	{ name: 'Weißer Hirsch', beschreibung: 'Majestätisch und kaum greifbar', kategorie: 'tier' },
	{ name: 'Uralte Kröte', beschreibung: 'Runzlig und weise mit goldenen Augen', kategorie: 'tier' },
	{ name: 'Schimmernder Fuchs', beschreibung: 'Fell das wie Mondlicht glänzt', kategorie: 'tier' },
	{ name: 'Stummer Rabe', beschreibung: 'Beobachtet mit wissenden Augen', kategorie: 'tier' },
	{ name: 'Tanzende Glühwürmchen', beschreibung: 'Ein Schwarm der Botschaften trägt', kategorie: 'tier' },
	{ name: 'Schattenkatze', beschreibung: 'Nur im Augenwinkel sichtbar', kategorie: 'tier' },
	{ name: 'Uralte Schildkröte', beschreibung: 'Moos auf dem Panzer, Sterne in den Augen', kategorie: 'tier' },
	{ name: 'Singender Fisch', beschreibung: 'Melodien aus der Tiefe', kategorie: 'tier' },

	// Objektformen
	{ name: 'Moosbedeckter Stein', beschreibung: 'Alt und warm und wissend', kategorie: 'objekt' },
	{ name: 'Rostiger Schlüssel', beschreibung: 'Öffnet Türen die es nicht gibt', kategorie: 'objekt' },
	{ name: 'Zerbrochener Spiegel', beschreibung: 'Zeigt was war und was sein könnte', kategorie: 'objekt' },
	{ name: 'Ewige Kerze', beschreibung: 'Flamme die niemals erlischt', kategorie: 'objekt' },
	{ name: 'Leere Wiege', beschreibung: 'Bewegt sich von selbst', kategorie: 'objekt' },
	{ name: 'Vergessenes Buch', beschreibung: 'Seiten die sich selbst schreiben', kategorie: 'objekt' },
	{ name: 'Windspiel aus Knochen', beschreibung: 'Klingt wie ferne Stimmen', kategorie: 'objekt' },

	// Menschenähnliche Wesen
	{ name: 'Alte mit langem Haar', beschreibung: 'Strähnen wie Spinnweben, Augen wie Sterne', kategorie: 'wesen' },
	{ name: 'Kind mit uralten Augen', beschreibung: 'Lächelt als wüsste es alles', kategorie: 'wesen' },
	{ name: 'Schatten ohne Körper', beschreibung: 'Dunkelheit die lächelt', kategorie: 'wesen' },
	{ name: 'Wanderer mit tausend Gesichtern', beschreibung: 'Jedes Mal anders und doch gleich', kategorie: 'wesen' },
	{ name: 'Durchsichtiges Mädchen', beschreibung: 'Man sieht die Welt durch sie hindurch', kategorie: 'wesen' },
	{ name: 'Schlafender Riese', beschreibung: 'Ein Hügel der manchmal atmet', kategorie: 'wesen' },
	{ name: 'Spiegelbild das bleibt', beschreibung: 'Auch wenn man weggeht', kategorie: 'wesen' },
];

// ==========================================
// Übernatürliche Fähigkeiten
// ==========================================

export interface FähigkeitTemplate {
	name: string;
	beschreibung: string;
	kosten: string;
	kategorie: 'segen' | 'wissen' | 'schutz' | 'transformation';
}

export const fähigkeitenTemplates: FähigkeitTemplate[] = [
	// Segen
	{ name: 'Blühendes Wort', beschreibung: 'Pflanzen erblühen bei einem Segen', kosten: 'Ein aufrichtiges Lob', kategorie: 'segen' },
	{ name: 'Heilende Berührung', beschreibung: 'Kleine Wunden und große Sorgen lindern', kosten: 'Eine Träne aus Mitgefühl', kategorie: 'segen' },
	{ name: 'Gesegneter Schlaf', beschreibung: 'Traumlose, heilende Ruhe schenken', kosten: 'Ein Schlaflied summen', kategorie: 'segen' },
	{ name: 'Wegverkürzung', beschreibung: 'Reisen dauern halb so lang', kosten: 'Ein Geschenk für den nächsten Fremden', kategorie: 'segen' },
	{ name: 'Fruchtbarer Boden', beschreibung: 'Was gepflanzt wird, gedeiht', kosten: 'Etwas Eigenes in die Erde geben', kategorie: 'segen' },
	{ name: 'Sanfter Regen', beschreibung: 'Wasser wenn es gebraucht wird', kosten: 'Einen Tag lang kein Dach aufsuchen', kategorie: 'segen' },

	// Wissen
	{ name: 'Vergessenes Enthüllen', beschreibung: 'Verlorene Erinnerungen zurückbringen', kosten: 'Eine eigene Erinnerung teilen', kategorie: 'wissen' },
	{ name: 'Wahrheiten Flüstern', beschreibung: 'Die echte Natur von etwas erkennen', kosten: 'Eine unbequeme Wahrheit aussprechen', kategorie: 'wissen' },
	{ name: 'Zukunft Andeuten', beschreibung: 'Vage Hinweise auf Kommendes', kosten: 'Einen Tag lang nur zuhören', kategorie: 'wissen' },
	{ name: 'Sprache der Tiere', beschreibung: 'Verstehen was Tiere sagen', kosten: 'Futter mit einem Tier teilen', kategorie: 'wissen' },
	{ name: 'Träume Deuten', beschreibung: 'Die Bedeutung von Träumen verstehen', kosten: 'Den eigenen Traum erzählen', kategorie: 'wissen' },
	{ name: 'Namen Kennen', beschreibung: 'Den wahren Namen von Dingen wissen', kosten: 'Den eigenen geheimen Namen verraten', kategorie: 'wissen' },

	// Schutz
	{ name: 'Gefahren Spüren', beschreibung: 'Vor Unheil gewarnt werden', kosten: 'Einen Moment lang die Augen schließen', kategorie: 'schutz' },
	{ name: 'Sichere Wege', beschreibung: 'Den richtigen Pfad finden', kosten: 'Einem Verirrten helfen', kategorie: 'schutz' },
	{ name: 'Böses Fernhalten', beschreibung: 'Schutz vor dunklen Absichten', kosten: 'Eine gute Tat im Verborgenen', kategorie: 'schutz' },
	{ name: 'Unsichtbarer Mantel', beschreibung: 'Von Feinden nicht gesehen werden', kosten: 'Etwas Kostbares verstecken', kategorie: 'schutz' },
	{ name: 'Sturm Abwenden', beschreibung: 'Schlechtes Wetter meiden', kosten: 'Im Regen tanzen', kategorie: 'schutz' },
	{ name: 'Kreis des Friedens', beschreibung: 'Ein Ort an dem keine Gewalt sein kann', kosten: 'Waffen ablegen und einen Tag nicht wieder aufnehmen', kategorie: 'schutz' },

	// Transformation
	{ name: 'Gestaltwandel', beschreibung: 'Für kurze Zeit eine andere Form annehmen', kosten: 'Einen Teil von sich zurücklassen', kategorie: 'transformation' },
	{ name: 'Zeit Dehnen', beschreibung: 'Einen Moment länger machen', kosten: 'Eine Stunde in völliger Stille', kategorie: 'transformation' },
	{ name: 'Träume Formen', beschreibung: 'Träume anderer beeinflussen', kosten: 'Wach bleiben während andere schlafen', kategorie: 'transformation' },
	{ name: 'Stimme Leihen', beschreibung: 'Mit der Stimme eines anderen sprechen', kosten: 'Einen Tag lang schweigen', kategorie: 'transformation' },
	{ name: 'Größe Ändern', beschreibung: 'Winzig oder riesig werden', kosten: 'Etwas Kleines wie etwas Großes behandeln', kategorie: 'transformation' },
	{ name: 'Alter Wandeln', beschreibung: 'Für kurze Zeit jünger oder älter erscheinen', kosten: 'Einem Älteren zuhören, einem Jüngeren helfen', kategorie: 'transformation' },
];

// ==========================================
// Opferwege
// ==========================================

export interface Opferweg {
	name: string;
	beschreibung: string;
	kategorie: 'materiell' | 'handlung' | 'emotional' | 'verzicht';
}

export const opferwege: Opferweg[] = [
	// Materiell
	{ name: 'Speisen hinterlassen', beschreibung: 'Das Beste vom Tisch, nicht die Reste', kategorie: 'materiell' },
	{ name: 'Blumen pflanzen', beschreibung: 'Etwas das wächst und blüht', kategorie: 'materiell' },
	{ name: 'Kerzen anzünden', beschreibung: 'Licht in der Dunkelheit', kategorie: 'materiell' },
	{ name: 'Wasser ausgießen', beschreibung: 'Reines Wasser an einem besonderen Ort', kategorie: 'materiell' },
	{ name: 'Bänder knüpfen', beschreibung: 'Bunte Stoffe an heiligen Bäumen', kategorie: 'materiell' },
	{ name: 'Steine stapeln', beschreibung: 'Kleine Türme als Zeichen der Ehrfurcht', kategorie: 'materiell' },

	// Handlung
	{ name: 'Ein Lied singen', beschreibung: 'Mit ganzem Herzen, egal wie es klingt', kategorie: 'handlung' },
	{ name: 'Eine Geschichte erzählen', beschreibung: 'Wahre oder erfundene, aber ehrlich erzählte', kategorie: 'handlung' },
	{ name: 'Einen Tanz aufführen', beschreibung: 'Bewegung als Gebet', kategorie: 'handlung' },
	{ name: 'Etwas reparieren', beschreibung: 'Zerbrochenes wieder ganz machen', kategorie: 'handlung' },
	{ name: 'Einen Ort säubern', beschreibung: 'Schmutz entfernen, Ordnung schaffen', kategorie: 'handlung' },
	{ name: 'Einem Fremden helfen', beschreibung: 'Ohne Erwartung einer Gegenleistung', kategorie: 'handlung' },

	// Emotional
	{ name: 'Eine Erinnerung teilen', beschreibung: 'Etwas Persönliches laut aussprechen', kategorie: 'emotional' },
	{ name: 'Ehrlich weinen', beschreibung: 'Tränen die von Herzen kommen', kategorie: 'emotional' },
	{ name: 'Aufrichtig beten', beschreibung: 'Worte ohne Berechnung', kategorie: 'emotional' },
	{ name: 'Verzeihen', beschreibung: 'Alten Groll loslassen', kategorie: 'emotional' },
	{ name: 'Sich entschuldigen', beschreibung: 'Fehler eingestehen und bereuen', kategorie: 'emotional' },
	{ name: 'Dankbarkeit aussprechen', beschreibung: 'Wertschätzung zeigen für das Kleine', kategorie: 'emotional' },

	// Verzicht
	{ name: 'Einen Tag fasten', beschreibung: 'Hunger als Opfer', kategorie: 'verzicht' },
	{ name: 'Im Schweigen verweilen', beschreibung: 'Keine Worte für eine bestimmte Zeit', kategorie: 'verzicht' },
	{ name: 'Einen Umweg gehen', beschreibung: 'Den längeren Weg wählen', kategorie: 'verzicht' },
	{ name: 'Schlaf opfern', beschreibung: 'Eine Nacht wachend verbringen', kategorie: 'verzicht' },
	{ name: 'Etwas Liebgewonnenes weggeben', beschreibung: 'Sich von Besitz trennen', kategorie: 'verzicht' },
	{ name: 'Barfuß gehen', beschreibung: 'Die Erde direkt spüren', kategorie: 'verzicht' },
];

// ==========================================
// Namen für Gottheiten
// ==========================================

export const gottheitNamen: string[] = [
	// Naturklänge
	'Murmelinde', 'Nebelwebe', 'Tautropf', 'Wurzelherz', 'Windhauch',
	'Moosflüster', 'Sternenfang', 'Blattschatten', 'Quellenmund', 'Rindensang',
	// Japanisch inspiriert
	'Yuki-no-Kami', 'Kawa-Hime', 'Mori-no-Sei', 'Tsuki-Mori', 'Hana-Gami',
	// Deutsch-märchenhaft
	'Frau Holle', 'Grünmantel', 'Silberzopf', 'Goldauge', 'Schattenbart',
	'Nebelmutter', 'Wurzelväterchen', 'Mondkind', 'Sonnentochter', 'Sternenvater',
	// Abstrakt
	'Die Wartende', 'Der Lauscher', 'Die Schweigsame', 'Der Wanderer',
	'Die Vergessene', 'Der Erste', 'Die Letzte', 'Der Niemand', 'Die Irgendwer',
];

export const gottheitBeinamen: string[] = [
	'Hüter*in der stillen Wasser',
	'Wächter*in der Schwellen',
	'Bewahrer*in vergessener Dinge',
	'Träger*in verlorener Träume',
	'Flüsterer*in im Wind',
	'Tänzer*in im Morgennebel',
	'Sänger*in der alten Lieder',
	'Sammler*in der letzten Blätter',
	'Hörende der ungesagten Worte',
	'Weberin der Schicksalsfäden',
	'Wächter der ersten Schritte',
	'Begleiterin der letzten Reise',
	'Herr der kleinen Freuden',
	'Dame der süßen Melancholie',
	'Kind der ewigen Dämmerung',
];

// ==========================================
// Ort-Kontext für inspirierte Gottheiten
// ==========================================

export interface OrtKontext {
	name: string;
	naturelleNamen: string[];
	naturelleKategorien: string[];
	ortBeschreibung?: string;
}

// Mapping von Naturelle-Kategorien zu passenden Domänen-Kategorien
const kategorieMapping: Record<string, ('natur' | 'übergang' | 'emotion' | 'alltag' | 'abstrakt')[]> = {
	'Gemütlich': ['alltag', 'emotion'],
	'Lebendig': ['natur', 'alltag'],
	'Verbindend': ['übergang', 'emotion'],
	'Weitläufig': ['natur', 'abstrakt'],
	'Einsam': ['emotion', 'abstrakt'],
	'Verlassen': ['übergang', 'abstrakt', 'emotion'],
};

// Ortsbasierte Beinamen-Templates
const ortsBeinamenTemplates: string[] = [
	'Wächter*in von {ort}',
	'Geist von {ort}',
	'Hüter*in des {ort}',
	'Seele von {ort}',
	'Stimme von {ort}',
	'Beschützer*in von {ort}',
	'Schatten von {ort}',
	'Herz von {ort}',
];

// ==========================================
// Generator-Funktionen
// ==========================================

export function generiereGottheitId(): string {
	return `gottheit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generiert Gottheit-Daten ohne Ort-Kontext (für unabhängige Gottheiten)
 */
export function generiereGottheitData(): Omit<Gottheit, 'id' | 'erstelltAm' | 'vorgeschichte'> {
	const domäne = getRandomElement(domänen);
	const erscheinung = getRandomElement(erscheinungen);
	const name = getRandomElement(gottheitNamen);
	const beiname = getRandomElement(gottheitBeinamen);

	// 1-3 Fähigkeiten
	const anzahlFähigkeiten = Math.floor(Math.random() * 3) + 1;
	const gewählteFähigkeiten = getRandomElements(fähigkeitenTemplates, anzahlFähigkeiten);
	const fähigkeiten: GottheitFähigkeit[] = gewählteFähigkeiten.map(f => ({
		name: f.name,
		beschreibung: f.beschreibung,
		kosten: f.kosten,
	}));

	const opfer = getRandomElement(opferwege);

	return {
		name,
		beiname,
		domäne: domäne.name,
		erscheinung: erscheinung.name,
		fähigkeiten,
		opferweg: opfer.name + ': ' + opfer.beschreibung,
	};
}

/**
 * Generiert Gottheit-Daten inspiriert von einem Ort
 */
export function generiereGottheitDataMitOrt(ortKontext: OrtKontext): Omit<Gottheit, 'id' | 'erstelltAm' | 'vorgeschichte'> {
	// Sammle passende Domänen-Kategorien basierend auf Naturelle-Kategorien
	const passendeDomänenKategorien = new Set<'natur' | 'übergang' | 'emotion' | 'alltag' | 'abstrakt'>();
	for (const kat of ortKontext.naturelleKategorien) {
		const mappedKats = kategorieMapping[kat];
		if (mappedKats) {
			mappedKats.forEach(k => passendeDomänenKategorien.add(k));
		}
	}

	// Falls keine Kategorien gefunden, alle verwenden
	const kategorienArray = passendeDomänenKategorien.size > 0
		? Array.from(passendeDomänenKategorien)
		: ['natur', 'übergang', 'emotion', 'alltag', 'abstrakt'] as const;

	// Filtere Domänen nach passenden Kategorien (70% Chance) oder wähle zufällig (30%)
	let domäne: Domäne;
	if (Math.random() < 0.7) {
		const passendeDomänen = domänen.filter(d => kategorienArray.includes(d.kategorie));
		domäne = passendeDomänen.length > 0 ? getRandomElement(passendeDomänen) : getRandomElement(domänen);
	} else {
		domäne = getRandomElement(domänen);
	}

	// Erscheinung - bevorzuge bestimmte Kategorien basierend auf Ort-Atmosphäre
	let erscheinung: Erscheinung;
	const hasNaturNaturelle = ortKontext.naturelleNamen.some(n =>
		['Wald', 'Wiese', 'Garten', 'Bach', 'See', 'Berg', 'Tal'].some(k => n.includes(k))
	);
	if (hasNaturNaturelle && Math.random() < 0.6) {
		const naturErscheinungen = erscheinungen.filter(e => e.kategorie === 'natur' || e.kategorie === 'tier');
		erscheinung = naturErscheinungen.length > 0 ? getRandomElement(naturErscheinungen) : getRandomElement(erscheinungen);
	} else {
		erscheinung = getRandomElement(erscheinungen);
	}

	// Name
	const name = getRandomElement(gottheitNamen);

	// Beiname - 50% Chance auf ortsbasierten Beinamen
	let beiname: string;
	if (Math.random() < 0.5) {
		const template = getRandomElement(ortsBeinamenTemplates);
		beiname = template.replace('{ort}', ortKontext.name);
	} else {
		beiname = getRandomElement(gottheitBeinamen);
	}

	// 1-3 Fähigkeiten
	const anzahlFähigkeiten = Math.floor(Math.random() * 3) + 1;
	const gewählteFähigkeiten = getRandomElements(fähigkeitenTemplates, anzahlFähigkeiten);
	const fähigkeiten: GottheitFähigkeit[] = gewählteFähigkeiten.map(f => ({
		name: f.name,
		beschreibung: f.beschreibung,
		kosten: f.kosten,
	}));

	const opfer = getRandomElement(opferwege);

	return {
		name,
		beiname,
		domäne: domäne.name,
		erscheinung: erscheinung.name,
		fähigkeiten,
		opferweg: opfer.name + ': ' + opfer.beschreibung,
	};
}

/**
 * Erstellt eine neue Gottheit, optional mit Ort-Kontext für thematische Inspiration
 */
export function erstelleGottheit(daten?: Partial<Gottheit>, ortKontext?: OrtKontext): Gottheit {
	// Generiere Basisdaten - mit oder ohne Ort-Kontext
	const generiert = ortKontext
		? generiereGottheitDataMitOrt(ortKontext)
		: generiereGottheitData();

	return {
		id: generiereGottheitId(),
		name: daten?.name ?? generiert.name,
		beiname: daten?.beiname ?? generiert.beiname,
		domäne: daten?.domäne ?? generiert.domäne,
		erscheinung: daten?.erscheinung ?? generiert.erscheinung,
		fähigkeiten: daten?.fähigkeiten ?? generiert.fähigkeiten,
		opferweg: daten?.opferweg ?? generiert.opferweg,
		vorgeschichte: daten?.vorgeschichte,
		bild: daten?.bild,
		ortId: daten?.ortId,
		erstelltAm: new Date().toISOString(),
	};
}
