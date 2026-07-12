import { Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from 'ui/button'
import { Dialog, DialogBody, DialogFooter, DialogHeader, DialogTitle } from 'ui/dialog'
import { Field, Label } from 'ui/fieldset'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { type DensityLevel, densityLevels } from 'ui/providers/density'
import { UIProvider } from 'ui/providers/ui'
import { Stack } from 'ui/stack'
import { type ThemeMode, themeModes } from './preferences'

type LabeledOption<T extends string> = { value: T; label: string }

type OptionsListboxProps<T extends string> = {
	options: readonly LabeledOption<T>[]
	value: T
	onValueChange: (value: T) => void
}

/**
 * The settings dialog's shared single-select control: a {@link Listbox} over a
 * fixed labelled option set. The `undefined`-guard lives here once — an empty
 * selection never reaches `onValueChange`.
 */
function OptionsListbox<T extends string>({
	options,
	value,
	onValueChange,
}: OptionsListboxProps<T>) {
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

type SettingsDialogProps = {
	mode: ThemeMode
	density: DensityLevel
	onModeChange: (mode: ThemeMode) => void
	onDensityChange: (density: DensityLevel) => void
}

/**
 * Site preferences launcher: a settings icon in the layout header that opens a
 * dialog of appearance + density listboxes. Selections apply immediately and
 * persist through the `useTheme` / `useDensity` hooks that own the state.
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
							<UIProvider portalContainer={portalRoot}>
								<Field>
									<Label>Appearance</Label>
									<OptionsListbox options={themeModes} value={mode} onValueChange={onModeChange} />
								</Field>
								<Field>
									<Label>Density</Label>
									<OptionsListbox
										options={densityLevels}
										value={density}
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
