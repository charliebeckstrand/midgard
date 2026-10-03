'use client'

import type { ComponentProps, ReactNode } from 'react'
import { Checkbox, CheckboxField } from '../../components/checkbox'
import { Control } from '../../components/control'
import { Label } from '../../components/fieldset'
import { ToggleGroup } from '../../primitives/toggle'

/**
 * The visibility checkbox of a column in a manager dialog, with the column's
 * title as its label. The column manager and the group editor share it. The
 * rest of the props go to the {@link Checkbox}. The row has the group layout
 * but no `group` role, because one checkbox is not a group, and the rows are
 * already in a list.
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
			<ToggleGroup>
				<CheckboxField>
					<Checkbox {...checkbox} />
					<Label>{columnTitle}</Label>
				</CheckboxField>
			</ToggleGroup>
		</Control>
	)
}
