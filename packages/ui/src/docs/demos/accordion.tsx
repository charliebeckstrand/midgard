'use client'

import { useState } from 'react'
import {
	Accordion,
	AccordionButton,
	AccordionItem,
	AccordionPanel,
} from '../../components/accordion'
import { code } from '../code'
import { Example } from '../example'
import { VariantListbox } from '../variant-listbox'

export const meta = { category: 'Data Display' }

const variants = ['separated', 'bordered', 'plain'] as const

const items = [
	{
		value: 'shipping',
		title: 'Shipping & delivery',
		body: 'Orders ship within one business day. Tracking links are emailed as soon as your package leaves the warehouse.',
	},
	{
		value: 'returns',
		title: 'Returns & refunds',
		body: 'Unworn items can be returned within 30 days for a full refund. Drop them off at any carrier location with the prepaid label.',
	},
	{
		value: 'support',
		title: 'Customer support',
		body: 'Our team is available Monday through Friday, 9am to 6pm. Reach out by email and we will respond within one business day.',
	},
]

export default function AccordionDemo() {
	const [variant, setVariant] = useState<(typeof variants)[number]>('separated')

	return (
		<div className="space-y-8">
			<Example
				title="Default"
				actions={<VariantListbox variants={variants} value={variant} onChange={setVariant} />}
				code={code`
					import {
						Accordion,
						AccordionButton,
						AccordionItem,
						AccordionPanel,
					} from 'ui/accordion'

					<Accordion variant="${variant}" defaultValue="shipping">
						<AccordionItem value="shipping">
							<AccordionButton>Shipping & delivery</AccordionButton>
							<AccordionPanel>Orders ship within one business day…</AccordionPanel>
						</AccordionItem>
					</Accordion>
				`}
			>
				<div className="lg:max-w-md">
					<Accordion variant={variant} defaultValue="shipping">
						{items.map((item) => (
							<AccordionItem key={item.value} value={item.value}>
								<AccordionButton>{item.title}</AccordionButton>
								<AccordionPanel>{item.body}</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</Example>
			<Example
				title="Multiple"
				code={code`
					import { Accordion, AccordionItem, AccordionButton, AccordionPanel } from 'ui/accordion'

					<Accordion type="multiple" defaultValue={['shipping', 'returns']}>
						{/* items */}
					</Accordion>
				`}
			>
				<div className="lg:max-w-md">
					<Accordion type="multiple" variant="bordered" defaultValue={['shipping', 'returns']}>
						{items.map((item) => (
							<AccordionItem key={item.value} value={item.value}>
								<AccordionButton>{item.title}</AccordionButton>
								<AccordionPanel>{item.body}</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</Example>
			<Example
				title="Disabled item"
				code={code`
					<AccordionItem value="support" disabled>
						<AccordionButton>Customer support</AccordionButton>
						<AccordionPanel>...</AccordionPanel>
					</AccordionItem>
				`}
			>
				<div className="lg:max-w-md">
					<Accordion variant="plain" defaultValue="shipping">
						{items.map((item) => (
							<AccordionItem
								key={item.value}
								value={item.value}
								disabled={item.value === 'support'}
							>
								<AccordionButton>{item.title}</AccordionButton>
								<AccordionPanel>{item.body}</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</Example>
		</div>
	)
}
