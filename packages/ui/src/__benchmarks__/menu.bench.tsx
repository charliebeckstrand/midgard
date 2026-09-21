/**
 * A closed `Menu` renders no panel. Its `PresencePortal` mounts nothing until
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
 * iteration. Both walk the level's cursor over the rows. Both re-read the
 * panel's item list per event, so an O(rows) per-event cost surfaces here. A
 * sweep visits every row once, so it pays that cost per row.
 *
 * Those run-lifetime mounts settle floating-ui a tick after the mount returns,
 * which React reports as an update outside `act`. The warnings land at
 * collection, before the first sample, and no timed region contains one. Read
 * them as noise, not as work inside a measurement.
 */

import { SquarePen } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { bench, describe } from 'vitest'
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
import { comboboxOptions } from './fixtures'
import { mountBenches, persistentTree, rerenderBench } from './harness'

/** The row counts every mount scenario sweeps: a toolbar menu, a column menu, an overflowing one. */
const ROWS = [8, 24, 64] as const

/** Rows per section in the sectioned composition, and children per submenu. */
const GROUP = 6

/** Menus on one page in the fan-out scenario — a per-row action column's worth. */
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

describe('Menu · closed dropdown (panel not rendered)', () => {
	mountBenches(
		ROWS,
		(count) => `${count} rows`,
		(count) => (
			<Dropdown>
				<Rows count={count} />
			</Dropdown>
		),
	)
})

describe('Menu · open dropdown (panel portaled)', () => {
	mountBenches(
		ROWS,
		(count) => `${count} rows · open`,
		(count) => (
			<Dropdown open>
				<Rows count={count} />
			</Dropdown>
		),
	)
})

describe('Menu · static inline (no portal, no positioning)', () => {
	// `defaultOpen` with no `placement`: the panel renders in place. Held beside
	// the open dropdown of the same size, the pair prices the floating layer.
	mountBenches(
		ROWS,
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
const COMPOSITIONS = [
	['label only', (label: string) => <MenuLabel>{label}</MenuLabel>],
	[
		'label + icon',
		(label: string) => (
			<>
				<Icon icon={<SquarePen />} />

				<MenuLabel>{label}</MenuLabel>
			</>
		),
	],
	[
		'label + shortcut',
		(label: string) => (
			<>
				<MenuLabel>{label}</MenuLabel>

				<MenuShortcut>⌘K</MenuShortcut>
			</>
		),
	],
	[
		'label + description',
		(label: string) => (
			<>
				<MenuLabel>{label}</MenuLabel>

				<MenuDescription>Applies to the current selection</MenuDescription>
			</>
		),
	],
] as const

describe('Menu · row composition (24 rows, open)', () => {
	mountBenches(
		COMPOSITIONS,
		([name]) => name,
		([, content]) => (
			<Dropdown open>
				{comboboxOptions(24).map((option) => (
					<MenuItem key={option.value}>{content(option.label)}</MenuItem>
				))}
			</Dropdown>
		),
	)
})

describe('Menu · row kind (24 rows, open)', () => {
	// The three branches `MenuItem` renders through, plus the sectioned layout —
	// a `<fieldset>` and `<legend>` per group, with a separator between.
	mountBenches(
		['button', 'link', 'disabled', 'sectioned'] as const,
		(kind) => `${kind} rows`,
		(kind) => (
			<Dropdown open>
				{kind === 'sectioned' ? (
					<Sections count={24} />
				) : (
					comboboxOptions(24).map((option) => (
						<MenuItem
							key={option.value}
							href={kind === 'link' ? '#row' : undefined}
							disabled={kind === 'disabled'}
						>
							<MenuLabel>{option.label}</MenuLabel>
						</MenuItem>
					))
				)}
			</Dropdown>
		),
	)
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

describe('Menu · fan-out (one menu per row of a page)', () => {
	// What a toolbar or an action column multiplies. The bare buttons are the
	// floor: the same trigger count with no menu behind any of them.
	mountBenches(
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

describe('Menu · submenus (24 rows, open)', () => {
	// Every fourth row opens a submenu of its own, each one a `MenuPointerLevel`
	// plus a second floating surface the closed panel still builds the shell for.
	mountBenches(
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

describe('Menu · open ⇄ closed (mounted, 24 rows)', () => {
	// Re-render alone: the tree mounts in the cycle setup, so a regression here
	// is the toggle's reconciliation — the panel subtree arriving and leaving —
	// rather than the mount.
	rerenderBench(
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

/** One `keydown` on `target`, the press the trigger's roving handler reads. */
function pressKey(target: HTMLElement, key: string) {
	target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key }))
}

/**
 * Mounts one open menu for the whole run and returns its rows. A dropdown's
 * panel portals out of the tree, so both models are reached by class.
 */
function openRows(count: number, model: 'virtual' | 'focus'): HTMLElement[] {
	const panel = `menu-bench-${model}-${count}`

	persistentTree(
		model === 'virtual' ? (
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

	return [...document.querySelectorAll<HTMLElement>(`.${panel} [role="menuitem"]`)]
}

describe('Menu · pointer sweep · virtual cursor (dropdown)', () => {
	// A dropdown keeps focus on its trigger, so each accepted arrival re-reads
	// the panel's rows and re-stamps the `data-active` cursor.
	for (const count of ROWS) {
		const rows = openRows(count, 'virtual')

		bench(`${count} rows · one pass`, () => {
			rows.forEach(sweepTo)
		})
	}
})

describe('Menu · pointer sweep · real focus (static)', () => {
	// Every other mode roves by real focus, so an arrival moves focus instead.
	for (const count of ROWS) {
		const rows = openRows(count, 'focus')

		bench(`${count} rows · one pass`, () => {
			rows.forEach(sweepTo)
		})
	}
})

describe('Menu · keyboard rove (dropdown, focus on trigger)', () => {
	// Arrow presses arrive on the trigger and move the `aria-activedescendant`
	// cursor. One pass walks the cursor down the whole panel.
	for (const count of ROWS) {
		const panel = `menu-rove-${count}`

		const container = persistentTree(
			<Dropdown open className={panel}>
				<Rows count={count} />
			</Dropdown>,
		)

		const trigger = container.querySelector<HTMLElement>(
			'[data-slot="menu-trigger"]',
		) as HTMLElement

		bench(`${count} rows · ArrowDown ×${count}`, () => {
			for (let step = 0; step < count; step++) pressKey(trigger, 'ArrowDown')
		})
	}
})

describe('Menu · typeahead (dropdown, focus on trigger)', () => {
	// A printable key seeds the type-ahead buffer and scans the rows for a match.
	for (const count of ROWS) {
		const panel = `menu-typeahead-${count}`

		const container = persistentTree(
			<Dropdown open className={panel}>
				<Rows count={count} />
			</Dropdown>,
		)

		const trigger = container.querySelector<HTMLElement>(
			'[data-slot="menu-trigger"]',
		) as HTMLElement

		bench(`${count} rows · one letter`, () => {
			pressKey(trigger, 'o')
		})
	}
})
