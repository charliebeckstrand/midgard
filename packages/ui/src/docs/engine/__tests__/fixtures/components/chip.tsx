import type { ButtonHTMLAttributes } from 'react'

/** Props for {@link Chip}: authored knobs on top of the button pass-through. */
export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	/** Visible label text. */
	label: string

	/** Tone of the chip surface. */
	tone?: 'gray' | 'red'

	/** Visual style; the kata supplies its default. */
	variant?: 'solid' | 'soft'
}

/** Compact tag control passing its remaining props to the underlying button. */
export function Chip({ label, tone = 'gray', variant, ...props }: ChipProps) {
	return (
		<button type="button" data-tone={tone} data-variant={variant} {...props}>
			{label}
		</button>
	)
}
