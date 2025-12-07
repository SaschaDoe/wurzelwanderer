/**
 * Character class data for Wurzelbücher (hero generation).
 */

export type VerbundenerTyp = 'muendel' | 'hummel';

export interface VerbundeneBekannteConfig {
	typ: VerbundenerTyp;
	label: string; // z.B. "Mündel", "Hummel"
	labelPlural: string; // z.B. "Mündel", "Hummeln"
	buttonText: string; // z.B. "Mündel hinzufügen", "Hummel hinzufügen"
	maxAnzahl?: number; // Optional: Begrenzung (undefined = unbegrenzt)
	startAnzahl?: number; // Optional: Anzahl bei Charaktererstellung (default 1)
}

export interface CharakterKlasseData {
	name: string;
	bild: string;
	beschreibung: string;
	frage: string;
	tokens: {
		anderer: string;
		selbst: string;
		ausgeben: string;
	};
	besonders: string;
	warnung?: string;
	farbe: string;
	verbundeneBekannte?: VerbundeneBekannteConfig;
}

export const charaktere: CharakterKlasseData[] = [
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
		farbe: 'earth',
		verbundeneBekannte: {
			typ: 'muendel',
			label: 'Mündel',
			labelPlural: 'Mündel',
			buttonText: 'Mündel erstellen',
			maxAnzahl: 1,
			startAnzahl: 1
		}
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
	},
	{
		name: 'Hummelhirt*in',
		bild: '/images/charaktere/page65_img1.png',
		beschreibung: 'Du hütest einen kleinen Schwarm von Hummeln. Sie arbeiten für dich und du sorgst für sie.',
		frage: 'Wie habe ich meine erste Hummel bekommen?',
		tokens: {
			anderer: 'Gib einer Baby-Hummel einen Namen und eine Persönlichkeit und schenke ihr Aufmerksamkeit',
			selbst: 'Handle etwas von deinen Hummeln Erarbeitetes gegen etwas, was dir Freude bereitet',
			ausgeben: 'Jemand kann dir mit den Hummeln zur Hand gehen'
		},
		besonders: 'Mit deinen Hummeln etwas Unerwartetes erreichen',
		farbe: 'summer',
		verbundeneBekannte: {
			typ: 'hummel',
			label: 'Hummel',
			labelPlural: 'Hummeln',
			buttonText: 'Hummel hinzufügen',
			startAnzahl: 1
		}
	}
];
