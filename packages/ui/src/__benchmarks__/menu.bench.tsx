/**
 * A closed `Menu` renders no panel. Its `Portal` mounts nothing until
 * the menu opens. So the closed rungs price the shell alone: the trigger, the
 * disclosure and roving plumbing, and the recipe resolutions `MenuContent`
 * always pays. They must hold flat as the row count grows.
 *
 * The open rungs add the panel and its rows. The static rung is that same
 * panel with the floating machinery taken out. The pair therefore prices the
 * portal, the positioning, and the presence wrapper.
 *
 * Fan-out is what a toolbar or a per-row action column multiplies: fifty closed
 * menus against fifty bare buttons, the floor a closed menu cannot beat.
 *
 * The rove and sweep scenarios drive one mounted, open menu across every
 * iteration, and both walk the level's cursor over the rows. The rove re-reads
 * the panel's item list per press, so an O(rows) per-event cost surfaces
 * there. The sweep addresses its row directly and holds flat per move in a real
 * engine (`browser/menu-pointer.bench.tsx`). It does not hold flat here,
 * because the one query it still makes is `querySelector`, which jsdom runs in
 * JavaScript over the panel's subtree. Read these rungs against each other,
 * not as a per-move cost.
 *
 * Read the rove and typeahead rungs as jsdom figures, not as what a reader
 * pays. Both call `getComputedStyle` while they look for a scroll container,
 * and jsdom resolves style in JavaScript. The same press costs many times more
 * here than in Chromium. Capping the panel gives that walk a scroller to find,
 * and barely moves the browser number.
 * `browser/menu-keyboard.bench.tsx` holds those figures. These rungs still
 * localize a regression; they do not size one.
 *
 * Those run-lifetime mounts settle floating-ui a tick after the mount returns,
 * which React reports as an update outside `act`. The warnings land at
 * collection, before the first sample, and no timed region contains one. Read
 * them as noise, not as work inside a measurement.
 */

import { SquarePen } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { vi } from 'vitest'
import { Icon } from '../components/icon'
import {
	Menu,
	MenuContent,
	MenuDescription,
	MenuHeading,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSeparator,
	MenuShortcut,
	MenuSub,
	MenuTrigger,
} from '../components/menu'
import { compareBenches } from './compare'
import { comboboxOptions, MENU_ROWS } from './fixtures'
import { mountBench, mountBenches, rerenderBench, sharedTree } from './harness'

/** Rows per section in the sectioned composition, and children per submenu. */
const GROUP = 6

/** Menus on one page in the fan-out scenario: a per-row action column's worth. */
const FAN_OUT = 50

/**
 * The rows a consumer writes, built inside the panel's own render rather than
 * hoisted. A closed menu never renders this component. The closed rungs
 * therefore measure the shell, not the row elements a hoisted list would
 * charge them for. An open menu pays the `createElement` calls where React
 * does.
 */
function Rows({ count }: { count: number }) {
	return (
		<>
			{comboboxOptions(count).map((option) => (
				<MenuItem key={option.value}>
					<MenuLabel>{option.label}</MenuLabel>
				</MenuItem>
			))}
		</>
	)
}

/** A dropdown: `placement` selects the floating mode, `defaultOpen` starts it open. */
function Dropdown({
	open = false,
	className,
	children,
}: {
	open?: boolean
	className?: string
	children: ReactNode
}) {
	return (
		<Menu placement="bottom-start" defaultOpen={open}>
			<MenuTrigger>Options</MenuTrigger>

			<MenuContent className={className}>{children}</MenuContent>
		</Menu>
	)
}

compareBenches('Menu · closed dropdown (panel not rendered)', (bench) => {
	mountBenches(
		bench,
		MENU_ROWS,
		(count) => `${count} rows`,
		(count) => (
			<Dropdown>
				<Rows count={count} />
			</Dropdown>
		),
	)
})

compareBenches('Menu · open dropdown (panel portaled)', (bench) => {
	mountBenches(
		bench,
		MENU_ROWS,
		(count) => `${count} rows · open`,
		(count) => (
			<Dropdown open>
				<Rows count={count} />
			</Dropdown>
		),
	)
})

compareBenches('Menu · static inline (no portal, no positioning)', (bench) => {
	// `defaultOpen` with no `placement`: the panel renders in place. Held beside
	// the open dropdown of the same size, the pair prices the floating layer.
	mountBenches(
		bench,
		MENU_ROWS,
		(count) => `${count} rows · static`,
		(count) => (
			<Menu defaultOpen>
				<MenuContent aria-label="Actions">
					<Rows count={count} />
				</MenuContent>
			</Menu>
		),
	)
})

/** The row shapes a menu is written in, each one slot heavier than the last. */
const COMPOSITIONS: { name: string; row: (label: string) => ReactNode }[] = [
	{ name: 'label only', row: (label) => <MenuLabel>{label}</MenuLabel> },
	{
		name: 'label + icon',
		row: (label) => (
			<>
				<Icon icon={<SquarePen />} />

				<MenuLabel>{label}</MenuLabel>
			</>
		),
	},
	{
		name: 'label + shortcut',
		row: (label) => (
			<>
				<MenuLabel>{label}</MenuLabel>

				<MenuShortcut>⌘K</MenuShortcut>
			</>
		),
	},
	{
		name: 'label + description',
		row: (label) => (
			<>
				<MenuLabel>{label}</MenuLabel>

				<MenuDescription>Applies to the current selection</MenuDescription>
			</>
		),
	},
]

compareBenches('Menu · row composition (24 rows, open)', (bench) => {
	mountBenches(
		bench,
		COMPOSITIONS,
		(composition) => composition.name,
		(composition) => (
			<Dropdown open>
				{comboboxOptions(24).map((option) => (
					<MenuItem key={option.value}>{composition.row(option.label)}</MenuItem>
				))}
			</Dropdown>
		),
	)
})

compareBenches('Menu · row kind (24 rows, open)', (bench) => {
	// The three branches `MenuItem` renders through.
	mountBenches(
		bench,
		['button', 'link', 'disabled'] as const,
		(kind) => `${kind} rows`,
		(kind) => (
			<Dropdown open>
				{comboboxOptions(24).map((option) => (
					<MenuItem
						key={option.value}
						href={kind === 'link' ? '#row' : undefined}
						disabled={kind === 'disabled'}
					>
						<MenuLabel>{option.label}</MenuLabel>
					</MenuItem>
				))}
			</Dropdown>
		),
	)

	// The sectioned layout renders a different tree, not a fourth row branch: a
	// `<fieldset>` and `<legend>` per group, with a separator between.
	mountBench(bench, 'sectioned rows', () => (
		<Dropdown open>
			<Sections count={24} />
		</Dropdown>
	))
})

/** `count` rows grouped into headed sections of {@link GROUP}, divided by separators. */
function Sections({ count }: { count: number }) {
	const options = comboboxOptions(count)

	const groups = Array.from({ length: Math.ceil(count / GROUP) }, (_, index) =>
		options.slice(index * GROUP, index * GROUP + GROUP),
	)

	return (
		<>
			{groups.map((rows, index) => (
				<MenuSection key={rows[0]?.value}>
					<MenuHeading>Group {index + 1}</MenuHeading>

					{rows.map((option) => (
						<MenuItem key={option.value}>
							<MenuLabel>{option.label}</MenuLabel>
						</MenuItem>
					))}

					{index < groups.length - 1 ? <MenuSeparator /> : null}
				</MenuSection>
			))}
		</>
	)
}

compareBenches('Menu · fan-out (one menu per row of a page)', (bench) => {
	// What a toolbar or an action column multiplies. The bare buttons are the
	// floor: the same trigger count with no menu behind any of them.
	mountBenches(
		bench,
		['closed menus', 'bare buttons'] as const,
		(kind) => `${FAN_OUT} ${kind}`,
		(kind) => (
			<>
				{comboboxOptions(FAN_OUT).map((option) =>
					kind === 'bare buttons' ? (
						<button key={option.value} type="button">
							Options
						</button>
					) : (
						<Dropdown key={option.value}>
							<Rows count={GROUP} />
						</Dropdown>
					),
				)}
			</>
		),
	)
})

compareBenches('Menu · submenus (24 rows, open)', (bench) => {
	// The last six rows open a submenu of their own, each one a `MenuPointerLevel`
	// plus a second floating surface the closed panel still builds the shell for.
	mountBenches(
		bench,
		[0, 6] as const,
		(subs) => `${subs} submenu rows`,
		(subs) => (
			<Dropdown open>
				{comboboxOptions(24)
					.slice(subs)
					.map((option) => (
						<MenuItem key={option.value}>
							<MenuLabel>{option.label}</MenuLabel>
						</MenuItem>
					))}

				{comboboxOptions(24)
					.slice(0, subs)
					.map((option) => (
						<MenuSub key={option.value} label={option.label}>
							<Rows count={GROUP} />
						</MenuSub>
					))}
			</Dropdown>
		),
	)
})

compareBenches('Menu · open ⇄ closed (mounted, 24 rows)', (bench) => {
	// Re-render alone: the tree mounts in the cycle setup, so a regression here
	// is the toggle's reconciliation (the panel subtree arriving and leaving)
	// rather than the mount.
	rerenderBench(
		bench,
		'toggle open',
		() => <Toggle open={false} />,
		(rerender, iteration) => rerender(<Toggle open={iteration % 2 === 1} />),
	)
})

/** A controlled dropdown whose open state the toggle bench drives. */
function Toggle({ open }: { open: boolean }): ReactElement {
	return (
		<Menu placement="bottom-start" open={open}>
			<MenuTrigger>Options</MenuTrigger>

			<MenuContent>
				<Rows count={24} />
			</MenuContent>
		</Menu>
	)
}

/** One mouse `pointermove` on `row`, the arrival a sweep across the panel makes. */
function sweepTo(row: HTMLElement, step: number) {
	row.dispatchEvent(
		new PointerEvent('pointermove', {
			bubbles: true,
			pointerType: 'mouse',
			clientX: 20,
			clientY: 20 + step * 32,
		}),
	)
}

/** One `keydown` on `target`, the press the roving handler of the panel reads. */
function pressKey(target: HTMLElement, key: string) {
	target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
}

/** One open menu, held for the run: its panel, and the rows that keys and a sweep visit. */
type Probe = { panel: HTMLElement; rows: HTMLElement[] }

/**
 * The element that takes a key of the open menu of `probe`: the row that has
 * the focus, or else the first row. The panel roves its rows by real focus.
 */
function keyTarget({ panel, rows }: Probe): HTMLElement {
	const active = document.activeElement

	if (active instanceof HTMLElement && panel.contains(active)) return active

	return rows[0] ?? panel
}

/**
 * Mounts one open menu for the whole run. A dropdown's panel portals out of the
 * tree, so the rows are reached by class rather than through the container.
 * Every driven scenario shares these mounts, because each surplus menu leaves
 * its rows and its dismiss listeners in the one document the others measure in.
 */
function openMenu(count: number, model: 'dropdown' | 'static'): Probe {
	const panel = `menu-bench-${model}-${count}`

	sharedTree(
		model === 'dropdown' ? (
			<Dropdown open className={panel}>
				<Rows count={count} />
			</Dropdown>
		) : (
			<Menu defaultOpen>
				<MenuContent aria-label="Actions" className={panel}>
					<Rows count={count} />
				</MenuContent>
			</Menu>
		),
	)

	return {
		panel: document.querySelector<HTMLElement>(`.${panel}`) as HTMLElement,
		rows: [...document.querySelectorAll<HTMLElement>(`.${panel} [role="menuitem"]`)],
	}
}

/** The dropdown probes, shared by the rove and the typeahead scenarios. */
const dropdownProbes = new Map(MENU_ROWS.map((count) => [count, openMenu(count, 'dropdown')]))

/** The static probes, which the sweep drives. */
const staticProbes = new Map(MENU_ROWS.map((count) => [count, openMenu(count, 'static')]))

/** The probe for `count`, which the maps above always hold. */
function probeAt(probes: Map<number, Probe>, count: number): Probe {
	return probes.get(count) as Probe
}

compareBenches('Menu · pointer sweep · real focus (static)', (bench) => {
	// Each mode roves by real focus, so an arrival moves the focus. A dropdown
	// runs the same level, so this one sweep prices both.
	for (const count of MENU_ROWS) {
		const { rows } = probeAt(staticProbes, count)

		bench(`${count} rows · one pass`, () => {
			rows.forEach(sweepTo)
		})
	}
})

compareBenches('Menu · keyboard rove (dropdown)', (bench) => {
	// Arrow presses arrive on the row that has the focus and move the focus. One
	// pass walks the focus down the whole panel. This is the one scenario that
	// still re-reads the panel's item list per event.
	for (const count of MENU_ROWS) {
		const probe = probeAt(dropdownProbes, count)

		bench(`${count} rows · ArrowDown ×${count}`, () => {
			for (let step = 0; step < count; step++) pressKey(keyTarget(probe), 'ArrowDown')
		})
	}
})

compareBenches('Menu · typeahead (dropdown)', (bench) => {
	// A printable key extends the type-ahead buffer and scans the rows for a
	// match. It reads the same mounted menus the rove scenario drives. Every label
	// starts with the letter, so the scan stops at its first candidate wherever
	// the cursor sits.
	//
	// The buffer clears after an idle window, and each press restarts that timer.
	// A bench presses far faster than the window, so on a real clock the query
	// gains one letter on each iteration, and the match walks the whole of it. A
	// fake clock for that timer alone fires the reset after each press. The
	// reset runs inside the timed region, and the last rung prices it.
	const fakeClock = {
		beforeAll: () => {
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
		},
		afterAll: () => {
			vi.useRealTimers()
		},
	}

	for (const count of MENU_ROWS) {
		const probe = probeAt(dropdownProbes, count)

		bench(`${count} rows · one letter`, fakeClock, () => {
			pressKey(keyTarget(probe), 'o')

			vi.runOnlyPendingTimers()
		})
	}

	bench('fake clock · one timer, scheduled and fired', fakeClock, () => {
		setTimeout(() => {}, 500)

		vi.runOnlyPendingTimers()
	})
})
