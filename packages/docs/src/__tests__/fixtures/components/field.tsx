import type { ComponentPropsWithoutRef } from 'react'

/** Props for {@link Field}: one authored knob over a narrowed input pass-through. */
export type FieldProps = Omit<ComponentPropsWithoutRef<'input'>, 'size' | 'color'> & {
	/** Visible label text above the control. */
	label: string
}

/** Labelled text input forwarding its remaining props to the underlying input. */
export function Field({ label, ...props }: FieldProps) {
	return (
		<label>
			{label}
			<input {...props} />
		</label>
	)
}
