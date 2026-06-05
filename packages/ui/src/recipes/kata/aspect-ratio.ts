// Aspect ratios are a structural scale with no kiso token equivalent; the preset
// classes live here so the recipe layer owns them. Numeric ratios are applied
// inline via `style` by the component.
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
