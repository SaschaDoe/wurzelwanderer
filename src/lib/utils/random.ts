/**
 * Random selection utilities.
 */

/**
 * Get a random element from an array.
 */
export function getRandomElement<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get multiple random elements from an array (shuffled selection).
 */
export function getRandomElements<T>(arr: T[], count: number): T[] {
	const shuffled = [...arr].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, Math.min(count, arr.length));
}
