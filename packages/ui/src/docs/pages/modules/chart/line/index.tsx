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
			<Example of={SingleSeries} surface />
			<Example of={MultiSeries} surface />
			<Example of={CustomColors} surface />
			<Example of={DualAxis} surface />
			<Example of={DashedLine} surface />
			<Example of={TimeAxis} surface />
			<Example of={DateLabels} surface />
			<Example of={CategoryDividers} surface />
			<Example of={ValueLabels} surface />
			<Example of={ReferenceLabels} surface />
			<Example of={Animated} surface />
		</>
	)
}
