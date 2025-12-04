/**
 * Utility functions for creating URL-safe slugs from German text.
 * Handles German umlauts and special characters consistently.
 */

/**
 * Converts German text to a URL-safe slug.
 * Replaces umlauts, removes special characters, and lowercases.
 *
 * @example
 * germanSlugify('Künstlerisch') // 'kuenstlerisch'
 * germanSlugify('Beschützer*in') // 'beschuetzerin'
 */
export function germanSlugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/ü/g, 'ue')
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ß/g, 'ss')
		.replace(/\*/g, '')
		.replace(/ /g, '-');
}

/**
 * Creates a CSS-safe class name from German category names.
 * Similar to germanSlugify but without space-to-dash conversion.
 *
 * @example
 * kategorieToClass('Körperlich') // 'koerperlich'
 */
export function kategorieToClass(kategorie: string): string {
	return kategorie
		.toLowerCase()
		.replace(/ü/g, 'ue')
		.replace(/ä/g, 'ae')
		.replace(/ö/g, 'oe')
		.replace(/ß/g, 'ss');
}

/**
 * Creates an HTML element ID from German text.
 *
 * @example
 * toElementId('Alter Turm') // 'alter-turm'
 */
export function toElementId(text: string): string {
	return germanSlugify(text);
}
