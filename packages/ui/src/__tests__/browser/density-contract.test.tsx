import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, onTestFinished } from 'vitest'
import { cdp, page, server } from 'vitest/browser'
import { Dialog, DialogBody, DialogPanel } from '../../components/dialog'
import { Input } from '../../components/input'
import { type DensityStep, densitySteps, writeRootDensity } from '../../core/density'
import { DensityProvider } from '../../providers/density'
import { dan } from '../../recipes/kiso/dan'
import { attach, densityStepOf, getSlot, present, renderUI } from '../helpers'

/**
 * The contract of the density scopes, in computed style.
 *
 * Each case puts a stepped class under a chain of `data-density` scopes and reads the computed
 * value. The `scopeStepOf` oracle (`densityStepOf`) gives the step that the case expects, and the
 * case also states that step. Thus a case holds the CSS and the oracle to one step.
 *
 * The cases cover the parts of the contract that `density-scope.test.tsx` does not hold: a root
 * change on a mounted tree, a slot in a slot, the `xs`, `sm`, and `md` hosts of a slot, a scope
 * deeper than two, a pseudo-element, two stepped classes on one property, the lists of three values
 * that the docs and `apps/places` use, the inset of an open dialog, and two deliberate forms (a
 * group of `space-x` that reads `density-set`, and a rem stop). A case that
 * `density-scope.test.tsx` holds is not repeated here.
 *
 * A stepped class takes its value from inherited custom properties that each scope sets, so it
 * gives the step of the nearest scope at each depth, and on a pseudo-element. The cases of a
 * deeper scope and of a stepped `::before` hold that no limit of depth applies, and that a
 * pseudo-element inherits the step of its element. A case of a computed value has a case of the
 * oracle step for the same row, so a wrong step or chain in a table shows in the oracle case.
 *
 * No case holds the thumb of the native slider. `getComputedStyle(input, '::-webkit-slider-thumb')`
 * gives the values of the input, not of the thumb. The thumb also does not change the layout of
 * the input: with `appearance: none`, the box height and the `scrollHeight` of the input are the
 * padding and the track at each step. Thus a change to the thumb shows in no case. The track has a
 * case in `density-scope.test.tsx`, which reads it as the content box of the input.
 *
 * Each block sets its width, because the dialog inset reads the `max-sm` breakpoint. The block of
 * the dialog from `sm` up sets a desktop width, and each other block a phone width. No other case
 * reads the width.
 */

/** A density scope: a step, or a control slot. */
type Scope = DensityStep | 'slot'

/** The class of the probe: an inline padding inside a 1px ring. */
const PROBE = 'density-px-ring-[1.5,2,2.5,3,3.5]'

/** The inline padding that {@link PROBE} gives at each step: the stop less the 1px ring. */
const PROBE_PX = { xs: 5, sm: 7, md: 9, lg: 11, xl: 13 } as const satisfies Record<
	DensityStep,
	number
>

/** The radius inside a 1px ring of a control frame at each step: `rounded-ring-[1,1.5,2,2.5,3]`. */
const RING_RADIUS_PX = { xs: 3, sm: 5, md: 7, lg: 9, xl: 11 } as const satisfies Record<
	DensityStep,
	number
>

/**
 * Puts a chain of scopes on the body for the current test, the outer scope first. It returns the
 * innermost scope, or the container when the chain is empty.
 */
function nest(chain: readonly Scope[]): HTMLElement {
	let parent: HTMLElement = attach(document.createElement('div'))

	for (const scope of chain) {
		const element = document.createElement('div')

		element.dataset.density = scope

		parent.append(element)

		parent = element
	}

	return parent
}

/**
 * Puts a probe element with `className` in a chain of scopes, and returns the probe. A `self` scope
 * goes on the probe itself.
 */
function probe(chain: readonly Scope[], className = PROBE, self?: Scope): HTMLElement {
	const element = document.createElement('div')

	element.className = className

	if (self) element.dataset.density = self

	nest(chain).append(element)

	return element
}

/** The computed value of a length property, in pixels. */
function px(element: Element, property: 'paddingBottom' | 'paddingLeft' | 'paddingTop' | 'width') {
	return Number.parseFloat(getComputedStyle(element)[property])
}

/** The step of the oracle and the padding of the probe, for one assertion. */
function probeStep(element: Element) {
	return { step: densityStepOf(element), padding: px(element, 'paddingLeft') }
}

/** The step of the oracle and the padding that {@link PROBE} gives at `step`. */
function atStep(step: DensityStep) {
	return { step, padding: PROBE_PX[step] }
}

/**
 * Writes `step` on the root element for the current test. The root class goes back to its value
 * before the test when the test finishes.
 */
function holdRoot(step: DensityStep) {
	const root = document.documentElement

	const before = root.className

	writeRootDensity(root, step)

	onTestFinished(() => {
		root.className = before
	})
}

/**
 * The root element is the scope of the app. Its class gives each element outside each other scope
 * its step, and a scope under it wins.
 */
describe('the root scope (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	it('follows a change of the root step on a mounted tree', () => {
		holdRoot('md')

		const element = probe([])

		const slot = probe(['slot'])

		const slotInSlot = probe(['slot', 'slot'])

		const slotInScope = probe(['lg', 'slot'])

		const read = () => [element, slot, slotInSlot, slotInScope].map(probeStep)

		const steps: [DensityStep, DensityStep[]][] = [
			['lg', ['lg', 'md', 'md', 'md']],
			['sm', ['sm', 'xs', 'xs', 'md']],
			['xs', ['xs', 'xs', 'xs', 'md']],
			['xl', ['xl', 'lg', 'lg', 'md']],
			['md', ['md', 'sm', 'sm', 'md']],
		]

		for (const [root, expected] of steps) {
			writeRootDensity(document.documentElement, root)

			expect(read()).toEqual(expected.map(atStep))
		}
	})
})

/**
 * A control slot (`data-density="slot"`) is one step below the scope above it. No slot takes `xl`,
 * and a slot under `xs` stays `xs`. A slot in a slot steps one time, not two. A scope in a slot
 * wins over the slot.
 */
describe('the slot scope (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	// `density-scope.test.tsx` holds a slot under `lg` and under `xl`.
	it.each<[DensityStep, DensityStep]>([
		['xs', 'xs'],
		['sm', 'xs'],
		['md', 'sm'],
	])('steps a slot under an %s scope to %s', (host, slot) => {
		expect(probeStep(probe([host, 'slot']))).toEqual(atStep(slot))
	})

	it.each<[DensityStep, DensityStep]>([
		['xs', 'xs'],
		['sm', 'xs'],
		['md', 'sm'],
		['lg', 'md'],
		['xl', 'lg'],
	])('steps a slot in a slot under an %s scope one time, to %s', (host, slot) => {
		expect(probeStep(probe([host, 'slot', 'slot']))).toEqual(atStep(slot))
	})

	it.each<[DensityStep, DensityStep]>([
		['sm', 'xs'],
		['md', 'sm'],
		['lg', 'md'],
	])('steps a slot in a slot under the %s root one time, to %s', (root, slot) => {
		holdRoot(root)

		expect(probeStep(probe(['slot', 'slot']))).toEqual(atStep(slot))
	})

	it('steps three slots in a chain one time', () => {
		expect(probeStep(probe(['lg', 'slot', 'slot', 'slot']))).toEqual(atStep('md'))
	})

	// `density-scope.test.tsx` holds a slot element under `lg`.
	it.each<[DensityStep, DensityStep]>([
		['xs', 'xs'],
		['xl', 'lg'],
	])('gives the slot step to a slot element under an %s scope', (host, slot) => {
		expect(probeStep(probe([host], PROBE, 'slot'))).toEqual(atStep(slot))
	})

	it.each<DensityStep>(['xs', 'lg'])('lets an xl element in a slot under %s keep xl', (host) => {
		expect(probeStep(probe([host, 'slot'], PROBE, 'xl'))).toEqual(atStep('xl'))
	})

	it('sizes an icon through a child variant at the step of the icon', () => {
		// The parent writes the size; each icon takes the size of its own step.
		const icons = (parent: HTMLElement, scopes: (Scope | undefined)[]) =>
			scopes.map((scope) => {
				const icon = document.createElement('span')

				icon.className = 'block'

				icon.dataset.slot = 'icon'

				if (scope) icon.dataset.density = scope

				parent.append(icon)

				return icon
			})

		const parent = (chain: readonly Scope[], self?: Scope) => {
			const element = document.createElement('div')

			element.className = '*:data-[slot=icon]:density-size-[4,4.5,5,5.5,6]'

			if (self) element.dataset.density = self

			nest(chain).append(element)

			return element
		}

		const read = (icon: HTMLElement) => ({ step: densityStepOf(icon), width: px(icon, 'width') })

		const ICON_PX = { xs: 16, sm: 18, md: 20, lg: 22, xl: 24 } as const

		const at = (step: DensityStep) => ({ step, width: ICON_PX[step] })

		expect(icons(parent(['lg']), ['xs', undefined, 'slot']).map(read)).toEqual([
			at('xs'),
			at('lg'),
			at('md'),
		])

		expect(icons(parent(['lg', 'slot']), ['xl', undefined]).map(read)).toEqual([at('xl'), at('md')])

		expect(icons(parent(['lg'], 'sm'), [undefined]).map(read)).toEqual([at('sm')])
	})
})

/**
 * A stepped class takes the step of the nearest scope at each depth.
 */
describe('scopes deeper than two (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	it('gives lg › sm › xl the step of the nearest scope', () => {
		expect(probeStep(probe(['lg', 'sm', 'xl']))).toEqual(atStep('xl'))
	})

	const deep: [string, Scope[], DensityStep, Scope?][] = [
		['lg › sm › xl › slot', ['lg', 'sm', 'xl', 'slot'], 'lg'],
		['lg › sm › xl › md', ['lg', 'sm', 'xl', 'md'], 'md'],
		['sm › lg › xs › xl › sm', ['sm', 'lg', 'xs', 'xl', 'sm'], 'sm'],
		['xs › xl › xs › slot', ['xs', 'xl', 'xs', 'slot'], 'xs'],
		['xl › xs › xl › slot › slot', ['xl', 'xs', 'xl', 'slot', 'slot'], 'lg'],
		['lg › sm › xl › xs element', ['lg', 'sm', 'xl'], 'xs', 'xs'],
		['lg › slot › sm', ['lg', 'slot', 'sm'], 'sm'],
		['lg › slot › sm › slot', ['lg', 'slot', 'sm', 'slot'], 'xs'],
		['xl › slot › xl › slot', ['xl', 'slot', 'xl', 'slot'], 'lg'],
	]

	it.each(deep)('gives %s the oracle step of the nearest scope', (_, chain, step, self) => {
		expect(densityStepOf(probe(chain, PROBE, self))).toBe(step)
	})

	it.each(deep)('gives %s the padding of the nearest scope', (_, chain, step, self) => {
		expect(px(probe(chain, PROBE, self), 'paddingLeft')).toBe(PROBE_PX[step])
	})
})

/**
 * A pseudo-element takes the step of its element. A stepped class after the pseudo-element works,
 * as the control frame writes it (`before:density-rounded-ring-[…]`), because the pseudo-element
 * inherits the custom properties of its element.
 */
describe('a pseudo-element (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	/** The step of the oracle and the radius of the inset fill of the frame of an Input. */
	const frameFill = (chain: readonly Scope[], size?: DensityStep) => {
		const container = nest(chain)

		container.innerHTML = renderToStaticMarkup(<Input aria-label="Name" size={size} />)

		const frame = present(container.querySelector('[data-slot="control-frame"]'), 'frame')

		return {
			step: densityStepOf(frame),
			radius: Number.parseFloat(getComputedStyle(frame, '::before').borderTopLeftRadius),
		}
	}

	it.each<[DensityStep, DensityStep]>([
		['xs', 'xs'],
		['lg', 'md'],
		['xl', 'lg'],
	])('rounds the inset fill of a frame in a slot under %s at %s', (host, step) => {
		expect(frameFill([host, 'slot'])).toEqual({ step, radius: RING_RADIUS_PX[step] })
	})

	it('rounds the inset fill of an xs frame under xl at xs', () => {
		expect(frameFill(['xl'], 'xs')).toEqual({ step: 'xs', radius: RING_RADIUS_PX.xs })
	})

	/** A probe with a stepped class after the pseudo-element, on its `::before`. */
	const after = (chain: readonly Scope[]) =>
		probe(chain, 'relative before:density-rounded-ring-[1,1.5,2,2.5,3]')

	/** The step of the oracle and the radius of the `::before` of {@link after}. */
	const fillAfter = (chain: readonly Scope[]) => {
		const element = after(chain)

		return {
			step: densityStepOf(element),
			radius: Number.parseFloat(getComputedStyle(element, '::before').borderTopLeftRadius),
		}
	}

	it.each<[string, Scope[]]>([
		['md', ['md']],
		['a slot under lg', ['lg', 'slot']],
	])('rounds a ::before with a stepped class after the pseudo-element at %s', (_, chain) => {
		expect(fillAfter(chain)).toEqual({ step: 'md', radius: RING_RADIUS_PX.md })
	})

	const otherSteps: DensityStep[] = ['xs', 'sm', 'lg', 'xl']

	it.each(otherSteps)('gives the oracle step %s to an element with a stepped ::before', (step) => {
		expect(densityStepOf(after([step]))).toBe(step)
	})

	it.each(otherSteps)(
		'rounds a ::before with a stepped class after the pseudo-element at %s',
		(step) => {
			const radius = getComputedStyle(after([step]), '::before').borderTopLeftRadius

			expect(Number.parseFloat(radius)).toBe(RING_RADIUS_PX[step])
		},
	)
})

/**
 * `density-any` is in the layer of the stepped classes with no specificity, so a stepped class on
 * the same property wins over it at each step, and a plain class wins over both.
 */
describe('density-any (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	/** The height of `density-h-[1,2,3,4,5]` at each step, in pixels. */
	const HEIGHT_PX = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const satisfies Record<
		DensityStep,
		number
	>

	const height = (element: Element) => Number.parseFloat(getComputedStyle(element).height)

	it.each(densitySteps)('loses to a stepped class in a %s scope', (step) => {
		expect(height(probe([step], 'block density-any:h-4 density-h-[1,2,3,4,5]'))).toBe(
			HEIGHT_PX[step],
		)
	})

	it('gives its value when no stepped class sets the property', () => {
		expect(height(probe(['lg'], 'block density-any:h-4'))).toBe(16)
	})

	it('loses to a plain class', () => {
		expect(height(probe(['lg'], 'block density-any:h-4 density-h-[1,2,3,4,5] h-8'))).toBe(32)
	})
})

/**
 * Two stepped classes on one property of one element. They have the same rank, so the later rule in
 * the sheet wins at each step. The order of the classes in the `class` attribute does not count.
 */
describe('two stepped classes on one property (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	/** The index of the last rule that names `className`, in the order of the document sheets. */
	const lastRuleOf = (className: string) => {
		const selector = `.${CSS.escape(className)}`

		let index = 0

		let last = -1

		const walk = (rules: CSSRuleList) => {
			for (const rule of rules) {
				index += 1

				if (rule instanceof CSSStyleRule && rule.selectorText.includes(selector)) last = index

				if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList) walk(rule.cssRules)
			}
		}

		for (const sheet of document.styleSheets) walk(sheet.cssRules)

		return last
	}

	it.each<[string, string, 'paddingTop' | 'paddingLeft', DensityStep, number, number]>([
		['density-p-[0.25,0.5,1,1.5,2.5]', 'density-p-[4,5,6,7,8]', 'paddingTop', 'xs', 1, 16],
		['density-p-[0.25,0.5,1,1.5,2.5]', 'density-p-[4,5,6,7,8]', 'paddingTop', 'lg', 6, 28],
		['density-px-[0.5,1,2,3,4.5]', 'density-px-[2,3,4,5,6]', 'paddingLeft', 'xs', 2, 8],
		['density-px-[0.5,1,2,3,4.5]', 'density-px-[2,3,4,5,6]', 'paddingLeft', 'lg', 12, 20],
	])(
		'gives %s with %s the later rule in the sheet (%s, at %s)',
		(first, second, property, step, firstPx, secondPx) => {
			const [firstRule, secondRule] = [lastRuleOf(first), lastRuleOf(second)]

			expect(Math.min(firstRule, secondRule)).toBeGreaterThan(-1)

			const expected = firstRule > secondRule ? firstPx : secondPx

			for (const className of [`${first} ${second}`, `${second} ${first}`]) {
				const element = probe([step], className)

				expect([densityStepOf(element), px(element, property)]).toEqual([step, expected])
			}
		},
	)
})

/**
 * A list of three values gives `sm`, `md`, and `lg`, and each outer step takes the value of its
 * neighbor. A ramp of `ui` has five values, so these classes come from consumers: the sidebar of the
 * docs (`density-px-ring-[1.5,2,2.5]`) and the category swatch of `apps/places`
 * (`density-w-[3,4,5] density-me-ring-[2.5,3,3.5]`).
 */
describe('a list of three values (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	it.each<[string, Scope[], DensityStep, { pad: number; width: number; end: number }]>([
		['xs', ['xs'], 'xs', { pad: 5, width: 12, end: 9 }],
		['sm', ['sm'], 'sm', { pad: 5, width: 12, end: 9 }],
		['md', ['md'], 'md', { pad: 7, width: 16, end: 11 }],
		['lg', ['lg'], 'lg', { pad: 9, width: 20, end: 13 }],
		['xl', ['xl'], 'xl', { pad: 9, width: 20, end: 13 }],
		['a slot under lg', ['lg', 'slot'], 'md', { pad: 7, width: 16, end: 11 }],
	])('gives each class its value at %s', (_, chain, step, expected) => {
		const label = probe(chain, 'density-px-ring-[1.5,2,2.5]')

		const swatch = document.createElement('span')

		swatch.className = 'inline-flex density-w-[3,4,5] density-me-ring-[2.5,3,3.5]'

		nest(chain).append(swatch)

		expect([densityStepOf(label), densityStepOf(swatch)]).toEqual([step, step])

		expect({
			pad: px(label, 'paddingLeft'),
			width: px(swatch, 'width'),
			end: Number.parseFloat(getComputedStyle(swatch).marginInlineEnd),
		}).toEqual(expected)
	})
})

/**
 * Below `sm`, the panel of a dialog sits on the bottom edge. Its one bottom padding adds
 * `--ui-panel-bottom` (`density-set-[4,5,6,7,8]/[--ui-panel-bottom]`) and `--ui-panel-safe`, which
 * holds the safe-area inset of the home indicator below `sm` only. So the panel inset is the step
 * inset plus the safe-area inset below `sm`, and the step inset alone from `sm` up. A consumer
 * padding replaces the padding of the panel at each width.
 *
 * In Chromium, the file sets a safe-area inset through CDP, so the two forms give different lengths
 * and the case sees which form wins. Firefox and WebKit have no such override. There the safe-area
 * inset is zero, the two forms give the same length, and the case holds only that length.
 */
describe('the bottom inset of an open dialog at 390px (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	/** The bottom safe-area inset of the page, in pixels: the height of an iPhone home indicator. */
	const SAFE_AREA_PX = server.browser === 'chromium' ? 34 : 0

	beforeAll(async () => {
		if (SAFE_AREA_PX)
			await cdp().send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: SAFE_AREA_PX } })
	})

	// The page is shared with the files that run after this one, so the inset goes back to zero.
	afterAll(async () => {
		if (SAFE_AREA_PX) await cdp().send('Emulation.setSafeAreaInsetsOverride', { insets: {} })
	})

	const INSET_PX = { xs: 16, sm: 20, md: 24, lg: 28, xl: 32 } as const satisfies Record<
		DensityStep,
		number
	>

	const dialog = (
		<Dialog open onOpenChange={() => {}}>
			<DialogPanel aria-label="Panel">
				<DialogBody>Body</DialogBody>
			</DialogPanel>
		</Dialog>
	)

	const inset = () => {
		const panel = getSlot(document.body, 'dialog')

		return { step: densityStepOf(panel), inset: px(panel, 'paddingBottom') }
	}

	it.each(densitySteps)('insets the panel at the %s root', (step) => {
		holdRoot(step)

		renderUI(dialog)

		expect(inset()).toEqual({ step, inset: INSET_PX[step] + SAFE_AREA_PX })
	})

	it.each<['compact' | 'loose', DensityStep, DensityStep]>([
		['compact', 'lg', 'sm'],
		['loose', 'sm', 'lg'],
	])('insets the panel in a %s scope under the %s root', (density, root, step) => {
		holdRoot(root)

		renderUI(<DensityProvider density={density}>{dialog}</DensityProvider>)

		expect(inset()).toEqual({ step, inset: INSET_PX[step] + SAFE_AREA_PX })
	})

	it('gives a consumer padding of the panel priority over the inset', () => {
		holdRoot('lg')

		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel aria-label="Panel" className="pb-0">
					<DialogBody>Body</DialogBody>
				</DialogPanel>
			</Dialog>,
		)

		expect(inset()).toEqual({ step: 'lg', inset: 0 })
	})
})

/**
 * From `sm` up, the panel of a dialog does not sit on the bottom edge, so `--ui-panel-safe` is zero
 * and the panel inset is the step inset alone, also on a page with a safe-area inset.
 */
describe('the bottom inset of an open dialog from sm up (real browser)', () => {
	beforeAll(() => page.viewport(1024, 844))

	/** The bottom safe-area inset of the page, in pixels. Only Chromium can set one. */
	const SAFE_AREA_PX = server.browser === 'chromium' ? 34 : 0

	beforeAll(async () => {
		if (SAFE_AREA_PX)
			await cdp().send('Emulation.setSafeAreaInsetsOverride', { insets: { bottom: SAFE_AREA_PX } })
	})

	// The page is shared with the files that run after this one, so the inset goes back to zero.
	afterAll(async () => {
		if (SAFE_AREA_PX) await cdp().send('Emulation.setSafeAreaInsetsOverride', { insets: {} })
	})

	it('insets the panel at the step inset alone', () => {
		holdRoot('lg')

		renderUI(
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel aria-label="Panel">
					<DialogBody>Body</DialogBody>
				</DialogPanel>
			</Dialog>,
		)

		expect(px(getSlot(document.body, 'dialog'), 'paddingBottom')).toBe(28)
	})
})

/**
 * `density-set` keeps the overlap of its step on the group in `--ui-avatar-overlap`, and each child
 * takes its margin from it (`space-x-(--ui-avatar-overlap)`). A child that is its own scope thus takes the overlap of the group. A group in a group
 * sets its own overlap, so its margin in the outer group is its own overlap, not the overlap of the
 * outer group. This is deliberate.
 */
describe('a group of space-x from density-set (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	/** The overlap of `dan.space.avatar.overlap` at each step, in pixels. */
	const OVERLAP_PX = { xs: -2, sm: -2, md: -4, lg: -4, xl: -4 } as const satisfies Record<
		DensityStep,
		number
	>

	/** A group with the overlap and two children, in a scope at `step`. It returns the group. */
	const group = (parent: HTMLElement, step?: DensityStep) => {
		const element = document.createElement('div')

		element.className = `flex ${dan.space.avatar.overlap}`

		if (step) element.dataset.density = step

		element.append(document.createElement('span'), document.createElement('span'))

		parent.append(element)

		return element
	}

	/** The end margin of `element`, in pixels. */
	const end = (element: Element) => Number.parseFloat(getComputedStyle(element).marginInlineEnd)

	it.each(densitySteps)('gives each child but the last the overlap of a group at %s', (step) => {
		const element = group(nest([]), step)

		const [first, last] = [...element.children]

		expect(end(present(first, 'first'))).toBe(OVERLAP_PX[step])

		expect(end(present(last, 'last'))).toBe(0)
	})

	it('gives a child that is its own scope the overlap of the group', () => {
		const element = group(nest([]), 'lg')

		const child = present(element.firstElementChild, 'child') as HTMLElement

		child.dataset.density = 'xs'

		expect({ step: densityStepOf(child), overlap: end(child) }).toEqual({
			step: 'xs',
			overlap: OVERLAP_PX.lg,
		})
	})

	it('gives a group in a group at xs its own overlap in the outer group at lg', () => {
		const outer = group(nest([]), 'lg')

		const inner = group(outer, 'xs')

		outer.prepend(inner)

		expect(end(inner)).toBe(OVERLAP_PX.xs)

		expect(end(present(inner.firstElementChild, 'inner child'))).toBe(OVERLAP_PX.xs)

		expect(end(present(inner.nextElementSibling, 'outer child'))).toBe(OVERLAP_PX.lg)
	})
})

/**
 * The thumb of the WebKit slider sits on its track by a negative top margin in stops of the spacing
 * scale (`dan.space.slider.thumb`), so it scales with the font size of the root. At a 16 px root,
 * it is -3 px to -7 px. This is deliberate.
 *
 * `getComputedStyle` does not read the thumb (see the top of this file), so a probe takes the same
 * stepped class with no pseudo-element.
 */
describe('the thumb offset of a slider (real browser)', () => {
	beforeAll(() => page.viewport(390, 844))

	const THUMB = 'density-mt-[-0.75,-1,-1.25,-1.5,-1.75]'

	/** The offset at each step, in stops of the spacing scale. */
	const STOPS = { xs: -0.75, sm: -1, md: -1.25, lg: -1.5, xl: -1.75 } as const satisfies Record<
		DensityStep,
		number
	>

	/** Sets the font size of the root for the current test. */
	const holdFontSize = (size: string) => {
		const root = document.documentElement

		const before = root.style.fontSize

		root.style.fontSize = size

		onTestFinished(() => {
			root.style.fontSize = before
		})
	}

	const offset = (step: DensityStep) =>
		Number.parseFloat(getComputedStyle(probe([step], THUMB)).marginTop)

	it('gives the thumb the stepped class of the probe', () => {
		expect(dan.space.slider.thumb).toBe(`[&::-webkit-slider-thumb]:${THUMB}`)
	})

	it.each(densitySteps)('gives the px of the stops at %s at a 16px root', (step) => {
		holdFontSize('16px')

		expect(offset(step)).toBe(STOPS[step] * 4)
	})

	it.each(densitySteps)('scales the offset at %s with a 20px root', (step) => {
		holdFontSize('20px')

		expect(offset(step)).toBe(STOPS[step] * 5)
	})
})
