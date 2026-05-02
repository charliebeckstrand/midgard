'use client'

import { Copy } from 'lucide-react'
import { CopyButton } from '../../components/copy-button'
import { Flex } from '../../components/flex'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Button' }

export default function CopyButtonDemo() {
	return (
		<Stack gap="xl">
			<Example title="Default">
				<CopyButton value="Hello, world!" />
			</Example>

			<Example title="Sizes">
				<Flex gap="lg">
					<CopyButton value="Large" size="lg" />
					<CopyButton value="Medium" size="md" />
					<CopyButton value="Small" size="sm" />
					<CopyButton value="Extra small" size="xs" />
				</Flex>
			</Example>

			<Example title="Custom icon">
				<CopyButton value="https://example.com" icon={<Copy />} />
			</Example>
		</Stack>
	)
}
