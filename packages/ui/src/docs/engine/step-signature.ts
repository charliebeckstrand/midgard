import { type DensityStep, densitySteps, stepDown } from '../../core/density'
import { valuesByStep } from '../../core/density/steps'
import { getOrCompute } from '../../utilities/get-or-compute'

/**
 * The step of an element: the step of its nearest density scope in the
 * instance, or `null` when that scope is outside the instance. A scope outside
 * the instance is the same for each instance, so a class under it does not
 * change between them.
 */
type Step = DensityStep | null

const isStep = (value: string): value is DensityStep =>
	(densitySteps as readonly string[]).includes(value)

/** The `data-density` value of a control slot, a scope one step below the scope above it. */
const SLOT = 'slot'

/** A value of React `useId`, such as `_r_1f_`. Each instance gets a different one. */
const REACT_ID = /_[rR]_[0-9a-zA-Z]+_/g

/** The anchor of the caption of an axis instance, which is chrome of the docs and not of the component. */
const CAPTION = '[data-slot="axis-caption"]'

/**
 * Read the step of `element` from its nearest density scope, `element`
 * included. A control slot takes the step below the scope above it. A slot in
 * a slot takes the step of the outer slot, as the rungs of `core/density` do.
 * The walk stops at `boundary`.
 */
function stepOf(element: Element, boundary: Element): Step {
	let slot = false

	for (let node: Element | null = element; node && node !== boundary; node = node.parentElement) {
		const value = node.getAttribute('data-density')

		if (value === SLOT) slot = true
		else if (value !== null && isStep(value)) return slot ? stepDown(value) : value
	}

	return null
}

/**
 * Split a class at each colon outside brackets and parentheses: the variants,
 * then the utility. `data-[slot=icon]:density-size-[3,4,5]` gives
 * `data-[slot=icon]` and `density-size-[3,4,5]`.
 */
function splitClass(name: string): string[] {
	const parts: string[] = []

	let depth = 0

	let start = 0

	for (let index = 0; index < name.length; index++) {
		const char = name[index]

		if (char === '[' || char === '(') depth++
		else if (char === ']' || char === ')') depth--
		else if (char === ':' && depth === 0) {
			parts.push(name.slice(start, index))

			start = index + 1
		}
	}

	parts.push(name.slice(start))

	return parts
}

/**
 * The steps that a density variant matches: `density-sm` gives `sm`, and
 * `density-[xs,sm]` gives `xs` and `sm`. It returns `null` for each other
 * variant. `density-any` matches at each step, so it returns `null`.
 */
function variantSteps(variant: string): readonly DensityStep[] | null {
	const single = /^density-([a-z]+)$/.exec(variant)?.[1]

	if (single !== undefined) return isStep(single) ? [single] : null

	const list = /^density-\[([^\]]+)\]$/.exec(variant)?.[1]?.split(',')

	return list?.every(isStep) ? list : null
}

/** A stepped utility, such as `density-p-[2,3,4]`, split into its prefix and its value at each step. */
type Stepped = { prefix: string; values: Record<DensityStep, string> }

/**
 * Read a stepped utility, such as `density-p-[2,3,4]` or `-density-mb-[1,2,3]!`.
 * It returns `null` for a utility that is not stepped, and for a list that
 * gives no step a value.
 */
function readStepped(utility: string): Stepped | null {
	const match = /^(!?-?density-[a-z][a-z-]*)-\[([^\]]+)\](!?)$/.exec(utility)

	const values = match?.[2] === undefined ? null : valuesByStep(match[2])

	return match && values ? { prefix: `${match[1]}${match[3]}`, values } : null
}

/**
 * One class of an element, with each density part read. A class with no
 * density part keeps its name.
 */
type ClassPart = {
	name: string
	/** The variants that are not density variants. */
	variants: readonly string[]
	/** The steps that each density variant of the class matches. */
	gates: readonly (readonly DensityStep[])[]
	/** The utility of the class, read as a stepped utility when it is one. */
	utility: string | Stepped
}

/** The parsed form of each class name. The docs site renders a bounded set of names. */
const parsedClasses = new Map<string, ClassPart | null>()

/** Read the density parts of a class, or `null` when it has none. Each name parses once. */
function readClass(name: string): ClassPart | null {
	return getOrCompute(parsedClasses, name, parseClass)
}

function parseClass(name: string): ClassPart | null {
	const parts = splitClass(name)

	const utility = parts.pop() ?? ''

	const variants: string[] = []

	const gates: (readonly DensityStep[])[] = []

	for (const variant of parts) {
		const steps = variantSteps(variant)

		if (steps) gates.push(steps)
		else variants.push(variant)
	}

	const stepped = readStepped(utility)

	if (gates.length === 0 && !stepped) return null

	return { name, variants, gates, utility: stepped ?? utility }
}

/**
 * Write a class with density parts as the rule that it gives at `step`. It
 * returns an empty string when a density variant does not match `step`. At a
 * `null` step it returns the name of the class, because the step is the same
 * for each instance.
 */
function resolveAt(part: ClassPart, step: Step): string {
	if (step === null) return part.name

	if (part.gates.some((steps) => !steps.includes(step))) return ''

	const utility =
		typeof part.utility === 'string'
			? part.utility
			: `${part.utility.prefix}=${part.utility.values[step]}`

	return [...part.variants, utility].join(':')
}

/**
 * The elements that a class can style, from the element that holds it: the
 * element alone, its subtree, or each element of the instance.
 */
type Reach = 'self' | 'subtree' | 'instance'

const REACH_RANK: Record<Reach, number> = { self: 0, subtree: 1, instance: 2 }

/** The variants that style a descendant: `*` styles a child, `**` and `marker` style each descendant. */
const DESCENDANT_VARIANTS = new Set(['*', '**', 'marker', 'selection'])

/**
 * Read how far a variant reaches. A pseudo-class, a pseudo-element, a media
 * query, and a `group-*` or `has-*` variant style the element itself. An
 * arbitrary variant styles a descendant when `&` comes before a combinator,
 * and a sibling when `&` comes before `~` or `+`. An arbitrary selector with no
 * `&` reaches the subtree, because the rule does not name the element.
 */
function reachOf(variant: string): Reach {
	if (DESCENDANT_VARIANTS.has(variant)) return 'subtree'

	if (!variant.startsWith('[') || !variant.endsWith(']')) return 'self'

	// Tailwind writes a space in an arbitrary value as `_`.
	const selector = variant.slice(1, -1).replaceAll('_', ' ').trim()

	if (selector.startsWith('@')) return 'self'

	if (/&\s*[~+]/.test(selector)) return 'instance'

	return !selector.includes('&') || /&\s*[>\s]/.test(selector) ? 'subtree' : 'self'
}

/** The farthest reach of the variants of a class. */
function reachOfAll(variants: readonly string[]): Reach {
	return variants
		.map(reachOf)
		.reduce<Reach>((far, reach) => (REACH_RANK[reach] > REACH_RANK[far] ? reach : far), 'self')
}

/**
 * Write a list of resolved rules as runs, such as `p=2*3,p=3`. A long subtree
 * of one step thus stays short.
 */
function runs(values: readonly string[]): string {
	const out: string[] = []

	let count = 0

	for (let index = 0; index < values.length; index++) {
		count++

		if (values[index] !== values[index + 1]) {
			out.push(count === 1 ? (values[index] ?? '') : `${values[index]}*${count}`)

			count = 0
		}
	}

	return out.join(',')
}

/**
 * Write the attributes of an element, except `class`, and `data-density` when
 * it holds a step or a slot. A `useId` value and the label of the instance
 * read the same in each instance, because each instance gets its own.
 */
function attributesOf(element: Element, label: string): string[] {
	const out: string[] = []

	for (const { name, value } of element.attributes) {
		if (name === 'class') continue

		if (name === 'data-density' && (value === SLOT || isStep(value))) continue

		const id = value.replace(REACT_ID, '#id')

		const text = label === '' ? id : id.replaceAll(label, '#label')

		out.push(`${name}=${text}`)
	}

	return out.sort()
}

/**
 * Write the rendered form of one axis instance at a density step. Two
 * instances give the same string when the CSS gives them the same rules.
 *
 * @remarks
 * It reads the DOM, and no layout. Each element gives its tag, its attributes,
 * and its classes. A class with a density part resolves at the step of the
 * element that it styles, as the rungs of `core/density` do. A class whose
 * variant styles a descendant, such as `*:`, resolves at the step of each
 * element in its subtree. A class that can style a sibling resolves at each
 * element of the instance. The text of the instance does not count, because
 * it can hold the label of the instance.
 *
 * It returns `null` when no element of the instance opens a scope at `step`.
 * Then the tree holds no scope of the component at that step, for example when
 * its panel is in a portal. The axis keeps the value.
 *
 * @param instance - The wrapper of the instance, whose descendants the component renders.
 * @param step - The step that the instance shows.
 * @param label - The label of the instance, which the content can show.
 *
 * @internal
 */
export function stepSignature(instance: Element, step: DensityStep, label: string): string | null {
	if (!instance.querySelector(`[data-density="${step}"]`)) return null

	const elements = [...instance.querySelectorAll('*')].filter(
		(element) => !element.closest(CAPTION),
	)

	const steps = elements.map((element) => stepOf(element, instance))

	return elements
		.map((element, index) => {
			const classes = [...element.classList].map((name) => classAt(name, element, index, steps))

			return [element.localName, ...attributesOf(element, label), ...classes.sort()].join(' ')
		})
		.join('\n')
}

/**
 * Write one class of the element at `index` as the rules that it gives. The
 * steps of the instance are in document order, so the subtree of the element
 * follows it.
 */
function classAt(name: string, element: Element, index: number, steps: readonly Step[]): string {
	const part = readClass(name)

	if (!part) return name

	const reach = reachOfAll(part.variants)

	if (reach === 'self') return resolveAt(part, steps[index] ?? null)

	const [from, end] =
		reach === 'instance'
			? [0, steps.length]
			: [index, index + 1 + element.getElementsByTagName('*').length]

	return runs(steps.slice(from, end).map((step) => resolveAt(part, step)))
}
