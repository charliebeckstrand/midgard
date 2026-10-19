import { useState } from 'react'
import { Field, Label } from 'ui/fieldset'
import { ProgressBar, ProgressGauge } from 'ui/progress'
import { Slider } from 'ui/slider'

export default function Value() {
	const [progress, setProgress] = useState(50)

	return (
		<>
			<ProgressBar aria-label="Upload progress" value={progress} />
			<ProgressGauge aria-label="Upload progress" value={progress} />
			<Field>
				<Label>Progress</Label>
				<Slider step={10} value={progress} onValueChange={setProgress} />
			</Field>
		</>
	)
}
