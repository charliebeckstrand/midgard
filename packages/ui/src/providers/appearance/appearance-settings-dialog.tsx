'use client'

import { ChevronsUpDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from '../../components/dialog'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Kbd } from '../../components/kbd'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { useInSidebarLayout } from '../../layouts/sidebar/sidebar'
import { Flex } from '../../structure/flex'
import { Stack } from '../../structure/stack'
import { densityLevels } from '../density/context'
import { UIProvider } from '../ui'
import { useAppearance } from './context'
import { motionModes, sidebarModes, themeModes } from './modes'

type ChoiceListboxProps<T extends string> = {
	options: readonly { label: string; value: T }[]
	value: T
	onValueChange: (value: T) => void
	suffix?: ReactNode
}

/**
 * A {@link Listbox} over a fixed labeled option set. The guard drops an empty
 * selection, so `onValueChange` always gets a value.
 *
 * @internal
 */
function ChoiceListbox<T extends string>({
	options,
	value,
	onValueChange,
	suffix,
}: ChoiceListboxProps<T>) {
	const labelFor = (v: T) => options.find((option) => option.value === v)?.label ?? v

	return (
		<Listbox<T>
			value={value}
			displayValue={labelFor}
			placement="bottom-start"
			suffix={suffix}
			onValueChange={(v) => v && onValueChange(v)}
		>
			{options.map((option) => (
				<ListboxOption key={option.value} value={option.value}>
					<ListboxLabel>{option.label}</ListboxLabel>
				</ListboxOption>
			))}
		</Listbox>
	)
}

// The modifier of the sidebar shortcut: ⌘ on Apple platforms, Ctrl elsewhere.
// It follows the `$mod` rule of tinykeys, which binds the shortcut. The dialog
// renders only in the client, so the label never renders on the server.
function sidebarShortcut() {
	return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘B' : 'Ctrl+B'
}

// The suffix of the sidebar picker: the key of the shortcut, then the chevron
// of the listbox. A custom suffix replaces the chevron, so the suffix holds
// both. Its content is not interactive, so a mousedown on it keeps the focus on
// the trigger, as a mousedown on the default chevron does.
function SidebarSuffix() {
	return (
		<Flex align="center" gap="sm" onMouseDown={(event) => event.preventDefault()}>
			<Kbd>{sidebarShortcut()}</Kbd>
			<Icon icon={<ChevronsUpDown />} />
		</Flex>
	)
}

/** Props for {@link AppearanceSettingsDialog}. @internal */
type AppearanceSettingsDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** More fields for the dialog, below the pickers. */
	children?: ReactNode
}

/**
 * The dialog of `AppearanceSettings`, with the appearance, density, motion, and
 * sidebar pickers. `AppearanceSettings` loads this module on the first press of
 * its button.
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
 * @internal
 */
export function AppearanceSettingsDialog({
	open,
	onOpenChange,
	children,
}: AppearanceSettingsDialogProps) {
	const { theme, density, motion, sidebar, setTheme, setDensity, setMotion, setSidebar } =
		useAppearance()

	const inSidebarLayout = useInSidebarLayout()

	const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel width="sm">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Stack gap="lg">
						{portalRoot && (
							<UIProvider portalContainer={portalRoot}>
								<Field>
									<Label>Appearance</Label>
									<ChoiceListbox options={themeModes} value={theme} onValueChange={setTheme} />
								</Field>
								<Field>
									<Label>Density</Label>
									<ChoiceListbox
										options={densityLevels}
										value={density}
										onValueChange={setDensity}
									/>
								</Field>
								<Field>
									<Label>Motion</Label>
									<ChoiceListbox options={motionModes} value={motion} onValueChange={setMotion} />
								</Field>
								{inSidebarLayout && (
									<Field className="max-lg:hidden">
										<Label>Sidebar</Label>
										<ChoiceListbox
											options={sidebarModes}
											value={sidebar}
											onValueChange={setSidebar}
											suffix={<SidebarSuffix />}
										/>
									</Field>
								)}
								{children}
							</UIProvider>
						)}
					</Stack>
					{/* The portal target of the listbox panels. See the note above. */}
					<div ref={setPortalRoot} className="contents" />
				</DialogBody>
			</DialogPanel>
		</Dialog>
	)
}
