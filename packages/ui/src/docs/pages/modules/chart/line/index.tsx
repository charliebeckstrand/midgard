import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import CategoryDividers from './category-dividers.tsx'
import CustomColors from './custom-colors.tsx'
import DashedLine from './dashed-line.tsx'
import DateLabels from './date-labels.tsx'
import DualAxis from './dual-axis.tsx'
import MultiSeries from './multi-series.tsx'
import ReferenceLabels from './reference-labels.tsx'
import SingleSeries from './single-series.tsx'
import TimeAxis from './time-axis.tsx'
import ValueLabels from './value-labels.tsx'

export default function LineTab() {
	return (
		<>
			<Example of={SingleSeries} ratio />
			<Example of={MultiSeries} ratio />
			<Example of={CustomColors} ratio />
			<Example of={DualAxis} ratio />
			<Example of={DashedLine} ratio />
			<Example of={TimeAxis} ratio />
			<Example of={DateLabels} ratio />
			<Example of={CategoryDividers} ratio />
			<Example of={ValueLabels} ratio />
			<Example of={ReferenceLabels} ratio />
			<Example of={Animated} ratio />
		</>
	)
}
