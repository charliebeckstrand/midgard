/**
 * The reference-line schema: the line that the `reference` prop of a cartesian
 * chart takes. It also holds the pure reads of the line that the hook and the
 * legend share. It holds no React, so a module that reads the schema does not
 * import the rules that {@link ChartReferenceLines} draws.
 */

import type { ChartColorSlot } from '../../../recipes/kata/chart'
import { keyByOccurrence } from '../../../utilities/key-by-occurrence'
import type { ChartValueAxisId } from './chart-axes/schema'
import { type ChartColor, rawColor, resolvePaint, textClass } from './chart-color/paint'
import type { ChartLegendReference } from './chart-legend/legend'
import type { ChartReadoutNote } from './types'

/** The keys that each arm of {@link ChartReferenceLine} takes. @internal */
type ChartReferenceShared = {
	/**
	 * A short name for the rule, such as `'Target'`. Give the name alone: the
	 * chart shows the value of a value rule after it. A value rule carries the
	 * name in its hover tooltip and its legend chip. Once a chart's
	 * `labels.references` is on, the rule draws the name and its value on the
	 * rule, and the legend drops its chip. Where the label already holds the
	 * value, such as `'Good 5%'`, set `labels.references` to `{ value: false }`,
	 * and the rule draws the label alone. A value rule with `valueDisplay:
	 * 'hover'` also draws the label alone. A category rule always draws the name
	 * near the top of the rule where it finds room, and the category readout shows
	 * it. Each rule breaks for the label that it draws. Omitted, a value rule
	 * reads by its value alone, and a category rule draws no label.
	 */
	label?: string
	/**
	 * Supporting text for the rule, such as what happened at an event. It reads
	 * after the label in the readout and in the visually-hidden list. It does not
	 * draw on the plot.
	 */
	description?: string
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
	 * Dash the rule (the annotation convention, telling a reference apart from a
	 * data line), or draw it solid.
	 * @defaultValue true
	 */
	dashed?: boolean
}

/**
 * A reference line at a value: a value-axis annotation drawn across the plot (a
 * target, threshold, budget, or average to read the marks against). It sits at
 * a raw domain `value`, so its position tracks the scale. The value also folds
 * into the domain, keeping an off-data target on-frame rather than clamped to an
 * edge. A pinned `min` or `max` can still leave it out. The rule then draws
 * nothing, and the legend and the visually-hidden list still name it.
 */
export type ChartReferenceValue = ChartReferenceShared & {
	/** The domain value the line sits at, in the same units the series are read in. */
	value: number
	category?: never
	/**
	 * The value axis the rule's `value` reads against. It folds into that
	 * axis's domain and draws at that axis's projection, so a `y2` threshold
	 * annotates the `y2`-bound series rather than the primary scale.
	 * @defaultValue 'y'
	 */
	axis?: ChartValueAxisId
	/**
	 * The color of the value in the standing label of the rule
	 * (`labels.references`): a named palette slot, or any raw CSS color. Omitted,
	 * the value takes the color of the rule, as the label does.
	 */
	valueColor?: ChartColor
	/**
	 * Where a labeled rule shows its value under `labels.references`. `'inline'`
	 * draws it after the label on the rule. `'hover'` draws the label alone, and
	 * keeps the hover tooltip and the keyboard stop of the rule, which read the
	 * label and the value. A rule with no label shows its value inline, because
	 * the value names it.
	 * @defaultValue 'inline'
	 */
	valueDisplay?: 'inline' | 'hover'
}

/**
 * A reference line at a category: a band-axis annotation drawn across the value
 * axis, such as a release, a launch, or a price change on a trend. It marks the
 * leading edge of the slot of its category on a chart that draws bars, and the
 * center of the band otherwise. It takes no legend chip and no keyboard stop:
 * its label and its description join the readout of its category, which the
 * pointer and the keyboard cursor both open. A category that the chart does
 * not draw draws no rule.
 */
export type ChartReferenceCategory = ChartReferenceShared & {
	/**
	 * The category the line marks: the raw `xKey` value of a row, as text. It is
	 * the same category that `onCategoryClick` reports.
	 */
	category: string
	value?: never
	axis?: never
	valueColor?: never
	valueDisplay?: never
}

/**
 * One reference line: a {@link ChartReferenceValue} at a value, or a
 * {@link ChartReferenceCategory} at a category. Both take the same label,
 * description, color, and dash, and draw over the marks.
 */
export type ChartReferenceLine = ChartReferenceValue | ChartReferenceCategory

/** Whether a reference line marks a category, not a value. @internal */
export function isCategoryReference(line: ChartReferenceLine): line is ChartReferenceCategory {
	return line.category !== undefined
}

/** Formats a reference value with its own axis's formatter. @internal */
export type ReferenceFormat = (value: number, axis: ChartValueAxisId) => string

/**
 * The text of one rule: its label and its value (or its category), or the
 * value alone where it has no label, then its description. The
 * visually-hidden list reads it, and the keyboard cursor speaks it for a stop
 * on a value rule. `formatCategory` writes a category as the axis does.
 *
 * @internal
 */
export function referenceText(
	line: ChartReferenceLine,
	format: ReferenceFormat,
	formatCategory: (category: string) => string = String,
): string {
	const at = isCategoryReference(line)
		? formatCategory(line.category)
		: format(line.value, line.axis ?? 'y')

	const text = line.label ? `${line.label}: ${at}` : at

	return line.description ? `${text}, ${line.description}` : text
}

/** The neutral de-emphasis slot a reference takes until colored. @internal */
export const DEFAULT_REFERENCE_COLOR = 'zinc' satisfies ChartColorSlot

/**
 * One unique key per rule: its axis and its label, or its axis and its value
 * (or its category) where it has no label, with the occurrence added to a
 * repeat. The label is
 * the identity of a labeled rule, so a rule such as an average keeps its key
 * when its value moves with the data. Two rules with one label on one axis
 * thus take two keys. The drawn rules and the parity list key their React
 * nodes on it, and the legend toggle keys each hidden rule on it.
 *
 * @internal
 */
export function ruleKeys(lines: readonly ChartReferenceLine[]): string[] {
	return keyByOccurrence(
		lines.map((line) => {
			if (isCategoryReference(line)) {
				return `x:${line.label === undefined ? `category:${line.category}` : `label:${line.label}`}`
			}

			return `${line.axis ?? 'y'}:${line.label === undefined ? `value:${line.value}` : `label:${line.label}`}`
		}),
	).map(({ key }) => key)
}

/**
 * The legend entries for the value reference lines: each finite rule's label,
 * or its value where it is unlabeled. A category rule takes no chip. Each is keyed to a line swatch in the rule's
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
		.flatMap((line, index) =>
			isCategoryReference(line) || !Number.isFinite(line.value) ? [] : [{ line, index }],
		)
		.map(({ line, index }) => {
			const paint = resolvePaint(line.color ?? DEFAULT_REFERENCE_COLOR)

			const label = line.label ?? format(line.value, line.axis ?? 'y')

			// Mirror the rule: dashed unless it is explicitly drawn solid.
			const dashed = line.dashed !== false

			// Carry the rule's own array index: the plot rules key their emphasis off
			// it, and a non-finite rule dropped from the chips leaves a gap the plot
			// keeps, so the chip must name the index rather than its own position.
			return { index, label, swatchClass: textClass(paint) ?? '', color: rawColor(paint), dashed }
		})
}

/**
 * The row of each category text: the first row whose raw category reads as it,
 * the match that `selectedCategories` uses. A category reference marks that
 * row.
 *
 * @internal
 */
export function categoryRows(rawCategories: readonly unknown[]): Map<string, number> {
	const rows = new Map<string, number>()

	rawCategories.forEach((category, index) => {
		const key = String(category ?? '')

		if (!rows.has(key)) rows.set(key, index)
	})

	return rows
}

/**
 * The readout notes of each category, aligned with `rawCategories`: one note
 * for each category reference at its row ({@link categoryRows}), in the order
 * of the prop. A rule with no label and no
 * description has nothing to say, so it adds no note. `undefined` when no rule
 * adds one, so a chart with no category reference carries no notes.
 *
 * @internal
 */
export function referenceNotes(
	reference: ChartReferenceLine[] | undefined,
	rawCategories: readonly unknown[],
): ChartReadoutNote[][] | undefined {
	const lines = reference ?? []

	const keys = ruleKeys(lines)

	const marked = lines.flatMap((line, index): [ChartReferenceCategory, string][] =>
		isCategoryReference(line) && (line.label || line.description)
			? [[line, keys[index] ?? '']]
			: [],
	)

	if (marked.length === 0) return undefined

	const notes: ChartReadoutNote[][] = rawCategories.map(() => [])

	const rows = categoryRows(rawCategories)

	for (const [line, key] of marked) {
		const row = rows.get(line.category)

		if (row === undefined) continue

		const paint = resolvePaint(line.color ?? DEFAULT_REFERENCE_COLOR)

		notes[row]?.push({
			key,
			text: line.label || (line.description ?? ''),
			description: line.label ? line.description : undefined,
			swatchClass: textClass(paint) ?? '',
			swatchColor: rawColor(paint),
			dashed: line.dashed !== false,
		})
	}

	return notes
}
