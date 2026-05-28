import { defineRecipe, palette, type VariantProps } from '../../core/recipe'
import { iro, kasane, kokkaku, narabi, shaku } from '../kiso'

const { solid, soft, outline } = iro.palette

export const k = defineRecipe(
	{
		base: [
			'inline-grid place-items-center align-middle overflow-hidden',
			'*:col-start-1 *:row-start-1',
			kasane.rounded.full,
		],
		variant: {
			solid: 'border border-transparent text-white',
			soft: 'border border-transparent',
			outline: 'border',
		},
		size: shaku.avatar,
		palette: palette({
			solid: [solid.bg, solid.text],
			soft: [soft.bg, soft.text],
			outline: [outline.ring, outline.text],
		}),
		defaults: { variant: 'solid', color: 'zinc', size: 'md' },
		skeleton: kokkaku.avatar,
	},
	{
		initials: 'select-none fill-current text-[48px] font-medium uppercase',
		image: 'size-full object-cover',
		/** Avatar-group container classes. */
		group: {
			base: narabi.row,
			ring: '*:ring-2 *:ring-white dark:*:ring-zinc-900',
			spacing: {
				sm: '-space-x-1.5',
				md: '-space-x-2',
				lg: '-space-x-2.5',
			},
		},
		/** Ring around an avatar's status indicator. */
		statusRing: 'ring-2 ring-white dark:ring-zinc-900',
	},
)

export type AvatarVariants = VariantProps<typeof k>
