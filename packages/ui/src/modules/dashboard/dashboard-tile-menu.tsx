'use client'

import {
	ArrowsFromAxisDashedHorizontal,
	ArrowsFromAxisDashedVertical,
	ArrowsToAxisDashedHorizontal,
	ArrowsToAxisDashedVertical,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	EllipsisVertical,
} from 'lucide-react'
import { IconButton } from '../../components/icon-button'
import { MenuMove, type MenuMoveItem } from '../../components/menu/menu-move'
import { Glyph } from '../../primitives/glyph'
import { reorderMessages } from '../../primitives/intl/intl-reorder'
import { useIntl } from '../../primitives/intl/use-intl'
import { useDashboardActions } from './context'
import { keepFocusOnBoard } from './dashboard-focus'
import { dashboardMessages } from './dashboard-messages'
import type { DashboardTileStep } from './use-dashboard-steps'

/** The label and the glyph of each item of the menu. */
const ITEMS = {
	left: { label: reorderMessages.moveLeft, icon: <Glyph icon={ChevronLeft} /> },
	right: { label: reorderMessages.moveRight, icon: <Glyph icon={ChevronRight} /> },
	up: { label: reorderMessages.moveUp, icon: <Glyph icon={ChevronUp} /> },
	down: { label: reorderMessages.moveDown, icon: <Glyph icon={ChevronDown} /> },
	wider: {
		label: dashboardMessages.increaseWidth,
		icon: <Glyph icon={ArrowsFromAxisDashedVertical} />,
	},
	narrower: {
		label: dashboardMessages.decreaseWidth,
		icon: <Glyph icon={ArrowsToAxisDashedVertical} />,
	},
	taller: {
		label: dashboardMessages.increaseHeight,
		icon: <Glyph icon={ArrowsFromAxisDashedHorizontal} />,
	},
	shorter: {
		label: dashboardMessages.decreaseHeight,
		icon: <Glyph icon={ArrowsToAxisDashedHorizontal} />,
	},
} as const

/** Whether a step changes the place of the tile, and not its span. */
const isMove = (step: DashboardTileStep) =>
	step === 'left' || step === 'right' || step === 'up' || step === 'down'

/** Props for {@link DashboardTileMenu}. @internal */
export type DashboardTileMenuProps = {
	/** The id of the tile. */
	id: string
	/** The name of the tile, for the name of the button. */
	label: string
	/** The class of the button, such as the floating form on a tile with no header row. */
	className?: string
}

/**
 * The menu of a tile in edit mode: a single-pointer path, with no drag, to
 * each move and each resize of the tile (WCAG 2.2 SC 2.5.7). The grip and the
 * splitters stay the drag paths, and the arrow keys stay the keyboard paths.
 *
 * The menu reads the board when it opens, and it offers only the steps that
 * change the board, as the move menus of `Grid` do. The moves come first, and
 * a separator divides them from the size steps. A tile that can neither move
 * nor resize shows one disabled "No change" item. Each step commits at once,
 * and the live region tells the new place or the new span. The focus then goes
 * back to the button, so the next step is one press away.
 *
 * @internal
 */
export function DashboardTileMenu({ id, label, className }: DashboardTileMenuProps) {
	const intl = useIntl()

	const { tileSteps, stepTile } = useDashboardActions()

	const items = (steps: DashboardTileStep[]): MenuMoveItem[] =>
		steps.map((step) => ({
			key: step,
			label: intl.formatMessage(ITEMS[step].label),
			icon: ITEMS[step].icon,
			onAction: () => stepTile(id, step),
		}))

	const read = () => {
		const steps = tileSteps(id)

		return [items(steps.filter(isMove)), items(steps.filter((step) => !isMove(step)))]
	}

	return (
		<MenuMove read={read} empty={intl.formatMessage(dashboardMessages.noStep)}>
			<IconButton
				ref={keepFocusOnBoard}
				data-slot="dashboard-tile-menu"
				aria-label={intl.formatMessage(dashboardMessages.arrange, { label })}
				icon={EllipsisVertical}
				className={className}
			/>
		</MenuMove>
	)
}
