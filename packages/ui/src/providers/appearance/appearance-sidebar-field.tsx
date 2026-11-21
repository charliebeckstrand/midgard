'use client'

import { Field, Label } from '../../components/fieldset'
import { Icon } from '../../components/icon'
import { Kbd } from '../../components/kbd'
import { useSidebarLayoutPlacement } from '../../layouts/sidebar/context'
import { ChevronsUpDown } from '../../primitives/icons/icons'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/offcanvas'
import { Flex } from '../../structure/flex'
import { appearanceMessages } from './appearance-messages'
import { ChoiceListbox } from './choice-listbox'
import { useAppearance } from './context'
import { sidebarModes } from './modes'

// The modifier of the sidebar shortcut: ⌘ on Apple platforms, ⌃ (Control) elsewhere.
// It follows the `$mod` rule of tinykeys, which binds the shortcut. The field
// renders only in the dialog, which renders only in the client, so the label
// never renders on the server.
function sidebarShortcut() {
	return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? '⌘B' : '⌃B'
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

/**
 * The Sidebar picker (Locked or Offcanvas) of {@link AppearanceSettings}, with
 * the key that toggles the sidebar: ⌘B on Apple platforms, and ⌃B (Control) on
 * others. Give it as a child of `AppearanceSettings`, so that the app sets its
 * position among the other fields.
 *
 * @remarks The picker changes the inline sidebar of a `SidebarLayout` only. It
 * thus renders nothing outside a `SidebarLayout`, and it shows only while the
 * layout is inline.
 */
export function AppearanceSidebarField() {
	const { sidebar, setSidebar } = useAppearance()

	const sidebarLayout = useSidebarLayoutPlacement()

	const intl = useIntl()

	if (!sidebarLayout) return null

	const options = sidebarModes.map(({ message, value }) => ({
		value,
		label: intl.formatMessage(message),
	}))

	return (
		<Field className={k({ layout: sidebarLayout }).inline.block}>
			<Label>{intl.formatMessage(appearanceMessages.sidebar)}</Label>
			<ChoiceListbox
				options={options}
				value={sidebar}
				onValueChange={setSidebar}
				suffix={<SidebarSuffix />}
			/>
		</Field>
	)
}
