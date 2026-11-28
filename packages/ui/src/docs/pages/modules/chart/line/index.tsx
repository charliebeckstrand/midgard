import { Example } from '../../../../kit/index.ts'
import Animated from './animated.tsx'
import CategoryDividers from './category-dividers.tsx'
import CustomColors from './custom-colors.tsx'
import DashedLine from './dashed-line.tsx'
import DateLabels from './date-labels.tsx'
import DualAxis from './dual-axis.tsx'
import MultiSeries from './multi-series.tsx'
import ReferenceLabels from './reference-labels.tsx'
import ReferenceLegend from './reference-legend.tsx'
import ReferenceNotes from './reference-notes.tsx'
import ReferencePanel from './reference-panel.tsx'
import SingleSeries from './single-series.tsx'
import TimeAxis from './time-axis.tsx'
import ValueLabels from './value-labels.tsx'

export default function LineTab() {
	return (
		<>
			<Example of={SingleSeries} />
			<Example of={MultiSeries} />
			<Example of={CustomColors} />
			<Example of={DualAxis} />
			<Example of={DashedLine} />
			<Example of={TimeAxis} />
			<Example of={DateLabels} />
			<Example of={CategoryDividers} />
			<Example of={ValueLabels} />
			<Example of={ReferenceLabels} />
			<Example of={ReferenceLegend} />
			<Example of={ReferenceNotes} />
			<Example of={ReferencePanel} />
			<Example of={Animated} />
		</>
	)
}
