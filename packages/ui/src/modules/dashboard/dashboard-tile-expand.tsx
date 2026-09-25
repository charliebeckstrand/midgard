'use client'

import { Maximize2 } from 'lucide-react'
import { type ReactNode, type RefObject, useEffect, useRef, useState } from 'react'
import { Button } from '../../components/button'
import {
	Dialog,
	DialogBody,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../../components/dialog'
import { Icon } from '../../components/icon'
import { cn } from '../../core'
import { k } from '../../recipes/kata/dashboard'
import { DashboardTileGuard } from './dashboard-tile-boundary'
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
	/** Receives each error that a boundary in the dialog catches. */
	onError: (error: unknown) => void
	/** The tile shell, which finds the element that takes the focus when an open dialog unmounts. */
	shell: RefObject<HTMLElement | null>
	/** The widget. */
	children?: ReactNode
}

/**
 * Moves the focus to the grip of a tile, else to the board, after the control
 * unmounts with its dialog open. The focus therefore never falls to the page.
 * The unmount of the dialog can return the focus in a microtask, so this focus
 * runs in a later microtask.
 */
function handBackFocus(shell: HTMLElement | null): void {
	queueMicrotask(() => {
		if (!shell?.isConnected) return

		const grip = shell.querySelector<HTMLElement>('[data-slot="dashboard-handle"]')

		;(grip ?? shell.closest<HTMLElement>('[data-slot="dashboard"]'))?.focus()
	})
}

/**
 * The expand control of a tile at rest, and the dialog that it opens. The dialog
 * renders the widget a second time, at a larger size, inside the scope of the
 * same tile. The widget therefore sees the same query in the dialog as on the
 * board, and a selection that it makes there records the same tile.
 *
 * Edit mode unmounts the control. When the dialog is open then, it closes, and
 * the focus goes to the grip of the tile. A tile with no grip, such as a static
 * tile, gives the focus to the board.
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
	shell,
	children,
}: DashboardTileExpandProps) {
	const [open, setOpen] = useState(false)

	// The dialog mounts on the first open. Until then, a render of the tile runs none of its hooks.
	const [seen, setSeen] = useState(false)

	// The cleanup of an unmount reads the open state that the last render committed.
	const openRef = useRef(false)

	useEffect(() => {
		openRef.current = open
	}, [open])

	useEffect(() => {
		return () => {
			if (openRef.current) handBackFocus(shell.current)
		}
	}, [shell])

	return (
		<>
			<DialogTrigger
				open={open}
				onClick={() => {
					setSeen(true)

					setOpen(true)
				}}
			>
				<Button
					type="button"
					variant="bare"
					size="sm"
					data-slot="dashboard-tile-expand"
					aria-label={`Expand ${label}`}
				>
					<Icon icon={<Maximize2 />} />
				</Button>
			</DialogTrigger>

			{seen && (
				<Dialog
					open={open}
					onOpenChange={setOpen}
					width="5xl"
					{...(title === undefined ? { 'aria-label': label } : {})}
				>
					{(title !== undefined || description !== undefined) && (
						<DialogHeader>
							{title !== undefined && <DialogTitle>{title}</DialogTitle>}

							{description !== undefined && (
								// The guard holds the whole slot. A failed description then leaves no empty
								// element for the `aria-describedby` of the dialog.
								<DashboardTileGuard label={label} onError={onError}>
									<DialogDescription>{description}</DialogDescription>
								</DashboardTileGuard>
							)}
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
			)}
		</>
	)
}
