'use client'

import { useState } from 'react'
import { Button } from '../../components/button'
import { Heading } from '../../components/heading'
import { Odometer } from '../../components/odometer'
import { Stack } from '../../components/stack'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

function CounterExample() {
	const [value, setValue] = useState(1284)

	return (
		<Example title="Counter">
			<Stack gap="md" align="start">
				<Heading level={2}>
					<Odometer value={value} />
				</Heading>
				<Button onClick={() => setValue(Math.floor(Math.random() * 100_000))}>Randomize</Button>
			</Stack>
		</Example>
	)
}

function CurrencyExample() {
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
			<Stack gap="md" align="start">
				<Heading level={2}>
					<Odometer value={value} format={format} />
				</Heading>
				<Button onClick={() => setValue(Math.random() * 100_000)}>Randomize</Button>
			</Stack>
		</Example>
	)
}

export function Demo() {
	const [value, setValue] = useState(1284)

	return (
		<>
			<CounterExample />
			<CurrencyExample />

			<Example title="Instant (duration=0)">
				<Heading level={2}>
					<Odometer value={value} duration={0} />
				</Heading>
				<Button onClick={() => setValue(Math.random() * 100_000)}>Randomize</Button>
			</Example>
		</>
	)
}
