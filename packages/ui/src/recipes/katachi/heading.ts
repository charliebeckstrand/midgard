import { tv, type VariantProps } from 'tailwind-variants'
import { sumi } from '../sumi'
import { take } from '../take'

export const heading = tv({
	base: [...sumi.text],
	variants: {
		level: {
			1: ['font-bold tracking-tight', take.text['3xl']],
			2: ['font-semibold tracking-tight', take.text['2xl']],
			3: ['font-semibold tracking-tight', take.text.xl],
			4: ['font-medium', take.text.lg],
			5: ['font-medium', take.text.md],
			6: ['font-medium', take.text.sm],
		},
	},
	defaultVariants: { level: 1 },
})

export type HeadingVariants = VariantProps<typeof heading>
