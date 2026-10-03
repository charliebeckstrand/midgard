import { createContext } from '../../core'
import { type AxesRead, type Axis, instanceKey, readAxes, signaturesIn } from './axes'

/**
 * The first read of the axes of each `Axes` on the page, which the build makes.
 * Thus the HTML of the page shows what the page shows after it hydrates.
 *
 * @remarks
 * The read takes the DOM of the instances, and the prerender runs no effect.
 * Thus the build renders a page with `Axes` two times. In the first pass, each
 * `Axes` writes its axes to `collect`, and the build reads the instances in the
 * HTML of that pass ({@link readPrerenderedAxes}). In the second pass, each
 * `Axes` starts from its read in `reads`. The page carries the reads as JSON
 * ({@link AxesReadsScript}), and the client hydrates from the same reads.
 *
 * The key of a read is the `useId` of its `Axes`. React gives a hydrated
 * component an id of one form and a component that mounts later an id of a
 * different form. Thus an `Axes` on a page that the reader opens later finds
 * no read, and it reads its own axes.
 */
export type AxesPrerender = {
	/** The first read of each `Axes`, keyed by its `useId`. */
	reads?: Record<string, AxesRead>
	/** The first pass: each `Axes` writes its axes here, keyed by its `useId`. */
	collect?: Map<string, readonly Axis[]>
}

export const [AxesPrerenderContext, useAxesPrerender] = createContext<AxesPrerender | null>(
	'AxesPrerender',
	{ default: null },
)

/** The `id` of the script that carries the reads. */
const AXES_READS_ID = 'axes-reads'

/**
 * Read the axes of each `Axes` in the HTML of the first pass. Each instance
 * wrapper carries the `useId` of its `Axes` (`data-axes`), its axis
 * (`data-axis`), and its value (`data-value`).
 */
export function readPrerenderedAxes(
	root: ParentNode,
	collect: ReadonlyMap<string, readonly Axis[]>,
): Record<string, AxesRead> {
	const instances = new Map<string, Map<string, Element>>()

	for (const element of root.querySelectorAll('[data-slot=axis-value][data-axes]')) {
		const id = element.getAttribute('data-axes') ?? ''

		const own = instances.get(id) ?? new Map<string, Element>()

		own.set(
			instanceKey(
				element.getAttribute('data-axis') ?? '',
				element.getAttribute('data-value') ?? '',
			),
			element,
		)

		instances.set(id, own)
	}

	return Object.fromEntries(
		[...collect].map(([id, axes]) => [
			id,
			readAxes(axes, signaturesIn(instances.get(id) ?? new Map())),
		]),
	)
}

/** The script that carries the reads to the client entry ({@link parseAxesReads}). */
export function AxesReadsScript() {
	const prerender = useAxesPrerender()

	if (!prerender?.reads) return null

	return (
		// React escapes the text of a script, so the JSON cannot close it.
		<script id={AXES_READS_ID} type="application/json" suppressHydrationWarning>
			{JSON.stringify({ reads: prerender.reads })}
		</script>
	)
}

/** The reads in the loaded page, or `null` when the page has none. */
export function parseAxesReads(): AxesPrerender | null {
	const text = document.getElementById(AXES_READS_ID)?.textContent

	return text ? (JSON.parse(text) as AxesPrerender) : null
}
