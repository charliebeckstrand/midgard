import { useState } from 'react'
import type { Hsva } from '../../components/color'
import { ColorPanel, ColorPicker } from '../../components/color'
import { Text } from '../../components/text'
import { Example } from '../components/example'
import { LabeledRow } from '../components/labeled'

export const meta = { category: 'Forms' }

const sizes = ['sm', 'md', 'lg'] as const

function PanelExample() {
	const [color, setColor] = useState('#3b82f6')

	return (
		<Example title="Panel" actions={<Text className="font-mono">{color}</Text>}>
			<ColorPanel value={color} onValueChange={setColor} />
		</Example>
	)
}

function PickerExample() {
	const [color, setColor] = useState('#f97316')

	return (
		<Example title="Picker" actions={<Text className="font-mono">{color}</Text>}>
			<ColorPicker value={color} onValueChange={setColor} />
		</Example>
	)
}

function AlphaExample() {
	const [color, setColor] = useState('#22c55eff')

	return (
		<Example title="With alpha">
			<ColorPanel alpha value={color} onValueChange={setColor} />
			<Text className="font-mono">{color}</Text>
		</Example>
	)
}

function HsvaExample() {
	const [color, setColor] = useState<Hsva>({ h: 280, s: 70, v: 90, a: 1 })

	return (
		<Example title="HSVA value">
			<ColorPanel format="hsva" value={color} onValueChange={setColor} />
			<Text className="font-mono tabular-nums">{`h ${color.h} · s ${color.s} · v ${color.v}`}</Text>
		</Example>
	)
}

export function Demo() {
	return (
		<>
			<PanelExample />

			<PickerExample />

			<AlphaExample />

			<HsvaExample />

			<Example title="Sizes">
				{sizes.map((size) => (
					<LabeledRow key={size} label={size}>
						<ColorPicker size={size} defaultValue="#8b5cf6" />
					</LabeledRow>
				))}
			</Example>

			<Example title="Disabled">
				<ColorPicker disabled defaultValue="#64748b" />
			</Example>
		</>
	)
}
