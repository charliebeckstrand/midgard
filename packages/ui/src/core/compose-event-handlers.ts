import type { SyntheticEvent } from 'react'

/** Options for {@link composeEventHandlers}. */
export type ComposeEventHandlersOptions = {
	/**
	 * Skip the library handler when the caller's handler already called
	 * `event.preventDefault()`. Set to `false` to run the library handler
	 * unconditionally.
	 * @defaultValue true
	 */
	checkForDefaultPrevented?: boolean
}

/**
 * Compose a caller-supplied event handler with the library's own: returns a
 * single handler that runs `theirs` first, then `ours` — skipping `ours` when
 * `theirs` called `event.preventDefault()`, unless `checkForDefaultPrevented`
 * is `false`. The caller's handler always runs and keeps the first chance to
 * cancel the default behaviour, the convention for layering behaviour onto a
 * forwarded handler.
 *
 * @param theirs - The caller's forwarded handler, if any.
 * @param ours - The library's handler.
 * @returns A handler that spreads both onto one prop.
 *
 * @example
 *   onKeyDown={composeEventHandlers(onKeyDown, (event) => {
 *     if (event.key === 'Enter') event.currentTarget.blur()
 *   })}
 */
export function composeEventHandlers<E extends SyntheticEvent>(
	theirs: ((event: E) => void) | undefined,
	ours: (event: E) => void,
	{ checkForDefaultPrevented = true }: ComposeEventHandlersOptions = {},
): (event: E) => void {
	return (event) => {
		theirs?.(event)

		if (!checkForDefaultPrevented || !event.defaultPrevented) ours(event)
	}
}
