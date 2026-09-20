import type { UserEvent } from '@testing-library/user-event'
import type { ReactElement } from 'react'

/**
 * A subject of the pass-through sweep: a render that takes the props the sweep
 * spreads, and the `data-slot` those props must reach.
 */
export type PassthroughSubject = {
	/** Renders the subject with `props` spread onto the element that must receive them. */
	render: (props: { id: string }) => ReactElement
	/** The `data-slot` the props must reach. */
	slot: string
}

/** A named, canonical render the baseline gate asserts is axe-clean. */
export type Case = {
	/** Scenario name, printed by every gate that sweeps this entry. */
	name: string
	/** The canonical render. */
	element: ReactElement
	/**
	 * Subjects for the pass-through sweep. A family entry carries one per
	 * component it publishes, so `description list` covers its list, its term,
	 * and its details. Omit it where the entry's subject is not a component that
	 * takes DOM props.
	 */
	passthrough?: readonly PassthroughSubject[]
}

/**
 * A case whose overlay has no controlled-open prop: `open` drives it open
 * through a real interaction before the gate asserts against the document.
 */
export type InteractiveCase = Case & {
	/** Drives the real interaction that opens the surface. */
	open: (user: UserEvent) => Promise<void>
}

/**
 * A dismissable surface that moves keyboard focus into itself when it opens.
 * `open` drives the real interaction and returns the trigger focus left. Scoped
 * to surfaces that focus programmatically (an explicit `.focus()`); the modal
 * Overlay family's layout-dependent trap is real-browser-only (see
 * `focus.test.tsx`).
 */
export type FocusCase = Case & {
	/** Drives the real interaction that opens the surface, and returns the element the trigger focus left. */
	open: (user: UserEvent) => Promise<HTMLElement>
}

/**
 * A modal surface whose trap must contain Tab while open and return focus to
 * its trigger on Escape. `trigger` is the accessible name of the opening
 * button; `surface` resolves the open trapped surface. Asserted only by the
 * real-browser floating-ui project (`browser/floating-ui/trap-corpus.test.tsx`):
 * the trap walks floating-ui's layout-dependent `tabbable` pass, which jsdom
 * resolves to zero-size, so the focus guards never engage there.
 */
export type TrapCase = Case & {
	/** Accessible name of the opening button. */
	trigger: string
	/** Resolves the open trapped surface. */
	surface: () => Promise<HTMLElement>
}

/**
 * A roved item whose description ink lands on the item wash.
 *
 * `element` renders the surface already open. The gate stamps `data-active` on
 * the item rather than driving a hover, because that attribute is what the
 * roving cursor sets — deterministic where a pointer is not, and a listbox roves
 * its first option on open anyway.
 *
 * `descriptionSlot` names the `data-slot` the recipe inks, stated beside the
 * fixture that renders it so a rename moves both together.
 */
export type RovedCase = Case & {
	/** The `data-slot` the recipe inks, stated beside the fixture that renders it. */
	descriptionSlot: string
}
