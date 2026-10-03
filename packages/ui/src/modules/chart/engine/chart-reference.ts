/**
 * The reference-line schema: the line that the `reference` prop of a cartesian
 * chart takes. It also holds the pure reads of the line that the hook and the
 * legend share. It holds no React, so a module that reads the schema does not
 * import the rules that {@link ChartReferenceLines} draws.
 */

import type { ChartColorSlot } from '../../../recipes/kata/chart'
import { keyByOccurrence } from '../../../utilities'
import type { ChartValueAxisId } from './chart-axes/schema'
import { type ChartColor, rawColor, resolvePaint, textClass } from './chart-color/paint'
import type { ChartLegendReference } from './chart-legend/legend'

/**
 * One reference line: a value-axis annotation drawn across the plot — a target,
 * threshold, budget, or average to read the marks against. It sits at a raw
 * domain `value`, so its position tracks the scale. The value also folds into
 * the domain, keeping an off-data target on-frame rather than clamped to an
 * edge. A pinned `min` or `max` can still leave it out. The rule then draws
 * nothing, and the legend and the visually-hidden list still name it.
 */
export type ChartReferenceLine = {
	/** The domain value the line sits at, in the same units the series are read in. */
	value: number
	/**
	 * A short label naming the rule. It is carried in its hover tooltip and legend
	 * chip. It is also drawn beside the rule at its far end, once a chart's
	 * `labels.references` is on. Omitted, the rule reads by its value alone.
	 */
	label?: string
	/**
	 * The rule's color: a named palette slot (rendered through the CVD-safe slot
	 * classes), or any raw CSS color string applied inline. That is a hex like
	 * `'#e11d48'`, an `'oklch(…)'`, or any value CSS accepts. Defaults to the
	 * neutral de-emphasis slot, so a reference reads as chrome until colored for
	 * emphasis.
	 * @defaultValue 'zinc'
	 */
	color?: ChartColor
	/**
	 * Dash the rule — the annotation convention, telling a reference apart from a
	 * data line — or draw it solid.
	 * @defaultValue true
	 */
	dashed?: boolean
	/**
	 * The value axis the rule's `value` reads against. It folds into that
	 * axis's domain and draws at that axis's projection, so a `y2` threshold
	 * annotates the `y2`-bound series rather than the primary scale.
	 * @defaultValue 'y'
	 */
	axis?: ChartValueAxisId
}

/** Formats a reference value with its own axis's formatter. @internal */
export type ReferenceFormat = (value: number, axis: ChartValueAxisId) => string

/**
 * The text of one rule: its label and its value, or its value alone where it
 * has no label. The visually-hidden list reads it, and the keyboard cursor
 * speaks it for a stop on the rule.
 *
 * @internal
 */
export function referenceText(line: ChartReferenceLine, format: ReferenceFormat): string {
	const value = format(line.value, line.axis ?? 'y')

	return line.label ? `${line.label}: ${value}` : value
}

/** The neutral de-emphasis slot a reference takes until colored. @internal */
export const DEFAULT_REFERENCE_COLOR = 'zinc' satisfies ChartColorSlot

/**
 * One unique key per rule: its axis and its label, or its axis and its value
 * where it has no label, with the occurrence added to a repeat. The label is
 * the identity of a labeled rule, so a rule such as an average keeps its key
 * when its value moves with the data. Two rules can share a key on two axes, or
 * on one axis. The drawn rules and the parity list key their React nodes on it,
 * and the legend toggle keys each hidden rule on it.
 *
 * @internal
 */
export function ruleKeys(lines: readonly ChartReferenceLine[]): string[] {
	return keyByOccurrence(
		lines.map(
			(line) =>
				`${line.axis ?? 'y'}:${line.label === undefined ? `value:${line.value}` : `label:${line.label}`}`,
		),
	).map(({ key }) => key)
}

/**
 * The legend entries for the reference lines: each finite rule's label, or its
 * value where it is unlabeled. Each is keyed to a line swatch in the rule's
 * color, a palette slot through its `text` class or a raw color inline. The
 * swatch is dashed to match the rule, unless the rule is drawn solid. All of it
 * resolves the same way the rule itself paints. The chart legend renders these
 * as switches beside the series switches when it shows, each toggling its rule
 * off; {@link ChartReferenceList} still carries the assistive-tech parity.
 *
 * @internal
 */
export function referenceLegendItems(
	reference: ChartReferenceLine[] | undefined,
	format: ReferenceFormat,
): ChartLegendReference[] {
	return (reference ?? [])
		.map((line, index) => ({ line, index }))
		.filter(({ line }) => Number.isFinite(line.value))
		.map(({ line, index }) => {
			const paint = resolvePaint(line.color ?? DEFAULT_REFERENCE_COLOR)

			const label = line.label ?? format(line.value, line.axis ?? 'y')

			// Mirror the rule: dashed unless it is explicitly drawn solid.
			const dashed = line.dashed !== false

			// Carry the rule's own array index — the plot rules key their emphasis off
			// it, and a non-finite rule dropped from the chips leaves a gap the plot
			// keeps, so the chip must name the index rather than its own position.
			return { index, label, swatchClass: textClass(paint) ?? '', color: rawColor(paint), dashed }
		})
}
