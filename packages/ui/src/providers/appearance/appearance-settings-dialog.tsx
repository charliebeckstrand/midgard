'use client'

import { type ReactNode, useState } from 'react'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from '../../components/dialog'
import { Field, Label } from '../../components/fieldset'
import { Segment, SegmentControl, SegmentItem } from '../../components/segment'
import { TabContent, TabContents, type TabContentsProps } from '../../components/tabs'
import type { MessageDescriptor } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { Stack } from '../../structure/stack'
import { densityLevels } from '../density/context'
import { UIProvider } from '../ui'
import { appearanceMessages } from './appearance-messages'
import type { AppearanceSettingsTab } from './appearance-settings'
import { ChoiceListbox } from './choice-listbox'
import { useAppearance } from './context'
import { motionModes, surfaceModes, themeModes } from './modes'

/** Props for {@link AppearanceSettingsDialog}. @internal */
type AppearanceSettingsDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** More fields for the dialog, below the pickers. */
	children?: ReactNode
	/** Tabs of fields after the tab of the pickers. */
	tabs?: readonly AppearanceSettingsTab[]
	/** The switch of the tabs, as the `animate` of `TabContents`. */
	animate?: TabContentsProps['animate']
}

/**
 * The dialog of `AppearanceSettings`, with the appearance, surfaces, density,
 * and motion pickers. `AppearanceSettings` loads this module on the
 * first press of its button.
 *
 * The listbox panels portal into a node inside the dialog (through the
 * `portalContainer` of `UIProvider`), not into `document.body`. A modal
 * `Dialog` runs the `markOthers` of floating-ui, which sets `aria-hidden` on
 * every sibling of the body. A panel that portals to the body thus goes out of
 * the accessibility tree.
 *
 * The mount node is in `DialogBody`, a plain block with no flex `gap`, and the
 * fields render only after the node exists. `FloatingPortal` captures its
 * target on the first mount.
 *
 * With `tabs`, a `Segment` switches the tab of the pickers ("UI") and each tab
 * of the app. The dialog opens on the "UI" tab, because only the active panel
 * mounts.
 *
 * @internal
 */
export function AppearanceSettingsDialog({
	open,
	onOpenChange,
	children,
	tabs,
	animate,
}: AppearanceSettingsDialogProps) {
	const { theme, density, motion, surfaces, setTheme, setDensity, setMotion, setSurfaces } =
		useAppearance()

	const intl = useIntl()

	// The options of a picker, with the label of each choice in the language of the reader.
	const choices = <T extends string>(options: { message: MessageDescriptor; value: T }[]) =>
		options.map(({ message, value }) => ({ value, label: intl.formatMessage(message) }))

	const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

	// The pickers, and the fields of `children` below them: the content of the
	// dialog, or of its "UI" tab.
	const fields = (
		<Stack gap="lg">
			<Field>
				<Label>{intl.formatMessage(appearanceMessages.appearance)}</Label>
				<ChoiceListbox options={choices(themeModes)} value={theme} onValueChange={setTheme} />
			</Field>
			<Field>
				<Label>{intl.formatMessage(appearanceMessages.surfaces)}</Label>
				<ChoiceListbox
					options={choices(surfaceModes)}
					value={surfaces}
					onValueChange={setSurfaces}
				/>
			</Field>
			<Field>
				<Label>{intl.formatMessage(appearanceMessages.density)}</Label>
				<ChoiceListbox
					options={choices(densityLevels)}
					value={density}
					onValueChange={setDensity}
				/>
			</Field>
			<Field>
				<Label>{intl.formatMessage(appearanceMessages.motion)}</Label>
				<ChoiceListbox options={choices(motionModes)} value={motion} onValueChange={setMotion} />
			</Field>
			{children}
		</Stack>
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel width="sm">
				<DialogHeader>
					<DialogTitle>{intl.formatMessage(appearanceMessages.settings)}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					{portalRoot && (
						<UIProvider portalContainer={portalRoot}>
							{tabs?.length ? (
								<Segment defaultValue="ui">
									<Stack gap="lg">
										<SegmentControl aria-label={intl.formatMessage(appearanceMessages.settings)}>
											<SegmentItem value="ui">
												{intl.formatMessage(appearanceMessages.interface)}
											</SegmentItem>
											{tabs.map((tab, index) => (
												<SegmentItem key={tab.label} value={`tab-${index}`}>
													{tab.label}
												</SegmentItem>
											))}
										</SegmentControl>
										<TabContents animate={animate}>
											<TabContent value="ui">{fields}</TabContent>
											{tabs.map((tab, index) => (
												<TabContent key={tab.label} value={`tab-${index}`}>
													<Stack gap="lg">{tab.children}</Stack>
												</TabContent>
											))}
										</TabContents>
									</Stack>
								</Segment>
							) : (
								fields
							)}
						</UIProvider>
					)}
					{/* The portal target of the listbox panels. See the note above. */}
					<div ref={setPortalRoot} className="contents" />
				</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}
