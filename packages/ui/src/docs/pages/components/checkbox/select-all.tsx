import { useState } from 'react'
import { Checkbox, CheckboxField, CheckboxGroup } from 'ui/checkbox'
import { Label } from 'ui/fieldset'
import { Text } from 'ui/text'
import { channelWords } from './channels.ts'

const channels = Object.values(channelWords)

export default function SelectAll() {
	const [selected, setSelected] = useState([channelWords.email])

	return (
		<>
			<CheckboxGroup aria-label="Notification channels">
				<CheckboxField>
					<Checkbox
						checked={selected.length === channels.length}
						indeterminate={selected.length > 0 && selected.length < channels.length}
						onChange={(event) => setSelected(event.target.checked ? channels : [])}
					/>
					<Label>All channels</Label>
				</CheckboxField>
				{channels.map((channel) => (
					<CheckboxField key={channel}>
						<Checkbox
							checked={selected.includes(channel)}
							onChange={(event) =>
								setSelected(
									channels.filter((item) =>
										item === channel ? event.target.checked : selected.includes(item),
									),
								)
							}
						/>
						<Label>{channel}</Label>
					</CheckboxField>
				))}
			</CheckboxGroup>
			<Text>Value: {selected.length > 0 ? selected.join(', ') : 'Empty'}</Text>
		</>
	)
}
