// The max width applies from `lg` up; below that the container is
// full-bleed. The horizontal padding applies at every width.
export const k = {
	size: {
		sm: 'lg:max-w-4xl',
		md: 'lg:max-w-5xl',
		lg: 'lg:max-w-6xl',
		xl: 'lg:max-w-7xl',
		full: 'lg:max-w-full',
	},
	padding: {
		0: 'px-0',
		sm: 'px-2',
		md: 'px-4',
		lg: 'px-6',
	},
} as const
