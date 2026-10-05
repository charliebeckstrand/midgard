import api from 'virtual:docs/api/components/currency-input'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Controlled from './controlled.tsx'
import CurrencyAndLocale from './currency-and-locale.tsx'
import CustomPrecision from './custom-precision.tsx'
import Disabled from './disabled.tsx'
import NoFractionDigits from './no-fraction-digits.tsx'
import CurrencyInputPlayground from './playground.tsx'

export default function CurrencyInputPage() {
	return (
		<>
			<Playground of={CurrencyInputPlayground} api={api} />
			<Example of={CurrencyAndLocale} />
			<Example of={NoFractionDigits} />
			<Example of={CustomPrecision} />
			<Example of={Controlled} />
			<Example of={Disabled} />
			<ApiTable api={api} />
		</>
	)
}
