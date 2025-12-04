/**
 * Character class data for Wurzelbücher (hero generation).
 */

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
