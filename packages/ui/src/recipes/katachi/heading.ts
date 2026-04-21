import { tv, type VariantProps } from 'tailwind-variants'
import { iro } from '../iro'
import { ji } from '../ji'

export const heading = tv({
	base: [...iro.text.default],
	variants: {
		level: {
			1: ['font-bold tracking-tight', ji.size['3xl']],
			2: ['font-semibold tracking-tight', ji.size['2xl']],
			3: ['font-semibold tracking-tight', ji.size.xl],
			4: ['font-medium', ji.size.lg],
			5: ['font-medium', ji.size.md],
			6: ['font-medium', ji.size.sm],
		},
	},
	defaultVariants: { level: 1 },
})

export type HeadingVariants = VariantProps<typeof heading>
