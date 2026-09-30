'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Checkbox, CheckboxField, CheckboxGroup } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Label } from '../../components/fieldset'

/**
 * The visibility checkbox of a column in a manager dialog, with the column's
 * title as its label. The column manager and the group editor share it. The
 * rest of the props go to the {@link Checkbox}.
 *
 * @internal
 */
export function GridManagerCheckboxRow({
	columnTitle,
	className,
	...checkbox
}: {
	/** The column's title, shown as the label. */
	columnTitle: ReactNode
	/** The class of the wrapping {@link Control}. */
	className?: string
} & ComponentProps<typeof Checkbox>) {
	return (
		<Control className={className}>
			<CheckboxGroup>
				<CheckboxField>
					<Checkbox {...checkbox} />
					<Label>{columnTitle}</Label>
				</CheckboxField>
			</CheckboxGroup>
		</Control>
	)
}
