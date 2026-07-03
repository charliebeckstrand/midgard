// Preset ratios only; numeric ratios are applied inline via `style` by the
// component.
export const k = {
	ratio: {
		square: 'aspect-square',
		video: 'aspect-video',
		auto: 'aspect-auto',
		'21/9': 'aspect-[21/9]',
		'16/9': 'aspect-[16/9]',
		'4/3': 'aspect-[4/3]',
		'3/2': 'aspect-[3/2]',
		'1/1': 'aspect-[1/1]',
	},
} as const
