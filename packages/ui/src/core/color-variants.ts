import { cva, type VariantProps } from 'class-variance-authority'

type ColorTokenValue = string | readonly string[]
type MutableTokenMap = Record<string, string | string[]>

/**
 * Creates a CVA variant function for color tokens that set CSS custom properties.
 *
 * Used by Checkbox, Radio, and Switch to map color names to nuri token classes.
 * Defaults to 'zinc' when no color is specified.
 */
export function colorVariants(tokenMap: Record<string, ColorTokenValue>) {
	return cva('', {
		variants: { color: tokenMap as MutableTokenMap },
		defaultVariants: { color: 'zinc' },
	})
}

export type ColorVariants = VariantProps<ReturnType<typeof colorVariants>>
