import type { ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { Badge, BadgeSkeleton } from '../../components/badge'
import { Button, ButtonSkeleton } from '../../components/button'
import { Card, CardBody, CardHeader, CardTitle } from '../../components/card'
import { Checkbox } from '../../components/checkbox'
import { Control, ControlSkeleton } from '../../components/control'
import { Fieldset, Label, Legend } from '../../components/fieldset'
import { Heading, HeadingSkeleton } from '../../components/heading'
import { Icon } from '../../components/icon'
import { Input } from '../../components/input'
import { List, ListItem } from '../../components/list'
import { LoadingDots, LoadingSpinner } from '../../components/loading'
import { NavItem } from '../../components/nav'
import { Placeholder } from '../../components/placeholder'
import { ProgressBar, ProgressGauge } from '../../components/progress'
import { Radio } from '../../components/radio'
import { Rating } from '../../components/rating'
import { SidebarItem } from '../../components/sidebar'
import { Slider, SliderSkeleton } from '../../components/slider'
import { Sparkline, SparklineSkeleton } from '../../components/sparkline'
import { Switch } from '../../components/switch'
import { Table, TableBody, TableCell, TableRow } from '../../components/table'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { Tree, TreeItem } from '../../components/tree'
import { writeRootDensity } from '../../core/density'
import { boxHeight, iconSize } from '../../core/density/geometry'
import { maxDepth } from '../../core/density/rungs'
import { SidebarLayout } from '../../layouts/sidebar'
import { ChatListItem } from '../../modules/chat'
import { Grid } from '../../modules/grid'
import { Option } from '../../primitives/option/option'
import { DensityProvider } from '../../providers/density'
import { attach, present, renderUI, screen } from '../helpers'

/**
 * A static leaf with no `size` follows the nearest density scope.
 *
 * Badge, Card, and Table read no context. Their `density-*` classes select the step in CSS from
 * the nearest `data-density` scope (packages/ui/tailwind.css). The innermost scope must win at
 * every depth. An explicit `size` makes the leaf its own scope, and a consumer `className` must
 * win over each step.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
const BADGE_FONT_PX = { sm: 14, md: 16, lg: 18 } as const

const CARD_PADDING_PX = { sm: 8, md: 12, lg: 16 } as const

const CELL_PADDING_PX = { sm: 4, md: 8, lg: 12 } as const

const badgeFont = (container: HTMLElement, text: string) => {
	const badge = present(
		[...container.querySelectorAll<HTMLElement>('[data-slot="badge"]')].find(
			(node) => node.textContent === text,
		),
		`badge ${text}`,
	)

	return Number.parseFloat(getComputedStyle(badge).fontSize)
}

/** Mounts the server markup of `element` with no hydration, for the current test. */
const mountMarkup = (element: ReactElement) => {
	const container = attach(document.createElement('div'))

	container.innerHTML = renderToStaticMarkup(element)

	return container
}

/**
 * The root element is the scope of the app: `AppearanceScript` writes the stored step on
 * `<html>` before the first paint. It ranks below each other scope and does not use one of the
 * ranked depths, so the trees keep each depth.
 */
describe('the root scope (real browser)', () => {
	afterEach(() => {
		writeRootDensity(document.documentElement, 'md')
	})

	it('gives its step to a leaf outside each other scope', () => {
		writeRootDensity(document.documentElement, 'sm')

		const { container } = renderUI(<Badge>x</Badge>)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.sm)
	})

	it('loses to a scope under it', () => {
		writeRootDensity(document.documentElement, 'sm')

		const { container } = renderUI(
			<Card size="lg">
				<Badge>x</Badge>
			</Card>,
		)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.lg)
	})

	it('keeps each ranked depth for the scopes under it', () => {
		writeRootDensity(document.documentElement, 'lg')

		// The ranked maximum of scopes under the root: `lg` cards around one `sm` card. If the root
		// took a depth, the last `lg` card would tie with the `sm` card at the last depth, and the
		// later `lg` rule would win.
		const nest = (depth: number): ReactElement =>
			depth === 1 ? (
				<Card size="sm">
					<Badge>x</Badge>
				</Card>
			) : (
				<Card size="lg">{nest(depth - 1)}</Card>
			)

		const { container } = renderUI(nest(maxDepth))

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.sm)
	})
})

/**
 * A control slot writes `data-density="slot"` and no step. It is a scope one step below the scope
 * above it, so the slot contents step down with no step in JS. A scope inside the slot wins over
 * it, and the slot counts as one depth.
 */
describe('the relative slot scope (real browser)', () => {
	afterEach(() => {
		writeRootDensity(document.documentElement, 'md')
	})

	it('steps its contents one step below an explicit scope', () => {
		const { container } = renderUI(
			<Card size="lg">
				<span data-density="slot">
					<Badge>x</Badge>
				</span>
			</Card>,
		)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.md)
	})

	it('steps its contents one step below the root', () => {
		writeRootDensity(document.documentElement, 'md')

		const { container } = renderUI(
			<span data-density="slot">
				<Badge>x</Badge>
			</span>,
		)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.sm)
	})

	it('steps below md when the root has no step', () => {
		const { container } = renderUI(
			<span data-density="slot">
				<Badge>x</Badge>
			</span>,
		)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.sm)
	})

	it('takes xs below sm, the smallest step', () => {
		writeRootDensity(document.documentElement, 'sm')

		const { container } = renderUI(
			<span data-density="slot">
				<Badge>x</Badge>
			</span>,
		)

		expect(badgeFont(container, 'x')).toBe(12)
	})

	it('gives its own step to the slot element', () => {
		const { container } = renderUI(
			<Card size="lg">
				<Badge data-density="slot">x</Badge>
			</Card>,
		)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.md)
	})

	it('loses to a scope inside it', () => {
		const { container } = renderUI(
			<Card size="sm">
				<span data-density="slot">
					<Badge size="lg">x</Badge>
				</span>
			</Card>,
		)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.lg)
	})

	it('reads the nearest scope above it, not an outer one', () => {
		writeRootDensity(document.documentElement, 'sm')

		const { container } = renderUI(
			<Card size="lg">
				<span data-density="slot">
					<Badge>x</Badge>
				</span>
			</Card>,
		)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.md)
	})
})

/**
 * A control has an `xl` step of its own. Its slot is a scope one step below it, so the slot of an
 * `xl` control takes `lg`, and the slot of an `lg` control takes `md`.
 */
describe('a control slot in an xl scope (real browser)', () => {
	afterEach(() => {
		writeRootDensity(document.documentElement, 'md')
	})

	const icon = (
		<Icon
			icon={
				<svg viewBox="0 0 1 1" aria-hidden="true">
					<title>icon</title>
				</svg>
			}
		/>
	)

	/** The height of the frame and the size of the prefix icon of an Input. */
	const measure = (container: HTMLElement) => {
		const one = (selector: string) => present(container.querySelector(selector), selector)

		return {
			frame: one('[data-slot="control-frame"]').getBoundingClientRect().height,
			affixIcon: one('[data-slot="prefix"] [data-slot="icon"]').getBoundingClientRect().height,
		}
	}

	const control = <Input aria-label="Search" prefix={icon} />

	it('gives the slot of an xl scope the step below xl', () => {
		expect(measure(mountMarkup(<div data-density="xl">{control}</div>))).toEqual({
			frame: boxHeight('xl'),
			affixIcon: iconSize('lg'),
		})

		expect(measure(mountMarkup(<div data-density="lg">{control}</div>))).toEqual({
			frame: boxHeight('lg'),
			affixIcon: iconSize('md'),
		})
	})

	it('gives the slot under an xl root the step below xl', () => {
		writeRootDensity(document.documentElement, 'xl')

		expect(measure(mountMarkup(control))).toEqual({
			frame: boxHeight('xl'),
			affixIcon: iconSize('lg'),
		})
	})
})

/**
 * A control reads no density context, so its server markup is the same at each step. The root
 * scope that `AppearanceScript` writes before the first paint then gives the stored step to the
 * markup with no hydration.
 */
describe('controls at the first paint (real browser)', () => {
	afterEach(() => {
		writeRootDensity(document.documentElement, 'md')
	})

	const px = (element: Element | null, property: 'fontSize' | 'paddingInlineStart') =>
		Number.parseFloat(getComputedStyle(present(element, 'element'))[property])

	it('sizes an unsized input at the step of the root', () => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(<Input aria-label="Name" />)

		const input = container.querySelector('[data-slot="input"]')

		expect(px(input, 'fontSize')).toBe(14)

		expect(px(input, 'paddingInlineStart')).toBe(9)
	})

	it('lets an explicit size win over the root', () => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(<Input aria-label="Name" size="lg" />)

		expect(px(container.querySelector('[data-slot="input"]'), 'fontSize')).toBe(18)
	})

	it('steps the prefix one step below the input and pads it at the input step', () => {
		writeRootDensity(document.documentElement, 'lg')

		const container = mountMarkup(<Input aria-label="Name" prefix={<Badge>x</Badge>} />)

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX.md)

		// A text affix pads at the `px` of the input; the badge constant is 2.
		expect(px(container.querySelector('[data-slot="prefix"]'), 'paddingInlineStart')).toBe(7)
	})

	it('sizes an unsized button at the step of the root', () => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(<Button>Save</Button>)

		expect(px(container.querySelector('[data-slot="button"]'), 'fontSize')).toBe(14)
	})

	it('steps a button in an input suffix one step below the input', () => {
		writeRootDensity(document.documentElement, 'lg')

		const container = mountMarkup(<Input aria-label="Name" suffix={<Button>Go</Button>} />)

		expect(px(container.querySelector('[data-slot="button"]'), 'fontSize')).toBe(16)
	})

	it.each<[string, ReactElement, string]>([
		['the root', <Input key="i" aria-label="Name" />, '9px'],
		['an explicit size', <Input key="i" aria-label="Name" size="sm" />, '5px'],
	])('rounds the inset fill of the input frame at the step of %s', (_, element, radius) => {
		writeRootDensity(document.documentElement, 'lg')

		// The fill is the `::before` of the frame. Its radius is the frame radius less the ring.
		const container = mountMarkup(element)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'frame')

		expect(getComputedStyle(frame, '::before').borderTopLeftRadius).toBe(radius)
	})

	it('sizes the unsized toggles at the step of the root', () => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(
			<>
				<Checkbox aria-label="Agree" />
				<Radio aria-label="Pick" />
				<Switch aria-label="On" />
			</>,
		)

		const widths = [...container.querySelectorAll('[data-slot="control"]')].map(
			(control) => control.getBoundingClientRect().width,
		)

		expect(widths).toEqual([18, 18, 36])
	})

	it('sizes the native slider track at an explicit size of the slider', () => {
		writeRootDensity(document.documentElement, 'sm')

		// The track is a pseudo-element, so its classes name the steps before it and keep the rung
		// of the input itself. The content box of the input is the height of its track.
		const container = mountMarkup(<Slider aria-label="Volume" size="lg" defaultValue={50} />)

		const slider = present(container.querySelector('[data-slot="slider"]'), 'slider')

		const { paddingTop, paddingBottom } = getComputedStyle(slider)

		const track =
			slider.getBoundingClientRect().height -
			Number.parseFloat(paddingTop) -
			Number.parseFloat(paddingBottom)

		expect([paddingTop, track]).toEqual(['20px', 8])
	})

	it('sizes the rating and the progress indicators at the step of the root', () => {
		writeRootDensity(document.documentElement, 'lg')

		const container = mountMarkup(
			<>
				<Rating aria-label="Score" readOnly value={3} />
				<ProgressBar aria-label="Upload" value={40} />
				<ProgressGauge aria-label="Upload" value={40} />
			</>,
		)

		const box = (slot: string) =>
			present(container.querySelector(`[data-slot="${slot}"]`), slot).getBoundingClientRect()

		expect(box('rating-star').width).toBe(22)

		expect(box('progress-bar').height).toBe(16)

		expect(box('progress-gauge').width).toBe(80)
	})

	it('pads a text prefix at the px of the input', () => {
		writeRootDensity(document.documentElement, 'lg')

		const container = mountMarkup(<Input aria-label="Name" prefix="$" />)

		expect(px(container.querySelector('[data-slot="prefix"]'), 'paddingInlineStart')).toBe(13)
	})
})

describe('items and slots at the first paint (real browser)', () => {
	afterEach(() => {
		writeRootDensity(document.documentElement, 'md')
	})

	type Property = 'fontSize' | 'paddingTop' | 'paddingInlineStart' | 'marginInlineEnd' | 'width'

	const px = (element: Element | null, property: Property) =>
		Number.parseFloat(getComputedStyle(present(element, 'element'))[property])

	const icon = (
		<Icon
			icon={
				<svg viewBox="0 0 1 1" aria-hidden="true">
					<title>icon</title>
				</svg>
			}
		/>
	)

	it('sizes an unsized sidebar item and its icon at the step of the root', () => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(<SidebarItem icon={icon}>Home</SidebarItem>)

		const inner = container.querySelector('[data-slot="sidebar-item-inner"]')

		expect(px(inner, 'fontSize')).toBe(14)

		// The row padding wins over the label padding of the inner Button.
		expect(px(inner, 'paddingTop')).toBe(6)

		expect(px(container.querySelector('[data-slot="icon"]'), 'width')).toBe(18)
	})

	it('sizes an unsized sidebar item and its icon at xs under an xs root', () => {
		writeRootDensity(document.documentElement, 'xs')

		const container = mountMarkup(
			<SidebarItem icon={icon}>
				<LoadingSpinner label="Loading" />
				Home
			</SidebarItem>,
		)

		const inner = container.querySelector('[data-slot="sidebar-item-inner"]')

		expect(px(inner, 'fontSize')).toBe(12)

		expect(px(inner, 'paddingTop')).toBe(4)

		expect(px(container.querySelector('[data-slot="icon"]'), 'width')).toBe(16)

		expect(px(container.querySelector('[data-slot="loading-spinner"]'), 'width')).toBe(16)
	})

	it.each([
		['xs', 16],
		['sm', 18],
		['md', 20],
		['lg', 22],
		['xl', 24],
	] as const)('sizes a spinner in a %s sidebar item as its icon', (size, width) => {
		const container = mountMarkup(
			<SidebarItem size={size} icon={icon}>
				<LoadingSpinner label="Loading" />
				Home
			</SidebarItem>,
		)

		expect(px(container.querySelector('[data-slot="loading-spinner"]'), 'width')).toBe(width)

		expect(px(container.querySelector('[data-slot="icon"]'), 'width')).toBe(width)
	})

	it('sizes an unsized nav item and its icon at xs under an xs root', () => {
		writeRootDensity(document.documentElement, 'xs')

		const container = mountMarkup(<NavItem icon={icon}>Home</NavItem>)

		const inner = container.querySelector('[data-slot="nav-item-inner"]')

		expect(px(inner, 'fontSize')).toBe(12)

		expect(px(inner, 'paddingTop')).toBe(4)

		expect(px(container.querySelector('[data-slot="icon"]'), 'width')).toBe(16)
	})

	it('sizes an unsized option and its icon at xs under an xs root', () => {
		writeRootDensity(document.documentElement, 'xs')

		const container = mountMarkup(
			<Option selected={false} onSelect={() => {}}>
				{icon}
				Option
			</Option>,
		)

		expect(px(container.querySelector('[role="option"]'), 'fontSize')).toBe(12)

		expect(px(container.querySelector('[data-slot="icon"]'), 'width')).toBe(16)
	})

	it('lets an explicit size of a sidebar item win over the root', () => {
		writeRootDensity(document.documentElement, 'lg')

		const container = mountMarkup(<SidebarItem size="sm">Home</SidebarItem>)

		expect(px(container.querySelector('[data-slot="sidebar-item-inner"]'), 'fontSize')).toBe(14)
	})

	it('steps a sidebar item suffix one step below the item and insets it at the item step', () => {
		writeRootDensity(document.documentElement, 'lg')

		const container = mountMarkup(<SidebarItem suffix={<Button>Edit</Button>}>Home</SidebarItem>)

		expect(px(container.querySelector('[data-slot="button"]'), 'fontSize')).toBe(16)

		expect(
			px(container.querySelector('[data-slot="sidebar-item-suffix"]'), 'marginInlineEnd'),
		).toBe(10)
	})

	it('steps the chat list item actions one step below the root', () => {
		writeRootDensity(document.documentElement, 'lg')

		const container = mountMarkup(<ChatListItem title="Chat" actions={<Button>Delete</Button>} />)

		expect(px(container.querySelector('[data-slot="button"]'), 'fontSize')).toBe(16)
	})

	it.each<[string, ReactElement, number, number]>([
		[
			'the root',
			<Tree key="t" aria-label="Files">
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
			14,
			22,
		],
		[
			'an explicit size',
			<Tree key="t" aria-label="Files" size="lg">
				<TreeItem label="Parent" defaultOpen>
					<TreeItem label="Child" />
				</TreeItem>
			</Tree>,
			18,
			34,
		],
	])('sizes and indents a tree at the step of %s', (_, element, font, indent) => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(element)

		expect(px(container.querySelector('[data-slot="tree-item-content"]'), 'fontSize')).toBe(font)

		expect(px(container.querySelector('[data-slot="tree-group"]'), 'paddingInlineStart')).toBe(
			indent,
		)
	})
})

describe('the sparkline at the first paint (real browser)', () => {
	afterEach(() => {
		writeRootDensity(document.documentElement, 'md')
	})

	const box = (element: Element | null) => {
		const { width, height } = present(element, 'element').getBoundingClientRect()

		return [width, height]
	}

	it.each<[string, ReactElement, number[]]>([
		['the root', <Sparkline key="s" data={[1, 3, 2]} aria-label="Trend" />, [72, 24]],
		[
			'an explicit size',
			<Sparkline key="s" data={[1, 3, 2]} size="lg" aria-label="Trend" />,
			[120, 40],
		],
	])('sizes the box at 3:1 at the step of %s', (_, element, expected) => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(element)

		expect(box(container.querySelector('svg'))).toEqual(expected)
	})

	it('sizes the skeleton to the box of the sparkline at each step', () => {
		for (const step of ['sm', 'md', 'lg'] as const) {
			writeRootDensity(document.documentElement, step)

			const container = mountMarkup(
				<>
					<Sparkline data={[1, 3, 2]} aria-label="Trend" />
					<SparklineSkeleton />
				</>,
			)

			expect(box(container.querySelector('[data-slot="placeholder"]'))).toEqual(
				box(container.querySelector('svg')),
			)

			container.remove()
		}
	})
})

describe('the grid at the first paint (real browser)', () => {
	afterEach(() => {
		writeRootDensity(document.documentElement, 'md')
	})

	const columns = [{ id: 'name', title: 'Name', cell: (row: { name: string }) => row.name }]

	const rows = [{ name: 'Ada' }]

	it.each<[string, ReactElement, number]>([
		[
			'the root',
			<Grid key="g" columns={columns} rows={rows} getKey={(row) => row.name} />,
			CELL_PADDING_PX.sm,
		],
		[
			'an explicit density',
			<Grid key="g" columns={columns} rows={rows} getKey={(row) => row.name} size="lg" />,
			CELL_PADDING_PX.lg,
		],
	])('pads the cells at the step of %s', (_, element, padding) => {
		writeRootDensity(document.documentElement, 'sm')

		const container = mountMarkup(element)

		const cell = present(container.querySelector('tbody td'), 'cell')

		expect(Number.parseFloat(getComputedStyle(cell).paddingInlineStart)).toBe(padding)
	})
})

describe('density scopes on static leaves (real browser)', () => {
	it.each([
		['compact', 14],
		['snug', 16],
		['loose', 18],
	] as const)('sets a legend in the text of a %s provider', (density, font) => {
		renderUI(
			<DensityProvider density={density}>
				<Fieldset>
					<Legend>Shipping</Legend>
				</Fieldset>
			</DensityProvider>,
		)

		expect(Number.parseFloat(getComputedStyle(screen.getByText('Shipping')).fontSize)).toBe(font)
	})

	it.each<[string, () => ReactElement, number]>([
		[
			'follows a compact provider',
			() => (
				<DensityProvider density="compact">
					<LoadingDots />
				</DensityProvider>
			),
			6,
		],
		['takes md outside a scope', () => <LoadingDots />, 8],
		[
			'follows a loose provider',
			() => (
				<DensityProvider density="loose">
					<LoadingDots />
				</DensityProvider>
			),
			10,
		],
		[
			'gives an xl scope the xl dot',
			() => (
				<div data-density="xl">
					<LoadingDots />
				</div>
			),
			12,
		],
	])('a loading dot %s', (_name, element, width) => {
		const { container } = renderUI(element())

		const dot = present(container.querySelector('[data-slot="loading-dot"]'), 'loading dot')

		expect(Number.parseFloat(getComputedStyle(dot).width)).toBe(width)
	})

	it.each<[string, () => ReactElement, keyof typeof BADGE_FONT_PX]>([
		['takes md outside a scope', () => <Badge>x</Badge>, 'md'],
		[
			'follows a compact provider',
			() => (
				<DensityProvider density="compact">
					<Badge>x</Badge>
				</DensityProvider>
			),
			'sm',
		],
		[
			'follows a sized card inside a compact provider',
			() => (
				<DensityProvider density="compact">
					<Card size="lg">
						<Badge>x</Badge>
					</Card>
				</DensityProvider>
			),
			'lg',
		],
		[
			'follows an md card that resets a compact provider',
			() => (
				<DensityProvider density="compact">
					<Card size="md">
						<Badge>x</Badge>
					</Card>
				</DensityProvider>
			),
			'md',
		],
		[
			'keeps an explicit size inside a scope',
			() => (
				<DensityProvider density="compact">
					<Badge size="lg">x</Badge>
				</DensityProvider>
			),
			'lg',
		],
	])('a badge %s', (_name, ui, step) => {
		const { container } = renderUI(ui())

		expect(badgeFont(container, 'x')).toBe(BADGE_FONT_PX[step])
	})

	it('pads an unsized card at the step of the outer card', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<Card size="sm">
					<Card>inner</Card>
				</Card>
			</DensityProvider>,
		)

		const inner = present(
			container.querySelectorAll<HTMLElement>('[data-slot="card"]')[1],
			'inner card',
		)

		expect(Number.parseFloat(getComputedStyle(inner).paddingTop)).toBe(CARD_PADDING_PX.sm)
	})

	it.each([
		['compact', 'sm'],
		['snug', 'md'],
		['loose', 'lg'],
	] as const)('pads the cells of a table with no size under a %s provider', (density, step) => {
		const { container } = renderUI(
			<DensityProvider density={density}>
				<Table>
					<TableBody>
						<TableRow>
							<TableCell>cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</DensityProvider>,
		)

		const cell = present(container.querySelector<HTMLElement>('td'), 'cell')

		expect(Number.parseFloat(getComputedStyle(cell).paddingLeft)).toBe(CELL_PADDING_PX[step])
	})
	it('pads the header of an unsized card at the step of the outer card', () => {
		// The body follows the header, because a header with no sibling after it adds no pad.
		const { container } = renderUI(
			<Card size="lg">
				<Card>
					<CardHeader>header</CardHeader>
					<CardBody>body</CardBody>
				</Card>
			</Card>,
		)

		const header = present(
			container.querySelector<HTMLElement>('[data-slot="card-header"]'),
			'card header',
		)

		expect(Number.parseFloat(getComputedStyle(header).paddingBottom)).toBe(CARD_PADDING_PX.lg)
	})

	it('lets a consumer className win over each step, inside a scope and on a pinned leaf', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Badge className="text-2xl">in scope</Badge>
				<Badge size="lg" className="text-2xl">
					pinned
				</Badge>
			</DensityProvider>,
		)

		expect(badgeFont(container, 'in scope')).toBe(24)

		expect(badgeFont(container, 'pinned')).toBe(24)
	})

	it.each([
		['takes the step of the scope', undefined, 28],
		['keeps an explicit size', 'lg', 32],
	] as const)('a badge skeleton %s', (_name, size, height) => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<BadgeSkeleton size={size} />
			</DensityProvider>,
		)

		const skeleton = present(
			container.querySelector<HTMLElement>('[data-slot="placeholder"]'),
			'badge skeleton',
		)

		expect(Number.parseFloat(getComputedStyle(skeleton).height)).toBe(height)
	})

	it.each([
		['takes md outside a scope', undefined, undefined, 30],
		['follows a compact provider', 'compact', undefined, 24],
		['follows a loose provider', 'loose', undefined, 36],
		['keeps an explicit size', 'compact', 'lg', 36],
	] as const)('a level 1 heading %s', (_name, density, size, px) => {
		const heading = <Heading size={size}>Title</Heading>

		const { container } = renderUI(
			density ? <DensityProvider density={density}>{heading}</DensityProvider> : heading,
		)

		const el = present(container.querySelector<HTMLElement>('h1'), 'heading')

		expect(Number.parseFloat(getComputedStyle(el).fontSize)).toBe(px)
	})

	it.each([
		['takes the step of the scope', undefined, 28],
		['keeps an explicit size', 'lg', 36],
	] as const)('a level 1 heading skeleton %s', (_name, size, height) => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<HeadingSkeleton size={size} />
			</DensityProvider>,
		)

		const skeleton = present(
			container.querySelector<HTMLElement>('[data-slot="placeholder"]'),
			'heading skeleton',
		)

		expect(Number.parseFloat(getComputedStyle(skeleton).height)).toBe(height)
	})

	it.each([
		['takes the step of the scope', undefined, { height: 32, width: 80 }],
		['keeps an explicit size', 'lg', { height: 44, width: 112 }],
	] as const)('a button skeleton %s', (_name, size, box) => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<ButtonSkeleton size={size} />
			</DensityProvider>,
		)

		const skeleton = present(
			container.querySelector<HTMLElement>('[data-slot="placeholder"]'),
			'button skeleton',
		)

		const style = getComputedStyle(skeleton)

		expect({
			height: Number.parseFloat(style.height),
			width: Number.parseFloat(style.width),
		}).toStrictEqual(box)
	})

	it('steps the margin of a slider skeleton and the minimum width of a grouped control skeleton', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<SliderSkeleton />
				<ControlSkeleton data-group="" />
			</DensityProvider>,
		)

		const [slider, control] = container.querySelectorAll<HTMLElement>('[data-slot="placeholder"]')

		expect(Number.parseFloat(getComputedStyle(present(slider, 'slider')).marginTop)).toBe(20)

		expect(Number.parseFloat(getComputedStyle(present(control, 'control')).minWidth)).toBe(128)
	})

	it('pads the cells of a table at its size inside another scope', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Table size="lg">
					<TableBody>
						<TableRow>
							<TableCell>cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</DensityProvider>,
		)

		const cell = present(container.querySelector<HTMLElement>('td'), 'cell')

		expect(Number.parseFloat(getComputedStyle(cell).paddingLeft)).toBe(CELL_PADDING_PX.lg)
	})
	it('keeps the Placeholder default height below a step and a plain class', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Placeholder />
				<Placeholder className="h-8" />
			</DensityProvider>,
		)

		const heights = Array.from(
			container.querySelectorAll<HTMLElement>('[data-slot="placeholder"]'),
			(node) => Number.parseFloat(getComputedStyle(node).height),
		)

		expect(heights).toEqual([16, 32])
	})

	it.each([
		['follows a compact provider', undefined, 14],
		['follows a sized control inside a compact provider', 'lg', 18],
	] as const)('a label %s', (_name, size, font) => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<Control size={size}>
					<Label>label</Label>
				</Control>
			</DensityProvider>,
		)

		const label = present(container.querySelector<HTMLElement>('[data-slot="label"]'), 'label')

		expect(Number.parseFloat(getComputedStyle(label).fontSize)).toBe(font)
	})
})

/**
 * A family that reads no context follows the nearest scope. `floating-ui/density-portal.test.tsx`
 * holds the families in a portal, which needs the real floating engine.
 */
describe('density scopes on families (real browser)', () => {
	const fontOf = (node: HTMLElement) => Number.parseFloat(getComputedStyle(node).fontSize)

	it('sizes an unsized card title at the step of its card', () => {
		renderUI(
			<Card size="lg">
				<CardTitle>Title</CardTitle>
			</Card>,
		)

		expect(fontOf(screen.getByText('Title'))).toBe(20)
	})

	it('pads a list row at the step of a compact provider', () => {
		const { container } = renderUI(
			<DensityProvider density="compact">
				<List items={[{ id: 'a' }]} getKey={(item) => item.id}>
					{(item) => <ListItem>{item.id}</ListItem>}
				</List>
			</DensityProvider>,
		)

		const row = present(container.querySelector<HTMLElement>('[data-slot="list-item"]'), 'row')

		expect(Number.parseFloat(getComputedStyle(row).paddingTop)).toBe(CARD_PADDING_PX.sm)
	})

	it('sizes the check of a selected option at the step of its scope', () => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<Option selected onSelect={() => {}}>
					Option
				</Option>
			</DensityProvider>,
		)

		const check = present(container.querySelector<SVGElement>('[data-slot="icon"]'), 'check')

		expect(Number.parseFloat(getComputedStyle(check).width)).toBe(22)
	})

	it.each([
		['follows a compact provider', undefined, 'tab', 14],
		['takes the explicit size of its group', 'lg', 'tab', 18],
		['sizes a segment item one text step below a tab', undefined, 'segment', 12],
	] as const)('a tab %s', (_name, size, variant, font) => {
		renderUI(
			<DensityProvider density="compact">
				<Tabs defaultValue="a" size={size} variant={variant}>
					<TabList aria-label="Sections">
						<Tab value="a">A</Tab>
					</TabList>
				</Tabs>
			</DensityProvider>,
		)

		expect(Number.parseFloat(getComputedStyle(screen.getByRole('tab')).fontSize)).toBe(font)
	})

	it('pads the sidebar layout content at the step of a compact provider', () => {
		renderUI(
			<DensityProvider density="compact">
				<SidebarLayout sidebar={<div>side</div>}>body</SidebarLayout>
			</DensityProvider>,
		)

		// The content region holds the children as its own text.
		const content = screen.getByText('body')

		expect(Number.parseFloat(getComputedStyle(content).paddingLeft)).toBe(16)
	})
})
