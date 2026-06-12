import type { UserEvent } from '@testing-library/user-event'
import type { ReactElement } from 'react'

/** A named, canonical render the baseline gate asserts is axe-clean. */
export type Case = readonly [name: string, element: ReactElement]

/**
 * A case whose overlay has no controlled-open prop: `open` drives it open
 * through a real interaction before the gate asserts against the document.
 */
export type InteractiveCase = readonly [
	name: string,
	element: ReactElement,
	open: (user: UserEvent) => Promise<void>,
]

/**
 * A dismissable surface that moves keyboard focus into itself when it opens.
 * `open` drives the real interaction and returns the trigger focus left. Scoped
 * to surfaces that focus programmatically (an explicit `.focus()`); the modal
 * Overlay family's layout-dependent trap is real-browser-only (see
 * `focus.test.tsx`).
 */
export type FocusCase = readonly [
	name: string,
	element: ReactElement,
	open: (user: UserEvent) => Promise<HTMLElement>,
]

/**
 * A modal surface whose trap must contain Tab while open and return focus to
 * its trigger on Escape. `trigger` is the accessible name of the opening
 * button; `surface` resolves the open trapped surface. Asserted only by the
 * real-browser floating-ui project (`browser/floating-ui/trap-corpus.test.tsx`):
 * the trap walks floating-ui's layout-dependent `tabbable` pass, which jsdom
 * resolves to zero-size, so the focus guards never engage there.
 */
export type TrapCase = readonly [
	name: string,
	trigger: string,
	element: ReactElement,
	surface: () => Promise<HTMLElement>,
]
