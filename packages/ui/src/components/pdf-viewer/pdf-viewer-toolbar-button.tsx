'use client'

import type { ComponentPropsWithoutRef, ReactElement } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

/** Props for {@link PdfViewerToolbarButton}: the glyph and its naming, plus anything `Button` takes. @internal */
type PdfViewerToolbarButtonProps = {
	/** Names the control for assistive tech. Also the tooltip, unless `tooltip` says more. */
	label: string
	/** The glyph, wrapped in {@link Icon} here so a caller passes the bare element. */
	icon: ReactElement
	disabled: boolean
	/**
	 * Tooltip text where it carries more than the label — the zoom controls name
	 * the level they step to.
	 * @defaultValue the `label`
	 */
	tooltip?: string
	/**
	 * Held-down treatment: `soft`'s wash while on, `plain` while off.
	 *
	 * @remarks The quietest fill that still reads as held down, and it leaves the button the
	 * same size, so the bar does not reflow as a control flips. Left on the default zinc: this
	 * bar is chrome, and the regions on the page below own the colour vocabulary — a blue
	 * toolbar button would compete with the very highlights it switches.
	 *
	 * Needed because every control in this bar keeps its glyph and names the *action* rather
	 * than the state ("Hide highlights" while they are shown), so without it the only
	 * difference between on and off is an ARIA attribute no recipe targets — nothing a pointer
	 * user can see.
	 *
	 * A flag here rather than `ToggleIconButton`, which is the package's designated two-state
	 * control: that one cross-fades between two icons — motion nothing else in this bar has, on
	 * controls whose glyph never changes — and it hardcodes `variant="bare"`, so it could not
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
	ComponentPropsWithoutRef<'button'>,
	'aria-label' | 'children' | 'color' | 'disabled' | 'prefix' | 'type'
> & { 'data-slot'?: string }

/**
 * One tooltipped icon button in the viewer's control bar. Every control across the toolbar,
 * the zoom group, and the document actions differs only in its glyph, label, handler and
 * state, so the Button and its Tooltip scaffold live here once.
 *
 * @remarks Rest props reach the `Button`, and are spread **before** the wiring this component
 * owns — the type, the accessible name and the variant — per [CONVENTIONS.md](CONVENTIONS.md)
 * §3.9. That is what lets a caller stamp the state its own control needs (`aria-pressed` on a
 * toggle, `aria-expanded` on one that discloses a panel) without a second copy of this
 * scaffold; three of them had grown before the spread existed. A button that discloses
 * nothing simply passes no `aria-expanded`, which renders no attribute rather than a false
 * one.
 * @internal
 */
export function PdfViewerToolbarButton({
	label,
	icon,
	disabled,
	tooltip,
	active = false,
	...props
}: PdfViewerToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					{...props}
					type="button"
					variant={active ? 'soft' : 'plain'}
					aria-label={label}
					disabled={disabled}
				>
					<Icon icon={icon} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip ?? label}</TooltipContent>
		</Tooltip>
	)
}
