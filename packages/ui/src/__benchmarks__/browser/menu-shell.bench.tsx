/**
 * Where the open goes when there is nothing in the panel.
 *
 * `menu-open.bench.tsx` reads an empty panel at 2.65 ms above its floor, and a
 * row at 0.09 ms. The shell is therefore the open at every size a reader meets,
 * and it is the largest figure this suite holds for the component. Nothing
 * said which layer of it spends the time. This bench ablates the shell.
 *
 * Every rung mounts one empty open surface and tears it down, so a step is what
 * that layer costs on one open. Each rung contains the one above it. The panel
 * stays empty throughout, because the rows are already priced next door.
 *
 * The rungs mount open rather than clicking open. The click path is the same
 * tree through a state flip, and a mount reaches every rung — a bare
 * `motion.div` has no open state to flip. What this bench reads is the cost of
 * building the shell, not the cost of the flip that asks for it.
 *
 * `static menu` is the ablation the library already ships: a `Menu` with
 * `defaultOpen` and no `placement` renders its panel in the document flow.
 * `MenuContent` gates the portal on that, so the rung carries the `Density`,
 * the `PopoverPanel`, and the viewport with no portal, no positioned wrapper,
 * and no `autoUpdate`. Held beside `open dropdown`, the pair prices the whole
 * floating layer.
 *
 * The second scenario splits that floating layer, and it reads floating-ui
 * directly rather than through this package. Nothing here composes a `ui`
 * surface: the rungs mount the vendor's own `useFloating` against a plain
 * `div`, so what they price is the engine, not the wrapper. `autoUpdate` is
 * the rung to watch. It walks the scroll ancestors, and it starts a
 * `ResizeObserver` on both elements and an `IntersectionObserver` for the
 * layout-shift watch.
 */

import { autoUpdate, FloatingPortal, flip, offset, shift, useFloating } from '@floating-ui/react'
import { AnimatePresence, motion } from 'motion/react'
import { bench, describe } from 'vitest'
import { Menu, MenuContent, MenuTrigger } from '../../components/menu'
import { useScrollOverflow } from '../../hooks'
import { Density } from '../../primitives/density'
import { PopoverPanel } from '../../primitives/popover'
import { k } from '../../recipes/kata/popover'
import { reactHost, WINDOW } from './harness'

/** The classes `PopoverPanel` resolves for its default surface, hoisted so no rung re-merges them. */
const PANEL = `${k.panel.base} ${k.panel.surface}`

/** One iteration: mount the surface `render` builds, then tear the root down. */
function mount(render: () => React.ReactNode) {
	const mounted = reactHost()

	mounted.render(render())

	mounted.destroy()
}

/** The ladder, each rung one layer further from a plain element. */
const RUNGS: [string, () => React.ReactNode][] = [
	['1 · plain div', () => <div className={PANEL} />],
	// The same element under `motion`, with the panel's own enter/exit config.
	['2 · motion.div', () => <motion.div className={PANEL} {...k.panel.motion} />],
	[
		'3 · AnimatePresence + motion.div',
		() => (
			<AnimatePresence>
				<motion.div className={PANEL} {...k.panel.motion} />
			</AnimatePresence>
		),
	],
	// Adds the roving handler, the scroll-within helper, and the autofocus
	// effect. `autoFocus={false}` matches the dropdown, which leaves focus on
	// its trigger.
	[
		'4 · PopoverPanel',
		() => (
			<PopoverPanel role="menu" autoFocus={false} typeahead aria-label="Actions">
				{null}
			</PopoverPanel>
		),
	],
	// Adds the `Menu` root, the `Density`, and the viewport. The menu is
	// uncapped, so its overflow watch is gated off. No portal and no positioning:
	// the panel renders in place.
	[
		'5 · static menu (no portal, no positioning)',
		() => (
			<Menu defaultOpen>
				<MenuContent aria-label="Actions">{null}</MenuContent>
			</Menu>
		),
	],
	// Adds the floating layer: the portal, the presence wrapper, the positioned
	// wrapper, the middleware pass, and `autoUpdate`'s observers.
	[
		'6 · open dropdown (the real thing)',
		() => (
			<Menu placement="bottom-start" defaultOpen>
				<MenuTrigger>Options</MenuTrigger>

				<MenuContent>{null}</MenuContent>
			</Menu>
		),
	],
]

describe('menu · one empty open panel, layer by layer', () => {
	for (const [name, render] of RUNGS) {
		bench(
			name,
			() => {
				mount(render)
			},
			WINDOW.slow,
		)
	}
})

/** The middleware chain `useFloatingPanel` builds, so the split reads the real pass. */
const MIDDLEWARE = [offset(4), flip(), shift({ padding: 8 })]

/**
 * One floating panel through the vendor's own hook.
 *
 * @param auto - Wire `autoUpdate` as `whileElementsMounted`, as the package does.
 * @param portal - Teleport the panel through `FloatingPortal`.
 */
function Floating({ auto, portal }: { auto: boolean; portal: boolean }) {
	const { refs, floatingStyles } = useFloating({
		placement: 'bottom-start',
		whileElementsMounted: auto ? autoUpdate : undefined,
		middleware: MIDDLEWARE,
	})

	const panel = <div ref={refs.setFloating} style={floatingStyles} className={PANEL} />

	return (
		<>
			<button type="button" ref={refs.setReference}>
				Options
			</button>

			{portal ? <FloatingPortal>{panel}</FloatingPortal> : panel}
		</>
	)
}

/** The vendor ladder, each rung one part of the floating layer further on. */
const FLOATING_RUNGS: [string, () => React.ReactNode][] = [
	[
		'1 · button + plain div',
		() => (
			<>
				<button type="button">Options</button>

				<div className={PANEL} />
			</>
		),
	],
	['2 · useFloating, no autoUpdate', () => <Floating auto={false} portal={false} />],
	['3 · useFloating + autoUpdate', () => <Floating auto portal={false} />],
	['4 · + FloatingPortal', () => <Floating auto portal />],
]

describe('floating-ui · the layer split, vendor only', () => {
	for (const [name, render] of FLOATING_RUNGS) {
		bench(
			name,
			() => {
				mount(render)
			},
			WINDOW.slow,
		)
	}
})

/**
 * The static panel, split at the `Menu` root.
 *
 * `Menu root only` mounts the hook tree with no panel to build: the
 * disclosure, the roving handler, the interactions, and the three contexts.
 * `useFloatingDisclosure` calls `useFloating` whether or not the menu is a
 * dropdown, so this rung already carries that hook — it carries no positioning
 * pass, because neither element is registered. The step to the static panel is
 * therefore what `MenuContent` builds: the `Density`, the `PopoverPanel`, and
 * the viewport. The menu is uncapped, so the viewport's overflow watch is
 * gated off.
 */
const STATIC_RUNGS: [string, () => React.ReactNode][] = [
	['1 · Menu root only (no panel to build)', () => <Menu defaultOpen>{null}</Menu>],
	[
		'2 · + MenuContent, static',
		() => (
			<Menu defaultOpen>
				<MenuContent aria-label="Actions">{null}</MenuContent>
			</Menu>
		),
	],
]

describe('menu · the static panel, split', () => {
	for (const [name, render] of STATIC_RUNGS) {
		bench(
			name,
			() => {
				mount(render)
			},
			WINDOW.slow,
		)
	}
})

/** One viewport div carrying the overflow watch `MenuViewport` puts on a capped panel. */
function Watched() {
	const scrollOverflowRef = useScrollOverflow()

	return <div ref={scrollOverflowRef} className={PANEL} />
}

/**
 * What a capped panel's viewport pays around its rows, measured on a bare `div`.
 *
 * `useScrollOverflow` reads `scrollTop`, `clientHeight`, and `scrollHeight` as
 * soon as the ref attaches. Those reads force style and layout on a node the
 * browser has just inserted, inside the commit. The hook then starts a
 * `ResizeObserver` over the node and each of its children, a
 * `MutationObserver`, and a scroll listener.
 */
const VIEWPORT_RUNGS: [string, () => React.ReactNode][] = [
	['1 · plain div', () => <div className={PANEL} />],
	['2 · + useScrollOverflow', () => <Watched />],
	[
		'3 · + Density around it',
		() => (
			<Density space="md" size="md">
				<Watched />
			</Density>
		),
	],
]

describe('menu · the viewport around the panel', () => {
	for (const [name, render] of VIEWPORT_RUNGS) {
		bench(
			name,
			() => {
				mount(render)
			},
			WINDOW.slow,
		)
	}
})

/** Rows the overflow watch is measured over, matching the open bench's ladder. */
const WATCH_ROWS = [24, 64] as const

/** One viewport holding `count` rows, with the overflow watch or without it. */
function Rows({ count, watched }: { count: number; watched: boolean }) {
	const scrollOverflowRef = useScrollOverflow()

	const children = Array.from({ length: count }, (_, row) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: a fixed-length static list
		<div key={row} className="px-3 py-1.5">
			Option {row}
		</div>
	))

	return watched ? (
		<div ref={scrollOverflowRef} className={PANEL}>
			{children}
		</div>
	) : (
		<div className={PANEL}>{children}</div>
	)
}

/**
 * What the overflow watch costs per row.
 *
 * `useScrollOverflow` observes the node and every one of its children, so its
 * `ResizeObserver` takes one `observe` call per row. A panel therefore pays it
 * again for each row it holds, on top of the row itself. Held beside the plain
 * viewport of the same size, the pair says how much of the open bench's
 * per-row figure is the row and how much is the watch.
 */
describe('menu · the overflow watch, per row', () => {
	for (const count of WATCH_ROWS) {
		for (const watched of [false, true]) {
			bench(
				`${count} rows · ${watched ? 'watched' : 'plain'}`,
				() => {
					mount(() => <Rows count={count} watched={watched} />)
				},
				WINDOW.slow,
			)
		}
	}
})
