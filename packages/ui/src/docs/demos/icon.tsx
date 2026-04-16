'use client'

import { Heart, Plus, Search, Star } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../../components/alert'
import { Code } from '../../components/code'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export default function IconDemo() {
	return (
		<Stack gap={6}>
			<Alert type="info" closable>
				<AlertTitle>SVG support</AlertTitle>
				<AlertDescription>
					The <Code>&lt;Icon&gt;</Code> component can wrap any SVG icon component. It provides a
					consistent interface for sizing and styling icons.
				</AlertDescription>
			</Alert>

			<Example title="Default">
				<Flex gap={4} className="dark:text-white">
					<Icon icon={<Search />} />
					<Icon icon={<Heart />} />
					<Icon icon={<Star />} />
				</Flex>
			</Example>

			<Example title="Sizes">
				<Flex gap={4} className="dark:text-white">
					{sizes.map((s) => (
						<Stack key={s} gap={2} align="center">
							<Icon icon={<Plus />} size={s} />
							<span className="text-xs text-zinc-500">{s}</span>
						</Stack>
					))}
				</Flex>
			</Example>

			<Example title="Custom size">
				<div className="dark:text-white">
					<Icon icon={<Star />} size={32} />
				</div>
			</Example>
		</Stack>
	)
}
