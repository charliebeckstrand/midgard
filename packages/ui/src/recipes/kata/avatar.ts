import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, kasane, kokkaku, narabi, shaku } from '../kiso'
import { dan } from '../kiso/dan'

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
			// With no `size`, the avatar takes the `md` box under `density-any`. That
			// rank is below each step, so a parent that sizes its avatars with
			// stepped classes, such as SidebarItem, wins over the default. An
			// explicit `size` is a plain class and wins over both.
			'density-any:size-9',
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
		size: avatar,
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
			 * Overlap of each avatar onto the one before it. The overlap and the
			 * ring together stay narrower than the space at the side of two
			 * initials, so the next avatar does not cover the initials.
			 */
			spacing: {
				sm: '-space-x-0.5',
				md: '-space-x-1',
				lg: '-space-x-1',
			},
			/**
			 * Child-avatar size projection. Avatar is a static leaf carrying its
			 * own md box. The group overrides descendants (`**:` reaches an
			 * avatar inside its with-status wrapper), so children track the
			 * group's `size` without reading context. Mirrors `shaku.avatar`.
			 */
			size: {
				sm: '**:data-[slot=avatar]:size-7',
				md: '**:data-[slot=avatar]:size-9',
				lg: '**:data-[slot=avatar]:size-11',
			},
			/**
			 * Child status-dot size projection. Avatar passes its own `size` to the
			 * StatusDot, so the group overrides the dot as it overrides the box.
			 * Mirrors the Swatch `circle` compounds in `swatch.ts`.
			 */
			dot: {
				sm: '**:data-[slot=status-dot]:size-2',
				md: '**:data-[slot=status-dot]:size-2.5',
				lg: '**:data-[slot=status-dot]:size-3',
			},
		},
		/** Ring around an avatar's status indicator. */
		statusRing: 'ring-2 ring-white dark:ring-zinc-900',
	},
)

/** Recipe variant props for {@link Avatar} — the styling axes its kata exposes (`variant`, `color`, `size`), for consumers composing custom slots. */
export type AvatarVariants = VariantProps<typeof k>
