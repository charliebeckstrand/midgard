import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
} from '../../../components/accordion'
import { Axes, Example } from '../../engine'

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

export function Demo() {
	return (
		<>
			<Axes
				of="Accordion"
				omit={['type', 'mount']}
				render={(props) => (
					// All the sections start closed. An open panel is a named region, and the
					// same name in each instance breaks the landmark rule.
					<Accordion {...props} className="w-96 max-w-full">
						{items.map((item) => (
							<AccordionItem key={item.value} value={item.value}>
								<AccordionTrigger>{item.title}</AccordionTrigger>
								<AccordionPanel>{item.body}</AccordionPanel>
							</AccordionItem>
						))}
					</Accordion>
				)}
			/>

			<Example title="Multiple">
				<Accordion type="multiple" variant="outline" defaultValue={['shipping', 'returns']}>
					{items.map((item) => (
						<AccordionItem key={item.value} value={item.value}>
							<AccordionTrigger>{item.title}</AccordionTrigger>
							<AccordionPanel>{item.body}</AccordionPanel>
						</AccordionItem>
					))}
				</Accordion>
			</Example>

			<Example title="Disabled item">
				<Accordion variant="plain" defaultValue="shipping">
					{items.map((item) => (
						<AccordionItem key={item.value} value={item.value} disabled={item.value === 'support'}>
							<AccordionTrigger>{item.title}</AccordionTrigger>
							<AccordionPanel>{item.body}</AccordionPanel>
						</AccordionItem>
					))}
				</Accordion>
			</Example>
		</>
	)
}
