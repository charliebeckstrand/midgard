/** Variant axes mirrored by the kata recipe's `defaults` literal. */
export type ChipProps = {
	/** Visible label text. */
	label: string

	/** Visual weight; the kata supplies `'solid'`. */
	variant?: 'solid' | 'soft'

	/** Accent palette; the kata supplies `'zinc'`. */
	color?: 'zinc' | 'iris'

	/** Density step; the destructured `'lg'` outranks the kata's `'md'`. */
	size?: 'sm' | 'md' | 'lg'
}

/** Kata-backed chip: variant-axis defaults come from the recipe literal. */
export function Chip({ label, variant, color, size = 'lg' }: ChipProps) {
	return (
		<span data-variant={variant} data-color={color} data-size={size}>
			{label}
		</span>
	)
}
