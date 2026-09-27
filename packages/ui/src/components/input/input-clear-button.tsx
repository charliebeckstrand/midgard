'use client'

import { X } from 'lucide-react'
import type { MouseEventHandler } from 'react'
import { Button } from '../button'
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
}

/**
 * The clear button that a field puts in its suffix: a bare button with an X
 * icon. The suffix slot turns off pointer events, and this button turns them on
 * again.
 *
 * @internal
 */
export function InputClearButton({ label, onClick, onMouseDown, disabled }: InputClearButtonProps) {
	return (
		<Button
			type="button"
			variant="bare"
			className="pointer-events-auto"
			aria-label={label}
			disabled={disabled}
			onMouseDown={onMouseDown}
			onClick={onClick}
		>
			<Icon icon={<X />} />
		</Button>
	)
}
