'use client'

import { ChevronsUpDown } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { Dialog, DialogBody, DialogHeader, DialogPanel, DialogTitle } from '../../components/dialog'
import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Kbd } from '../../components/kbd'
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { useSidebarLayoutPlacement } from '../../layouts/sidebar/sidebar'
import { intlMessages } from '../../primitives/intl/intl-messages'
import type { MessageDescriptor } from '../../primitives/intl/types'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/offcanvas'
import { Flex } from '../../structure/flex'
import { Stack } from '../../structure/stack'
import { densityLevels } from '../density/context'
import { useLocaleChoice } from '../locale/context'
import { localeOptions } from '../locale/locale-choice'
import { UIProvider } from '../ui'
import { appearanceMessages } from './appearance-messages'
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
	const labelFor = (choice: T) => options.find((option) => option.value === choice)?.label ?? choice

	return (
		<Listbox<T>
			value={value}
			displayValue={labelFor}
			placement="bottom-start"
			suffix={suffix}
			onValueChange={(next) => next && onValueChange(next)}
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
 * The dialog of `AppearanceSettings`, with the appearance, density, motion,
 * sidebar, and language pickers. `AppearanceSettings` loads this module on the
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
 * @internal
 */
export function AppearanceSettingsDialog({
	open,
	onOpenChange,
	children,
}: AppearanceSettingsDialogProps) {
	const { theme, density, motion, sidebar, setTheme, setDensity, setMotion, setSidebar } =
		useAppearance()

	// The Sidebar setting changes the inline sidebar only, so the picker shows
	// where the enclosing layout is inline.
	const sidebarLayout = useSidebarLayoutPlacement()

	// The Language picker shows under a `LocaleProvider` that has `locales`.
	const localeChoice = useLocaleChoice()

	const locales = localeChoice?.locales

	const intl = useIntl()

	const systemLabel = intl.formatMessage(intlMessages.system)

	// The name of each language comes from `Intl.DisplayNames`, which is slow on
	// its first use, so the closed dialog does not read the names.
	const languages = useMemo(
		() => (open && locales ? localeOptions(locales, systemLabel) : []),
		[open, locales, systemLabel],
	)

	// The options of a picker, with the label of each choice in the language of the reader.
	const choices = <T extends string>(options: { message: MessageDescriptor; value: T }[]) =>
		options.map(({ message, value }) => ({ value, label: intl.formatMessage(message) }))

	const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPanel width="sm">
				<DialogHeader>
					<DialogTitle>{intl.formatMessage(appearanceMessages.settings)}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Stack gap="lg">
						{portalRoot && (
							<UIProvider portalContainer={portalRoot}>
								<Field>
									<Label>{intl.formatMessage(appearanceMessages.appearance)}</Label>
									<ChoiceListbox
										options={choices(themeModes)}
										value={theme}
										onValueChange={setTheme}
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
									<ChoiceListbox
										options={choices(motionModes)}
										value={motion}
										onValueChange={setMotion}
									/>
								</Field>
								{sidebarLayout && (
									<Field className={k({ layout: sidebarLayout }).inline.block}>
										<Label>{intl.formatMessage(appearanceMessages.sidebar)}</Label>
										<ChoiceListbox
											options={choices(sidebarModes)}
											value={sidebar}
											onValueChange={setSidebar}
											suffix={<SidebarSuffix />}
										/>
									</Field>
								)}
								{localeChoice && (
									<Field>
										<Label>{intl.formatMessage(appearanceMessages.language)}</Label>
										<ChoiceListbox
											options={languages}
											value={localeChoice.choice}
											onValueChange={localeChoice.setChoice}
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
