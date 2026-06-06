'use client'

import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../../components/button'
import {
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '../../components/dialog'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import type { DensityLevel } from '../../providers/density'
import { PortalProvider } from '../../providers/portal'
import type { ThemeMode } from '../hooks/use-theme'
import { DensityListbox } from './density-listbox'
import { ThemeListbox } from './theme-listbox'

type SettingsDialogProps = {
	mode: ThemeMode
	density: DensityLevel
	onModeChange: (mode: ThemeMode) => void
	onDensityChange: (density: DensityLevel) => void
}

/**
 * Docs preferences launcher: a settings icon in the layout header that opens a
 * dialog of appearance + density listboxes. Selections apply immediately and
 * persist through the `useTheme` / `useDensity` hooks that own the state.
 *
 * The listbox panels are portalled into a node *inside* the dialog (via
 * `PortalProvider`) rather than `document.body`. A modal `Dialog` runs
 * floating-ui's `markOthers`, which `aria-hidden`s every body sibling — so a
 * panel portalled to `body` lands there and vanishes from the accessibility
 * tree. Scoping the portal into the overlay subtree keeps the options reachable.
 *
 * The mount node sits inside `DialogBody` (a plain block, no flex `gap`) so it
 * doesn't perturb the panel's slot rhythm, and the fields are gated on it:
 * `FloatingPortal` captures its target when it first mounts, so the listboxes
 * must not render until the mount node exists.
 */
export function SettingsDialog({
	mode,
	density,
	onModeChange,
	onDensityChange,
}: SettingsDialogProps) {
	const [open, setOpen] = useState(false)

	const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

	return (
		<>
			<Button variant="bare" aria-label="Settings" onClick={() => setOpen(true)}>
				<Icon icon={<Settings2 />} />
			</Button>
			<Dialog open={open} size="sm" onOpenChange={setOpen}>
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Stack gap="lg">
						{portalRoot && (
							<PortalProvider container={portalRoot}>
								<Field>
									<Label>Appearance</Label>
									<ThemeListbox
										value={mode}
										placement="bottom-start"
										onValueChange={onModeChange}
									/>
								</Field>
								<Field>
									<Label>Density</Label>
									<DensityListbox
										value={density}
										placement="bottom-start"
										onValueChange={onDensityChange}
									/>
								</Field>
							</PortalProvider>
						)}
					</Stack>
					{/* Portal target for the listbox panels — see the note above. */}
					<div ref={setPortalRoot} className="contents" />
				</DialogBody>
				<DialogFooter>
					<Button variant="plain" onClick={() => setOpen(false)}>
						Done
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}
