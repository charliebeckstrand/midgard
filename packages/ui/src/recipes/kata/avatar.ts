import { defineRecipe, iro, palette, take, type VariantPropsOf } from '../../core/recipe'

const { solid, soft, outline } = iro.palette

export const k = defineRecipe({
	base: [
		'inline-grid place-items-center align-middle overflow-hidden',
		'*:col-start-1 *:row-start-1',
		'rounded-full',
	],
	variant: {
		solid: 'border border-transparent text-white',
		soft: 'border border-transparent',
		outline: 'border',
	},
	size: take.avatar,
	palette: palette({
		solid: [solid.bg, solid.text],
		soft: [soft.bg, soft.text],
		outline: [outline.ring, outline.text],
	}),
	defaults: { variant: 'solid', color: 'zinc', size: 'md' },
})

export const initials = 'select-none fill-current text-[48px] font-medium uppercase'

export const image = 'size-full object-cover'

/** Avatar-group container classes. */
export const group = {
	base: 'flex items-center',
	ring: '*:ring-2 *:ring-white dark:*:ring-zinc-900',
	spacing: {
		sm: '-space-x-1.5',
		md: '-space-x-2',
		lg: '-space-x-2.5',
	},
}

/** Ring around an avatar's status indicator. */
export const statusRing = 'ring-2 ring-white dark:ring-zinc-900'

export type AvatarVariants = VariantPropsOf<typeof k>
