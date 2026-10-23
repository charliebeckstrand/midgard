import { defineScale, type ScaleStep } from '../../core/density'
import { defineKata, definePalette, type VariantProps } from '../../core/recipe'
import { dan, iro, kasane, kokkaku, narabi } from '../kiso'

const { palette } = iro
const { rounded } = kasane
const { flex } = narabi

/**
 * The negative margin of an avatar in a SidebarItem. It lands on the element in
 * the flow of the row: the circle, the status wrapper, or the skeleton. The row
 * then keeps the height of a row with an icon.
 */
const sidebarItemMargin = '[&:is([data-slot=sidebar-item]>:not([data-density=slot])>*)]:-m-0.5'

export const k = defineKata(
	{
		base: [
			'inline-grid place-items-center align-middle overflow-hidden',
			'*:col-start-1 *:row-start-1',
			rounded.full,
			// The avatar takes the step of its nearest density scope. An explicit
			// `size` makes the avatar its own scope.
			dan.size.avatar.base,
			// In a SidebarItem, the avatar is one step above the icon, with a negative
			// margin, so the row keeps the height of a row with an icon. The inner
			// button of the row is the child of the row that is not an affix slot:
			// its own `data-slot` changes in the mini rail. Each class selects the
			// avatar itself, so Chromium tests the rule only against the avatars.
			dan.size.avatar.sidebar,
			sidebarItemMargin,
		],
		variant: {
			solid: 'border border-transparent text-white',
			soft: 'border border-transparent',
			outline: 'border',
		},
		// The colors at rest, from the palette of iro. An avatar takes no hover.
		palette: definePalette({
			solid: palette.solid,
			soft: palette.soft,
			outline: palette.outline,
		}),
		defaults: { variant: 'solid', color: 'zinc' },
		slots: {
			initials: 'select-none fill-current text-[48px] font-medium uppercase',
			/**
			 * The background layer of the image. A browser leaves out a background in
			 * print by default, so the layer asks for its colors and image in print.
			 */
			image:
				'size-full bg-cover bg-center [-webkit-print-color-adjust:exact] [print-color-adjust:exact]',
			/**
			 * The avatar group. Its `outline` is the gap around each descendant avatar
			 * circle, in the color of the page. `**:` reaches an avatar inside its
			 * with-status wrapper, so the gap follows the round box. The gap is an
			 * outline, not a ring, because forced colors keep an outline and remove a
			 * box-shadow.
			 *
			 * The overlap of each avatar onto the one before it is at the step of the
			 * nearest density scope. The overlap and the gap outline together stay
			 * narrower than the space at the side of two initials, so the next
			 * avatar does not cover the initials. The group keeps the value of its
			 * step, so an avatar with its own `size` takes the overlap of the group.
			 */
			group: [
				flex.row,
				'**:data-[slot=avatar]:outline-2 **:data-[slot=avatar]:outline-solid **:data-[slot=avatar]:outline-white dark:**:data-[slot=avatar]:outline-zinc-900',
				dan.space.avatar.overlap,
			],
			/**
			 * The wrapper of an avatar with a status. It fits the circle, so a
			 * stretching flex or grid parent cannot widen it and move the dot off the
			 * circle. In a SidebarItem, the wrapper is in the flow of the row, so it
			 * takes the margin.
			 */
			status: {
				base: ['relative inline-flex size-fit', sidebarItemMargin],
				slots: {
					/** The indicator, on the top inline-end corner of the avatar, with a gap around it, as in a group. */
					dot: [
						'absolute top-0 inset-e-0',
						'outline-2 outline-solid outline-white dark:outline-zinc-900',
					],
				},
			},
		},
	},
	{
		// The skeleton takes the size and the margin of an avatar in a SidebarItem,
		// so the row keeps its height when the avatar replaces the skeleton.
		skeleton: {
			...kokkaku.avatar,
			base: [...kokkaku.avatar.base, dan.size.avatar.sidebar, sidebarItemMargin],
		},
	},
)

/** The size scale of {@link Avatar} and {@link AvatarGroup}: the steps of the avatar box. */
export const scale = defineScale(dan.size.avatar.base)

/** Recipe variant props for {@link Avatar}: the `variant` and `color` axes of its kata, and the `size` step that the component writes as a density scope. */
export type AvatarVariants = Omit<VariantProps<typeof k>, 'variant' | 'color'> & {
	/** The fill style of the avatar. @defaultValue 'solid' */
	variant?: VariantProps<typeof k>['variant']
	/** The palette color of the avatar. @defaultValue 'zinc' */
	color?: VariantProps<typeof k>['color']
	/**
	 * The density step of the avatar box. Omit it to take the step of the nearest
	 * density scope. A step makes the avatar a density scope.
	 */
	size?: ScaleStep<typeof scale>
}
