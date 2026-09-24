import { nextPaint } from './frames'
import { present } from './present'
import { getSlot } from './slot-queries'

/** The data body of a grid: the first `<tbody>` of the table in its scroller. */
export function windowBody(container: HTMLElement): HTMLTableSectionElement {
	return present<HTMLTableSectionElement>(
		getSlot(container, 'grid-scroll').querySelector('table > tbody'),
		'the data body',
	)
}

/**
 * Samples the offset of an anchor from `start` after each of `count` paints,
 * and returns the largest. It finds the anchor again on each sample, because
 * a window can mount a new node for the same row. An anchor that is missing
 * has left the window, which counts as an infinite drift.
 *
 * @param anchor - Finds the anchor row.
 * @param start - The top of the anchor before the change.
 * @param count - The count of paints to sample.
 */
export async function sampleDrift(
	anchor: () => HTMLElement | null,
	start: number,
	count: number,
): Promise<number> {
	let drift = 0

	for (let i = 0; i < count; i++) {
		await nextPaint()

		const top = anchor()?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY

		drift = Math.max(drift, Math.abs(top - start))
	}

	return drift
}

/**
 * Records a value for each reveal transition that starts under `root`: a
 * `transitionrun` of `grid-template-rows`. `pick` maps the row of the
 * transition, if any, to the value it records.
 */
export function watchReveals<V>(
	root: HTMLElement,
	pick: (row: HTMLTableRowElement | null, event: TransitionEvent) => V,
): V[] {
	const runs: V[] = []

	root.addEventListener('transitionrun', (event) => {
		const transition = event as TransitionEvent

		if (transition.propertyName !== 'grid-template-rows') return

		runs.push(pick((transition.target as Element).closest('tr'), transition))
	})

	return runs
}
