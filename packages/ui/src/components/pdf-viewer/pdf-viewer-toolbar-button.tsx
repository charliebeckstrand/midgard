'use client'

import type { ReactElement } from 'react'
import { Button } from '../button'
import { Icon } from '../icon'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'

/** Props for {@link PdfViewerToolbarButton}. @internal */
type PdfViewerToolbarButtonProps = {
	/** Names the control for assistive tech. Also the tooltip, unless `tooltip` says more. */
	label: string
	/** The glyph, wrapped in {@link Icon} here so a caller passes the bare element. */
	icon: ReactElement
	disabled: boolean
	onClick: () => void
	/**
	 * Tooltip text where it carries more than the label — the zoom controls name
	 * the level they step to.
	 * @defaultValue the `label`
	 */
	tooltip?: string
	/**
	 * Disclosure state for a button that opens a panel, stamped as
	 * `aria-expanded`. Omit on a button that discloses nothing, which renders no
	 * attribute rather than a false one.
	 */
	expanded?: boolean
}

/**
 * One tooltipped icon button in the viewer's control bar. The eight controls
 * across the toolbar, the zoom group, and the document actions differ only in
 * their glyph, label, and handler, so the plain-variant Button and its Tooltip
 * scaffold live here once.
 *
 * @internal
 */
export function PdfViewerToolbarButton({
	label,
	icon,
	disabled,
	onClick,
	tooltip,
	expanded,
}: PdfViewerToolbarButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<Button
					type="button"
					variant="plain"
					aria-label={label}
					aria-expanded={expanded}
					disabled={disabled}
					onClick={onClick}
				>
					<Icon icon={icon} />
				</Button>
			</TooltipTrigger>
			<TooltipContent>{tooltip ?? label}</TooltipContent>
		</Tooltip>
	)
}
