import { error } from '@sveltejs/kit';
import { ereignisse, getEreignisBySlug } from '$lib/data/ereignisse';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const ereignis = getEreignisBySlug(params.slug);

	if (!ereignis) {
		throw error(404, 'Ereignis nicht gefunden');
	}

	return { ereignis };
};

export const prerender = true;

export function entries() {
	return ereignisse.map(e => ({ slug: e.slug }));
}
