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
import { UIProvider } from '../../providers/ui'
import type { SurfaceMode } from '../hooks/use-surface'
import type { ThemeMode } from '../hooks/use-theme'
import { DensityListbox } from './density-listbox'
import { SurfaceListbox } from './surface-listbox'
import { ThemeListbox } from './theme-listbox'

type SettingsDialogProps = {
	mode: ThemeMode
	surface: SurfaceMode
	density: DensityLevel
	onModeChange: (mode: ThemeMode) => void
	onSurfaceChange: (surface: SurfaceMode) => void
	onDensityChange: (density: DensityLevel) => void
}

/**
 * Docs preferences launcher: a settings icon in the layout header that opens a
 * dialog of theme, surface, and density listboxes. Selections apply immediately
 * and persist through the `useTheme` / `useSurface` / `useDensity` hooks that
 * own the state.
 *
 * The listbox panels portal into a node *inside* the dialog (via `UIProvider`'s
 * `portalContainer`), not `document.body`. A modal `Dialog` runs floating-ui's
 * `markOthers`, which `aria-hidden`s every body sibling; a panel portalled to
 * `body` vanishes from the accessibility tree.
 *
 * The mount node sits inside `DialogBody` (a plain block, no flex `gap`), and
 * the fields are gated on it: `FloatingPortal` captures its target on first
 * mount; the listboxes render only after the mount node exists.
 */
export function SettingsDialog({
	mode,
	surface,
	density,
	onModeChange,
	onSurfaceChange,
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
							<UIProvider portalContainer={portalRoot}>
								<Field>
									<Label>Theme</Label>
									<ThemeListbox
										value={mode}
										placement="bottom-start"
										onValueChange={onModeChange}
									/>
								</Field>
								<Field>
									<Label>Surface</Label>
									<SurfaceListbox
										value={surface}
										placement="bottom-start"
										onValueChange={onSurfaceChange}
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
							</UIProvider>
						)}
					</Stack>
					{/* Portal target for the listbox panels; see the note above. */}
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
