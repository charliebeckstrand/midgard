import { useEffect } from 'react'
import { Button } from '../../../components/button'
import {
	CommandPalette,
	CommandPaletteGroup,
	CommandPaletteItem,
	CommandPaletteLabel,
} from '../../../components/command-palette'
import { Confirm } from '../../../components/confirm'
import {
	Dialog,
	DialogBody,
	DialogPanel,
	DialogTitle,
	DialogTrigger,
} from '../../../components/dialog'
import {
	Drawer,
	DrawerBody,
	DrawerPanel,
	DrawerTitle,
	DrawerTrigger,
} from '../../../components/drawer'
import { Lightbox, LightboxTrigger } from '../../../components/lightbox'
import {
	Menu,
	MenuContent,
	MenuItem,
	MenuLabel,
	MenuSection,
	MenuSub,
	MenuTrigger,
} from '../../../components/menu'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Sheet, SheetBody, SheetPanel, SheetTitle, SheetTrigger } from '../../../components/sheet'
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
 * Opens the first submenu on the page once, on mount. A submenu has no prop that
 * opens it, so the click drives it open as a reader does. Used by the disclosure
 * subject of the menu.
 */
function OpenFirstSubmenu() {
	useEffect(() => {
		document.querySelector<HTMLElement>('[data-slot="menu-sub-trigger"]')?.click()
	}, [])

	return null
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
		disclosure: [
			{
				component: 'Dialog',
				render: ({ open, disabled }) => (
					<Dialog defaultOpen={open}>
						<DialogTrigger disabled={disabled}>Create project</DialogTrigger>
						<DialogPanel>
							<DialogTitle>Create project</DialogTitle>
						</DialogPanel>
					</Dialog>
				),
				parts: ['panel-trigger', 'dialog'],
				disabledParts: ['panel-trigger'],
			},
		],
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
		disclosure: [
			{
				component: 'Drawer',
				render: ({ open, disabled }) => (
					<Drawer defaultOpen={open}>
						<DrawerTrigger disabled={disabled}>Open drawer</DrawerTrigger>
						<DrawerPanel>
							<DrawerTitle>Drawer</DrawerTitle>
						</DrawerPanel>
					</Drawer>
				),
				parts: ['panel-trigger', 'drawer'],
				disabledParts: ['panel-trigger'],
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
		disclosure: [
			{
				component: 'Sheet',
				render: ({ open, disabled }) => (
					<Sheet defaultOpen={open}>
						<SheetTrigger disabled={disabled}>Open sheet</SheetTrigger>
						<SheetPanel>
							<SheetTitle>Right Sheet</SheetTitle>
						</SheetPanel>
					</Sheet>
				),
				parts: ['panel-trigger', 'sheet'],
				disabledParts: ['panel-trigger'],
			},
		],
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
		disclosure: [
			{
				// Controlled only, and with no trigger: the panel is the one part.
				component: 'Confirm',
				render: ({ open }) => (
					<Confirm open={open} onOpenChange={noop} onConfirm={noop} title="Discard changes?" />
				),
				parts: ['confirm'],
			},
		],
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
		disclosure: [
			{
				component: 'Popover',
				render: ({ open, disabled }) => (
					<Popover defaultOpen={open}>
						<PopoverTrigger disabled={disabled}>Open popover</PopoverTrigger>
						<PopoverContent>content</PopoverContent>
					</Popover>
				),
				parts: ['popover-trigger', 'floating-surface', 'popover-content'],
				disabledParts: ['popover-trigger'],
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
		disclosure: [
			{
				component: 'Menu',
				render: ({ open, disabled }) => (
					<Menu placement="bottom-start" sheet={false} defaultOpen={open}>
						<MenuTrigger disabled={disabled}>Options</MenuTrigger>
						<MenuContent>
							<MenuItem>Edit</MenuItem>
						</MenuContent>
					</Menu>
				),
				parts: ['menu-trigger', 'floating-surface', 'popover-panel'],
				disabledParts: ['menu-trigger'],
			},
			{
				// A static menu holds the row, and the mount opens the submenu.
				component: 'MenuSub',
				render: ({ open, disabled }) => (
					<>
						<Menu defaultOpen>
							<MenuContent aria-label="Actions">
								<MenuSub label="Share" disabled={disabled}>
									<MenuItem>Copy link</MenuItem>
								</MenuSub>
							</MenuContent>
						</Menu>
						{open ? <OpenFirstSubmenu /> : null}
					</>
				),
				parts: ['menu-sub-trigger', 'floating-surface'],
				disabledParts: ['menu-sub-trigger'],
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
		disclosure: [
			{
				// No trigger: the dialog panel of the palette is the one part.
				component: 'CommandPalette',
				render: ({ open }) => (
					<CommandPalette defaultOpen={open}>
						<CommandPaletteItem>New file</CommandPaletteItem>
					</CommandPalette>
				),
				parts: ['dialog'],
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
