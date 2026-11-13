'use client'

import { X } from 'lucide-react'
import {
	type AriaRole,
	type KeyboardEvent,
	type MouseEventHandler,
	memo,
	type ReactNode,
	type Ref,
} from 'react'
import { cn } from '../../core/cn'
import { defineMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { type BadgeVariants, k } from '../../recipes/kata/badge'
import { isActivationKey } from '../../utilities/keyboard-navigation'
import { Button } from '../button'
import { Icon } from '../icon'
import { Badge } from './badge'

const messages = defineMessages<{ remove: { label: string } }>({
	remove: {
		id: 'ui.badge.remove',
		defaultMessage: 'Remove {label}',
		description:
			'The name of the button that removes a chip, such as a tag. The label is the text of the chip.',
	},
})

/**
 * Props for {@link BadgeRemovable}.
 *
 * @typeParam V - The type of `value`, which `onRemove` takes.
 * @internal
 */
export type BadgeRemovableProps<V = undefined> = {
	/**
	 * The text of the chip. The remove button has the name "Remove <label>", in
	 * the language of the reader.
	 */
	label: string
	/**
	 * Rich content in place of `label`. The chip then shows this content, and
	 * `label` names only the remove button.
	 */
	children?: ReactNode
	/** The palette color of the chip. @defaultValue 'zinc' */
	color?: BadgeVariants['color']
	/** The ARIA role of the chip, for example `listitem`. */
	role?: AriaRole
	className?: string
	/**
	 * The value that the chip gives to `onRemove`, for example its position in a
	 * list. One `onRemove` can then serve each chip of the list, so a chip
	 * renders only when its own props change.
	 */
	value?: V
	/**
	 * Fires with `value` on a click of the remove button, and on Delete or
	 * Backspace on it. Omit it for a chip with no remove button.
	 */
	onRemove?: (value: V) => void
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
 * The button cancels an auto-repeat of each of these keys. So a key held down
 * removes one chip, also when the removal moves focus to the remove button of
 * the next chip.
 * The `outline` variant has the page surface as its fill, so the muted glyph
 * of the `bare` button stays above the 3:1 contrast floor for non-text. A
 * `label` truncates to the width of the chip, and the chip is no wider than
 * its container.
 *
 * @internal
 */
function BadgeRemovableImpl<V = undefined>({
	label,
	children,
	color,
	role,
	className,
	onRemove,
	disabled,
	removeRef,
	removeProps,
	value,
}: BadgeRemovableProps<V>) {
	const intl = useIntl()

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		const removes = event.key === 'Delete' || event.key === 'Backspace'

		// A repeat of Enter fires a native click, and a repeat of Space arms one.
		// The removal can move focus here while the key is still down, so each
		// repeat is canceled.
		if (event.repeat && (removes || isActivationKey(event.key))) {
			event.preventDefault()

			return
		}

		if (!removes) return

		event.preventDefault()

		onRemove?.(value as V)
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
						aria-label={intl.formatMessage(messages.remove, { label })}
						disabled={disabled}
						onClick={(event) => {
							removeProps?.onClick?.(event)

							onRemove(value as V)
						}}
						onKeyDown={handleKeyDown}
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

/**
 * Memoized {@link BadgeRemovableImpl}. When a list gives each chip its own
 * `value`, and one `onRemove` and one `removeProps` object that keep their
 * identity, the list renders only the chips whose props change. @internal
 */
export const BadgeRemovable = memo(BadgeRemovableImpl) as typeof BadgeRemovableImpl
