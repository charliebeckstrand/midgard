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
 * The fields are gated on `portalRoot` because `FloatingPortal` captures its
 * target node when it first mounts: rendering the listboxes only once the mount
 * node exists ensures their panels portal into the dialog from the start rather
 * than falling back to `body`.
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
			<Dialog open={open} size="sm" aria-label="Settings" onOpenChange={setOpen}>
				{/* Portal target inside the overlay subtree; see the note above. */}
				<div ref={setPortalRoot} className="contents" />
				{portalRoot && (
					<PortalProvider container={portalRoot}>
						<DialogHeader>
							<DialogTitle>Settings</DialogTitle>
						</DialogHeader>
						<DialogBody>
							<Stack gap="lg">
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
							</Stack>
						</DialogBody>
						<DialogFooter>
							<Button variant="plain" onClick={() => setOpen(false)}>
								Done
							</Button>
						</DialogFooter>
					</PortalProvider>
				)}
			</Dialog>
		</>
	)
}
