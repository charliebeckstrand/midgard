import { X } from 'lucide-react'
import type { ComponentType, MouseEventHandler } from 'react'
import { cn } from '../../core/cn'
import { IntlMessage } from '../../primitives/intl'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { PanelClose, type PanelCloseProps } from '../../primitives/panel'
import type { PanelHeaderProps } from '../../primitives/panel/types'
import { k } from '../../recipes/kata/panel'
import { Icon } from '../icon'
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
 * The X close of a panel header: a `bare` icon button with the label "Close"
 * in the language of the reader. It stays live in a locked scope, as
 * {@link ButtonClose} does.
 */
function ButtonCloseX({ slot, onClick }: { slot: string; onClick?: MouseEventHandler }) {
	const intl = useIntl()

	return (
		<Button
			lockable={false}
			type="button"
			variant="bare"
			data-slot={slot}
			aria-label={intl.formatMessage(intlMessages.close)}
			onClick={onClick}
		>
			<Icon icon={<X />} />
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

/** Props for the header of a Dialog, a Drawer, or a Sheet (`<div>` attributes). */
export type ClosableHeaderProps = PanelHeaderProps & {
	/**
	 * Puts an X close at the end of the header, on the line of the title. The X
	 * stamps `data-slot="<slotPrefix>-close"`.
	 *
	 * @defaultValue false
	 */
	closable?: boolean
}

/**
 * Builds the header of a panel family from the `Header` of `createPanel`. A
 * `closable` header is a row: its children make a column at the start, and
 * the X close is at the end.
 *
 * @internal
 */
export function createPanelHeader(slotPrefix: string, Header: ComponentType<PanelHeaderProps>) {
	const { bar } = k

	return function ClosableHeader({
		closable = false,
		className,
		children,
		...props
	}: ClosableHeaderProps) {
		if (!closable) {
			return (
				<Header className={className} {...props}>
					{children}
				</Header>
			)
		}

		return (
			<Header className={cn(bar.base, className)} {...props}>
				<div className={cn(bar.lead)}>{children}</div>

				<PanelClose>
					<ButtonCloseX slot={`${slotPrefix}-close`} />
				</PanelClose>
			</Header>
		)
	}
}
