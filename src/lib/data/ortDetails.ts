/**
 * Pre-defined tables for Ort details (Gerüchte, Aktivitäten, Entdeckungen)
 * Each entry can have:
 * - text: The template text with placeholders {BEKANNTER}, {NATURELL}
 * - naturelleFilter: Only include if one of these naturelle is present (non-metaphorical)
 * - tags: 'magisch' or 'trauma' for filtering based on settings
 */

export interface OrtDetailEintrag {
	text: string;
	naturelleFilter?: string[]; // Naturelle names that must be present (non-metaphorical)
	tags?: ('magisch' | 'trauma')[];
}

export type DetailKategorie = 'geruechte' | 'aktivitaeten' | 'entdeckungen';

// ==========================================
// GERÜCHTE
// ==========================================

export const geruechteNormal: OrtDetailEintrag[] = [
	{ text: 'Man sagt, {BEKANNTER} kennt hier jeden Winkel und jedes Versteck.' },
	{ text: 'Die Bewohner flüstern, dass {BEKANNTER} einst etwas Wertvolles hier vergraben hat.' },
	{ text: 'Angeblich trifft sich hier manchmal eine geheime Runde zum Geschichtenerzählen.' },
	{ text: 'Es heißt, wer dreimal um den ältesten Baum läuft, findet etwas Verlorenes wieder.' },
	{ text: 'Reisende berichten von einem köstlichen Duft, der manchmal durch die Luft weht.' },
	{ text: '{BEKANNTER} soll hier einmal einen wichtigen Fund gemacht haben.' },
	{ text: 'Man erzählt sich, dass die besten Beeren der Gegend hier wachsen.' },
	{ text: 'Einige behaupten, hier gäbe es einen geheimen Pfad, den nur wenige kennen.' },
	{ text: 'Die Alten sagen, dies sei ein guter Ort für wichtige Entscheidungen.' },
	{ text: '{BEKANNTER} hat angeblich hier ein altes Familienrezept wiederentdeckt.' },
	{ text: 'Man munkelt, dass sich hier verschiedene Wege auf besondere Weise kreuzen.' },
	{ text: 'Es wird erzählt, dass {BEKANNTER} hier seinen Beruf erlernt hat.' },
	{ text: 'Wanderer behaupten, die Aussicht von hier sei zu bestimmten Zeiten besonders schön.' },
	{ text: 'Die Leute sagen, wer hier rastet, hat besonders erholsame Träume.' },
	{ text: 'Angeblich wurde hier einst ein wichtiger Handel abgeschlossen.' },

	// Mit Naturelle-Filter
	{ text: 'Das Wasser hier soll besonders klar und erfrischend sein.', naturelleFilter: ['Teich', 'Bach', 'Fluss', 'See', 'Quelle', 'Brunnen'] },
	{ text: 'Man sagt, die Brücke hier wurde von einem Meister erbaut.', naturelleFilter: ['Brücke'] },
	{ text: 'Die Höhle soll angeblich viel tiefer gehen als man denkt.', naturelleFilter: ['Höhle', 'Grotte'] },
	{ text: 'Unter den Wurzeln des großen Baumes soll etwas versteckt sein.', naturelleFilter: ['Baum', 'Eiche', 'Weide', 'Linde'] },
	{ text: 'Der Gasthof hier soll das beste Essen der ganzen Gegend haben.', naturelleFilter: ['Gasthof', 'Taverne', 'Wirtshaus'] },
];

export const geruechteMagisch: OrtDetailEintrag[] = [
	{ text: '{BEKANNTER} soll hier einmal ein Wesen aus einer anderen Welt gesehen haben.', tags: ['magisch'] },
	{ text: 'Man flüstert, dass die Sterne hier nachts besonders nah erscheinen.', tags: ['magisch'] },
	{ text: 'Angeblich kann man hier manchmal Stimmen aus der Vergangenheit hören.', tags: ['magisch'] },
	{ text: 'Die Alten sagen, ein Geist wacht freundlich über diesen Ort.', tags: ['magisch'] },
	{ text: 'Es heißt, Wünsche, die man hier ausspricht, haben besondere Kraft.', tags: ['magisch'] },
	{ text: '{BEKANNTER} behauptet, hier einmal einen Regenbogen berührt zu haben.', tags: ['magisch'] },
	{ text: 'Man erzählt sich, dass hier die Grenze zur Feenwelt besonders dünn ist.', tags: ['magisch'] },
	{ text: 'Einige schwören, sie hätten hier Musik gehört, obwohl niemand spielte.', tags: ['magisch'] },
	{ text: 'Die Blumen hier sollen angeblich im Mondlicht leuchten.', tags: ['magisch'] },
	{ text: 'Man sagt, verlorene Dinge finden manchmal von selbst hierher zurück.', tags: ['magisch'] },
	{ text: 'Es wird geflüstert, dass {BEKANNTER} hier eine Vision der Zukunft hatte.', tags: ['magisch'] },
	{ text: 'Angeblich kann man hier bei Vollmond seltsame Schatten tanzen sehen.', tags: ['magisch'] },
	{ text: 'Die Steine hier sollen warm sein, auch im tiefsten Winter.', tags: ['magisch'] },
	{ text: 'Man munkelt, dass die Zeit hier manchmal anders vergeht.', tags: ['magisch'] },
	{ text: 'Reisende berichten von einem Licht, das sie sicher durch die Nacht führte.', tags: ['magisch'] },

	// Mit Naturelle-Filter
	{ text: 'Das Wasser hier soll heilende Kräfte haben.', naturelleFilter: ['Teich', 'Bach', 'Quelle', 'Brunnen'], tags: ['magisch'] },
	{ text: 'Die Höhle soll ein Portal zu einem anderen Reich beherbergen.', naturelleFilter: ['Höhle', 'Grotte'], tags: ['magisch'] },
	{ text: 'Der alte Baum hier soll Träume wahr machen können.', naturelleFilter: ['Baum', 'Eiche', 'Weide'], tags: ['magisch'] },
];

export const geruechteTrauma: OrtDetailEintrag[] = [
	{ text: '{BEKANNTER} spricht nicht gern über das, was hier einst geschah.', tags: ['trauma'] },
	{ text: 'Man sagt, hier wurde einst ein schwerer Verlust erlitten.', tags: ['trauma'] },
	{ text: 'Die Älteren meiden diesen Ort an bestimmten Tagen im Jahr.', tags: ['trauma'] },
	{ text: 'Es heißt, {BEKANNTER} trägt hier eine alte Schuld mit sich.', tags: ['trauma'] },
	{ text: 'Angeblich erinnert dieser Ort an einen Streit, der nie beigelegt wurde.', tags: ['trauma'] },
	{ text: 'Man flüstert von einem Versprechen, das hier gebrochen wurde.', tags: ['trauma'] },
	{ text: 'Die Stimmung hier wird manchmal schwer, ohne ersichtlichen Grund.', tags: ['trauma'] },
	{ text: '{BEKANNTER} warnt davor, hier zu tief zu graben - bildlich und wörtlich.', tags: ['trauma'] },
	{ text: 'Es gibt Geschichten über eine Freundschaft, die hier zerbrach.', tags: ['trauma'] },
	{ text: 'Man sagt, jemand hat hier einst alles verloren, was ihm lieb war.', tags: ['trauma'] },
	{ text: 'Die Alten erzählen von einem Unglück, das hier verhindert werden konnte - knapp.', tags: ['trauma'] },
	{ text: 'Angeblich wurde hier einmal jemand zu Unrecht beschuldigt.', tags: ['trauma'] },
	{ text: 'Es heißt, {BEKANNTER} kommt hierher, um zu trauern.', tags: ['trauma'] },
	{ text: 'Manche Bewohner sagen, der Boden hier habe Tränen gesehen.', tags: ['trauma'] },
	{ text: 'Eine alte Fehde soll ihren Ursprung an diesem Ort haben.', tags: ['trauma'] },

	// Mit Naturelle-Filter
	{ text: 'Im Wasser hier soll einst etwas Kostbares verloren gegangen sein.', naturelleFilter: ['Teich', 'Bach', 'Fluss', 'See'], tags: ['trauma'] },
	{ text: 'Die Ruinen hier zeugen von etwas, das nicht mehr ist.', naturelleFilter: ['Ruine', 'Turm', 'Burg'], tags: ['trauma'] },
];

// ==========================================
// AKTIVITÄTEN
// ==========================================

export const aktivitaetenNormal: OrtDetailEintrag[] = [
	{ text: 'Genieße die Ruhe und beobachte das Treiben der kleinen Bewohner.' },
	{ text: 'Sammle Kräuter und Pflanzen, die hier besonders gut gedeihen.' },
	{ text: 'Führe ein Gespräch mit {BEKANNTER} über die Geschichte des Ortes.' },
	{ text: 'Halte Ausschau nach versteckten Pfaden und vergessenen Winkeln.' },
	{ text: 'Mache eine Pause und genieße ein mitgebrachtes Mahl.' },
	{ text: 'Lausche den Geschichten, die sich die Einheimischen erzählen.' },
	{ text: 'Erkunde die Umgebung und fertige eine Skizze an.' },
	{ text: 'Hilf {BEKANNTER} bei einer alltäglichen Aufgabe.' },
	{ text: 'Suche nach essbaren Beeren, Nüssen oder Pilzen.' },
	{ text: 'Beobachte die Tiere und lerne ihre Gewohnheiten kennen.' },
	{ text: 'Tausche Neuigkeiten und Gerüchte mit den Bewohnern aus.' },
	{ text: 'Finde einen gemütlichen Platz zum Lesen oder Nachdenken.' },
	{ text: 'Übe eine Fertigkeit, die du von {BEKANNTER} lernen kannst.' },
	{ text: 'Erkunde die natürlichen Materialien, die man hier finden kann.' },
	{ text: 'Knüpfe neue Bekanntschaften oder pflege alte Freundschaften.' },

	// Mit Naturelle-Filter
	{ text: 'Bade im klaren Wasser und erfrische dich.', naturelleFilter: ['Teich', 'Bach', 'Fluss', 'See'] },
	{ text: 'Überquere die Brücke und genieße die Aussicht.', naturelleFilter: ['Brücke'] },
	{ text: 'Erforsche die Gänge und Nischen der Höhle.', naturelleFilter: ['Höhle', 'Grotte'] },
	{ text: 'Klettere auf den Aussichtspunkt und überblicke die Gegend.', naturelleFilter: ['Hügel', 'Berg', 'Felsen', 'Turm'] },
	{ text: 'Genieße ein warmes Getränk und gutes Essen.', naturelleFilter: ['Gasthof', 'Taverne', 'Wirtshaus', 'Markt'] },
	{ text: 'Stöbere in den Waren und finde vielleicht ein Schnäppchen.', naturelleFilter: ['Markt', 'Laden', 'Werkstatt'] },
];

export const aktivitaetenMagisch: OrtDetailEintrag[] = [
	{ text: 'Versuche, die magische Energie dieses Ortes zu spüren.', tags: ['magisch'] },
	{ text: 'Suche nach Zeichen und Symbolen aus alter Zeit.', tags: ['magisch'] },
	{ text: 'Meditiere und öffne deinen Geist für Visionen.', tags: ['magisch'] },
	{ text: 'Sammle seltene Zutaten für Tränke oder Zauber.', tags: ['magisch'] },
	{ text: 'Sprich mit {BEKANNTER} über die alten Geheimnisse.', tags: ['magisch'] },
	{ text: 'Beobachte den Himmel nach ungewöhnlichen Zeichen.', tags: ['magisch'] },
	{ text: 'Lausche den Stimmen des Windes - vielleicht tragen sie Botschaften.', tags: ['magisch'] },
	{ text: 'Suche nach dem verborgenen Eingang zu einem anderen Reich.', tags: ['magisch'] },
	{ text: 'Entziffere alte Inschriften oder vergessene Runen.', tags: ['magisch'] },
	{ text: 'Versuche, mit den Geistern dieses Ortes Kontakt aufzunehmen.', tags: ['magisch'] },
	{ text: 'Führe ein kleines Ritual durch, um Glück zu erbitten.', tags: ['magisch'] },
	{ text: 'Sammle Mondwasser oder Morgentau für besondere Zwecke.', tags: ['magisch'] },
	{ text: 'Suche nach Pflanzen, die nur hier wachsen und besondere Kräfte haben.', tags: ['magisch'] },
	{ text: 'Beobachte das Spiel von Licht und Schatten - es könnte etwas verraten.', tags: ['magisch'] },
	{ text: 'Bitte {BEKANNTER}, dir von den alten Legenden zu erzählen.', tags: ['magisch'] },

	// Mit Naturelle-Filter
	{ text: 'Wirf einen Stein ins Wasser und deute die Wellen.', naturelleFilter: ['Teich', 'Bach', 'See', 'Brunnen'], tags: ['magisch'] },
	{ text: 'Berühre den alten Baum und spüre seine Erinnerungen.', naturelleFilter: ['Baum', 'Eiche', 'Weide'], tags: ['magisch'] },
	{ text: 'Entzünde eine Kerze in der Dunkelheit der Höhle.', naturelleFilter: ['Höhle', 'Grotte'], tags: ['magisch'] },
];

export const aktivitaetenTrauma: OrtDetailEintrag[] = [
	{ text: 'Höre {BEKANNTER} zu, wenn er von vergangenen Zeiten spricht.', tags: ['trauma'] },
	{ text: 'Suche nach Überresten dessen, was hier einst war.', tags: ['trauma'] },
	{ text: 'Hilf dabei, alte Wunden zu heilen - metaphorisch oder wörtlich.', tags: ['trauma'] },
	{ text: 'Bringe ein Opfer dar für jene, die nicht mehr hier sind.', tags: ['trauma'] },
	{ text: 'Versuche, einen alten Streit zu schlichten.', tags: ['trauma'] },
	{ text: 'Sammle die Scherben von etwas, das zerbrochen wurde.', tags: ['trauma'] },
	{ text: 'Sitze still und gedenke derer, die diesen Ort einst kannten.', tags: ['trauma'] },
	{ text: 'Hilf {BEKANNTER}, ein schwieriges Kapitel abzuschließen.', tags: ['trauma'] },
	{ text: 'Suche nach Antworten auf Fragen, die niemand stellen will.', tags: ['trauma'] },
	{ text: 'Pflanze etwas Neues als Zeichen der Hoffnung.', tags: ['trauma'] },
	{ text: 'Repariere etwas, das lange vernachlässigt wurde.', tags: ['trauma'] },
	{ text: 'Höre den Geschichten zu, die sonst niemand hören will.', tags: ['trauma'] },
	{ text: 'Bringe Licht in einen dunklen Winkel dieses Ortes.', tags: ['trauma'] },
	{ text: 'Suche nach dem Guten in dem, was schlecht erscheint.', tags: ['trauma'] },
	{ text: 'Hilf jemandem, sich mit der Vergangenheit zu versöhnen.', tags: ['trauma'] },

	// Mit Naturelle-Filter
	{ text: 'Lege Blumen an der Stelle nieder, wo etwas Trauriges geschah.', naturelleFilter: ['Ruine', 'Friedhof', 'Gedenkstein'], tags: ['trauma'] },
	{ text: 'Räume den Schutt beiseite und enthülle, was darunter liegt.', naturelleFilter: ['Ruine', 'Turm'], tags: ['trauma'] },
];

// ==========================================
// ENTDECKUNGEN
// ==========================================

export const entdeckungenNormal: OrtDetailEintrag[] = [
	{ text: 'Ein kleines Versteck, in dem jemand Schätze aufbewahrt hat.' },
	{ text: 'Eine handgeschriebene Notiz mit einer kryptischen Nachricht.' },
	{ text: 'Ein vergessener Pfad, der zu einem überraschenden Ziel führt.' },
	{ text: 'Ein gemütlicher Platz, der wie geschaffen ist zum Ausruhen.' },
	{ text: 'Spuren von {BEKANNTER}, die auf ein Geheimnis hindeuten.' },
	{ text: 'Ein natürliches Material von besonderer Qualität.' },
	{ text: 'Die Überreste eines alten Lagers oder Rastplatzes.' },
	{ text: 'Ein Werkzeug oder Gegenstand, der hier zurückgelassen wurde.' },
	{ text: 'Eine natürliche Formation, die wie etwas Bekanntes aussieht.' },
	{ text: 'Ein Tier, das sich hier eingenistet hat.' },
	{ text: 'Zeichen einer alten Tradition, die hier gepflegt wurde.' },
	{ text: 'Ein Aussichtspunkt, von dem man weit sehen kann.' },
	{ text: 'Eine Stelle, an der besondere Pflanzen wachsen.' },
	{ text: 'Hinweise auf einen verborgenen Vorrat.' },
	{ text: 'Ein natürliches Phänomen, das nur hier auftritt.' },

	// Mit Naturelle-Filter
	{ text: 'Am Grund des Wassers schimmert etwas Interessantes.', naturelleFilter: ['Teich', 'Bach', 'See', 'Brunnen'] },
	{ text: 'Unter der Brücke hat jemand etwas hinterlassen.', naturelleFilter: ['Brücke'] },
	{ text: 'Tief in der Höhle gibt es eine Kammer, die kaum jemand kennt.', naturelleFilter: ['Höhle', 'Grotte'] },
	{ text: 'In der Baumhöhle hat ein Bewohner sein Zuhause eingerichtet.', naturelleFilter: ['Baum', 'Eiche', 'Weide'] },
	{ text: 'Im Keller des Gebäudes lagern vergessene Fässer und Kisten.', naturelleFilter: ['Gasthof', 'Mühle', 'Haus', 'Turm'] },
];

export const entdeckungenMagisch: OrtDetailEintrag[] = [
	{ text: 'Ein Kristall, der in verschiedenen Farben schimmert.', tags: ['magisch'] },
	{ text: 'Runen, die in Stein oder Holz geritzt wurden.', tags: ['magisch'] },
	{ text: 'Eine Pflanze, die im Dunkeln sanft leuchtet.', tags: ['magisch'] },
	{ text: 'Ein Spiegel, in dem man mehr sieht als nur sein Abbild.', tags: ['magisch'] },
	{ text: 'Feenringe aus Pilzen an einer verborgenen Stelle.', tags: ['magisch'] },
	{ text: 'Ein Gegenstand, der {BEKANNTER} gehört haben soll - mit besonderen Eigenschaften.', tags: ['magisch'] },
	{ text: 'Eine Quelle, deren Wasser ungewöhnliche Eigenschaften hat.', tags: ['magisch'] },
	{ text: 'Spuren von Wesen, die nicht von dieser Welt zu sein scheinen.', tags: ['magisch'] },
	{ text: 'Ein Buch oder eine Schriftrolle mit altem Wissen.', tags: ['magisch'] },
	{ text: 'Ein Tor oder eine Schwelle, die nirgendwo hinzuführen scheint.', tags: ['magisch'] },
	{ text: 'Steine, die in einem perfekten Muster angeordnet sind.', tags: ['magisch'] },
	{ text: 'Eine Melodie, die von selbst erklingt, wenn man genau hinhört.', tags: ['magisch'] },
	{ text: 'Fußspuren, die im Morgengrauen erscheinen und verschwinden.', tags: ['magisch'] },
	{ text: 'Ein Amulett oder Talisman, halb im Boden vergraben.', tags: ['magisch'] },
	{ text: 'Ein Ort, an dem Träume besonders lebhaft und bedeutsam sind.', tags: ['magisch'] },

	// Mit Naturelle-Filter
	{ text: 'Auf dem Grund des Wassers liegt ein verzauberter Gegenstand.', naturelleFilter: ['Teich', 'See', 'Brunnen'], tags: ['magisch'] },
	{ text: 'In den Tiefen der Höhle wachsen leuchtende Kristalle.', naturelleFilter: ['Höhle', 'Grotte'], tags: ['magisch'] },
	{ text: 'Der Baum trägt Früchte, die nur in Märchen vorkommen sollten.', naturelleFilter: ['Baum', 'Eiche', 'Obstgarten'], tags: ['magisch'] },
];

export const entdeckungenTrauma: OrtDetailEintrag[] = [
	{ text: 'Ein zerbrochener Gegenstand, der einst jemandem wichtig war.', tags: ['trauma'] },
	{ text: 'Die Überreste von etwas, das mit Gewalt zerstört wurde.', tags: ['trauma'] },
	{ text: 'Ein Brief, der nie abgeschickt wurde.', tags: ['trauma'] },
	{ text: 'Spuren eines überstürzten Aufbruchs.', tags: ['trauma'] },
	{ text: 'Ein Versteck, in dem sich jemand vor etwas verborgen hat.', tags: ['trauma'] },
	{ text: 'Zeichen eines Kampfes oder Streits.', tags: ['trauma'] },
	{ text: 'Ein Grab oder Gedenkstein an unerwarteter Stelle.', tags: ['trauma'] },
	{ text: 'Die Habseligkeiten von jemandem, der nicht zurückkehrte.', tags: ['trauma'] },
	{ text: 'Hinweise auf ein Geheimnis, das {BEKANNTER} verbirgt.', tags: ['trauma'] },
	{ text: 'Ein Ort, der offensichtlich lange gemieden wurde.', tags: ['trauma'] },
	{ text: 'Narben in der Landschaft von einem vergangenen Ereignis.', tags: ['trauma'] },
	{ text: 'Ein Tagebuch mit beunruhigenden Einträgen.', tags: ['trauma'] },
	{ text: 'Ketten oder Fesseln, die von dunklen Zeiten zeugen.', tags: ['trauma'] },
	{ text: 'Die Ruine von etwas, das einst schön gewesen sein muss.', tags: ['trauma'] },
	{ text: 'Ein Spielzeug, das jemand zurückgelassen hat.', tags: ['trauma'] },

	// Mit Naturelle-Filter
	{ text: 'Auf dem Grund des Wassers liegen Dinge, die jemand loswerden wollte.', naturelleFilter: ['Teich', 'See', 'Brunnen', 'Fluss'], tags: ['trauma'] },
	{ text: 'In der Dunkelheit der Höhle verbirgt sich ein trauriges Geheimnis.', naturelleFilter: ['Höhle', 'Grotte'], tags: ['trauma'] },
	{ text: 'Die Ruinen erzählen von einer Zeit, die gewaltsam endete.', naturelleFilter: ['Ruine', 'Turm', 'Burg'], tags: ['trauma'] },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

export interface OrtDetailSelection {
	geruechte: string[];
	aktivitaeten: string[];
	entdeckungen: string[];
}

export interface SelectionContext {
	naturelleNames: string[]; // Non-metaphorical naturelle names
	bekannteNames: string[];
	erlaubeMagisch: boolean;
	erlaubeTrauma: boolean;
}

/**
 * Get all entries from a category, filtered by context
 */
function getFilteredEntries(
	normalEntries: OrtDetailEintrag[],
	magischEntries: OrtDetailEintrag[],
	traumaEntries: OrtDetailEintrag[],
	context: SelectionContext
): OrtDetailEintrag[] {
	const allEntries: OrtDetailEintrag[] = [...normalEntries];

	if (context.erlaubeMagisch) {
		allEntries.push(...magischEntries);
	}
	if (context.erlaubeTrauma) {
		allEntries.push(...traumaEntries);
	}

	// Filter by naturelle if specified
	return allEntries.filter(entry => {
		if (!entry.naturelleFilter || entry.naturelleFilter.length === 0) {
			return true; // No filter = always include
		}
		// Check if any of the required naturelle is present
		return entry.naturelleFilter.some(required =>
			context.naturelleNames.some(present =>
				present.toLowerCase().includes(required.toLowerCase()) ||
				required.toLowerCase().includes(present.toLowerCase())
			)
		);
	});
}

/**
 * Replace placeholders in text with actual values
 */
function replacePlaceholders(text: string, bekannteNames: string[], naturelleNames: string[]): string {
	let result = text;

	// Replace {BEKANNTER} with a random Bekannter name
	if (result.includes('{BEKANNTER}') && bekannteNames.length > 0) {
		const randomBekannter = bekannteNames[Math.floor(Math.random() * bekannteNames.length)];
		result = result.replace(/{BEKANNTER}/g, randomBekannter);
	}

	// Replace {NATURELL} with a random Naturell name
	if (result.includes('{NATURELL}') && naturelleNames.length > 0) {
		const randomNaturell = naturelleNames[Math.floor(Math.random() * naturelleNames.length)];
		result = result.replace(/{NATURELL}/g, randomNaturell);
	}

	return result;
}

/**
 * Select random entries from a filtered list
 */
function selectRandomEntries(
	entries: OrtDetailEintrag[],
	count: number,
	bekannteNames: string[],
	naturelleNames: string[]
): string[] {
	if (entries.length === 0) return [];

	const selected: string[] = [];
	const availableIndices = [...Array(entries.length).keys()];

	for (let i = 0; i < count && availableIndices.length > 0; i++) {
		const randomIndex = Math.floor(Math.random() * availableIndices.length);
		const entryIndex = availableIndices.splice(randomIndex, 1)[0];
		const entry = entries[entryIndex];
		selected.push(replacePlaceholders(entry.text, bekannteNames, naturelleNames));
	}

	return selected;
}

/**
 * Main function to select random details for an Ort
 */
export function selectOrtDetails(context: SelectionContext, countPerCategory: number = 3): OrtDetailSelection {
	const geruechteFiltered = getFilteredEntries(
		geruechteNormal, geruechteMagisch, geruechteTrauma, context
	);
	const aktivitaetenFiltered = getFilteredEntries(
		aktivitaetenNormal, aktivitaetenMagisch, aktivitaetenTrauma, context
	);
	const entdeckungenFiltered = getFilteredEntries(
		entdeckungenNormal, entdeckungenMagisch, entdeckungenTrauma, context
	);

	return {
		geruechte: selectRandomEntries(geruechteFiltered, countPerCategory, context.bekannteNames, context.naturelleNames),
		aktivitaeten: selectRandomEntries(aktivitaetenFiltered, countPerCategory, context.bekannteNames, context.naturelleNames),
		entdeckungen: selectRandomEntries(entdeckungenFiltered, countPerCategory, context.bekannteNames, context.naturelleNames),
	};
}
