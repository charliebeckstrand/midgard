import {
	type DensityStep,
	densitySteps,
	isDensityStep,
	scopeStepOf,
	stepsOfList,
	valuesByStep,
} from '../../core/density/steps'
import { getOrCompute } from '../../utilities/get-or-compute'
import { splitTopLevel } from './split-top-level'

/**
 * The step of an element: the step of its nearest density scope in the
 * instance, or `null` when that scope is outside the instance. A scope outside
 * the instance is the same for each instance, so a class under it does not
 * change between them.
 */
type Step = DensityStep | null

/** A value of React `useId`, such as `_r_1f_`. Each instance gets a different one. */
const REACT_ID = /_[rR]_[0-9a-zA-Z]+_/g

/**
 * The elements that a class can style, from the element that holds it: the
 * element alone, its subtree, or each element of the instance. A larger rank
 * reaches farther.
 */
const Reach = { self: 0, subtree: 1, instance: 2 } as const

type Reach = (typeof Reach)[keyof typeof Reach]

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
	if (DESCENDANT_VARIANTS.has(variant)) return Reach.subtree

	if (!variant.startsWith('[') || !variant.endsWith(']')) return Reach.self

	// Tailwind writes a space in an arbitrary value as `_`.
	const selector = variant.slice(1, -1).replaceAll('_', ' ').trim()

	if (selector.startsWith('@')) return Reach.self

	if (/&\s*[~+]/.test(selector)) return Reach.instance

	return !selector.includes('&') || /&\s*[>\s]/.test(selector) ? Reach.subtree : Reach.self
}

/**
 * The steps that a density variant matches: `density-sm` gives `sm`, and
 * `density-[xs,sm]` gives `xs` and `sm`. It returns `null` for each other
 * variant, `density-any` included, because that variant matches at each step.
 */
function stepsOfVariant(variant: string): readonly DensityStep[] | null {
	const match = /^density-(?:([a-z]+)|\[([^\]]+)\])$/.exec(variant)

	return match ? stepsOfList((match[1] ?? match[2] ?? '').replaceAll('_', ' ')) : null
}

/**
 * A class with a density part, read once: how far it reaches, and the rule
 * that it gives at each step. The rule is empty at a step that a density
 * variant of the class does not match.
 */
type DensityClass = { reach: Reach; at: Record<DensityStep, string> }

/**
 * Read a class with a density part: a density variant, a stepped utility such
 * as `density-p-[2,3,4]`, or both. It returns `null` for a class with no
 * density part.
 */
function parseClass(name: string): DensityClass | null {
	const parts = splitTopLevel(name, ':', false)

	const utility = parts.pop() ?? ''

	const variants: string[] = []

	const gates: (readonly DensityStep[])[] = []

	for (const variant of parts) {
		const steps = stepsOfVariant(variant)

		if (steps) gates.push(steps)
		else variants.push(variant)
	}

	const [, head = '', list = '', important = ''] =
		/^(!?density-[a-z][a-z-]*)-\[([^\]]+)\](!?)$/.exec(utility) ?? []

	const values = list ? valuesByStep(list) : null

	if (gates.length === 0 && !values) return null

	const ruleAt = (step: DensityStep) => {
		if (gates.some((steps) => !steps.includes(step))) return ''

		const rule = values ? `${head}${important}=${values[step]}` : utility

		return [...variants, rule].join(':')
	}

	return {
		reach: Math.max(Reach.self, ...variants.map(reachOf)) as Reach,
		at: Object.fromEntries(densitySteps.map((step) => [step, ruleAt(step)])) as DensityClass['at'],
	}
}

/** The read of each class with a density part. The docs site renders a bounded set of them. */
const densityClasses = new Map<string, DensityClass | null>()

/** Read the density part of a class, or `null` when it has none. Each name parses once. */
function readClass(name: string): DensityClass | null {
	// Most classes have no density part, so they skip the parse and the cache.
	return name.includes('density-') ? getOrCompute(densityClasses, name, parseClass) : null
}

/**
 * Write one class of the element at `index` as its rules. Each rule takes the
 * step of an element that the class can style. The steps of the instance are
 * in document order, so the subtree of the element follows it.
 */
function classAt(name: string, element: Element, index: number, steps: readonly Step[]): string {
	const part = readClass(name)

	if (!part) return name

	let [from, end] = [index, index + 1]

	if (part.reach === Reach.instance) [from, end] = [0, steps.length]
	else if (part.reach === Reach.subtree) end += element.getElementsByTagName('*').length

	return steps
		.slice(from, end)
		.map((step) => (step === null ? name : part.at[step]))
		.join(',')
}

/**
 * Write the attributes of an element, except `class`, `style`, and
 * `data-density` when it holds a step or a slot. A `useId` value and the label
 * of the instance read the same in each instance, because each instance gets
 * its own.
 *
 * @remarks
 * Tailwind classes carry each style that a prop sets. An inline `style`
 * carries the state of the run, such as a fill that springs to its value. A
 * read after a picker change compares an instance that mounts now with an
 * instance that settled before, so their inline styles differ for no change in
 * the props.
 */
function attributesOf(element: Element, label: string): string[] {
	const out: string[] = []

	for (const { name, value } of element.attributes) {
		if (name === 'class' || name === 'style') continue

		if (name === 'data-density' && (value === 'slot' || isDensityStep(value))) continue

		const id = value.replace(REACT_ID, '#id')

		out.push(`${name}=${label === '' ? id : id.replaceAll(label, '#label')}`)
	}

	return out.sort()
}

/**
 * Write the rendered form of one axis instance. Two instances give the same
 * string when the CSS gives them the same rules.
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
 * The step that the instance shows does not count. A component can open its
 * scope at another step, such as a Calendar at `xs`, which opens `sm`. It
 * returns `null` when no element of the instance opens a density scope. Then
 * the component writes its step in no element of the tree, for example when
 * its panel is in a portal. The axis keeps the value.
 *
 * @param instance - The wrapper of the instance, whose descendants the component renders.
 * @param label - The label of the instance, which the content can show.
 *
 * @internal
 */
export function stepSignature(instance: Element, label: string): string | null {
	const elements = [...instance.querySelectorAll('*')]

	const steps = elements.map((element) => scopeStepOf(element, instance, null))

	if (steps.every((step) => step === null)) return null

	return elements
		.map((element, index) => {
			const classes = [...element.classList].map((name) => classAt(name, element, index, steps))

			return [element.localName, ...attributesOf(element, label), ...classes.sort()].join(' ')
		})
		.join('\n')
}

/**
 * Write the text that an element holds directly. The label of the instance
 * reads the same in each instance.
 */
function ownTextOf(element: Element, label: string): string {
	let text = ''

	for (const node of element.childNodes) if (node instanceof Text) text += node.data

	text = text.trim()

	return label === '' ? text : text.replaceAll(label, '#label')
}

/**
 * Write the rendered form of one instance of an axis that is not a density
 * axis. Two instances give the same string when they render the same DOM.
 *
 * @remarks
 * Each element gives its tag, its attributes, its classes, and its own text.
 * The label of the instance does not count, because each instance can show
 * its own label. A `useId` value does not count, because each instance gets
 * its own.
 *
 * @param instance - The wrapper of the instance, whose descendants the component renders.
 * @param label - The label of the instance, which the content can show.
 *
 * @internal
 */
export function formSignature(instance: Element, label: string): string {
	return [...instance.querySelectorAll('*')]
		.map((element) =>
			[
				element.localName,
				...attributesOf(element, label),
				...[...element.classList].sort(),
				ownTextOf(element, label),
			].join(' '),
		)
		.join('\n')
}
