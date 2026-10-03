import { defineScale, type ScaleStep } from '../../core/density'
import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, kasane, kokkaku, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { palette } = iro
const { rounded } = kasane
const { flex } = narabi

export const k = defineRecipe(
	{
		base: [
			'inline-grid place-items-center align-middle overflow-hidden',
			'*:col-start-1 *:row-start-1',
			rounded.full,
			// The avatar takes the step of its nearest density scope. An explicit
			// `size` makes the avatar its own scope.
			dan.size.avatar,
			// In a SidebarItem, the avatar is one step above the icon, with a negative
			// margin, so the row keeps the height of a row with an icon. The inner
			// button of the row is the child of the row that is not an affix slot:
			// its own `data-slot` changes in the mini rail. Each class selects the
			// avatar itself, so Chromium tests the rule only against the avatars.
			dan.size.avatarInSidebarItem,
			'[&:is([data-slot=sidebar-item]>:not([data-density=slot])>*)]:-m-0.5',
		],
		variant: {
			solid: 'border border-transparent text-white',
			soft: 'border border-transparent',
			outline: 'border',
		},
		palette: definePalette(basePalette(palette)),
		defaults: { variant: 'solid', color: 'zinc' },
		skeleton: kokkaku.avatar,
	},
	{
		initials: 'select-none fill-current text-[48px] font-medium uppercase',
		image: 'size-full object-cover',
		/** Avatar-group container classes. */
		group: {
			base: flex.row,
			/**
			 * Ring on each descendant avatar circle. `**:` reaches an avatar inside
			 * its with-status wrapper, so the ring follows the round box.
			 */
			ring: '**:data-[slot=avatar]:ring-2 **:data-[slot=avatar]:ring-white dark:**:data-[slot=avatar]:ring-zinc-900',
			/**
			 * Overlap of each avatar onto the one before it, at the step of the
			 * nearest density scope. The overlap and the ring together stay
			 * narrower than the space at the side of two initials, so the next
			 * avatar does not cover the initials. The stepped utilities take no
			 * negative value, so the overlap is a density variant.
			 */
			spacing: 'density-[xs,sm]:-space-x-0.5 density-[md,lg,xl]:-space-x-1',
		},
		/** Ring around an avatar's status indicator. */
		statusRing: 'ring-2 ring-white dark:ring-zinc-900',
	},
)

/** The size scale of {@link Avatar} and {@link AvatarGroup}: the steps of the avatar box. */
export const scale = defineScale(dan.size.avatar)

/** Recipe variant props for {@link Avatar}: the `variant` and `color` axes of its kata, and the `size` step that the component writes as a density scope. */
export type AvatarVariants = VariantProps<typeof k> & { size?: ScaleStep<typeof scale> }
