'use client'

import { X } from 'lucide-react'
import type { MouseEventHandler, Ref } from 'react'
import { intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Button } from '../button'
import { lockedProps } from '../button/button-constants'
import { Icon } from '../icon'

type InputClearButtonProps = {
	/** The accessible name, such as "Clear search". */
	label: string
	onClick: MouseEventHandler<HTMLButtonElement>
	/**
	 * A text field passes `preventDefault` here, so that focus stays in the
	 * field. A trigger passes `stopPropagation`, so that the press does not open
	 * its surface.
	 */
	onMouseDown?: MouseEventHandler<HTMLButtonElement>
	disabled?: boolean
	/** Makes the button inert and keeps its focus, as {@link lockedProps} do. */
	locked?: boolean
	ref?: Ref<HTMLButtonElement>
}

/**
 * The clear button that a field puts in its suffix: a bare button with an X
 * icon. The suffix slot turns off pointer events, and this button turns them on
 * again.
 *
 * @internal
 */
export function InputClearButton({
	label,
	onClick,
	onMouseDown,
	disabled,
	locked,
	ref,
}: InputClearButtonProps) {
	return (
		<Button
			ref={ref}
			type="button"
			variant="bare"
			className="pointer-events-auto"
			aria-label={label}
			disabled={disabled}
			onMouseDown={onMouseDown}
			onClick={onClick}
			{...(locked && lockedProps)}
		>
			<Icon icon={<X />} />
		</Button>
	)
}

/**
 * The clear button of a picker trigger, named "Clear selection" in the language
 * of the reader. The press stops at the button, so it does not open the surface
 * of the trigger.
 *
 * @remarks
 * `onClear` empties the value and moves the focus. The button unmounts with the
 * value that it clears, so without a move the focus falls to the body (WCAG
 * 2.4.3).
 *
 * @internal
 */
export function SelectionClearButton({ onClear }: { onClear: () => void }) {
	const intl = useIntl()

	return (
		<InputClearButton
			label={intl.formatMessage(intlMessages.clearSelection)}
			onMouseDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation()

				onClear()
			}}
		/>
	)
}
