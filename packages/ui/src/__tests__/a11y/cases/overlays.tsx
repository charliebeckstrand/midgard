import { useEffect } from 'react'
import { Button } from '../../../components/button'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../../components/command-palette'
import { Confirm } from '../../../components/confirm'
import { Dialog, DialogBody, DialogPanel, DialogTitle } from '../../../components/dialog'
import { Drawer, DrawerBody, DrawerPanel, DrawerTitle } from '../../../components/drawer'
import { Lightbox, LightboxTrigger } from '../../../components/lightbox'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuTrigger,
} from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Sheet, SheetBody, SheetPanel, SheetTitle } from '../../../components/sheet'
import { Toast, ToastProvider, useToast } from '../../../components/toast'
import { noop } from '../../helpers'
import type { Case } from './types'

/**
 * Mounts a `ToastProvider`, enqueues one toast on mount, and renders the
 * portaled viewport, exercising a live toast's role/name wiring statically.
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
 * Overlay corpus: components whose content is portaled to `document.body`.
 * The gate (`baseline.test.tsx`) renders them open and asserts against the
 * document, not the render container. Each case is authored in its canonical
 * open state via a controlled `open`/`defaultOpen` prop.
 */
export const overlays: readonly Case[] = [
	{
		// Modal dialog: named by its title via aria-labelledby; aria-modal set.
		name: 'dialog',
		element: (
			<Dialog key="d" open onOpenChange={noop}>
				<DialogPanel>
					<DialogTitle>Create project</DialogTitle>
					<DialogBody>Enter the details for your new project.</DialogBody>
				</DialogPanel>
			</Dialog>
		),
	},
	{
		// Bottom drawer: a modal surface named by its title.
		name: 'drawer',
		element: (
			<Drawer key="dr" open onOpenChange={noop}>
				<DrawerPanel>
					<DrawerTitle>Drawer</DrawerTitle>
					<DrawerBody>Slides up from the bottom.</DrawerBody>
				</DrawerPanel>
			</Drawer>
		),
		density: [
			{
				render: (size) => (
					<Drawer open onOpenChange={noop}>
						<DrawerPanel size={size}>
							<DrawerTitle>Drawer</DrawerTitle>
						</DrawerPanel>
					</Drawer>
				),
				slot: 'drawer',
			},
		],
	},
	{
		// Side sheet: a modal surface named by its title.
		name: 'sheet',
		element: (
			<Sheet key="sh" open onOpenChange={noop}>
				<SheetPanel>
					<SheetTitle>Right Sheet</SheetTitle>
					<SheetBody>Slides in from the right.</SheetBody>
				</SheetPanel>
			</Sheet>
		),
	},
	{
		// Confirmation dialog: named by its title, with confirm/cancel actions.
		name: 'confirm',
		element: (
			<Confirm
				key="cf"
				open
				onOpenChange={noop}
				onConfirm={noop}
				title="Discard changes?"
				description="You have unsaved changes that will be lost."
				confirm={{ label: 'Discard changes', color: 'amber' }}
				cancel={{ label: 'Keep editing' }}
			/>
		),
	},
	{
		// Non-modal popover anchored to its trigger button.
		name: 'popover',
		element: (
			<Popover key="po" open>
				<PopoverTrigger>
					<Button variant="outline">Open popover</Button>
				</PopoverTrigger>
				<PopoverContent>This is a general-purpose floating container.</PopoverContent>
			</Popover>
		),
		density: [
			{
				render: (size) => (
					<Popover open>
						<PopoverTrigger>
							<Button variant="outline">Open</Button>
						</PopoverTrigger>
						<PopoverContent size={size}>content</PopoverContent>
					</Popover>
				),
				slot: 'popover-content',
			},
		],
	},
	{
		// Dropdown menu: role=menu with grouped menuitems, opened on mount.
		name: 'menu',
		element: (
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
			</Menu>
		),
		link: [
			{
				render: (href) => (
					<Menu defaultOpen>
						<MenuContent>
							<MenuItem href={href}>Docs</MenuItem>
						</MenuContent>
					</Menu>
				),
				slot: 'menu-item',
			},
		],
	},
	{
		// Command palette: a modal search dialog over a grouped result list.
		name: 'command palette',
		element: (
			<CommandPalette key="cp" open onOpenChange={noop}>
				<CommandPaletteGroup title="Files">
					<CommandPaletteItem>
						<CommandPaletteLabel>New file</CommandPaletteLabel>
					</CommandPaletteItem>
					<CommandPaletteItem>
						<CommandPaletteLabel>Open file</CommandPaletteLabel>
					</CommandPaletteItem>
				</CommandPaletteGroup>
			</CommandPalette>
		),
		link: [
			{
				render: (href) => (
					<CommandPalette open onOpenChange={noop}>
						<CommandPaletteItem href={href}>Docs</CommandPaletteItem>
					</CommandPalette>
				),
				slot: 'command-palette-item',
			},
		],
	},
	{
		// Live toast: each toast carries its own status/alert role for politeness.
		name: 'toast',
		element: (
			<ToastProvider key="ts">
				<ToastCase />
			</ToastProvider>
		),
	},
	{
		// Photo viewer: a modal dialog named by `aria-label`. The photos next to
		// the center are inert and hidden, and the step buttons have names.
		name: 'lightbox',
		element: (
			<Lightbox
				key="lb"
				photos={[
					{ src: '/a.jpg', alt: 'Harbor at dawn', width: 1500, height: 1000 },
					{ src: '/b.jpg', alt: 'Snow on a ridge', width: 1000, height: 1500 },
					{ src: '/c.jpg', alt: 'Field of poppies', width: 1200, height: 1200 },
				]}
				defaultIndex={1}
				closable
			>
				<LightboxTrigger index={0} />
				<LightboxTrigger index={1} />
				<LightboxTrigger index={2} />
			</Lightbox>
		),
	},
]
