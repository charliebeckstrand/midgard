'use client'

import { type ReactNode, type RefObject, useEffect, useState } from 'react'
import { CardDescription, CardTitle } from '../../components/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { useEscapeLayer } from '../../hooks/use-escape-layer'
import { useTruncation } from '../../hooks/use-truncation'
import { k } from '../../recipes/kata/dashboard'
import { hasContent } from '../../utilities/children'
import { useDashboardTitleLevel } from './context'
import { DashboardTileGuard } from './dashboard-tile-boundary'

/**
 * Whether the keyboard focus is in `scope`, until an Escape press. The focus
 * must match `:focus-visible`, so a click that focuses a widget of the tile
 * shows no reveal. Escape puts the reveal away until the focus leaves the
 * scope (WCAG 1.4.13), as it closes a `Tooltip`.
 *
 * @param scope - The tile. A focus on any of its controls or of its widget counts.
 * @param enabled - Whether the reveal has text to show. A reveal with none takes no Escape press.
 * @internal
 */
function useKeyboardFocusWithin(scope: RefObject<HTMLElement | null>, enabled: boolean): boolean {
	const [focused, setFocused] = useState(false)

	const [dismissed, setDismissed] = useState(false)

	// Adjusted during render: the focus that the press dismissed has left the scope.
	if (dismissed && !focused) setDismissed(false)

	useEscapeLayer({
		open: enabled && focused && !dismissed,
		layered: false,
		onDismiss: () => setDismissed(true),
	})

	useEffect(() => {
		const node = scope.current

		if (!node) return

		const focusIn = (event: FocusEvent) => {
			const target = event.target

			setFocused(target instanceof Element && target.matches(':focus-visible'))
		}

		const focusOut = (event: FocusEvent) => {
			if (!node.contains(event.relatedTarget as Node | null)) setFocused(false)
		}

		node.addEventListener('focusin', focusIn)

		node.addEventListener('focusout', focusOut)

		return () => {
			node.removeEventListener('focusin', focusIn)

			node.removeEventListener('focusout', focusOut)
		}
	}, [scope])

	return focused && !dismissed
}

/** Props for {@link DashboardTileHeading}. @internal */
type DashboardTileHeadingProps = {
	/** The id of the title element, which names the tile. */
	titleId: string
	/** The heading of the tile. */
	title?: string
	/** The muted line under the title. */
	description?: ReactNode
	/** The name of the tile, for the guard of the description. */
	label: string
	/** The tile shell. A keyboard focus in it shows the reveal. */
	shell: RefObject<HTMLElement | null>
	/** Edit mode is on, so the tooltip stays closed. */
	editing: boolean
	/** Receives each error that the guard of the description catches. */
	onError: (error: unknown) => void
}

/**
 * The title block of a tile: the title, a heading at the `titleLevel` of the
 * dashboard, over the description. Each line is clipped to one line. While a
 * line truncates, a hover of the block and a keyboard focus in the tile show
 * the text of each line that truncates in a tooltip (WCAG 1.4.10). The title is
 * not focusable, so the keyboard reaches it through the controls and the
 * widget of the tile. This is the reveal of the chart header and the grid
 * header. The title names the tile, so the tooltip adds no description.
 *
 * @remarks In edit mode the tooltip stays closed.
 * @internal
 */
function DashboardTileHeading({
	titleId,
	title,
	description,
	label,
	shell,
	editing,
	onError,
}: DashboardTileHeadingProps) {
	const slots = k()

	const level = useDashboardTitleLevel()

	// The tile arms the measure of each line: a hover of the block is in the tile,
	// and the keyboard focus that shows the reveal is on a control of the tile.
	const [titleRef, titleCut] = useTruncation<HTMLHeadingElement>({ armRef: shell })

	const [descriptionRef, descriptionCut] = useTruncation<HTMLParagraphElement>({ armRef: shell })

	const enabled = (titleCut || descriptionCut) && !editing

	const held = useKeyboardFocusWithin(shell, enabled)

	const hasDescription = hasContent(description)

	return (
		<Tooltip disabled={!enabled} open={held}>
			<TooltipTrigger aria-describedby={undefined}>
				<div className={slots.heading}>
					{title !== undefined && (
						<CardTitle ref={titleRef} id={titleId} level={level} className="truncate">
							{title}
						</CardTitle>
					)}

					{hasDescription && (
						<DashboardTileGuard label={label} onError={onError}>
							<CardDescription ref={descriptionRef} className="truncate">
								{description}
							</CardDescription>
						</DashboardTileGuard>
					)}
				</div>
			</TooltipTrigger>

			<TooltipContent>
				{titleCut && <span className="block">{title}</span>}

				{/* The copy of the description renders outside the guard of the row, so it takes a guard of its own. */}
				{descriptionCut && hasDescription && (
					<DashboardTileGuard label={label} onError={onError}>
						<span className="block">{description}</span>
					</DashboardTileGuard>
				)}
			</TooltipContent>
		</Tooltip>
	)
}

/** Props for {@link DashboardTileHeader}. @internal */
export type DashboardTileHeaderProps = {
	/** The name of the tile. */
	label: string
	/** The id of the title element, which names the tile. */
	titleId: string
	/** The heading of the tile. */
	title?: string
	/** The muted line under the title. */
	description?: ReactNode
	/** The app controls, after the title block. */
	actions?: ReactNode
	/** The control that clears the selection of the tile, before the actions. */
	clear?: ReactNode
	/** The element where the widget puts its own controls, after the actions. */
	widget?: ReactNode
	/** The drag grip in edit mode, or `null`. */
	handle: ReactNode
	/** The standard controls of the tile, at the far end of the row. */
	controls?: ReactNode
	/** The tile shell. A keyboard focus in it shows the truncation reveal of the title block. */
	shell: RefObject<HTMLElement | null>
	/** Edit mode is on, so the title block shows no tooltip. */
	editing: boolean
	/** Receives each error that a guard of the row catches. */
	onError: (error: unknown) => void
}

/**
 * The header row of a tile: the drag grip, the title block, the actions, the
 * controls of the widget, and the standard controls. The standard controls
 * come last, so the expand control is at the far end of the row.
 * The grip enters and leaves with edit mode on the same row. The content box
 * therefore keeps its height, and a widget never re-lays out on the switch.
 *
 * The row is outside the boundaries of the content box. The description and the
 * actions of the app therefore each get a guard. A throw in one does not reach the board.
 *
 * @internal
 */
export function DashboardTileHeader({
	label,
	titleId,
	title,
	description,
	actions,
	clear,
	widget,
	handle,
	controls,
	shell,
	editing,
	onError,
}: DashboardTileHeaderProps) {
	const slots = k()

	return (
		<div data-slot="card-header" className={slots.header}>
			{handle}

			<DashboardTileHeading
				titleId={titleId}
				title={title}
				description={description}
				label={label}
				shell={shell}
				editing={editing}
				onError={onError}
			/>

			<div data-slot="dashboard-tile-actions" className={slots.actions}>
				{clear}

				{hasContent(actions) && (
					<DashboardTileGuard label={label} onError={onError}>
						{actions}
					</DashboardTileGuard>
				)}
			</div>

			{widget}

			{controls}
		</div>
	)
}
