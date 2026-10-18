import type { ReactNode } from 'react'
import { cn } from '../../core'
import { IntlMessage } from '../../primitives/intl/intl-message'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { k } from '../../recipes/kata/table'
import { Alert } from '../alert'
import { TableBody } from './table-body'
import { TableCell } from './table-cell'
import { TableRow } from './table-row'

const messages = defineMessages({
	noItems: {
		id: 'ui.table.noItems',
		defaultMessage: 'No items',
		description: 'The title of the empty state of a table that has no rows.',
	},
})

/** Props for {@link TableEmpty}: the `columns` count to span, and optional placeholder `children`. */
export type TableEmptyProps = {
	/** The number of columns in the table. The cell of the empty row spans all of them. */
	columns: number
	/**
	 * The content of the empty row.
	 * @defaultValue A soft {@link Alert} at full width, with the title "No items"
	 * in the language of the reader.
	 */
	children?: ReactNode
}

/** @internal A default empty-state alert for {@link TableEmpty}. */
const TableEmptyAlert = () => (
	<Alert variant="soft" title={<IntlMessage message={messages.noItems} />} className="w-full" />
)

/**
 * Empty-state body for a {@link Table}: a single row whose cell spans all
 * `columns` and shows the empty message. Render in place of {@link TableBody}
 * when there are no rows.
 */
export function TableEmpty({ columns, children }: TableEmptyProps) {
	// The default resolves in the body. The React Compiler cannot compile a JSX
	// default in a parameter.
	const content = children === undefined ? <TableEmptyAlert /> : children

	return (
		<TableBody>
			<TableRow>
				<TableCell colSpan={columns} className={cn(k.empty)}>
					{content}
				</TableCell>
			</TableRow>
		</TableBody>
	)
}
