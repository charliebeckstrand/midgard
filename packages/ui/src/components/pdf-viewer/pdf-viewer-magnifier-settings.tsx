'use client'

import { ScanSearch } from 'lucide-react'
import { useId } from 'react'
import { cn } from '../../core'
import { useIntl } from '../../primitives/intl/use-intl'
import { k } from '../../recipes/kata/pdf-viewer'
import { Stack } from '../../structure/stack'
import {
	Dialog,
	DialogBody,
	DialogHeader,
	DialogPanel,
	DialogTitle,
	DialogTrigger,
} from '../dialog'
import { Fieldset, Label, Legend } from '../fieldset'
import { Radio, RadioField, RadioGroup } from '../radio'
import { Switch, SwitchField } from '../switch'
import { usePdfViewerContext } from './context'
import { pdfViewerMessages } from './pdf-viewer-messages'
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
 * and the dialog it opens. The dialog holds the loupe's own switch, its power, its lens size
 * and its dwell.
 *
 * @remarks The button and the dialog are one control, so they live in one file. The open
 * state is chrome nothing outside the viewer drives, so the uncontrolled `Dialog` root holds
 * it rather than `PdfViewerContext`. There every region on the page would re-render for it.
 * `DialogTrigger` stamps the `aria-haspopup`, `aria-expanded`, and `aria-controls` that
 * report it. The ARIA belongs to the panel, so it is written by the panel's own trigger
 * rather than by hand here.
 *
 * **Every control is a native input, and that is deliberate.** A modal `Dialog` runs
 * floating-ui's `markOthers`, which `aria-hidden`s every sibling of the body. A `Listbox`
 * or `Select` inside one therefore portals its panel out of the accessibility tree. The docs
 * engine's own settings dialog carries a `UIProvider portalContainer` workaround for exactly
 * that. Radios and a switch portal nothing, so there is nothing to work around.
 *
 * The dwell and the power keep their controls while the loupe is off. They are settings, not
 * actions. A reader who turns the lens off and sets it up for next time does something
 * reasonable. A row of dead radios would only say they cannot.
 * @internal
 */
export function PdfViewerMagnifierSettings({ disabled }: PdfViewerMagnifierSettingsProps) {
	const {
		magnifierOn,
		setMagnifierOn,
		magnifierChoice: choice,
		setMagnifierChoice,
	} = usePdfViewerContext()

	// Scopes the radio `name`s, which is what groups a set of radios natively. Two viewers on
	// one page would otherwise share three groups, and each would steer the other's lens.
	const scope = useId()

	const intl = useIntl()

	// The toolbar renders this only where the consumer asked for a loupe, so the settings are
	// always there. The guard is what tells the compiler so.
	if (!choice) return null

	return (
		<Dialog>
			<DialogTrigger>
				<PdfViewerToolbarButton
					label={intl.formatMessage(pdfViewerMessages.magnifierSettings)}
					icon={<ScanSearch />}
					// Keyed on the loupe rather than on the dialog: the glyph stands for the lens, so
					// the fill has to report whether the lens is on, not whether its settings are up.
					active={magnifierOn}
					data-slot="pdf-viewer-magnifier-settings-trigger"
					disabled={disabled}
				/>
			</DialogTrigger>

			<DialogPanel width="sm" data-slot="pdf-viewer-magnifier-settings">
				<DialogHeader>
					<DialogTitle>{intl.formatMessage(pdfViewerMessages.magnifier)}</DialogTitle>
				</DialogHeader>
				<DialogBody>
					<Stack gap="lg">
						<SwitchField>
							<Label>{intl.formatMessage(pdfViewerMessages.showMagnifier)}</Label>
							<Switch
								checked={magnifierOn}
								onChange={(event) => setMagnifierOn(event.target.checked)}
							/>
						</SwitchField>

						<PdfViewerMagnifierChoice
							name={`${scope}-zoom`}
							label={intl.formatMessage(pdfViewerMessages.magnification)}
							options={zoomOptions}
							value={choice.zoom}
							onChange={(zoom) => setMagnifierChoice({ ...choice, zoom })}
						/>

						<PdfViewerMagnifierChoice
							name={`${scope}-size`}
							label={intl.formatMessage(pdfViewerMessages.size)}
							options={sizeOptions}
							value={choice.size}
							onChange={(size) => setMagnifierChoice({ ...choice, size })}
						/>

						<PdfViewerMagnifierChoice
							name={`${scope}-delay`}
							label={intl.formatMessage(pdfViewerMessages.delay)}
							options={delayOptions}
							value={choice.delay}
							onChange={(delay) => setMagnifierChoice({ ...choice, delay })}
						/>
					</Stack>
				</DialogBody>
			</DialogPanel>
		</Dialog>
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
 * One captioned row of radios: the three choice groups below the switch are this, three
 * times over, differing only in caption and options.
 *
 * @remarks The legend names the group twice over. It names the `<fieldset>` as a
 * `<legend>`, and again names the `radiogroup` the `RadioGroup` renders through
 * `aria-labelledby`. Both are needed, because a legend does not reach a `radiogroup` div.
 *
 * It is local rather than in a file of its own. It has no meaning outside this dialog. A move
 * would only put three call sites further from the settings that they configure.
 * @internal
 */
function PdfViewerMagnifierChoice<T extends string>({
	name,
	label,
	options,
	value,
	onChange,
}: PdfViewerMagnifierChoiceProps<T>) {
	const legendId = useId()

	const intl = useIntl()

	return (
		<Fieldset className={cn(k.settings.group)}>
			<Legend id={legendId}>{label}</Legend>
			<RadioGroup aria-labelledby={legendId} className={cn(k.settings.options)}>
				{options.map((option) => (
					<RadioField key={option.value}>
						<Radio
							name={name}
							value={option.value}
							checked={value === option.value}
							onChange={() => onChange(option.value)}
						/>
						<Label>{option.label(intl)}</Label>
					</RadioField>
				))}
			</RadioGroup>
		</Fieldset>
	)
}
