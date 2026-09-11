'use client'

import { ScanSearch } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pdf-viewer'
import { Button } from '../button'
import {
	Dialog,
	DialogBody,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../dialog'
import { Description, Fieldset, Label, Legend } from '../fieldset'
import { Radio, RadioField, RadioGroup } from '../radio'
import { Stack } from '../stack'
import { Switch, SwitchField } from '../switch'
import { usePdfViewerContext } from './context'
import { PdfViewerToolbarButton } from './pdf-viewer-toolbar-button'
import {
	delayOptions,
	type MagnifierOption,
	sizeOptions,
	zoomOptions,
} from './use-pdf-viewer-magnifier'

/** Props for {@link PdfViewerMagnifierSettings}. @internal */
type PdfViewerMagnifierSettingsProps = {
	/** Disables the control while the viewer is loading or empty, as the toolbar's others are. */
	disabled: boolean
}

/**
 * The magnifier control the toolbar shows in `'config'` mode: a button that opens a dialog,
 * and the dialog it opens — the loupe's own switch, its power, its lens size and its dwell.
 *
 * @remarks The button and the dialog are one control, so they live in one file. The open
 * state is chrome nothing outside the viewer drives, so it stays here rather than in
 * `PdfViewerContext`, where every region on the page would re-render for it. `DialogTrigger`
 * stamps the `aria-haspopup` and `aria-expanded` that report it — the ARIA belongs to the
 * panel, so it is written by the panel's own trigger rather than by hand here.
 *
 * **Every control is a native input, and that is deliberate.** A modal `Dialog` runs
 * floating-ui's `markOthers`, which `aria-hidden`s every sibling of the body — so a `Listbox`
 * or `Select` inside one portals its panel out of the accessibility tree, and the docs
 * engine's own settings dialog carries a `UIProvider portalContainer` workaround for exactly
 * that. Radios and a switch portal nothing, so there is nothing to work around.
 *
 * The dwell and the power keep their controls while the loupe is off. They are settings, not
 * actions: a reader who turns the lens off and sets it up for next time does something
 * reasonable, and a row of dead radios would only say they cannot.
 * @internal
 */
export function PdfViewerMagnifierSettings({ disabled }: PdfViewerMagnifierSettingsProps) {
	const {
		magnifierOn,
		setMagnifierOn,
		magnifierChoice: choice,
		setMagnifierChoice,
	} = usePdfViewerContext()

	const [open, setOpen] = useState(false)

	// Scopes the radio `name`s, which is what groups a set of radios natively. Two viewers on
	// one page would otherwise share three groups, and each would steer the other's lens.
	const scope = useId()

	// The toolbar renders this only where the consumer asked for a loupe, so the settings are
	// always there. The guard is what tells the compiler so.
	if (!choice) return null

	return (
		<>
			<DialogTrigger open={open} onClick={() => setOpen(true)}>
				<PdfViewerToolbarButton
					label="Magnifier settings"
					icon={<ScanSearch />}
					// Keyed on the loupe rather than on the dialog: the glyph stands for the lens, so
					// the fill has to report whether the lens is on, not whether its settings are up.
					active={magnifierOn}
					data-slot="pdf-viewer-magnifier-settings-trigger"
					disabled={disabled}
				/>
			</DialogTrigger>

			<Dialog
				open={open}
				onOpenChange={setOpen}
				width="sm"
				data-slot="pdf-viewer-magnifier-settings"
			>
				<DialogHeader>
					<DialogTitle>Magnifier</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Stack gap="lg">
						<SwitchField>
							<Label>Show the magnifier</Label>
							<Description>A lens beside the cursor, while it rests on the page.</Description>
							<Switch
								checked={magnifierOn}
								onChange={(event) => setMagnifierOn(event.target.checked)}
							/>
						</SwitchField>

						<PdfViewerMagnifierChoice
							name={`${scope}-zoom`}
							label="Magnification"
							options={zoomOptions}
							value={choice.zoom}
							onChange={(zoom) => setMagnifierChoice({ ...choice, zoom })}
						/>

						<PdfViewerMagnifierChoice
							name={`${scope}-size`}
							label="Size"
							options={sizeOptions}
							value={choice.size}
							onChange={(size) => setMagnifierChoice({ ...choice, size })}
						/>

						<PdfViewerMagnifierChoice
							name={`${scope}-delay`}
							label="Delay"
							options={delayOptions}
							value={choice.delay}
							onChange={(delay) => setMagnifierChoice({ ...choice, delay })}
						/>
					</Stack>
				</DialogBody>
				<DialogFooter>
					<Button type="button" variant="plain" onClick={() => setOpen(false)}>
						Done
					</Button>
				</DialogFooter>
			</Dialog>
		</>
	)
}

/** Props for {@link PdfViewerMagnifierChoice}. @internal */
type PdfViewerMagnifierChoiceProps<T extends string> = {
	/** Groups the radios natively, and must be unique to this group on the page. */
	name: string
	/** Captions the group, and names it for assistive tech. */
	label: string
	options: readonly MagnifierOption<T>[]
	value: T
	onChange: (value: T) => void
}

/**
 * One captioned row of radios — the three choice groups below the switch are this, three
 * times over, differing only in caption and options.
 *
 * @remarks The legend names the group twice over: once as a `<legend>`, which names the
 * `<fieldset>`, and again through `aria-labelledby`, which names the `radiogroup` the
 * `RadioGroup` renders. Both are needed, because a legend does not reach a `radiogroup` div.
 *
 * Local rather than a file of its own, the way `ToolbarToggle` is: it says nothing outside
 * this dialog, and a lift would only put three call sites further from the thing they
 * configure.
 * @internal
 */
function PdfViewerMagnifierChoice<T extends string>({
	name,
	label,
	options,
	value,
	onChange,
}: PdfViewerMagnifierChoiceProps<T>) {
	const legend = useId()

	return (
		<Fieldset className={cn(k.settings.group)}>
			<Legend id={legend}>{label}</Legend>
			<RadioGroup aria-labelledby={legend} className={cn(k.settings.options)}>
				{options.map((option) => (
					<RadioField key={option.value}>
						<Radio
							name={name}
							value={option.value}
							checked={value === option.value}
							onChange={() => onChange(option.value)}
						/>
						<Label>{option.label}</Label>
					</RadioField>
				))}
			</RadioGroup>
		</Fieldset>
	)
}
