'use client'

import { Settings2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import type { AppearanceSettingsDialog } from './appearance-settings-dialog'

/**
 * Loads the module of the dialog, which carries the dialog and the listboxes. A
 * page loads it on the first press of the button, so a page that opens no
 * settings does not load the dialog before it hydrates.
 * @internal
 */
const loadDialog = () => import('./appearance-settings-dialog')

/** Starts the load for a reader who shows intent: a pointer or a focus on the button. @internal */
const preloadDialog = () => void loadDialog()

/** Props for {@link AppearanceSettings}: more fields for the dialog. */
export type AppearanceSettingsProps = {
	/**
	 * More fields for the dialog, such as the settings of one app. They go below
	 * the motion and sidebar pickers, in the same stack. Their floating panels portal into
	 * the dialog, as the panels of the pickers do.
	 */
	children?: ReactNode
}

/**
 * Settings icon button that opens a dialog with the appearance, density, and
 * motion pickers of the nearest {@link AppearanceProvider}. A selection applies
 * immediately and persists. Put it in the header or the navbar of the app.
 *
 * Inside a `SidebarLayout`, the dialog also has the Sidebar picker (Locked or
 * Offcanvas), with the key that toggles it. The picker shows from `lg` up,
 * where the layout shows its desktop sidebar.
 *
 * @remarks The dialog loads on demand. A pointer on the button or a focus on
 * it starts the load of the dialog module, and a press opens the dialog when
 * the module is there. The button does not change, so the dialog gives the
 * focus back to it when it closes.
 */
export function AppearanceSettings({ children }: AppearanceSettingsProps) {
	const [open, setOpen] = useState(false)

	const [dialog, setDialog] = useState<{
		AppearanceSettingsDialog: typeof AppearanceSettingsDialog
	} | null>(null)

	const show = () => {
		void loadDialog().then((module) => {
			setDialog(module)

			setOpen(true)
		})
	}

	return (
		<>
			<Button
				variant="bare"
				aria-label="Settings"
				onPointerEnter={preloadDialog}
				onPointerDown={preloadDialog}
				onFocus={preloadDialog}
				onClick={show}
			>
				<Icon icon={<Settings2 />} />
			</Button>
			{dialog && (
				<dialog.AppearanceSettingsDialog open={open} onOpenChange={setOpen}>
					{children}
				</dialog.AppearanceSettingsDialog>
			)}
		</>
	)
}
