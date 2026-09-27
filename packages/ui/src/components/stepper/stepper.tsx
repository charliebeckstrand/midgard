'use client'

import { type ComponentProps, type ReactNode, useId, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useA11yRoving, useMinBreakpoint } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/stepper'
import { Stack } from '../../structure/stack'
import { partitionByType } from '../../utilities/flatten-children'
import { StepperContext, type StepperLayout, type StepperOrientation } from './context'
import { StepperPanels } from './stepper-panels'

/** Props for {@link Stepper}: the controlled `value`, its `onValueChange` handler, `linear`/`orientation` modifiers, and step children. */
export type StepperProps = Omit<
	ComponentProps<'div'>,
	'className' | 'children' | 'onKeyDown' | 'aria-label' | 'aria-orientation' | 'defaultValue'
> & {
	/**
	 * Controlled current step index. Pair with `onValueChange`.
	 *
	 * @remarks
	 * Stepper is index-only and takes no `null`, as an exemption from
	 * CONVENTIONS §7.3. A flow always has a current step. `undefined` leaves
	 * the stepper uncontrolled.
	 */
	value?: number
	/**
	 * Initial step index when uncontrolled.
	 * @defaultValue 0
	 */
	defaultValue?: number
	onValueChange?: (value: number) => void
	/**
	 * Restricts navigation to completed and current steps.
	 * @defaultValue false
	 */
	linear?: boolean
	orientation?: StepperOrientation
	/**
	 * How {@link StepperPanel}s off the current step are held.
	 *
	 * @remarks
	 * Defaults to `active` — only the current step's panel is mounted, so
	 * stepping away discards whatever it held and stepping back rebuilds it
	 * empty. A flow whose panels carry entry wants `lazy` — a form split across
	 * steps, say. It mounts each panel on its first visit, then holds it in
	 * `<Activity mode="hidden">`. That preserves its state and its DOM, so scroll
	 * position and uncontrolled inputs survive, while its effects stay torn down.
	 * `always` mounts every panel up front, paying the whole flow's first render
	 * before the first step is answered.
	 *
	 * @defaultValue 'active'
	 */
	mount?: Mount
	className?: string
	children?: ReactNode
}

// Separates row content (steps, separators) from the panels group.
function partitionStepperChildren(children: ReactNode): {
	rowChildren: ReactNode[]
	panelsChildren: ReactNode[]
} {
	const { matched, rest } = partitionByType(children, StepperPanels)

	return { rowChildren: rest, panelsChildren: matched }
}

/**
 * Controlled, indexed multi-step flow keyed by a numeric `value`. Partitions
 * its children into a `role="toolbar"` step row and a `<StepperPanels>` group,
 * scopes an `ActiveIndicator` for the current-step marker, and shares step state
 * via context. Each `<StepperStep>` derives its completed/current/upcoming state
 * by comparing its own index against `value`.
 *
 * @remarks
 * Client component (`'use client'`). Without `orientation`, the row is
 * `vertical` below 640px and `horizontal` from it, since a horizontal row
 * overflows narrow screens. CSS picks that layout, so the server render does
 * not shift after hydration. The arrow-key axis and `aria-orientation` follow
 * the viewport in JavaScript. When `onValueChange` is set, steps
 * render as buttons and the row is a single Tab stop with roving arrow-key
 * navigation; `linear` then disables upcoming steps. Compose `<StepperSkeleton>`
 * in loading trees.
 */
export function Stepper({
	value,
	defaultValue,
	onValueChange,
	linear = false,
	orientation,
	mount = 'active',
	className,
	children,
	...props
}: StepperProps) {
	const [current = 0, setCurrent] = useControllable<number>({
		value,
		defaultValue: defaultValue ?? 0,
		onValueChange: (next) => onValueChange?.(next ?? 0),
	})

	// Steps become interactive when the flow can actually advance: an
	// uncontrolled stepper owns its own index, while a controlled one needs a
	// handler. A `value`-only stepper stays a display-only progress readout.
	const interactive = onValueChange !== undefined || defaultValue !== undefined

	// Without an explicit orientation, CSS picks the layout, so the server render
	// and the first paint already match the viewport. Only the keyboard axis and
	// `aria-orientation` read the viewport in JavaScript.
	const layout: StepperLayout = orientation ?? 'responsive'

	const isDesktop = useMinBreakpoint('sm')

	const resolvedOrientation: StepperOrientation =
		orientation ?? (isDesktop ? 'horizontal' : 'vertical')

	const { rowChildren, panelsChildren } = useMemo(
		() => partitionStepperChildren(children),
		[children],
	)

	const rowRef = useRef<HTMLDivElement>(null)

	const baseId = useId()

	const handleKeyDown = useA11yRoving(rowRef, {
		itemSelector: 'button[data-slot="stepper-step"]:not(:disabled)',
		orientation: resolvedOrientation,
		// Step row is a single Tab stop (role="toolbar"); arrows move across steps,
		// resting on the current step. Gated to interactive steppers (matching the
		// keydown below): a display-only stepper renders no step buttons, so the
		// tab-stop effect — a focusin listener and MutationObserver — would only spin.
		manageTabIndex: interactive,
		activeSelector: '[aria-current="step"]',
	})

	const hasPanels = panelsChildren.length > 0

	const contextValue = useMemo(
		() => ({
			value: current,
			onValueChange: interactive ? setCurrent : undefined,
			layout,
			linear,
			baseId,
			hasPanels,
			mount,
		}),
		[current, interactive, setCurrent, layout, linear, baseId, hasPanels, mount],
	)

	const row = (
		<div
			{...props}
			ref={rowRef}
			data-slot="stepper"
			data-orientation={resolvedOrientation}
			role="toolbar"
			aria-label="Steps"
			aria-orientation={resolvedOrientation}
			onKeyDown={interactive ? handleKeyDown : undefined}
			className={cn(k.root({ orientation: layout }), className)}
		>
			{rowChildren}
		</div>
	)

	return (
		<StepperContext value={contextValue}>
			<ActiveIndicatorScope>
				{panelsChildren.length === 0 ? (
					row
				) : (
					<Stack gap="xl" data-slot="stepper-root">
						{row}
						{panelsChildren}
					</Stack>
				)}
			</ActiveIndicatorScope>
		</StepperContext>
	)
}
