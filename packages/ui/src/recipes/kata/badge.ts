import { definePalette, defineRecipe, type VariantProps } from '../../core/recipe'
import { basePalette } from '../katakana'
import { iro, ji, kasane, kokkaku, narabi, shaku } from '../kiso'

const { palette } = iro
const { size, weight } = ji
const { gap, padding, rounded } = kasane
const { badge } = kokkaku
const { flex } = narabi
const { icon } = shaku

export const k = defineRecipe({
	base: ['group', flex.inline, 'w-fit', weight.medium],
	variant: {
		outline: 'ring-1 ring-inset',
	},
	// A uniform 4px height scale: the type ramp (text-xs → text-lg) sets the
	// step while vertical padding holds constant (py('1')), landing
	// xs/sm/md/lg on 22/26/30/34px. `md` matches a `sm` Button's 30px box.
	// Badges step 4px, not Button's 8px: a text line-height floors a badge
	// near 22px, so an 8px scale anchored at md=30 leaves no room for xs.
	// Horizontal padding still grows 0.5/step to hold the affix
	// chip-alignment lockstep (`kiso/control/affix.ts`).
	size: {
		xs: [size.xs, icon.xs, gap.g('0.5'), padding.py('1'), padding.px('1')],
		sm: [size.sm, icon.sm, gap.g('0.75'), padding.py('1'), padding.px('1.5')],
		md: [size.md, icon.md, gap.g('1'), padding.py('1'), padding.px('2')],
		lg: [size.lg, icon.lg, gap.g('1.25'), padding.py('1'), padding.px('2.5')],
	},
	rounded,
	palette: definePalette({ ...basePalette(palette), plain: palette.plain.text }),
	defaults: { variant: 'soft', color: 'zinc', size: 'md', rounded: 'md' },
	skeleton: badge,
})

export type BadgeVariants = VariantProps<typeof k>
