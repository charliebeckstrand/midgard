'use client'

import { Plus } from 'lucide-react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { useIntl } from '../../primitives/intl/use-intl'
import { gridMessages } from './engine/grid-messages'
import { keepFocus } from './grid-cell-editor'

/**
 * The built-in Add control of the new-row slot, in the slot's Add column.
 * Unlike the settle pair, it is in the tab order. Tab does not commit in the
 * slot, so the control takes no key from an editor. It is also the keyboard
 * route to an add from a listbox, or from a slot that keeps Enter. While an
 * add is in flight, the slot makes its cell inert.
 *
 * @internal
 */
export function GridAddRowButton({ addRow }: { addRow: () => void }) {
	const intl = useIntl()

	return (
		<Button
			type="button"
			variant="bare"
			color="green"
			aria-label={intl.formatMessage(gridMessages.addRow)}
			data-slot="grid-new-row-add"
			onMouseDown={keepFocus}
			onClick={addRow}
		>
			<Icon icon={<Plus />} />
		</Button>
	)
}
