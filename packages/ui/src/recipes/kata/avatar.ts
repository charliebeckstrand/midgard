import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, kasane, kokkaku, narabi, shaku } from '../kiso'

const { palette } = iro
const { rounded } = kasane
const { flex } = narabi
const { avatar } = shaku

export const k = defineRecipe(
	{
		base: [
			'inline-grid place-items-center align-middle overflow-hidden',
			'*:col-start-1 *:row-start-1',
			rounded.full,
		],
		variant: {
			solid: 'border border-transparent text-white',
			soft: 'border border-transparent',
			outline: 'border',
		},
		size: avatar,
		palette: definePalette(basePalette(palette)),
		defaults: { variant: 'solid', color: 'zinc', size: 'md' },
		skeleton: kokkaku.avatar,
	},
	{
		initials: 'select-none fill-current text-[48px] font-medium uppercase',
		image: 'size-full object-cover',
		/** Avatar-group container classes. */
		group: {
			base: flex.row,
			ring: '*:ring-2 *:ring-white dark:*:ring-zinc-900',
			spacing: {
				sm: '-space-x-1.5',
				md: '-space-x-2',
				lg: '-space-x-2.5',
			},
			/**
			 * Child-avatar size projection. Avatar is a static leaf carrying its
			 * own md box; the group overrides descendants (`**:` reaches an
			 * avatar inside its with-status wrapper) so children track the
			 * group's `size` without reading context. Mirrors `shaku.avatar`.
			 */
			size: {
				sm: '**:data-[slot=avatar]:size-7',
				md: '**:data-[slot=avatar]:size-9',
				lg: '**:data-[slot=avatar]:size-11',
			},
		},
		/** Ring around an avatar's status indicator. */
		statusRing: 'ring-2 ring-white dark:ring-zinc-900',
	},
)

/** Recipe variant props for {@link Avatar} — the styling axes its kata exposes (`variant`, `color`, `size`), for consumers composing custom slots. */
export type AvatarVariants = VariantProps<typeof k>
