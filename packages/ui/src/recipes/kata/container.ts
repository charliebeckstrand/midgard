// Max-width and horizontal padding apply from `lg` up; below that the
// container is full-bleed.
export const k = {
	size: {
		sm: 'lg:max-w-4xl',
		md: 'lg:max-w-5xl',
		lg: 'lg:max-w-6xl',
		xl: 'lg:max-w-7xl',
		full: 'lg:max-w-full',
		// Numeric `size`: cap to the `--container-size` custom property at `lg` up.
		custom: 'lg:max-w-[var(--container-size)]',
	},
	padding: {
		none: 'lg:px-0',
		sm: 'lg:px-2',
		md: 'lg:px-4',
		lg: 'lg:px-6',
	},
} as const
