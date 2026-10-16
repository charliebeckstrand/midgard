import {
	Accordion,
	AccordionItem,
	AccordionPanel,
	type AccordionProps,
	AccordionTrigger,
} from 'ui/accordion'
import { items } from './items.ts'

// The page omits `type`, so the playground is a single accordion. It opens its
// first section, which a `collapsible={false}` accordion requires. The Multiple
// example opens the others, so no two open panels make the same region.
export default function AccordionPlayground(props: AccordionProps & { type?: 'single' }) {
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
