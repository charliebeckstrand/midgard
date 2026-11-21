'use client'

import { type ReactNode, useState } from 'react'
import { Button, type ButtonProps } from '../../components/button'
import { Icon } from '../../components/icon'
import type { TabContentsProps } from '../../components/tabs'
import { useFail } from '../../hooks/use-fail'
import { useIntentLoad } from '../../hooks/use-intent-load'
import { Settings2 } from '../../primitives/icons/icons'
import { useIntl } from '../../primitives/intl/use-intl'
import { appearanceMessages } from './appearance-messages'

/**
 * Loads the module of the dialog, which carries the dialog and the listboxes. A
 * page loads it in idle time after the hydration. Thus the page does not load
 * the dialog before it hydrates, and the first press does not wait for it.
 * @internal
 */
const loadDialog = () => import('./appearance-settings-dialog')

/** One tab of the settings of an app in {@link AppearanceSettings}. */
export type AppearanceSettingsTab = {
	/** The label of the tab in the segment, such as "Game". */
	label: string
	/** The fields of the tab. */
	children: ReactNode
}

/**
 * Props for {@link AppearanceSettings}: the fill style of the button, more fields
 * for the dialog, tabs of fields, and the switch of the tabs.
 */
export type AppearanceSettingsProps = {
	/**
	 * The fill style of the settings button. Set `'plain'` to match the plain
	 * icon buttons next to it, such as the menu of the app.
	 *
	 * @defaultValue 'bare'
	 */
	variant?: ButtonProps['variant']
	/**
	 * More fields for the dialog, such as the settings of one app. They go below
	 * the pickers of the dialog, in the same stack. Their floating panels portal
	 * into the dialog, as the panels of the pickers do.
	 */
	children?: ReactNode
	/**
	 * Tabs of fields after the tab of the pickers. With tabs, a `Segment` at the
	 * top of the dialog switches the tabs. The first tab is "UI", with the
	 * pickers and `children`. Each tab of the list follows it, in its order.
	 * The floating panels of each tab portal into the dialog.
	 */
	tabs?: readonly AppearanceSettingsTab[]
	/**
	 * The switch of the tabs, as the `animate` of `TabContents`: `'fade'`,
	 * `'slide'`, or `false` for no animation. It has no effect without `tabs`.
	 *
	 * @defaultValue 'fade'
	 */
	animate?: TabContentsProps['animate']
}

/**
 * Settings icon button that opens a dialog with the appearance, surfaces,
 * density, and motion pickers of the nearest {@link AppearanceProvider}. A
 * selection applies immediately and persists. Put it in the header or the
 * navbar of the app. The Surfaces picker (Glass or Solid) sets the surface of
 * each Dialog, Drawer, and Sheet panel, the dialog itself included.
 *
 * The dialog has no Sidebar picker of its own. Inside a `SidebarLayout`, give
 * {@link AppearanceSidebarField} as a child, so that the app sets its position
 * among the other fields.
 *
 * The dialog has no Language picker of its own. Under a `LocaleProvider` that
 * has `locales`, give {@link AppearanceLanguageField} as a child.
 *
 * The button is `bare` by default. `variant` sets another fill style.
 *
 * With `tabs`, a segment at the top of the dialog switches between the "UI"
 * tab of the pickers and each tab of the app. The dialog opens on the "UI" tab.
 * `animate` sets how the panels switch: a fade by default, or a slide.
 *
 * @remarks The dialog module loads in idle time after the hydration. The
 * dialog then renders closed, so the first open is the same as a later open. A
 * pointer on the button or a focus on it starts the load sooner. A press before
 * the load opens the dialog when the module arrives. The button does not
 * change, so the dialog gives the focus back to it when it closes. When the
 * load of a press fails, the error throws in the next render, so the nearest
 * error boundary shows it.
 */
export function AppearanceSettings({
	variant = 'bare',
	children,
	tabs,
	animate,
}: AppearanceSettingsProps) {
	const [open, setOpen] = useState(false)

	const fail = useFail()

	const { module: dialog, request, preload } = useIntentLoad(loadDialog)

	const intl = useIntl()

	const show = () => request(() => setOpen(true), fail)

	return (
		<>
			<Button
				variant={variant}
				aria-label={intl.formatMessage(appearanceMessages.settings)}
				onPointerEnter={preload}
				onPointerDown={preload}
				onFocus={preload}
				onClick={show}
			>
				<Icon icon={<Settings2 />} />
			</Button>
			{dialog && (
				<dialog.AppearanceSettingsDialog
					open={open}
					onOpenChange={setOpen}
					tabs={tabs}
					animate={animate}
				>
					{children}
				</dialog.AppearanceSettingsDialog>
			)}
		</>
	)
}
