/**
 * Ort (location) generation logic extracted from naturelle page.
 * Can be reused across the application (hexkarte, naturelle, etc.)
 */

import { getRandomElement, getRandomElements } from '$lib/utils/random';
import { kategorien, isMagisch, isTrauma, type StimmungItem } from '$lib/data/naturelle';
import { generiereBekanntenData, type GenerierterBekannter } from '$lib/data/merkmale';
import type { GespeicherterOrt, OrtNaturell } from '$lib/data/ort';

export interface OrtGeneratorOptions {
	regionId: string;
	erlaubeMagisch?: boolean;
	erlaubeTrauma?: boolean;
	anzahlNaturelle?: number;
	anzahlBekannte?: number;
	aktiveKategorien?: string[];
}

const DEFAULT_KATEGORIEN = ['Gemütlich', 'Lebendig', 'Verbindend', 'Weitläufig', 'Einsam', 'Verlassen'];

/**
 * Generiert einen neuen Ort basierend auf den gegebenen Optionen.
 */
export function generiereNeuenOrt(options: OrtGeneratorOptions): GespeicherterOrt {
	const {
		regionId,
		erlaubeMagisch = true,
		erlaubeTrauma = true,
		anzahlNaturelle = 3,
		anzahlBekannte = 2,
		aktiveKategorien = DEFAULT_KATEGORIEN
	} = options;

	// Filter categories by active selection
	const aktiveKats = kategorien.filter(k => aktiveKategorien.includes(k.name));
	if (aktiveKats.length === 0) {
		throw new Error('Keine aktiven Kategorien ausgewählt');
	}

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

	// Generate place name from one of the selected Naturelle
	const naturellMitNamen = gewaehlteNaturelle.filter(n => n.ortsnamen && n.ortsnamen.length > 0);
	let ortsname: string;
	let hauptNaturell: string;

	if (naturellMitNamen.length > 0) {
		const gewaehlteNaturellFuerName = getRandomElement(naturellMitNamen);
		ortsname = getRandomElement(gewaehlteNaturellFuerName.ortsnamen!);
		hauptNaturell = gewaehlteNaturellFuerName.name;
	} else {
		ortsname = gewaehlteNaturelle[0].name;
		hauptNaturell = gewaehlteNaturelle[0].name;
	}

	// Generate initial Bekannte
	const initialeBekannte: GenerierterBekannter[] = [];
	for (let i = 0; i < anzahlBekannte; i++) {
		initialeBekannte.push(generiereBekanntenData(erlaubeMagisch, erlaubeTrauma));
	}

	// 50% Chance für jedes Naturell, metaphorisch zu sein
	const naturelleMitMetaphorisch: OrtNaturell[] = gewaehlteNaturelle.map(n => ({
		name: n.name,
		bild: n.bild,
		beschreibung: n.beschreibung,
		kannImmer: n.kannImmer,
		stimmung: n.stimmung,
		volkssagen: n.volkssagen,
		kategorie: n.kategorie,
		farbe: n.farbe,
		ortsnamen: n.ortsnamen,
		metaphorisch: Math.random() < 0.5
	}));

	return {
		id: crypto.randomUUID(),
		regionId,
		name: ortsname,
		hauptNaturell,
		bekannte: initialeBekannte,
		gottheiten: [],
		naturelle: naturelleMitMetaphorisch,
		erstelltAm: new Date().toISOString()
	};
}

/**
 * Alle verfügbaren Kategorie-Namen.
 */
export function getAlleKategorien(): string[] {
	return kategorien.map(k => k.name);
}

/**
 * Default Kategorien für Ort-Generierung.
 */
export function getDefaultKategorien(): string[] {
	return [...DEFAULT_KATEGORIEN];
}
