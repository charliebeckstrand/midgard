import type { LightboxPhoto } from 'ui/lightbox'

type Scene = {
	alt: string
	width: number
	height: number
	/** The top and the bottom color of the sky. */
	sky: [string, string]
	sun: string
	/** The colors of the hills, from the farthest to the nearest. */
	hills: [string, string, string]
}

/** A ridge across the full width, with its crest at `crest` of the height. */
function ridge(width: number, height: number, crest: number, phase: number) {
	const y = height * crest

	const step = width / 4

	const points = [0, 1, 2, 3, 4].map((i) => {
		const lift = Math.sin(i * 1.7 + phase) * height * 0.06

		return `${i * step},${(y + lift).toFixed(1)}`
	})

	return `M0,${height} L${points.join(' L')} L${width},${height} Z`
}

/** A landscape drawn as an SVG, so the docs need no photo files. */
function landscape({ alt, width, height, sky, sun, hills }: Scene): LightboxPhoto {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#s)"/>
<circle cx="${width * 0.68}" cy="${height * 0.38}" r="${Math.min(width, height) * 0.09}" fill="${sun}"/>
<path d="${ridge(width, height, 0.55, 0)}" fill="${hills[0]}"/>
<path d="${ridge(width, height, 0.68, 2)}" fill="${hills[1]}"/>
<path d="${ridge(width, height, 0.82, 4)}" fill="${hills[2]}"/>
</svg>`

	return { src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, alt, width, height }
}

export const photos: LightboxPhoto[] = [
	landscape({
		alt: 'Sunrise over green hills',
		width: 1500,
		height: 1000,
		sky: ['#fde68a', '#fb923c'],
		sun: '#fff7ed',
		hills: ['#65a30d', '#4d7c0f', '#365314'],
	}),
	landscape({
		alt: 'Blue mountains at dusk',
		width: 1000,
		height: 1500,
		sky: ['#312e81', '#c084fc'],
		sun: '#fde68a',
		hills: ['#6366f1', '#4338ca', '#1e1b4b'],
	}),
	landscape({
		alt: 'Desert dunes at noon',
		width: 1200,
		height: 1200,
		sky: ['#38bdf8', '#e0f2fe'],
		sun: '#fefce8',
		hills: ['#fcd34d', '#f59e0b', '#b45309'],
	}),
	landscape({
		alt: 'Pine ridges in fog',
		width: 1600,
		height: 900,
		sky: ['#cbd5e1', '#f1f5f9'],
		sun: '#ffffff',
		hills: ['#94a3b8', '#475569', '#1e293b'],
	}),
	landscape({
		alt: 'Red cliffs at sunset',
		width: 1200,
		height: 900,
		sky: ['#f43f5e', '#fbbf24'],
		sun: '#fff1f2',
		hills: ['#be123c', '#9f1239', '#4c0519'],
	}),
]
