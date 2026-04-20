'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Odometer } from '../../components/odometer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

function Counter() {
	const [value, setValue] = useState(1284)

	return (
		<Example
			title="Counter"
			code={code`
				import { Odometer } from 'ui/odometer'

				<Odometer value={value} />
			`}
		>
			<Stack gap={3} align="start">
				<div className="text-3xl font-semibold">
					<Odometer value={value} />
				</div>
				<Button onClick={() => setValue(Math.floor(Math.random() * 100_000))}>Randomize</Button>
			</Stack>
		</Example>
	)
}

function Currency() {
	const [value, setValue] = useState(48_215.67)

	const format = (n: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

	return (
		<Example
			title="Currency"
			code={code`
				const format = (n: number) =>
					new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

				<Odometer value={value} format={format} />
			`}
		>
			<Stack gap={3} align="start">
				<div className="text-3xl font-semibold">
					<Odometer value={value} format={format} />
				</div>
				<Button onClick={() => setValue(Math.random() * 100_000)}>Randomize</Button>
			</Stack>
		</Example>
	)
}

export default function OdometerDemo() {
	return (
		<Stack gap={6}>
			<Counter />
			<Currency />

			<Example
				title="Instant (duration=0)"
				code={code`
					<Odometer value={42} duration={0} />
				`}
			>
				<div className="text-3xl font-semibold">
					<Odometer value={42} duration={0} />
				</div>
			</Example>
		</Stack>
	)
}
