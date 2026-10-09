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
	'size.check.box': iconSize,
	'size.check.mark': (step) => iconSize(step) - 4,
	'size.avatar.sidebar': (step) => iconSize(step) + 4,
	'size.tree.indent': iconSize,
	'size.row': lineHeight,
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
} as const satisfies Record<string, (step: DensityStep) => number>
