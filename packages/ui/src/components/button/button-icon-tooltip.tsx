'use client'

import { Children, type ComponentProps, type ReactElement } from 'react'
import { ariaAttr } from '../../core/aria-attr'
import { dataAttr } from '../../core/data-attr'
import type { FloatingPlacement } from '../../hooks/use-floating-panel'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { Button } from './button'

/** Props for {@link ButtonIconTooltip}: the glyph and its naming, plus anything `Button` takes. @internal */
type ButtonIconTooltipProps = {
	/** Names the control for assistive tech. Also the tooltip, unless `tooltip` says more. */
	label: string
	/**
	 * The glyph, wrapped in {@link Icon} here so a caller passes the bare element. A
	 * list gives glyphs that the CSS shows one at a time, such as one for each layout.
	 */
	icon: ReactElement | readonly ReactElement[]
	/**
	 * Disables the control but keeps it focusable. It is `aria-disabled`, stays in the
	 * tab order or the arrow order of a toolbar, and drops each press.
	 *
	 * @remarks Not the native `disabled`. A press can disable its own control, such as a
	 * zoom step at the last level, and a native `disabled` then drops the focus to the
	 * page (WCAG 2.4.3). The WAI-ARIA toolbar pattern keeps a disabled item focusable too.
	 */
	disabled: boolean
	/**
	 * Tooltip text where it carries more than the label, such as the zoom buttons of the
	 * PDF viewer, which name the level they step to.
	 * @defaultValue the `label`.
	 */
	tooltip?: string
	/**
	 * The side of the tooltip. A group of these buttons puts it across the axis
	 * that the group runs along. A hover tooltip takes the pointer (WCAG 2.2
	 * SC 1.4.13), so a tooltip on the next button takes the press on that button.
	 * @defaultValue 'top'
	 */
	tooltipPlacement?: FloatingPlacement
	/**
	 * Held-down treatment: `soft`'s wash while on, `plain` while off.
	 *
	 * @remarks The quietest fill that still reads as held down. It leaves the button the same
	 * size, so a bar does not reflow as a control flips. Left on the default zinc, because
	 * a bar of such controls is chrome. In the PDF viewer, the regions on the page own the
	 * color vocabulary, and a blue toolbar button would compete with the highlights it
	 * switches.
	 *
	 * Needed because each toggle of the PDF toolbar keeps its glyph, and names the *action* rather
	 * than the state ("Hide highlights" while they are shown). Without it the only difference
	 * between on and off is an ARIA attribute no recipe targets. A pointer user can see
	 * nothing.
	 *
	 * A flag here rather than `ToggleIconButton`, which is the package's designated two-state
	 * control. That one cross-fades between two icons, motion that no other control of the bar has, on
	 * controls whose glyph never changes. It also hardcodes `variant="bare"`, so it could not
	 * take this swap. The two-state semantics belong to the caller's ARIA attribute, not to
	 * that component.
	 * @defaultValue false
	 */
	active?: boolean
	/*
	 * Plus the `<button>` attributes, less the ones this component or `Button`'s recipe owns.
	 * `color` and `prefix` are legacy HTML attributes that collide with `Button`'s variant axis
	 * and its adornment slot; neither has a use here.
	 */
} & Omit<
	ComponentProps<'button'>,
	'aria-label' | 'children' | 'color' | 'disabled' | 'prefix' | 'type'
> & { 'data-slot'?: string }

/**
 * An icon button with its label as its accessible name and its tooltip. A control at
 * the end of its range keeps the focus: `disabled` makes it `aria-disabled`, and it
 * drops each press. The toolbar of the PDF viewer and the zoom buttons of a map use it.
 *
 * @remarks Rest props reach the `Button`, and are spread **before** the wiring this
 * component owns (the type, the accessible name and the variant), per
 * [CONVENTIONS.md](CONVENTIONS.md) §3.9. Thus a caller can stamp the state of its own
 * control without a second copy of this part. Examples are `aria-pressed` on a toggle,
 * and `aria-expanded` on a control that discloses a panel. A control that discloses
 * nothing passes no `aria-expanded`, and the button then has no such attribute. Three
 * copies of the part had grown in the PDF viewer before the spread existed, and a fourth
 * in the map before the part moved here.
 * @internal
 */
export function ButtonIconTooltip({
	label,
	icon,
	disabled,
	tooltip,
	tooltipPlacement,
	active = false,
	onClick,
	...props
}: ButtonIconTooltipProps) {
	return (
		<Tooltip placement={tooltipPlacement}>
			<TooltipTrigger>
				<Button
					// A view control writes no field, so a locked scope, such as a
					// submitting form, leaves it live.
					lockable={false}
					{...props}
					type="button"
					variant={active ? 'soft' : 'plain'}
					aria-label={label}
					aria-disabled={ariaAttr(disabled)}
					data-disabled={dataAttr(disabled)}
					onClick={disabled ? undefined : onClick}
				>
					{Children.map(icon, (glyph) => (
						<Icon icon={glyph} />
					))}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip ?? label}</TooltipContent>
		</Tooltip>
	)
}
