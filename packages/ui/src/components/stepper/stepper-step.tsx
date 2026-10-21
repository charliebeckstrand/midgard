'use client'

import { Children, type ComponentProps, type ReactNode, useMemo } from 'react'
import { cn, dataAttr } from '../../core'
import { useA11yDisclosure } from '../../hooks/a11y/use-a11y-disclosure'
import { useIntl } from '../../primitives/intl/use-intl'
import { useMountsEveryPanel } from '../../primitives/mount'
import { hasChildOfType, partitionByType } from '../../utilities/children'
import { StepperStepContext, type StepState, useStepper } from './context'
import { StepperIndicator } from './stepper-indicator'
import { stepperMessages } from './stepper-messages'

/**
 * Props for {@link StepperStep}: the step's `value` index, an optional `disabled` flag, and child indicator/title/description content.
 * The root `<li>` takes the rest. The step gives `value` a meaning of its own.
 */
export type StepperStepProps = Omit<ComponentProps<'li'>, 'value'> & {
	value: number
	/**
	 * Disables the step, so that a press does not select it.
	 * @defaultValue false
	 */
	disabled?: boolean
	/** The class of the step: the `<button>` of a step that a press selects, else the `<li>`. */
	className?: string
}

// Completed/current/upcoming differ visually by color and the checkmark glyph
// only (WCAG 1.4.1); the sr-only suffix names the state for AT. It comes last
// in the step, so AT reads the title first. The current step has no suffix:
// its aria-current="step" already reads as "current step".
const STATE_TEXT = {
	completed: stepperMessages.completed,
	current: undefined,
	upcoming: stepperMessages.notStarted,
} as const

/**
 * Derives a step's display state by comparing its index to the stepper's current value.
 *
 * @returns `'completed'` below the current value, `'current'` at it, `'upcoming'` above.
 * @internal
 */
function computeState(stepValue: number, value: number): StepState {
	if (stepValue < value) return 'completed'
	if (stepValue === value) return 'current'

	return 'upcoming'
}

/**
 * Splits children into the indicator and a content column, wrapping
 * non-indicator nodes in a `stepper-content` slot. A vertical step lays the
 * column beside the indicator. A horizontal step dissolves the column
 * (`display: contents`), so its title and description sit in the step like its
 * direct children.
 *
 * @internal
 */
function partitionChildren(children: ReactNode, contentClassName: string): ReactNode {
	const { matched: indicators, rest } = partitionByType(children, StepperIndicator)

	return (
		<>
			{indicators}
			<span data-slot="stepper-content" className={contentClassName}>
				{rest}
			</span>
		</>
	)
}

/**
 * Injects a default `<StepperIndicator>` when the consumer omits one.
 *
 * @remarks Returns an array, not a Fragment, so the step keeps one child list.
 * @internal
 */
function ensureIndicator(children: ReactNode): ReactNode {
	if (hasChildOfType(children, StepperIndicator)) return children

	return [<StepperIndicator key="__auto-stepper-indicator" />, ...Children.toArray(children)]
}

/**
 * A single step within a {@link Stepper}, identified by its `value` index.
 * Derives its `completed`/`current`/`upcoming` state from the stepper's current
 * value and exposes it to descendant indicator, title, and description slots.
 * Injects a default `<StepperIndicator>` when none is supplied.
 *
 * @remarks
 * Color and the checkmark glyph alone show the state, so an `sr-only` suffix
 * after the title and description ("completed"/"not started") names it for
 * assistive tech (WCAG 1.4.1). The current step has no suffix, because its
 * `aria-current="step"` already gives "current step".
 *
 * Renders as a `<button>` in an `<li>` (with `aria-current`, and `aria-controls`
 * wiring to the matching `<StepperPanel>`) when the stepper has an
 * `onValueChange` handler, otherwise a display-only `<li>` (with `aria-current`).
 * Both are items in the list of the stepper. In `linear` steppers, upcoming steps are disabled. It
 * splits children into the indicator and a content column. A vertical step
 * aligns the column with the indicator, and a horizontal step dissolves it.
 */
export function StepperStep({ value, disabled, className, children, ...props }: StepperStepProps) {
	const {
		value: currentValue,
		onValueChange,
		slots,
		linear,
		baseId,
		hasPanels,
		mount,
	} = useStepper()

	const intl = useIntl()

	const state = computeState(value, currentValue)

	// Shares baseId + value with StepperPanel; the two derive matching ids.
	const { triggerId, panelId } = useA11yDisclosure({ id: baseId, key: value })

	const everyPanel = useMountsEveryPanel(mount)

	const stepClasses = slots.step

	const classes = cn(stepClasses, className)

	const layoutChildren = useMemo(
		() => partitionChildren(ensureIndicator(children), slots.content),
		[children, slots.content],
	)

	const providerValue = useMemo(() => ({ value, state }), [value, state])

	const stateMessage = STATE_TEXT[state]

	const stateText = stateMessage && intl.formatMessage(stateMessage)

	const inner = (
		<StepperStepContext value={providerValue}>
			{layoutChildren}
			{stateText && <span className="sr-only">, {stateText}</span>}
		</StepperStepContext>
	)

	// Renders as a <button> when onValueChange is set. Linear mode disables upcoming steps.
	if (onValueChange !== undefined) {
		const isDisabled = disabled === true || (linear && state === 'upcoming')

		return (
			<li data-slot="stepper-item" {...props} className={slots.item}>
				<button
					type="button"
					id={triggerId}
					data-slot="stepper-step"
					data-state={state}
					aria-current={state === 'current' ? 'step' : undefined}
					// aria-controls needs the panel id to actually be in the DOM: guaranteed
					// for the current step, and for every step under a policy that mounts
					// them all, after hydration. The server markup holds the current panel
					// only.
					aria-controls={hasPanels && (state === 'current' || everyPanel) ? panelId : undefined}
					disabled={isDisabled}
					onClick={() => onValueChange(value)}
					className={cn(stepClasses, slots.button, className)}
				>
					{inner}
				</button>
			</li>
		)
	}

	return (
		<li
			{...props}
			// The roving model of the stepper selects this anchor, so it comes after the spread.
			data-slot="stepper-step"
			id={triggerId}
			data-state={state}
			aria-current={state === 'current' ? 'step' : undefined}
			data-disabled={dataAttr(disabled)}
			className={cn(classes, 'cursor-default')}
		>
			{inner}
		</li>
	)
}
