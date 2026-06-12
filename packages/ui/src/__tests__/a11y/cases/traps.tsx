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
import { Sheet, SheetBody, SheetTitle } from '../../../components/sheet'
import { noop, screen } from '../../helpers'
import { Disclosure } from './harness'
import type { TrapCase } from './types'

/**
 * Trap corpus: the modal Overlay family, each behind a `Disclosure` trigger so
 * the gate can drive the full open → Tab-wrap → Escape → restore cycle. All
 * five route through the shared `Overlay` primitive's `<FloatingFocusManager
 * modal>`, but each case guards its own wiring of that primitive — the prop
 * plumbing a per-component regression breaks first.
 *
 * Only the floating-ui browser project can assert these
 * (`browser/floating-ui/trap-corpus.test.tsx`); see `TrapCase`.
 */
export const traps: readonly TrapCase[] = [
	[
		'dialog',
		'Open dialog',
		<Disclosure
			key="td"
			label="Open dialog"
			render={(open, onOpenChange) => (
				<Dialog open={open} onOpenChange={onOpenChange}>
					<DialogTitle>Edit profile</DialogTitle>
					<DialogBody>
						<Button>First</Button>
						<Button>Last</Button>
					</DialogBody>
				</Dialog>
			)}
		/>,
		() => screen.findByRole('dialog', { name: 'Edit profile' }),
	],
	[
		'drawer',
		'Open drawer',
		<Disclosure
			key="tdr"
			label="Open drawer"
			render={(open, onOpenChange) => (
				<Drawer open={open} onOpenChange={onOpenChange}>
					<DrawerTitle>Drawer</DrawerTitle>
					<DrawerBody>
						<Button>First</Button>
						<Button>Last</Button>
					</DrawerBody>
				</Drawer>
			)}
		/>,
		() => screen.findByRole('dialog', { name: 'Drawer' }),
	],
	[
		'sheet',
		'Open sheet',
		<Disclosure
			key="tsh"
			label="Open sheet"
			render={(open, onOpenChange) => (
				<Sheet open={open} onOpenChange={onOpenChange}>
					<SheetTitle>Right Sheet</SheetTitle>
					<SheetBody>
						<Button>First</Button>
						<Button>Last</Button>
					</SheetBody>
				</Sheet>
			)}
		/>,
		() => screen.findByRole('dialog', { name: 'Right Sheet' }),
	],
	[
		'confirm',
		'Open confirm',
		<Disclosure
			key="tcf"
			label="Open confirm"
			render={(open, onOpenChange) => (
				<Confirm
					open={open}
					onOpenChange={onOpenChange}
					onConfirm={noop}
					title="Discard changes?"
					description="You have unsaved changes that will be lost."
					confirm={{ label: 'Discard changes', color: 'amber' }}
					cancel={{ label: 'Keep editing' }}
				/>
			)}
		/>,
		() => screen.findByRole('alertdialog', { name: 'Discard changes?' }),
	],
	[
		'command palette',
		'Open command palette',
		<Disclosure
			key="tcp"
			label="Open command palette"
			render={(open, onOpenChange) => (
				<CommandPalette open={open} onOpenChange={onOpenChange}>
					<CommandPaletteGroup title="Files">
						<CommandPaletteItem>
							<CommandPaletteLabel>New file</CommandPaletteLabel>
						</CommandPaletteItem>
						<CommandPaletteItem>
							<CommandPaletteLabel>Open file</CommandPaletteLabel>
						</CommandPaletteItem>
					</CommandPaletteGroup>
				</CommandPalette>
			)}
		/>,
		() => screen.findByRole('dialog'),
	],
]
