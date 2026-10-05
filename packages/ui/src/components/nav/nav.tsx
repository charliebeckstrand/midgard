'use client'

import { type ComponentProps, useMemo } from 'react'
import { CurrentContext, useCurrentState } from '../../primitives/current'
import { CurrentStoreContext, useCurrentStore } from '../../primitives/current/current'
import { partitionByType } from '../../utilities/flatten-children'
import { NavContents } from './nav-content'

/** Props for {@link Nav}: the active `value` and a change callback, plus native `<nav>` attributes (less `onChange` and `defaultValue`). */
export type NavProps = Omit<ComponentProps<'nav'>, 'onChange' | 'defaultValue'> & {
	/** Controlled active value. Pair with `onValueChange`. */
	value?: string | null
	/** Initial active value when uncontrolled. */
	defaultValue?: string
	onValueChange?: (value: string | null) => void
}

/**
 * Navigation landmark that broadcasts the active `value` to descendants via the current-item context.
 *
 * @remarks
 * A {@link NavContents} child renders after the `<nav>`, not in it. The panels
 * are page content, so they stay out of the navigation landmark. They still
 * read the active `value` of the `Nav`. All other children render in the
 * `<nav>`. The `Stepper` keeps its `StepperPanels` out of its step row in the
 * same way.
 */
export function Nav({
	value,
	defaultValue,
	onValueChange,
	className,
	children,
	...props
}: NavProps) {
	// Shares the current-item cascade with Tabs rather than hand-rolling the
	// context, so controlled and uncontrolled behave identically across both.
	const context = useCurrentState({ value, defaultValue, onValueChange })

	// Each item reads its own value from the store, so a change renders only the
	// item that stops being current and the item that becomes current.
	const store = useCurrentStore(context)

	// The panels are page content, not navigation, so they render after the
	// landmark.
	const { matched: contents, rest } = useMemo(
		() => partitionByType(children, NavContents),
		[children],
	)

	return (
		<CurrentContext value={context}>
			<CurrentStoreContext value={store}>
				<nav data-slot="nav" className={className} {...props}>
					{rest}
				</nav>
				{contents}
			</CurrentStoreContext>
		</CurrentContext>
	)
}
