import type { MouseEventHandler } from 'react'
import { IntlMessage } from '../../primitives/intl/intl-message'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { PanelClose, type PanelCloseProps } from '../../primitives/panel'
import { Button } from './button'

/**
 * The standard Close button of a panel or a popover: a `soft` button with the
 * label "Close" in the language of the reader. It stays live in a locked scope,
 * such as a submitting form, because a close writes no field. The close
 * control that renders it gives the `onClick` that closes.
 *
 * @internal
 */
export function ButtonClose({ slot, onClick }: { slot: string; onClick?: MouseEventHandler }) {
	return (
		<Button lockable={false} type="button" variant="soft" data-slot={slot} onClick={onClick}>
			<IntlMessage message={intlMessages.close} />
		</Button>
	)
}

/**
 * Builds the close control of a panel family. With no child, the control
 * renders the {@link ButtonClose}, which stamps `data-slot="<slotPrefix>-close"`.
 * With one child, a click on the child closes the panel, and the child's own
 * `onClick` runs first.
 *
 * @internal
 */
export function createPanelClose(slotPrefix: string) {
	return function Close({ children }: Partial<PanelCloseProps>) {
		return <PanelClose>{children ?? <ButtonClose slot={`${slotPrefix}-close`} />}</PanelClose>
	}
}
