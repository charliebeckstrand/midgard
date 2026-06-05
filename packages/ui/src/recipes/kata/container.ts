// Container's max-width and horizontal padding apply only from `lg` up, so the
// values are bespoke `lg:`-prefixed literals rather than the unprefixed `ma.px`
// spacing scale — kept here so the recipe layer, not the component, owns them.
export const k = {
	size: {
		sm: 'lg:max-w-4xl',
		md: 'lg:max-w-5xl',
		lg: 'lg:max-w-6xl',
		xl: 'lg:max-w-7xl',
		full: 'lg:max-w-full',
	},
	padding: {
		none: 'lg:px-0',
		sm: 'lg:px-2',
		md: 'lg:px-4',
		lg: 'lg:px-6',
	},
} as const
