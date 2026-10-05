import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { items } from './items.ts'

export default function Multiple() {
	return (
		<Accordion type="multiple" variant="outline" defaultValue={['shipping', 'returns']}>
			{items.map((item) => (
				<AccordionItem key={item.value} value={item.value}>
					<AccordionTrigger>{item.title}</AccordionTrigger>
					<AccordionPanel>{item.body}</AccordionPanel>
				</AccordionItem>
			))}
		</Accordion>
	)
}
