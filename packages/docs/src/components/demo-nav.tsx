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
import { cn } from 'ui/core'
import { Icon } from 'ui/icon'
import { Popover, PopoverContent, PopoverTrigger } from 'ui/popover'
import { Stack } from 'ui/stack'

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
 * Bare icon button that opens a {@link Popover} listing the page's examples,
 * each a button that scrolls its example into view. Renders nothing until at
 * least {@link MIN_EXAMPLES} examples have registered, so single-example pages
 * stay uncluttered.
 *
 * @remarks Reads the registry from {@link DemoNavProvider}; place it within the
 * same provider that wraps the demo body.
 */
export function DemoNav() {
	const entries = use(ExampleEntriesContext)

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLButtonElement>(null)

	if (entries.length < MIN_EXAMPLES) return null

	const select = (id: string) => {
		jumpTo(id)

		// The trigger sits in the sticky header, so the popover's close-time focus
		// restore would scroll the content back to the trigger's unstuck position,
		// undoing the jump. Focusing it here (without scrolling) both satisfies the
		// restore — which skips when focus is already on the trigger — and keeps the
		// keyboard caret on a sensible control.
		triggerRef.current?.focus({ preventScroll: true })

		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen} placement="bottom-start">
			<PopoverTrigger>
				<Button ref={triggerRef} variant="bare" aria-label="Jump to example">
					<Icon icon={<ListSortAscending />} />
				</Button>
			</PopoverTrigger>
			<PopoverContent autoFocus p="xs" aria-label="Examples on this page">
				<Stack data-slot="demo-nav" className="min-w-40 max-w-72">
					{entries.map((entry) => (
						<button
							key={entry.id}
							type="button"
							onClick={() => select(entry.id)}
							className={cn(
								'w-full truncate rounded-md px-3 py-1.5 text-left text-sm',
								'hover:bg-zinc-100 dark:hover:bg-zinc-800',
								'focus-visible:-outline-offset-2',
							)}
						>
							{entry.title}
						</button>
					))}
				</Stack>
			</PopoverContent>
		</Popover>
	)
}
