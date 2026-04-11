export const ratioMap = {
	square: 'aspect-square',
	video: 'aspect-video',
	'16/9': 'aspect-[16/9]',
	'4/3': 'aspect-[4/3]',
	'3/2': 'aspect-[3/2]',
	'21/9': 'aspect-[21/9]',
} as const

export type AspectRatioPreset = keyof typeof ratioMap
