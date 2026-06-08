// Preset aspect-ratio classes owned by the recipe layer. Numeric ratios are
// applied inline via `style` by the component.
export const k = {
	ratio: {
		square: 'aspect-square',
		video: 'aspect-video',
		'16/9': 'aspect-[16/9]',
		'4/3': 'aspect-[4/3]',
		'3/2': 'aspect-[3/2]',
		'21/9': 'aspect-[21/9]',
	},
} as const
