'use client'

import { ListSortAscending } from 'lucide-react'
import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, useMenuActions } from 'ui/menu'

// Below this count the page reads top-to-bottom comfortably, so the jump nav
// stays hidden; at or above it the list earns its place.
const MIN_EXAMPLES = 3

// Breathing room left above a jumped-to example, beneath the sticky header.
const JUMP_GAP_PX = 8

/** One registered example: its anchor `id` and the heading to list it under. */
type ExampleEntry = { id: string; title: ReactNode }

/** The registration seam an {@link Example} reaches for through context. */
type Registry = { register: (entry: ExampleEntry) => () => void }

// Split contexts so an Example subscribes only to the stable `register`
// function, never re-rendering as siblings register; the entries list lives on
// its own context that only DemoNav reads.
const ExampleRegistryContext = createContext<Registry | null>(null)

const ExampleEntriesContext = createContext<readonly ExampleEntry[]>([])

/**
 * Scrolls the example anchored to `id` into view within the docs content
 * scroller, clearing the sticky header. No-ops when the element or its scroll
 * ancestor is absent.
 *
 * @internal
 */
function jumpTo(id: string) {
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

	const top =
		target.getBoundingClientRect().top -
		scroller.getBoundingClientRect().top +
		scroller.scrollTop -
		headerHeight -
		JUMP_GAP_PX

	scroller.scrollTo({ top, behavior: 'smooth' })
}

/**
 * Provides the example registry to one demo's subtree. {@link Example}s within
 * register their title and anchor; {@link DemoNav} reads the collected list.
 * Entries accrue in mount order, which matches document order for the demo's
 * top-to-bottom example list.
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
 * @param id - The example's anchor id, the scroll target for its nav entry.
 * @param title - The example heading; registration is skipped when empty.
 */
export function useRegisterExample(id: string, title: ReactNode) {
	const registry = use(ExampleRegistryContext)

	// Snapshot the title so the effect can register the current value without
	// listing a (potentially per-render) ReactNode in its dependencies.
	const titleRef = useRef(title)

	titleRef.current = title

	const hasTitle = title != null && title !== ''

	useEffect(() => {
		if (!registry || !hasTitle) return

		return registry.register({ id, title: titleRef.current })
	}, [registry, id, hasTitle])
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
 * {@link MIN_EXAMPLES} examples have registered, so single-example pages stay
 * uncluttered.
 *
 * @remarks Reads the registry from {@link DemoNavProvider}; place it within the
 * same provider that wraps the demo body.
 */
export function DemoNav() {
	const entries = use(ExampleEntriesContext)

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
