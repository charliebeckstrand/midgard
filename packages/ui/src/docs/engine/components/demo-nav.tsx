'use client'

import { ListSortAscending } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuTrigger,
	useMenuActions,
} from '../../../components/menu'
import { createContext } from '../../../core'
import { useCurrentPanelActive } from '../../../primitives/current'
import { replaceHash } from '../router'

// A page with no titled examples has nothing to jump to, so the nav stays
// hidden; one example or more earns it a place in the header.
const MIN_EXAMPLES = 1

// Breathing room left above a jumped-to example, beneath the sticky header.
const JUMP_GAP_PX = 8

/** One registered example: its anchor `id` and the heading to list it under. */
type ExampleEntry = { id: string; title: ReactNode }

/** The registration seam an {@link Example} reaches for through context. */
type Registry = { register: (entry: ExampleEntry) => () => void }

// Split contexts so an Example subscribes only to the stable `register`
// function, never re-rendering as siblings register; the entries list lives on
// its own context that only DemoNav reads.
const [ExampleRegistryContext, useExampleRegistry] = createContext<Registry | null>(
	'ExampleRegistry',
	{ default: null },
)

const [ExampleEntriesContext, useExampleEntries] = createContext<readonly ExampleEntry[]>(
	'ExampleEntries',
	{ default: [] },
)

/**
 * Scrolls the example anchored to `id` into view within the docs content
 * scroller, clearing the sticky header. No-ops when the element or its scroll
 * ancestor is absent.
 */
export function jumpTo(id: string) {
	const target = document.getElementById(id)

	if (!target) return

	// The content column owns the only vertical scroll on the route; mirrors the
	// `closest('[class*="overflow-y"]')` lookup the app uses to reset scroll.
	const scroller = target.closest<HTMLElement>('[class*="overflow-y"]')

	if (!scroller) {
		target.scrollIntoView({ behavior: 'smooth', block: 'start' })

		return
	}

	const header = scroller.querySelector<HTMLElement>('[data-slot="header"]')

	const headerHeight = header?.offsetHeight ?? 0

	// Offset any scroll into this column — a native hash jump, `scrollIntoView`,
	// a focus-driven scroll — by the sticky header's height, so a landing anchor
	// never hides beneath it. Cleared and re-measured on every jump since the
	// header height tracks the density cascade.
	scroller.style.scrollPaddingTop = `${headerHeight + JUMP_GAP_PX}px`

	const top =
		target.getBoundingClientRect().top -
		scroller.getBoundingClientRect().top +
		scroller.scrollTop -
		headerHeight -
		JUMP_GAP_PX

	scroller.scrollTo({ top, behavior: 'smooth' })
}

// Frames to wait for a lazily-mounted target before giving up (~0.5s at 60fps).
const JUMP_MAX_FRAMES = 30

/**
 * {@link jumpTo} that waits for the anchored element to mount. A deep link to a
 * tab route lands before that route's chunk resolves, so the example the hash
 * names isn't in the DOM on the first frame; poll across animation frames until
 * it is, then jump. Returns a canceller so a superseding navigation can abort a
 * pending poll.
 */
export function jumpToWhenReady(id: string): () => void {
	let frame = 0

	let handle = 0

	const attempt = () => {
		if (document.getElementById(id)) {
			jumpTo(id)

			return
		}

		if (frame++ < JUMP_MAX_FRAMES) handle = requestAnimationFrame(attempt)
	}

	handle = requestAnimationFrame(attempt)

	return () => cancelAnimationFrame(handle)
}

/**
 * Provides the example registry to one demo's subtree. {@link Example}s within
 * register their title and anchor; {@link DemoNav} reads the collected list.
 * Entries accrue in registration order, which matches document order for the
 * examples on view — examples in inactive tab panels stay out of the list until
 * their tab is shown.
 */
export function DemoNavProvider({ children }: { children: ReactNode }) {
	const [entries, setEntries] = useState<ExampleEntry[]>([])

	const register = useCallback((entry: ExampleEntry) => {
		setEntries((prev) => [...prev, entry])

		return () => setEntries((prev) => prev.filter((e) => e.id !== entry.id))
	}, [])

	const registry = useMemo<Registry>(() => ({ register }), [register])

	return (
		<ExampleRegistryContext value={registry}>
			<ExampleEntriesContext value={entries}>{children}</ExampleEntriesContext>
		</ExampleRegistryContext>
	)
}

/**
 * Registers a titled example with the enclosing {@link DemoNavProvider} so it
 * appears in the page's {@link DemoNav}. Untitled examples and examples rendered
 * outside a provider are skipped. The registered title is captured at mount;
 * demo titles are static, so it never needs to track later changes.
 *
 * An example inside an inactive tab panel deregisters until its tab is shown, so
 * a tabbed demo's nav lists only the examples on the tab in view — fade-mode
 * panels stay mounted but out of sight, and jumping to a hidden one leads
 * nowhere.
 *
 * @param id - The example's anchor id, the scroll target for its nav entry.
 * @param title - The example heading; registration is skipped when empty.
 */
export function useRegisterExample(id: string, title: ReactNode) {
	const registry = useExampleRegistry()

	// True unless the example sits in a tab panel that isn't the one on view;
	// gates registration so DemoNav tracks the active tab (see the folded
	// `useCurrentPanelActive` state on CurrentContent).
	const active = useCurrentPanelActive()

	// Snapshot the title so the effect can register the current value without
	// listing a (potentially per-render) ReactNode in its dependencies.
	const titleRef = useRef(title)

	titleRef.current = title

	const hasTitle = title != null && title !== ''

	useEffect(() => {
		if (!registry || !hasTitle || !active) return

		return registry.register({ id, title: titleRef.current })
	}, [registry, id, hasTitle, active])
}

/**
 * One menu item that scrolls to its example on selection.
 *
 * @remarks The trigger sits in the sticky header, so the menu's close-time focus
 * restore would scroll the content back to the trigger's unstuck position,
 * undoing the jump. Refocusing the trigger here (without scrolling, before
 * {@link MenuItem}'s own close) satisfies the restore — which skips when focus
 * is already on the trigger — and keeps the keyboard caret on a sensible control.
 * @internal
 */
function DemoNavItem({ entry }: { entry: ExampleEntry }) {
	const { triggerRef } = useMenuActions()

	return (
		<MenuItem
			onAction={() => {
				// The hash mirrors the jump so the address bar deep-links the example.
				replaceHash(entry.id)

				jumpTo(entry.id)

				triggerRef.current?.focus({ preventScroll: true })
			}}
		>
			<MenuLabel>{entry.title}</MenuLabel>
		</MenuItem>
	)
}

/**
 * Bare icon button that opens a {@link Menu} of the page's examples, each item
 * scrolling its example into view. Renders nothing until at least
 * {@link MIN_EXAMPLES} examples have registered, so pages with nothing to jump
 * to stay uncluttered.
 *
 * @remarks Reads the registry from {@link DemoNavProvider}; place it within the
 * same provider that wraps the demo body.
 */
export function DemoNav() {
	const entries = useExampleEntries()

	if (entries.length < MIN_EXAMPLES) return null

	return (
		<Menu placement="bottom-start">
			<MenuTrigger>
				<Button variant="bare" aria-label="Jump to example">
					<Icon icon={<ListSortAscending />} />
				</Button>
			</MenuTrigger>
			<MenuContent>
				{entries.map((entry) => (
					<DemoNavItem key={entry.id} entry={entry} />
				))}
			</MenuContent>
		</Menu>
	)
}
