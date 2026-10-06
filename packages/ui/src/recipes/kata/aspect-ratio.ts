// Preset ratios only; numeric ratios are applied inline via `style` by the
// component.
const ratio = {
	'21/9': 'aspect-21/9',
	'16/9': 'aspect-video',
	'4/3': 'aspect-4/3',
	'3/2': 'aspect-3/2',
	'1/1': 'aspect-square',
	auto: 'aspect-auto',
} as const

export const k = {
	ratio: {
		...ratio,
		// The aliases of `1/1` and `16/9`, with the class of each ratio.
		square: ratio['1/1'],
		video: ratio['16/9'],
	},
} as const
