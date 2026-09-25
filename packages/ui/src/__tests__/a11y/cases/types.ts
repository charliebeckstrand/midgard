import type { UserEvent } from '@testing-library/user-event'
import type { FocusEvent, ReactElement } from 'react'
import type { Step } from '../../../recipes'

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

/** A skeleton the component publishes for a loading tree. */
export type SkeletonSubject = {
	/** The skeleton render. */
	element: ReactElement
	/** The `data-slot` the real component publishes, which the skeleton must not render. */
	absentSlot: string
	/**
	 * How many placeholders the silhouette draws, where the count is part of the
	 * contract. Omit it where the skeleton only claims to draw something.
	 */
	placeholders?: number
}

/** A subject that becomes an anchor when it is given an `href`. */
export type LinkSubject = {
	/** Renders the subject with `href` on the element that must become the anchor. */
	render: (href: string) => ReactElement
	/** The `data-slot` that must render an `<a>`. */
	slot: string
}

/**
 * A subject that resolves its size through the Density cascade and publishes
 * the answer as `data-size`.
 */
export type DensitySubject = {
	/** Renders the subject, with `size` as its explicit prop when the sweep passes one. */
	render: (size?: Step) => ReactElement
	/** The `data-slot` that publishes `data-size`. */
	slot: string
}

/** The props the text-input sweep passes, one leg at a time. */
export type TextInputProbe = {
	/** A callback ref, so one probe fits an `<input>` and a `<textarea>` alike. */
	ref?: (element: HTMLElement | null) => void
	placeholder?: string
	disabled?: boolean
}

/** A text field whose ref, placeholder, and disabled state reach its editable element. */
export type TextInputSubject = {
	/** Renders the subject with `props` on the component under test. */
	render: (props: TextInputProbe) => ReactElement
	/** The `data-slot` of the editable element. */
	slot: string
}

/**
 * A form-bound control whose blur marks its field touched, even when the
 * caller's `onBlur` calls `preventDefault()` (CONVENTIONS.md §3.9).
 */
export type TouchOnBlurSubject = {
	/** Renders the subject bound to the field `name`, with the caller's `onBlur`. */
	render: (props: {
		name: string
		onBlur: (event: FocusEvent<HTMLElement>) => void
	}) => ReactElement
	/** The value the field starts from in `Form.defaultValues`. */
	defaultValue: unknown
	/** The `data-slot` of the element that takes focus. */
	slot: string
}

/** A named, canonical render a gate drives. */
export type Scenario = {
	/** Scenario name, printed by every gate that sweeps this entry. */
	name: string
	/** The canonical render. */
	element: ReactElement
}

/**
 * A scenario in one of the three axe-gated corpora, so it may carry capability
 * columns. The gates that keep their own list — focus, traps, roved — extend
 * {@link Scenario} instead, because `corpus` does not reach them and a column
 * written there would be swept by nothing.
 */
export type Case = Scenario & {
	/**
	 * Subjects for the pass-through sweep. A family entry carries one per
	 * component it publishes, so `description list` covers its list, its term,
	 * and its details. Omit it where the entry's subject is not a component that
	 * takes DOM props.
	 */
	passthrough?: readonly PassthroughSubject[]
	/**
	 * Skeletons the component publishes. A list, because one entry can publish
	 * more than one silhouette: `progress` has a bar and a gauge.
	 */
	skeleton?: readonly SkeletonSubject[]
	/**
	 * Subjects that swap their element for an anchor when given an `href`. A
	 * list, because one entry can publish more than one such subject.
	 */
	link?: readonly LinkSubject[]
	/**
	 * Subjects that resolve their size through the Density cascade. A list,
	 * because one entry can publish more than one: `slider in field` covers the
	 * slider and the range slider.
	 */
	density?: readonly DensitySubject[]
	/** Text fields whose ref, placeholder, and disabled state reach the editable element. */
	textInput?: readonly TextInputSubject[]
	/** Form-bound controls whose blur marks the field touched, whatever the caller's `onBlur` does. */
	touchOnBlur?: readonly TouchOnBlurSubject[]
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
export type FocusCase = Scenario & {
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
export type TrapCase = Scenario & {
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
export type RovedCase = Scenario & {
	/** The `data-slot` the recipe inks, stated beside the fixture that renders it. */
	descriptionSlot: string
}
