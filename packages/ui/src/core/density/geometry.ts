/**
 * The geometry of density: the formulas that give the text, the line, the
 * icon, and the boxes of each step, in px. They are the spec of the
 * text-coupled ramps of `recipes/kiso/dan`. Tailwind reads each ramp as a
 * literal class, so the ramps keep their literals, and
 * `density-geometry.test.ts` holds each literal of {@link geometry} to its
 * formula.
 *
 * The text steps 2 px, and the line height is the text size plus 8 px, so the
 * line steps 2 px too. The icon is the text size plus 4 px, so it has a margin
 * of 2 px in the line box at each step. A button pads its icon-only square
 * 2 px more than its label, so the square is as tall as the labeled button. A
 * control pads as the label of a button does, so a control and a button of a
 * step have the same height.
 *
 * Tailwind's line heights step 4 px while its text sizes step 2 px, so
 * `density-text` couples the line height to the size. Each size is even, so an
 * icon centers on a whole pixel. An icon of a fractional size, such as
 * 17.5 px, sits at a quarter pixel and blurs on a 1x screen.
 *
 * A ramp that does not follow the text, such as a padding, a gap, a radius, or
 * a width, keeps its three inner values. {@link spacingSteps} gives its outer
 * values.
 *
 * @internal
 */

import type { DensityStep } from './steps'

/** The index of each step: `md` is 0, and each step is one more than the step below it. */
export const stepIndex = {
	xs: -2,
	sm: -1,
	md: 0,
	lg: 1,
	xl: 2,
} as const satisfies Record<DensityStep, number>

/** The size of the body text and of the label of a chip: 12 px to 20 px. */
export const textSize = (step: DensityStep) => 16 + 2 * stepIndex[step]

/** The size of small text: one step below the body text, 10 px to 18 px. */
export const smallTextSize = (step: DensityStep) => textSize(step) - 2

/** The line height of a text size: the size plus 8 px. */
export const leadingOf = (size: number) => size + 8

/** The line height of the body text: 20 px to 28 px. */
export const lineHeight = (step: DensityStep) => leadingOf(textSize(step))

/** The size of an icon and of each glyph beside a label: 16 px to 24 px. */
export const iconSize = (step: DensityStep) => textSize(step) + 4

/** The block padding of a labeled button and of a control, inside the ring: 3 px to 11 px. */
export const padY = (step: DensityStep) => 7 + 2 * stepIndex[step]

/** The padding of an icon-only button, inside the ring: 2 px more than {@link padY}. */
export const padIcon = (step: DensityStep) => padY(step) + 2

/** The height of a labeled button and of a control: 26 px to 50 px. */
export const boxHeight = (step: DensityStep) => lineHeight(step) + 2 * padY(step)

/** The padding of a bare icon button: 3 px to 7 px. */
export const padBare = (step: DensityStep) => 5 + stepIndex[step]

/** The box of a bare icon button: the icon and the bare padding, 22 px to 38 px. */
export const bareBox = (step: DensityStep) => iconSize(step) + 2 * padBare(step)

/** The height of a badge: the line of its label and a 3 px padding, 26 px to 34 px. */
export const badgeHeight = (step: DensityStep) => lineHeight(step) + 6

/** The thumb of a switch: the line height less 8 px, 12 px to 20 px. */
export const thumbSize = (step: DensityStep) => lineHeight(step) - 8

/**
 * Snaps a spacing length to the grid: the 1 px grid below 8 px, and the 2 px
 * grid from 8 px. A half rounds away from zero.
 */
const snap = (px: number) => {
	const size = Math.abs(px)

	const snapped = size < 8 ? Math.floor(size + 0.5) : 2 * Math.floor(size / 2 + 0.5)

	return Math.sign(px) * snapped
}

/**
 * The five values of a spacing ramp in px, from its values at `sm`, `md`, and
 * `lg`. Padding, gaps, radii, and widths do not follow the text, so each ramp
 * keeps the look of its three inner steps. The outer steps continue the
 * constant difference of the inner steps. When that difference gives `xs` a
 * value of 0 or less, the outer steps continue the ratio instead: `xs` is
 * sm²/md and `xl` is lg²/md, snapped to the grid. For example, 4/8/12 gives
 * 2/4/8/12/18.
 */
export function spacingSteps(sm: number, md: number, lg: number): number[] {
	const step = md - sm

	if (Math.sign(sm - step) === Math.sign(md)) return [sm - step, sm, md, lg, lg + step]

	return [snap((sm * sm) / md), sm, md, lg, snap((lg * lg) / md)]
}

/**
 * The indent of a nested tree item: the chevron, which is as wide as an icon,
 * and the row gap, which is the `sm` stop of the gap scale (4/8/12 at `sm`,
 * `md`, and `lg`). 18 px to 42 px.
 */
export const treeIndent = (step: DensityStep) =>
	iconSize(step) + (spacingSteps(4, 8, 12)[stepIndex[step] + 2] ?? Number.NaN)

/**
 * The ramps of `recipes/kiso/dan` that the formulas give, keyed by their path
 * in `dan`. Each formula gives the px value that the ramp renders at a step: a
 * ring utility subtracts its 1 px ring, and a text ramp gives its font size.
 */
export const geometry = {
	'text.body': textSize,
	'text.chip': textSize,
	'text.small': smallTextSize,
	'size.icon.base': iconSize,
	'size.icon.slot': iconSize,
	'size.icon.spinner': iconSize,
	'size.icon.small': (step) => smallTextSize(step) + 4,
	'size.check.box': iconSize,
	'size.check.mark': (step) => iconSize(step) - 4,
	'size.avatar.sidebar': (step) => iconSize(step) + 4,
	'size.tree.indent': iconSize,
	'size.row': lineHeight,
	'size.separator.base': smallTextSize,
	'size.separator.svg': smallTextSize,
	'size.line.text': lineHeight,
	'size.line.base': (step) => leadingOf(smallTextSize(step)),
	'size.switch.thumb': thumbSize,
	'size.switch.width': (step) => 2 * thumbSize(step) + 8,
	'size.button.base': boxHeight,
	'size.pagination': boxHeight,
	'size.control.base': boxHeight,
	'size.button.icon': bareBox,
	'size.badge.base': badgeHeight,
	'space.button.base': padIcon,
	'space.button.label': padY,
	'space.button.bare': padBare,
	'space.control.y': padY,
	'space.tree.indent': treeIndent,
} as const satisfies Record<string, (step: DensityStep) => number>
