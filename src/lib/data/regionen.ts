// Region-System für Wurzelwanderer
// Regionen sind die übergeordnete Ebene über Orten und definieren
// geographische, Flora/Fauna und architektonische Besonderheiten

export interface Besonderheit {
	name: string;
	beschreibung: string;
	promptText: string; // Englisch für Bildgenerierung
}

export interface GespeicherteRegion {
	id: string;
	name: string;
	geographisch: Besonderheit[]; // 1-3 Items
	faunaFlora: Besonderheit[]; // 1-2 Items
	architektur?: Besonderheit; // 0-1 Item
	bilder?: string[];
	erstelltAm: string;
	istHeimat?: boolean;
}

// ============================================
// GEOGRAPHISCHE BESONDERHEITEN (~25 Items)
// ============================================
export const geographischeBesonderheiten: Besonderheit[] = [
	{
		name: 'Riesenpilzwald',
		beschreibung: 'Anstelle von Bäumen wachsen hier haushohe Pilze in allen Farben',
		promptText: 'giant mushrooms instead of trees, towering colorful fungi forming a forest'
	},
	{
		name: 'Schwebende Inseln',
		beschreibung: 'Felsbrocken und Landmassen schweben majestätisch in der Luft',
		promptText: 'floating islands hovering in the sky, suspended rock formations with vegetation'
	},
	{
		name: 'Kristallformationen',
		beschreibung: 'Überall ragen glitzernde Kristalle aus dem Boden',
		promptText: 'crystal formations growing from the ground, sparkling gemstone outcrops'
	},
	{
		name: 'Leuchtende Flüsse',
		beschreibung: 'Die Gewässer hier schimmern in sanftem, überirdischem Licht',
		promptText: 'bioluminescent rivers and streams, glowing water flowing through the landscape'
	},
	{
		name: 'Ewiger Herbst',
		beschreibung: 'Die Blätter sind immer golden und rot, es ist immer Erntezeit',
		promptText: 'eternal autumn with golden and red foliage, perpetual harvest season colors'
	},
	{
		name: 'Spiegelseen',
		beschreibung: 'Seen von solcher Stille, dass sie die Welt perfekt widerspiegeln',
		promptText: 'mirror-like lakes with perfect reflections, extremely still crystal-clear water'
	},
	{
		name: 'Wurzellabyrinthe',
		beschreibung: 'Gigantische Baumwurzeln bilden ein endloses Tunnelsystem',
		promptText: 'massive tree root systems forming tunnels and passages, labyrinthine root networks'
	},
	{
		name: 'Singende Steine',
		beschreibung: 'Der Wind erzeugt Melodien, wenn er durch die löchrigen Felsen streicht',
		promptText: 'porous rock formations that create musical sounds, wind-carved singing stones'
	},
	{
		name: 'Nebelschluchten',
		beschreibung: 'Tiefe Schluchten, aus denen ewig dichter Nebel aufsteigt',
		promptText: 'deep misty canyons with perpetual fog rising from the depths'
	},
	{
		name: 'Dampfende Quellen',
		beschreibung: 'Heiße Quellen und Geysire durchziehen das Land',
		promptText: 'hot springs and geysers, steaming thermal vents throughout the landscape'
	},
	{
		name: 'Versteinerte Wälder',
		beschreibung: 'Uralte Bäume, zu Stein geworden, stehen still wie Denkmäler',
		promptText: 'petrified forest with stone trees, ancient fossilized woodland'
	},
	{
		name: 'Korallenhügel',
		beschreibung: 'Bunte Korallenstrukturen wachsen hier an Land wie versteinerte Wellen',
		promptText: 'coral formations growing on land, colorful reef-like hills and structures'
	},
	{
		name: 'Magnetberge',
		beschreibung: 'Metallische Berge, die seltsame magnetische Phänomene erzeugen',
		promptText: 'magnetic mountains with metallic rocks, floating metal debris nearby'
	},
	{
		name: 'Bernsteinwälder',
		beschreibung: 'Bäume, deren Harz alles in goldenen Bernstein hüllt',
		promptText: 'amber forests with trees dripping golden resin, preserved creatures in amber'
	},
	{
		name: 'Obsidianfelder',
		beschreibung: 'Weite Ebenen aus schwarzem, glasigem Vulkangestein',
		promptText: 'obsidian plains, black volcanic glass fields reflecting the sky'
	},
	{
		name: 'Regenbogenfelsen',
		beschreibung: 'Geschichtete Felsen in allen Farben des Regenbogens',
		promptText: 'rainbow-layered rock formations, colorful striped cliffs and mountains'
	},
	{
		name: 'Mondlandschaft',
		beschreibung: 'Karge, silbrig schimmernde Landschaft wie von einem anderen Himmelskörper',
		promptText: 'lunar landscape with silver-grey terrain, crater-like formations, otherworldly'
	},
	{
		name: 'Salzwüste',
		beschreibung: 'Endlose weiße Salzebenen, die in der Sonne blenden',
		promptText: 'salt flats stretching to the horizon, blinding white crystalline desert'
	},
	{
		name: 'Hängende Gärten',
		beschreibung: 'Vegetation wächst von Klippen und Überhängen herab',
		promptText: 'hanging gardens cascading from cliffs, vertical gardens on rock faces'
	},
	{
		name: 'Gezeitenhöhlen',
		beschreibung: 'Ein Netzwerk von Höhlen, die mit den Gezeiten geflutet werden',
		promptText: 'tidal cave systems, partially flooded caverns with sea life'
	},
	{
		name: 'Wanderdünen',
		beschreibung: 'Sanddünen, die sich merklich bewegen und die Landschaft verändern',
		promptText: 'shifting sand dunes, desert landscape that constantly changes'
	},
	{
		name: 'Eisnadeln',
		beschreibung: 'Spitze Eisformationen ragen wie Nadeln aus dem gefrorenen Boden',
		promptText: 'ice needle formations, penitentes and sharp frozen spires'
	},
	{
		name: 'Moosmeer',
		beschreibung: 'Weiche, tiefe Moosdecken bedecken alles wie ein grüner Ozean',
		promptText: 'deep moss covering everything, soft green carpet landscape'
	},
	{
		name: 'Blasenfelsen',
		beschreibung: 'Rundliche, hohle Felsformationen wie versteinerte Blasen',
		promptText: 'bubble-like hollow rock formations, spherical stone structures'
	},
	{
		name: 'Windschliff-Bögen',
		beschreibung: 'Natürliche Steinbögen und Brücken, vom Wind geformt',
		promptText: 'natural stone arches carved by wind, dramatic rock bridges'
	}
];

// ============================================
// FAUNA & FLORA BESONDERHEITEN (~20 Items)
// ============================================
export const faunaFloraBesonderheiten: Besonderheit[] = [
	{
		name: 'Leuchtpflanzen',
		beschreibung: 'Die Vegetation strahlt in sanftem, biolumineszenten Licht',
		promptText: 'bioluminescent plants glowing softly, luminous flowers and leaves'
	},
	{
		name: 'Rieseninsekten',
		beschreibung: 'Insekten von ungewöhnlicher Größe bevölkern diese Region',
		promptText: 'giant insects, oversized butterflies, beetles, and dragonflies'
	},
	{
		name: 'Sprechende Tiere',
		beschreibung: 'Die Tiere hier können sprechen und führen eigene Geschäfte',
		promptText: 'animals with intelligent expressions, creatures gathered in conversation'
	},
	{
		name: 'Wandernde Bäume',
		beschreibung: 'Die Bäume bewegen sich langsam und wechseln ihre Standorte',
		promptText: 'trees with root-feet, mobile forest, walking trees'
	},
	{
		name: 'Geisterfalter',
		beschreibung: 'Durchscheinende Schmetterlinge tanzen in der Luft',
		promptText: 'translucent ghost butterflies, ethereal pale moths floating'
	},
	{
		name: 'Kristallfrucht-Bäume',
		beschreibung: 'Bäume tragen Früchte, die wie geschliffene Edelsteine aussehen',
		promptText: 'trees bearing crystal-like fruits, gemstone apples and berries'
	},
	{
		name: 'Federmoos',
		beschreibung: 'Weiches Moos mit federartiger Textur bedeckt den Boden',
		promptText: 'feather-like moss covering surfaces, soft plume-textured ground cover'
	},
	{
		name: 'Fliegende Fische',
		beschreibung: 'Fische schwimmen durch die Luft wie durch Wasser',
		promptText: 'fish swimming through the air, aerial aquatic creatures'
	},
	{
		name: 'Alte Baumgesichter',
		beschreibung: 'Uralte Bäume haben Gesichter in ihrer Rinde',
		promptText: 'ancient trees with faces in their bark, wise old tree spirits'
	},
	{
		name: 'Regenbogenblumen',
		beschreibung: 'Blumen, die alle Farben des Spektrums gleichzeitig zeigen',
		promptText: 'flowers with rainbow-colored petals, prismatic blooms'
	},
	{
		name: 'Schattenrehe',
		beschreibung: 'Scheue Rehe aus lebenden Schatten gleiten durch die Wälder',
		promptText: 'deer made of living shadows, dark ethereal forest creatures'
	},
	{
		name: 'Singende Vögel-Chöre',
		beschreibung: 'Vögel singen in perfekter Harmonie wie ein Orchester',
		promptText: 'flocks of songbirds in harmonious chorus, musical bird gatherings'
	},
	{
		name: 'Rankenpflanzen',
		beschreibung: 'Aggressive Ranken wachsen über alles und jeden hinweg',
		promptText: 'creeping vines covering everything, lush aggressive vine growth'
	},
	{
		name: 'Farbwechsel-Echsen',
		beschreibung: 'Kleine Echsen, die wie lebende Kaleidoskope die Farbe wechseln',
		promptText: 'color-changing lizards, iridescent chameleon-like creatures'
	},
	{
		name: 'Traumblüten',
		beschreibung: 'Blumen, deren Duft lebhafte Träume und Visionen hervorruft',
		promptText: 'dreamy flowers with misty pollen, psychedelic looking blooms'
	},
	{
		name: 'Steinböcke',
		beschreibung: 'Bergziegen mit Fell so grau wie Fels, fast unsichtbar',
		promptText: 'stone-colored mountain goats blending with rocks, camouflaged ibex'
	},
	{
		name: 'Glühwürmchen-Schwärme',
		beschreibung: 'Riesige Schwärme von Glühwürmchen erleuchten die Nächte',
		promptText: 'massive firefly swarms, thousands of glowing insects at night'
	},
	{
		name: 'Flüstergras',
		beschreibung: 'Gras, das im Wind wie leise Stimmen flüstert',
		promptText: 'tall whispering grass, meadows that seem to murmur'
	},
	{
		name: 'Silberfüchse',
		beschreibung: 'Füchse mit silbern schimmerndem Fell, weise und vorsichtig',
		promptText: 'silver-furred foxes with intelligent eyes, mystical canines'
	},
	{
		name: 'Blasenquallen',
		beschreibung: 'Quallen-artige Wesen schweben durch die Luft',
		promptText: 'floating jellyfish-like creatures in the air, aerial medusae'
	}
];

// ============================================
// ARCHITEKTUR BESONDERHEITEN (~13 Items)
// ============================================
export const architekturBesonderheiten: Besonderheit[] = [
	{
		name: 'Felsstädte',
		beschreibung: 'Städte und Häuser direkt in Felswände gehauen',
		promptText: 'cities carved into cliff faces, rock-cut architecture'
	},
	{
		name: 'Baumhäuser',
		beschreibung: 'Behausungen hoch oben in den Baumkronen',
		promptText: 'treehouses and platforms high in the canopy, arboreal dwellings'
	},
	{
		name: 'Ruinenarchitektur',
		beschreibung: 'Neue Bauten entstehen in und um antike Ruinen',
		promptText: 'buildings integrated with ancient ruins, inhabited old structures'
	},
	{
		name: 'Brückenstädte',
		beschreibung: 'Städte, die sich über Schluchten und Flüsse spannen',
		promptText: 'cities built on bridges spanning chasms, bridge-based settlements'
	},
	{
		name: 'Schwimmende Häuser',
		beschreibung: 'Behausungen auf dem Wasser, verbunden durch Stege',
		promptText: 'floating houses on water, connected by wooden walkways'
	},
	{
		name: 'Pilzhäuser',
		beschreibung: 'Wohnungen in oder aus riesigen Pilzen',
		promptText: 'houses made from giant mushrooms, fungal architecture'
	},
	{
		name: 'Kristallkuppeln',
		beschreibung: 'Gebäude unter oder aus transparenten Kristallkuppeln',
		promptText: 'buildings under crystal domes, translucent protective structures'
	},
	{
		name: 'Lebende Architektur',
		beschreibung: 'Häuser aus lebenden, wachsenden Pflanzen geformt',
		promptText: 'living architecture grown from plants, organic building shapes'
	},
	{
		name: 'Höhlensiedlungen',
		beschreibung: 'Gemütliche Behausungen in natürlichen Höhlensystemen',
		promptText: 'cave dwelling settlements, cozy underground homes'
	},
	{
		name: 'Windmühlen-Dörfer',
		beschreibung: 'Jedes Gebäude hat eine Windmühle oder ein Windrad',
		promptText: 'villages where every building has windmills, wind-powered architecture'
	},
	{
		name: 'Terrassenbauten',
		beschreibung: 'Gebäude in Terrassen an Hängen errichtet',
		promptText: 'terraced hillside buildings, stepped architecture on slopes'
	},
	{
		name: 'Muschelpaläste',
		beschreibung: 'Prachtbauten aus riesigen Muscheln und Perlmutt',
		promptText: 'palaces made from giant shells, mother-of-pearl architecture'
	},
	{
		name: 'Nomadenzelte',
		beschreibung: 'Prächtige, verzierte Zelte und mobile Behausungen',
		promptText: 'ornate nomadic tents, decorated mobile dwellings'
	}
];

// ============================================
// DEUTSCHE REGIONSNAMEN (~50 Items)
// ============================================
export const regionenNamen: string[] = [
	'Nebelgrund',
	'Silbertann',
	'Wurzelheim',
	'Dämmerwald',
	'Steinmark',
	'Grünwacht',
	'Frostgipfel',
	'Mondental',
	'Schattenau',
	'Bernsteinhain',
	'Wildbach',
	'Farnhügel',
	'Dornenreich',
	'Eichenbruch',
	'Funkensee',
	'Glutberg',
	'Herbstlande',
	'Irrlichter',
	'Jagdgrund',
	'Klippenrand',
	'Lichtung',
	'Moorstille',
	'Nachtweide',
	'Ostmark',
	'Pilzwald',
	'Quellenort',
	'Rabenfels',
	'Sturmhöhe',
	'Tiefenbrunn',
	'Ulmenhag',
	'Vogelruh',
	'Windbruch',
	'Zaubertal',
	'Ahorngrund',
	'Birkenhain',
	'Kristallbach',
	'Dunkelforst',
	'Erlenried',
	'Fichteneck',
	'Gletschersee',
	'Himmelsspitz',
	'Immergrün',
	'Johannisklamm',
	'Kupferhang',
	'Lindenau',
	'Mühlengrund',
	'Nebelmoor',
	'Orchideental',
	'Pfadfindermark',
	'Rosendorn'
];

// ============================================
// DEFAULT REGION: HEIMATGEFILDE
// ============================================
export const HEIMATGEFILDE_ID = 'heimatgefilde';

export const HEIMATGEFILDE: GespeicherteRegion = {
	id: HEIMATGEFILDE_ID,
	name: 'Heimatgefilde',
	geographisch: [],
	faunaFlora: [],
	architektur: undefined,
	erstelltAm: new Date().toISOString(),
	istHeimat: true
};

// ============================================
// HILFSFUNKTIONEN
// ============================================

/**
 * Wählt zufällige Elemente aus einem Array
 */
export function getRandomElements<T>(array: T[], count: number): T[] {
	const shuffled = [...array].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Wählt ein zufälliges Element aus einem Array
 */
export function getRandomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

/**
 * Generiert einen zufälligen Regionsnamen
 */
export function generiereRegionsname(): string {
	return getRandomElement(regionenNamen);
}

/**
 * Generiert eine neue Region mit zufälligen Besonderheiten
 */
export function generiereZufaelligeRegion(): GespeicherteRegion {
	const anzahlGeo = Math.floor(Math.random() * 3) + 1; // 1-3
	const anzahlFauna = Math.floor(Math.random() * 2) + 1; // 1-2
	const hatArchitektur = Math.random() > 0.5; // 50% Chance

	return {
		id: crypto.randomUUID(),
		name: generiereRegionsname(),
		geographisch: getRandomElements(geographischeBesonderheiten, anzahlGeo),
		faunaFlora: getRandomElements(faunaFloraBesonderheiten, anzahlFauna),
		architektur: hatArchitektur ? getRandomElement(architekturBesonderheiten) : undefined,
		erstelltAm: new Date().toISOString()
	};
}
