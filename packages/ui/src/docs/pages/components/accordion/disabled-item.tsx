import { Accordion, AccordionItem, AccordionPanel, AccordionTrigger } from 'ui/accordion'
import { items } from './items.ts'

export default function DisabledItem() {
	return (
		<Accordion variant="plain">
			{items.map((item) => (
				<AccordionItem key={item.value} value={item.value} disabled={item.value === 'support'}>
					<AccordionTrigger>{item.title}</AccordionTrigger>
					<AccordionPanel>{item.body}</AccordionPanel>
				</AccordionItem>
			))}
		</Accordion>
	)
}
