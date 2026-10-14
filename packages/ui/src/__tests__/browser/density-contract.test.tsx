import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, describe, expect, it, onTestFinished } from 'vitest'
import { cdp, page, server } from 'vitest/browser'
import { Dialog, DialogBody, DialogPanel } from '../../components/dialog'
import { Input } from '../../components/input'
import {
	type DensityStep,
	densitySteps,
	readRootDensity,
	writeRootDensity,
} from '../../core/density'
import { scopeStepOf } from '../../core/density/steps'
import { DensityProvider } from '../../providers/density'
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
 * that the docs and `apps/places` use, and the inset of an open dialog. A case that
 * `density-scope.test.tsx` holds is not repeated here.
 *
 * A case that main cannot hold is an `it.fails`. Step 1 of the density plan moves the stepped
 * classes to inherited custom properties, and then each such case passes. At that step, change
 * each `it.fails` to `it`. An `it.fails` holds only the computed value. A normal `it` holds the
 * step of the oracle for the same row, so a wrong step or chain in the table cannot make an
 * `it.fails` pass.
 *
 * No case holds the thumb of the native slider. `getComputedStyle(input, '::-webkit-slider-thumb')`
 * gives the values of the input, not of the thumb. The thumb also does not change the layout of
 * the input: with `appearance: none`, the box height and the `scrollHeight` of the input are the
 * padding and the track at each step. Thus a change to the thumb shows in no case. The track has a
 * case in `density-scope.test.tsx`, which reads it as the content box of the input.
 *
 * The file sets a phone width, because the dialog inset reads the `max-sm` breakpoint. No other
 * case reads the width.
 */
beforeAll(() => page.viewport(390, 844))

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

	it('gives a step on the data-density of the root element priority over the root class', () => {
		const root = document.documentElement

		holdRoot('sm')

		root.setAttribute('data-density', 'lg')

		onTestFinished(() => root.removeAttribute('data-density'))

		const element = probe([])

		const slot = probe(['slot'])

		// `densityStepOf` stops at the root element, so the oracle walks to the top here.
		const oracle = (node: Element) => scopeStepOf(node, null, readRootDensity(root))

		expect([oracle(element), px(element, 'paddingLeft')]).toEqual(['lg', PROBE_PX.lg])

		expect([oracle(slot), px(slot, 'paddingLeft')]).toEqual(['md', PROBE_PX.md])
	})
})

/**
 * A control slot (`data-density="slot"`) is one step below the scope above it. No slot takes `xl`,
 * and a slot under `xs` stays `xs`. A slot in a slot steps one time, not two. A scope in a slot
 * wins over the slot.
 */
describe('the slot scope (real browser)', () => {
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
 * Each depth of scopes has its own layer of rungs on main, up to `maxDepth`, which is 2. A slot
 * counts as one depth. A chain that holds on main stays an `it`, as do the slot chains above. A
 * chain that main ranks wrongly is an `it.fails`: an outer scope wins there.
 */
describe('scopes deeper than two (real browser)', () => {
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

	// Step 1 of the density plan makes each case pass.
	it.fails.each(deep)('gives %s the padding of the nearest scope', (_, chain, step, self) => {
		expect(px(probe(chain, PROBE, self), 'paddingLeft')).toBe(PROBE_PX[step])
	})
})

/**
 * A pseudo-element takes the step of its element. On main, only a step variant before the
 * pseudo-element works, as the control frame writes it (`density-md:before:…`).
 */
describe('a pseudo-element (real browser)', () => {
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

	// On main, only the `md` rung of such a class matches, because it has no scope in its selector.
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

	// The rung of each other step nests the pseudo-element under a scope selector, and that rule
	// matches no element on main. Step 1 of the density plan makes each case pass.
	it.fails.each(otherSteps)(
		'rounds a ::before with a stepped class after the pseudo-element at %s',
		(step) => {
			const radius = getComputedStyle(after([step]), '::before').borderTopLeftRadius

			expect(Number.parseFloat(radius)).toBe(RING_RADIUS_PX[step])
		},
	)
})

/**
 * Two stepped classes on one property of one element. They have the same rank, so the later rule in
 * the sheet wins at each step. The order of the classes in the `class` attribute does not count.
 */
describe('two stepped classes on one property (real browser)', () => {
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
 * Below `sm`, the panel of a dialog sits on the bottom edge. Its element holds the stepped inset
 * (`density-pb-[4,5,6,7,8]`) and the `max-sm` step variants that add the safe-area inset of the
 * home indicator (`env(safe-area-inset-bottom)`). The variant must win, so the panel inset is the
 * step inset plus the safe-area inset.
 *
 * In Chromium, the file sets a safe-area inset through CDP, so the two forms give different lengths
 * and the case sees which form wins. Firefox and WebKit have no such override. There the safe-area
 * inset is zero, the two forms give the same length, and the case holds only that length.
 */
describe('the bottom inset of an open dialog at 390px (real browser)', () => {
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
})
