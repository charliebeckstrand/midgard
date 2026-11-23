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
			<Example of={SingleSeries} box="ratio" />
			<Example of={MultiSeries} box="ratio" />
			<Example of={CustomColors} box="ratio" />
			<Example of={DualAxis} box="ratio" />
			<Example of={DashedLine} box="ratio" />
			<Example of={TimeAxis} box="ratio" />
			<Example of={DateLabels} box="ratio" />
			<Example of={CategoryDividers} box="ratio" />
			<Example of={ValueLabels} box="ratio" />
			<Example of={ReferenceLabels} box="ratio" />
			<Example of={ReferenceLegend} box="ratio" />
			<Example of={ReferenceNotes} box="ratio" />
			<Example of={ReferencePanel} box="ratio" />
			<Example of={Animated} box="ratio" />
		</>
	)
}
