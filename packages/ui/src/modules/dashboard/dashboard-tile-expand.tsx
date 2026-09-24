'use client'

import { Maximize2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../../components/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../../components/dialog'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileContent } from './dashboard-tile-content'

/** Props for {@link DashboardTileExpand}. @internal */
export type DashboardTileExpandProps = {
	/** The id of the tile, which the scope hooks read in the dialog too. */
	id: string
	/** The name of the tile, for the accessible names. */
	label: string
	/** The heading of the tile. Without it, the dialog takes `label` as its accessible name. */
	title?: string
	/** The muted line under the title. */
	description?: ReactNode
	/** What the dialog shows while the content suspends. */
	fallback: ReactNode
	/** Receives each error that the boundary in the dialog catches. */
	onError: (error: unknown) => void
	/** The widget. */
	children?: ReactNode
}

/**
 * The expand control of a tile at rest, and the dialog that it opens. The dialog
 * renders the widget a second time, at a larger size, inside the scope of the
 * same tile. The widget therefore sees the same query in the dialog as on the
 * board, and a selection that it makes there records the same tile.
 *
 * @internal
 */
export function DashboardTileExpand({
	id,
	label,
	title,
	description,
	fallback,
	onError,
	children,
}: DashboardTileExpandProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				type="button"
				variant="bare"
				size="sm"
				data-slot="dashboard-tile-expand"
				aria-label={`Expand ${label}`}
				onClick={() => setOpen(true)}
			>
				<Icon icon={<Maximize2 />} />
			</Button>

			<Dialog
				open={open}
				onOpenChange={setOpen}
				width="5xl"
				{...(title === undefined ? { 'aria-label': label } : {})}
			>
				{(title !== undefined || description !== undefined) && (
					<DialogHeader>
						{title !== undefined && <DialogTitle>{title}</DialogTitle>}

						{description !== undefined && <DialogDescription>{description}</DialogDescription>}
					</DialogHeader>
				)}

				<DialogBody>
					<div data-slot="dashboard-tile-expanded" className={cn(k.expanded)}>
						<DashboardTileContent
							id={id}
							label={label}
							mount="always"
							inert={false}
							fallback={fallback}
							onError={onError}
						>
							{children}
						</DashboardTileContent>
					</div>
				</DialogBody>

				<DialogFooter>
					<DialogClose>
						<Button type="button">Close</Button>
					</DialogClose>
				</DialogFooter>
			</Dialog>
		</>
	)
}
