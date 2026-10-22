// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type DensityStep, densitySteps } from '../../core/density'
import { geometry, lineHeight, spacingSteps } from '../../core/density/geometry'
import { slotStep, valuesByStep } from '../../core/density/steps'
import { dan } from '../../recipes/kiso/dan'

/**
 * The ramps of `dan` are literal classes, because Tailwind reads each class
 * from its source. `core/density/geometry.ts` gives the formula of each
 * text-coupled ramp. These cases hold each literal to its formula, and they
 * check the identities of the model against the live ramps.
 */

/** The size of each name of the text scale, in px. */
const textScale: Record<string, number> = {
	'2xs': 10,
	xs: 12,
	sm: 14,
	base: 16,
	lg: 18,
	xl: 20,
	'2xl': 24,
	'3xl': 30,
	'4xl': 36,
	'5xl': 48,
}

/** The ramp at `path` in `dan`, such as `size.icon.base`. */
function rampAt(path: string): string {
	const value = path
		.split('.')
		.reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], dan)

	if (typeof value !== 'string') throw new Error(`No ramp at dan.${path}`)

	return value
}

/**
 * The px value of `ramp` at each step. A text ramp gives its font size. A ring
 * utility subtracts its 1 px ring. Each other ramp gives its spacing stop.
 */
function parsePx(ramp: string): Record<DensityStep, number> {
	const match = /density-([a-z-]+)-\[([^\]]+)\](?:\/\[--[a-z0-9-]+\])?$/.exec(ramp)

	if (!match) throw new Error(`Not a ramp: ${ramp}`)

	const [, utility, list] = match as unknown as [string, string, string]

	const values = valuesByStep(list)

	if (!values) throw new Error(`Not a list of three or five values: ${ramp}`)

	const px = (value: string) => {
		if (utility === 'text') return textScale[value] ?? Number.NaN

		const stop = Number(value) * 4

		return utility.endsWith('-ring') ? stop - 1 : stop
	}

	return Object.fromEntries(densitySteps.map((step) => [step, px(values[step])])) as Record<
		DensityStep,
		number
	>
}

describe('density geometry', () => {
	describe.each(Object.entries(geometry))('dan.%s', (path, formula) => {
		const ramp = rampAt(path)

		it('has five values', () => {
			expect(/\[([^\]]+)\]$/.exec(ramp)?.[1]?.split(',')).toHaveLength(5)
		})

		it.each(densitySteps)('renders the formula at %s', (step) => {
			expect(parsePx(ramp)[step]).toBe(formula(step))
		})
	})

	describe.each(densitySteps)('at %s', (step) => {
		const body = parsePx(dan.text.body)[step]

		const chip = parsePx(dan.text.chip)[step]

		const icon = parsePx(dan.size.icon.base)[step]

		const leading = lineHeight(step)

		it('centers the icon in the line box with a 2 px margin', () => {
			expect((leading - icon) / 2).toBe(2)
		})

		it('gives the line height of the text plus 8 px', () => {
			expect(leading).toBe(body + 8)

			expect(leading).toBe(chip + 8)
		})

		it('gives an icon-only button the height of a labeled button', () => {
			const square = icon + 2 * parsePx(dan.space.button.base)[step]

			const labeled = chip + 8 + 2 * parsePx(dan.space.button.label)[step]

			expect(square).toBe(labeled)
		})

		it('gives a control the height of a button', () => {
			const control = body + 8 + 2 * parsePx(dan.space.control.y)[step]

			const button = chip + 8 + 2 * parsePx(dan.space.button.label)[step]

			expect(control).toBe(button)
		})
	})
})

describe('spacing steps', () => {
	it.each([
		[
			[8, 12, 16],
			[4, 8, 12, 16, 20],
		],
		[
			[-12, -16, -20],
			[-8, -12, -16, -20, -24],
		],
		[
			[4, 8, 12],
			[2, 4, 8, 12, 18],
		],
		[
			[2, 4, 6],
			[1, 2, 4, 6, 10],
		],
		[
			[8, 16, 24],
			[4, 8, 16, 24, 36],
		],
	])('extends %j to %j', ([sm, md, lg], steps) => {
		expect(spacingSteps(sm as number, md as number, lg as number)).toStrictEqual(steps)
	})

	const scales = {
		'gap.scale': dan.gap.scale,
		'gap.x': dan.gap.x,
		'gap.y': dan.gap.y,
		'space.scale.p': dan.space.scale.p,
		'space.scale.px': dan.space.scale.px,
		'space.scale.py': dan.space.scale.py,
	}

	describe.each(Object.entries(scales))('dan.%s', (_, scale) => {
		it.each(Object.entries(scale))('extends the %s stop by the rule', (_, ramp) => {
			const { sm, md, lg } = parsePx(ramp)

			expect(densitySteps.map((step) => parsePx(ramp)[step])).toStrictEqual(
				spacingSteps(sm, md, lg),
			)
		})
	})

	describe.each(['x', 'y'] as const)('dan.gap.touch.%s', (axis) => {
		it.each(Object.keys(dan.gap.scale) as (keyof typeof dan.gap.scale)[])(
			'fills the gap of the %s stop at each step',
			(stop) => {
				const gap = parsePx(dan.gap.scale[stop])

				const ramp = dan.gap.touch[axis][stop]

				expect(ramp).toMatch(
					new RegExp(`^density-set-\\[[^\\]]+\\]/\\[--touch-target-gap-${axis}\\]$`),
				)

				expect(parsePx(ramp)).toStrictEqual(gap)
			},
		)
	})
})

/**
 * Each ramp of `dan` and its path, such as `size.icon.base`. A string with more
 * than one stepped class, such as the track of the slider, gives each class, and
 * each path takes the number of its class, such as `size.slider.input.track#1`.
 */
function collectRamps(node: unknown, path: string[] = []): [string, string][] {
	if (typeof node === 'string') {
		const classes = node
			.split(/\s+/)
			.filter((token) => /density-[a-z-]+-\[[^\]]+\](?:\/\[--[a-z0-9-]+\])?$/.test(token))

		return classes.map((token, index) => [
			classes.length > 1 ? `${path.join('.')}#${index}` : path.join('.'),
			token,
		])
	}

	if (node && typeof node === 'object' && !Array.isArray(node)) {
		return Object.entries(node).flatMap(([key, child]) => collectRamps(child, [...path, key]))
	}

	return []
}

/** The values of `ramp` at each step, as written. */
const parseValues = (ramp: string) =>
	(/\[([^\]]+)\](?:\/\[--[a-z0-9-]+\])?$/.exec(ramp)?.[1] ?? '').split(',')

/**
 * The ramps of the combinator between query chips. The combinator sits one step
 * below the chips, which sit one step below the scope, so each ramp is the ramp
 * of the Button or the chip at the slot step. No step is below `xs`, so `xs` and
 * `sm` share a value (`slotStep`).
 */
const slotRamps = {
	'text.combinator': dan.text.chip,
	'space.combinator.base': dan.space.button.base,
	'space.combinator.label': dan.space.button.label,
	'radius.combinator': dan.radius.button,
} as const

/**
 * The ramps that give one value to two or more steps:
 *
 *   - The sidebar width and its edge take the three container widths `2xs`,
 *     `xs`, and `sm`.
 *   - The avatar overlap takes two stops, so the overlap and the ring stay
 *     narrower than the space beside two initials.
 *   - The touch gaps of the tag row and of the query chips are for a row in a
 *     slot, so `xl` keeps the value of `lg`. The tag row also gives `xs` the
 *     value of `sm`.
 *   - The top padding of the sidebar layout header in the drawer layout is 0
 *     at each step. It is a ramp so that it is in the layer of the padding of
 *     the inline layout, and a breakpoint can switch the two.
 *   - The `0` stop of the spacing scale (`space.none` and `gap.none`) is 0 at
 *     each step, for the same reason: a breakpoint switches it with a stop of
 *     the scale.
 */
const sharedRamps = new Set([
	'size.sidebar.width',
	'size.sidebar.edge',
	'space.avatar.overlap',
	'gap.touch.tags.x',
	'gap.touch.tags.y',
	'gap.touch.chips',
	'space.shell.top.none',
	'space.none.p',
	'space.none.px',
	'space.none.py',
	'gap.none',
])

describe('every ramp of dan', () => {
	const ramps = collectRamps(dan)

	it('finds the ramps', () => {
		expect(ramps.length).toBeGreaterThan(100)
	})

	const own = ramps.filter(([path]) => !(path in slotRamps) && !sharedRamps.has(path))

	it.each(own)('gives dan.%s a distinct value at each step', (_, ramp) => {
		const values = parseValues(ramp)

		expect(values).toHaveLength(5)

		expect(new Set(values).size).toBe(5)
	})

	it.each(Object.entries(slotRamps))('reads dan.%s at the slot step', (path, source) => {
		const ramp = collectRamps(dan).find(([name]) => name === path)?.[1] ?? ''

		const values = parseValues(ramp)

		const sourceValues = parseValues(source)

		expect(densitySteps.map((step) => values[densitySteps.indexOf(step)])).toStrictEqual(
			densitySteps.map((step) => sourceValues[densitySteps.indexOf(slotStep(step))]),
		)
	})
})

describe('the line of a skeleton', () => {
	// A skeleton line is as tall as the line of the text that it stands in for:
	// the text size plus 8 px.
	const lines = [
		['size.line.timeline', dan.size.line.timeline, dan.text.title],
		['size.stat.value.base', dan.size.stat.value.base, dan.text.h1],
	] as const

	it.each(lines)('gives dan.%s the line of its text at each step', (_, line, text) => {
		const height = parsePx(line)

		const size = parsePx(text)

		for (const step of densitySteps) expect(height[step]).toBe(size[step] + 8)
	})
})
