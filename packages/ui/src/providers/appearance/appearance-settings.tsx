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
import { Listbox, ListboxLabel, ListboxOption } from '../../components/listbox'
import { Stack } from '../../structure/stack'
import { densityLevels } from '../density/context'
import { UIProvider } from '../ui'
import { themeModes, useAppearance } from './context'

type ChoiceListboxProps<T extends string> = {
	options: readonly { label: string; value: T }[]
	value: T
	onValueChange: (value: T) => void
}

/**
 * A {@link Listbox} over a fixed labeled option set. The guard drops an empty
 * selection, so `onValueChange` always gets a value.
 *
 * @internal
 */
function ChoiceListbox<T extends string>({ options, value, onValueChange }: ChoiceListboxProps<T>) {
	const labelFor = (v: T) => options.find((option) => option.value === v)?.label ?? v

	return (
		<Listbox<T>
			value={value}
			displayValue={labelFor}
			placement="bottom-start"
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

/**
 * Settings icon button that opens a dialog with the appearance and density
 * pickers of the nearest {@link AppearanceProvider}. A selection applies
 * immediately and persists. Put it in the header or the navbar of the app.
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
 */
export function AppearanceSettings() {
	const { theme, density, setTheme, setDensity } = useAppearance()

	const [open, setOpen] = useState(false)

	const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

	return (
		<>
			<Button variant="bare" aria-label="Settings" onClick={() => setOpen(true)}>
				<Icon icon={<Settings2 />} />
			</Button>
			<Dialog open={open} width="sm" onOpenChange={setOpen}>
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
							</UIProvider>
						)}
					</Stack>
					{/* The portal target of the listbox panels. See the note above. */}
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
