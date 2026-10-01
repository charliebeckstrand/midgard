import { Copy } from 'lucide-react'
import { CopyButton } from '../../../components/copy-button'
import { Axes, Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Axes of="CopyButton" render={(props, label) => <CopyButton {...props} text={label} />} />

			<Example title="Custom icon">
				<CopyButton text="https://example.com" icon={<Copy />} />
			</Example>
		</>
	)
}
