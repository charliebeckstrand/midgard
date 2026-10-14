'use client'

import { Checkbox, CheckboxField } from '../../components/checkbox'
import { Label } from '../../components/fieldset'

/**
 * A checkbox with a label, such as "Preserve", on one flag of the store.
 *
 * @internal
 */
export function EventsFlagField({
	label,
	checked,
	disabled,
	onChange,
}: {
	label: string
	checked: boolean
	disabled?: boolean
	onChange: (checked: boolean) => void
}) {
	return (
		<CheckboxField>
			<Checkbox
				checked={checked}
				disabled={disabled}
				onChange={(event) => onChange(event.target.checked)}
			/>
			<Label>{label}</Label>
		</CheckboxField>
	)
}
