import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { defineMessages, type MessageDescriptor, useIntl } from 'ui/primitives/intl'
import { intlMessages } from '../../primitives/intl/intl-messages.ts'

// The direction of the docs: a setting that lays out the whole site left to
// right or right to left, so a reader can check each page in a right-to-left
// app. The setting writes `dir` on the root element, which is the direction of
// the app, and each portal reads it from there.
//
// "System" is the default. It gives the direction of the language of the page,
// and the root element then has no `dir`. Each language of the docs is left to
// right, so "System" is left to right.
//
// The choice is a check, not a preference, so it is not stored. It stays while
// the tab shows the docs, and a reload starts at "System".

/** The choices of the setting. */
type Direction = 'system' | 'ltr' | 'rtl'

const messages = defineMessages({
	label: {
		id: 'docs.direction.label',
		defaultMessage: 'Direction',
		description:
			'The label of the setting that lays out the docs site left to right or right to left.',
	},
	ltr: {
		id: 'docs.direction.ltr',
		defaultMessage: 'Left to right',
		description: 'The option of the direction setting that lays out the site left to right.',
	},
	rtl: {
		id: 'docs.direction.rtl',
		defaultMessage: 'Right to left',
		description: 'The option of the direction setting that lays out the site right to left.',
	},
})

// "System" shows the message of ui that each System choice of the settings shows.
const DIRECTIONS: { label: MessageDescriptor; value: Direction }[] = [
	{ label: intlMessages.system, value: 'system' },
	{ label: messages.ltr, value: 'ltr' },
	{ label: messages.rtl, value: 'rtl' },
]

/** The choice that the root element shows: its `dir`, else "System". */
function readChoice(): Direction {
	const { dir } = document.documentElement

	return dir === 'ltr' || dir === 'rtl' ? dir : 'system'
}

/** Writes the choice on the root element. "System" takes `dir` off. */
function setDirection(choice: Direction): void {
	if (choice === 'system') document.documentElement.removeAttribute('dir')
	else document.documentElement.dir = choice
}

/**
 * The picker of the direction in the settings. The settings render on the
 * client only, so the picker reads the choice from the root element at once.
 * Thus the picker shows the choice again when the settings open again.
 */
export function DirectionListbox() {
	const [choice, setChoice] = useState(readChoice)

	const intl = useIntl()

	const labelFor = (value: Direction): string => {
		const option = DIRECTIONS.find((candidate) => candidate.value === value)

		return option ? intl.formatMessage(option.label) : value
	}

	return (
		<Field>
			<Label>{intl.formatMessage(messages.label)}</Label>
			<Listbox<Direction>
				value={choice}
				displayValue={labelFor}
				placement="bottom-start"
				onValueChange={(next) => {
					if (!next) return

					setDirection(next)

					setChoice(next)
				}}
			>
				{DIRECTIONS.map((option) => (
					<ListboxOption key={option.value} value={option.value}>
						<ListboxLabel>{intl.formatMessage(option.label)}</ListboxLabel>
					</ListboxOption>
				))}
			</Listbox>
		</Field>
	)
}
