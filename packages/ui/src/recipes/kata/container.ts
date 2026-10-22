/**
 * Container kata: the unit of `<Container>`. The `base` slot is the centered
 * page wrapper, with the `width` and `padding` axes. The `size` prop of the
 * component sets `width`, because a kata axis named `size` is a density step. The max width applies from
 * `lg` up; below that the container is full-bleed. The horizontal padding
 * applies at every width.
 */
import { defineKata } from '../../core/recipe'

export const k = defineKata({
	base: 'w-full h-full mx-auto',
	width: {
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
	defaults: { width: 'md', padding: 'md' },
})
