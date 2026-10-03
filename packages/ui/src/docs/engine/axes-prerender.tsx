import { createContext } from '../../core'
import {
	type AxesRead,
	type Axis,
	type AxisSignatures,
	type AxisValue,
	isStepAxis,
	readAxes,
} from './axes'
import { valueLabel } from './components/format'
import { formSignature, lookSignature, stepSignature } from './step-signature'

/**
 * The first read of the axes of each `Axes` on a page, which the prerender
 * makes. Thus the HTML of the page shows the axes and the values that the page
 * shows after it hydrates, and the page does not change after the first paint.
 *
 * @remarks
 * The read of `Axes` takes the DOM of the instances. The prerender runs no
 * effect, so it renders each page two times. In the first pass, each `Axes`
 * writes its axes to `collect`. The server reads the instances in the HTML of
 * that pass ({@link readPrerenderedAxes}). In the second pass, each `Axes`
 * starts from its read in `reads`. The page carries the reads as JSON
 * ({@link AXES_READS_ID}), and the client hydrates from the same reads.
 */
export type AxesPrerender = {
	/** The path of the page that the reads are for. Another page reads its own axes. */
	path: string
	/** The first read of each `Axes`, keyed by the `useId` of the `Axes`. */
	reads?: Record<string, AxesRead>
	/** The first pass of the prerender: each `Axes` writes its axes here, keyed by its `useId`. */
	collect?: Map<string, readonly Axis[]>
}

export const [AxesPrerenderContext, useAxesPrerender] = createContext<AxesPrerender | null>(
	'AxesPrerender',
	{ default: null },
)

/** The `id` of the script that carries the {@link AxesPrerender} of a page as JSON. */
export const AXES_READS_ID = 'axes-reads'

/**
 * The signatures of the instances of one `Axes`.
 *
 * @param instances - The wrapper of each instance, keyed `axis:value`.
 */
export function signaturesIn(instances: ReadonlyMap<string, Element>): AxisSignatures {
	const at = (axis: Axis, value: AxisValue) => instances.get(`${axis.name}:${value}`)

	return {
		form: (axis, value) => {
			const instance = at(axis, value)

			if (!instance) return null

			const label = valueLabel(value)

			return isStepAxis(axis) ? stepSignature(instance, label) : formSignature(instance, label)
		},
		look: (axis, value) => {
			const instance = at(axis, value)

			return instance ? lookSignature(instance, valueLabel(value)) : null
		},
	}
}

/**
 * Read the axes of each `Axes` in the HTML of the first pass of the
 * prerender. Each instance wrapper carries the `useId` of its `Axes`
 * (`data-axes`), its axis (`data-axis`), and its value (`data-value`).
 */
export function readPrerenderedAxes(
	root: ParentNode,
	collect: ReadonlyMap<string, readonly Axis[]>,
): Record<string, AxesRead> {
	const instances = new Map<string, Map<string, Element>>()

	for (const element of root.querySelectorAll('[data-slot=axis-value][data-axes]')) {
		const id = element.getAttribute('data-axes') ?? ''

		const own = instances.get(id) ?? new Map<string, Element>()

		own.set(`${element.getAttribute('data-axis')}:${element.getAttribute('data-value')}`, element)

		instances.set(id, own)
	}

	return Object.fromEntries(
		[...collect].map(([id, axes]) => [
			id,
			readAxes(axes, signaturesIn(instances.get(id) ?? new Map())),
		]),
	)
}

/**
 * The script that carries the reads of the prerender to the client, as JSON.
 * The client entry parses it before it hydrates ({@link parseAxesReads}).
 */
export function AxesReadsScript() {
	const prerender = useAxesPrerender()

	if (!prerender?.reads) return null

	const { path, reads } = prerender

	return (
		// React escapes the text of a script, so the JSON cannot close it.
		<script id={AXES_READS_ID} type="application/json" suppressHydrationWarning>
			{JSON.stringify({ path, reads })}
		</script>
	)
}

/** The reads of the prerender in the loaded page, or `null` when the page has none. */
export function parseAxesReads(): AxesPrerender | null {
	const text = document.getElementById(AXES_READS_ID)?.textContent

	return text ? (JSON.parse(text) as AxesPrerender) : null
}
