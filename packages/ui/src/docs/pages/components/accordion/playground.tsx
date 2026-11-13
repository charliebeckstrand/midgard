import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	type AccordionProps,
	AccordionTrigger,
} from 'ui/accordion'
import { items } from './items.ts'

// The page omits `multiple`, so the playground is a single accordion. It opens its
// first section, which a `collapsible={false}` accordion requires. The other
// examples show the same items with `region={false}`, so the page never has two
// regions with the same name.
export default function AccordionPlayground(props: AccordionProps & { multiple?: false }) {
	return (
		<Accordion defaultValue="shipping" {...props}>
			{items.map((item) => (
				<AccordionItem key={item.value} value={item.value}>
					<AccordionTrigger>{item.title}</AccordionTrigger>
					<AccordionPanel>{item.body}</AccordionPanel>
				</AccordionItem>
			))}
		</Accordion>
	)
}
