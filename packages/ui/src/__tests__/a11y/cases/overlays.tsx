import { useEffect } from 'react'
import { Button } from '../../../components/button'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../../components/command-palette'
import { Confirm } from '../../../components/confirm'
import { Dialog, DialogBody, DialogTitle } from '../../../components/dialog'
import { Drawer, DrawerBody, DrawerTitle } from '../../../components/drawer'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Sheet, SheetBody, SheetTitle } from '../../../components/sheet'
import { Toast } from '../../../components/toast'
import { ToastProvider, useToast } from '../../../providers/toast'
import { noop } from '../../helpers'
import type { Case } from './types'

/**
 * Mounts a `ToastProvider`, enqueues one toast on mount, and renders the
 * portalled viewport, exercising a live toast's role/name wiring statically.
 * Used by the overlays corpus.
 */
function ToastCase() {
	const { toast } = useToast()

	useEffect(() => {
		toast({ title: 'Saved', description: 'Your changes have been saved.', severity: 'success' })
	}, [toast])

	return <Toast />
}

/**
 * Overlay corpus: components whose content is portalled to `document.body`.
 * The gate (`baseline.test.tsx`) renders them open and asserts against the
 * document, not the render container. Each case is authored in its canonical
 * open state via a controlled `open`/`defaultOpen` prop.
 */
export const overlays: readonly Case[] = [
	[
		// Modal dialog: named by its title via aria-labelledby; aria-modal set.
		'dialog',
		<Dialog key="d" open onOpenChange={noop}>
			<DialogTitle>Create project</DialogTitle>
			<DialogBody>Enter the details for your new project.</DialogBody>
		</Dialog>,
	],
	[
		// Bottom drawer: a modal surface named by its title.
		'drawer',
		<Drawer key="dr" open onOpenChange={noop}>
			<DrawerTitle>Drawer</DrawerTitle>
			<DrawerBody>Slides up from the bottom.</DrawerBody>
		</Drawer>,
	],
	[
		// Side sheet: a modal surface named by its title.
		'sheet',
		<Sheet key="sh" open onOpenChange={noop}>
			<SheetTitle>Right Sheet</SheetTitle>
			<SheetBody>Slides in from the right.</SheetBody>
		</Sheet>,
	],
	[
		// Confirmation dialog: named by its title, with confirm/cancel actions.
		'confirm',
		<Confirm
			key="cf"
			open
			onOpenChange={noop}
			onConfirm={noop}
			title="Discard changes?"
			description="You have unsaved changes that will be lost."
			confirm={{ label: 'Discard changes', color: 'amber' }}
			cancel={{ label: 'Keep editing' }}
		/>,
	],
	[
		// Non-modal popover anchored to its trigger button.
		'popover',
		<Popover key="po" open>
			<PopoverTrigger>
				<Button variant="outline">Open popover</Button>
			</PopoverTrigger>
			<PopoverContent>This is a general-purpose floating container.</PopoverContent>
		</Popover>,
	],
	[
		// Dropdown menu: role=menu with grouped menuitems, opened on mount.
		'menu',
		<Menu key="mn" defaultOpen>
			<MenuTrigger>
				<Button variant="outline">Options</Button>
			</MenuTrigger>
			<MenuContent>
				<MenuSection>
					<MenuItem>
						<MenuLabel>Edit</MenuLabel>
					</MenuItem>
					<MenuItem>
						<MenuLabel>Duplicate</MenuLabel>
					</MenuItem>
				</MenuSection>
			</MenuContent>
		</Menu>,
	],
	[
		// Command palette: a modal search dialog over a grouped result list.
		'command palette',
		<CommandPalette key="cp" open onOpenChange={noop}>
			{() => (
				<CommandPaletteGroup title="Files">
					<CommandPaletteItem>
						<CommandPaletteLabel>New file</CommandPaletteLabel>
					</CommandPaletteItem>
					<CommandPaletteItem>
						<CommandPaletteLabel>Open file</CommandPaletteLabel>
					</CommandPaletteItem>
				</CommandPaletteGroup>
			)}
		</CommandPalette>,
	],
	[
		// Live toast: each toast carries its own status/alert role for politeness.
		'toast',
		<ToastProvider key="ts">
			<ToastCase />
		</ToastProvider>,
	],
]
