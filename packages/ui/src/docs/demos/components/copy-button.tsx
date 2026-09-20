import { Copy } from 'lucide-react'
import { CopyButton } from '../../../components/copy-button'
import { Flex } from '../../../components/flex'
import { Example } from '../../engine'

export function Demo() {
	return (
		<>
			<Example title="Default">
				<CopyButton text="Hello, world!" />
			</Example>

			<Example title="Sizes">
				<Flex gap="lg">
					<CopyButton text="Large" size="lg" />
					<CopyButton text="Medium" size="md" />
					<CopyButton text="Small" size="sm" />
					<CopyButton text="Extra small" size="xs" />
				</Flex>
			</Example>

			<Example title="Custom icon">
				<CopyButton text="https://example.com" icon={<Copy />} />
			</Example>
		</>
	)
}
