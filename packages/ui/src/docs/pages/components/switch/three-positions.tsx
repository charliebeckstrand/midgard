import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { SwitchChoice } from 'ui/switch'
import { Text } from 'ui/text'

const MODES = [
	{ value: 'ltl', label: 'LTL' },
	{ value: 'tl', label: 'TL' },
] as const

export default function ThreePositions() {
	const [mode, setMode] = useState<'ltl' | 'tl' | null>(null)

	return (
		<>
			<Field>
				<Label as="span">Freight</Label>
				<SwitchChoice options={MODES} value={mode} onValueChange={setMode} />
			</Field>
			<Text>Value: {MODES.find((option) => option.value === mode)?.label ?? 'Empty'}</Text>
		</>
	)
}
