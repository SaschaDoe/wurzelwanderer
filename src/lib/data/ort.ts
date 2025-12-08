/**
 * Shared Ort (location) type definitions for Wurzelwanderer.
 * Extracted from naturelle page for reuse across the application.
 */

import type { GenerierterBekannter } from './merkmale';
import type { Gottheit } from './gottheiten';
import type { StimmungItem } from './naturelle';

export interface OrtGeschichteEvent {
	jahr?: string;
	event: string;
}

export interface OrtDetails {
	geruechte: string[];
	aktivitaeten: string[];
	entdeckungen: string[];
}

export interface SpielleiterNachricht {
	id: string;
	rolle: 'nutzer' | 'spielleiter';
	text: string;
	timestamp: string;
	vorgeschlageneFakten?: string[];
	akzeptierteFakten?: string[];
}

export interface OrtNaturell {
	name: string;
	bild: string;
	beschreibung: string;
	kannImmer: string[];
	stimmung: StimmungItem[];
	volkssagen: StimmungItem[];
	kategorie: string;
	farbe: string;
	ortsnamen?: string[];
	metaphorisch?: boolean;
}

export interface GespeicherterOrt {
	id: string;
	regionId: string;
	name: string;
	bilder?: string[];
	hauptNaturell?: string;
	ortBeschreibung?: string;
	anmerkungen?: string;
	beschreibungsAnmerkungen?: string;
	szenenBeschreibung?: string;
	bekannte: GenerierterBekannter[];
	gottheiten?: Gottheit[];
	naturelle: OrtNaturell[];
	erstelltAm: string;
	details?: OrtDetails;
	geschichte?: OrtGeschichteEvent[];
	spielleiterChat?: SpielleiterNachricht[];
	spielleiterFakten?: string;
}
