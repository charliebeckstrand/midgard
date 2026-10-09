'use client'

import { X } from 'lucide-react'
import type { AriaRole, KeyboardEvent, MouseEventHandler, ReactNode, Ref } from 'react'
import { cn } from '../../core'
import type { Color } from '../../recipes'
import { k } from '../../recipes/kata/badge'
import { Button } from '../button'
import { Icon } from '../icon'
import { Badge } from './badge'

/**
 * Props for {@link BadgeRemovable}.
 *
 * @internal
 */
export type BadgeRemovableProps = {
	/** The text of the chip. The remove button has the name "Remove <label>". */
	label: string
	/**
	 * Rich content in place of `label`. The chip then shows this content, and
	 * `label` names only the remove button.
	 */
	children?: ReactNode
	/** Badge color. */
	color?: Color
	/** The ARIA role of the chip, for example `listitem`. */
	role?: AriaRole
	className?: string
	/** Fires on a click of the remove button, and on Delete or Backspace on it. Omit it for a chip with no remove button. */
	onRemove?: () => void
	/** Disables the remove button. The button stays in the chip. */
	disabled?: boolean
	/** The ref of the remove button. */
	removeRef?: Ref<HTMLButtonElement>
	/**
	 * More props for the remove button. Its `onClick` runs before `onRemove`.
	 */
	removeProps?: {
		'data-slot'?: string
		onMouseDown?: MouseEventHandler<HTMLButtonElement>
		onClick?: MouseEventHandler<HTMLButtonElement>
	}
}

/**
 * The removable chip: an `outline`, full-radius Badge with a remove button
 * that shows an X. TagInput, QueryChips, and ChatPrompt use it.
 *
 * @remarks
 * The remove button is the one Tab stop of the chip. It removes the chip on a
 * click, Enter, Space, Delete, or Backspace. Delete and Backspace prevent the
 * default action of the key, so the key does nothing more after the removal.
 * The `outline` variant has the page surface as its fill, so the muted glyph
 * of the `bare` button stays above the 3:1 contrast floor for non-text. A
 * `label` truncates to the width of the chip, and the chip is no wider than
 * its container.
 *
 * @internal
 */
export function BadgeRemovable({
	label,
	children,
	color,
	role,
	className,
	onRemove,
	disabled,
	removeRef,
	removeProps,
}: BadgeRemovableProps) {
	const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key !== 'Delete' && event.key !== 'Backspace') return

		event.preventDefault()

		onRemove?.()
	}

	return (
		<Badge
			role={role}
			variant="outline"
			radius="full"
			color={color}
			className={cn('max-w-full', k.removable, className)}
			suffix={
				onRemove && (
					<Button
						{...removeProps}
						ref={removeRef}
						type="button"
						variant="bare"
						aria-label={`Remove ${label}`}
						disabled={disabled}
						onClick={(event) => {
							removeProps?.onClick?.(event)

							onRemove()
						}}
						onKeyDown={onKeyDown}
					>
						<Icon icon={<X />} />
					</Button>
				)
			}
		>
			{children ?? <span className="truncate">{label}</span>}
		</Badge>
	)
}
