import api from 'virtual:docs/api/components/date-picker'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import FooterButtons from './footer-buttons.tsx'
import Glass from './glass.tsx'
import MultipleRanges from './multiple-ranges.tsx'
import DatePickerPlayground from './playground.tsx'
import RangesAsText from './ranges-as-text.tsx'
import RelativeRanges from './relative-ranges.tsx'
import TypedInput from './typed-input.tsx'

export default function DatePickerPage() {
	return (
		<>
			<Playground of={DatePickerPlayground} api={api} omit={['open', 'defaultOpen', 'truncate']} />
			<Example of={Controlled} />
			<Example of={TypedInput} />
			<Example of={RelativeRanges} />
			<Example of={MultipleRanges} />
			<Example of={RangesAsText} />
			<Example of={FooterButtons} />
			<Example of={Glass} />
			<ApiTable api={api} />
		</>
	)
}
