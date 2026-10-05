import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	type AccordionProps,
	AccordionTrigger,
} from 'ui/accordion'
import { items } from './items.ts'

export default function AccordionPlayground(props: AccordionProps) {
	return (
		<Accordion {...props}>
			{items.map((item) => (
				<AccordionItem key={item.value} value={item.value}>
					<AccordionTrigger>{item.title}</AccordionTrigger>
					<AccordionPanel>{item.body}</AccordionPanel>
				</AccordionItem>
			))}
		</Accordion>
	)
}
