import { Heart, Plus, Search, Star } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../../components/alert'
import { Code } from '../../components/code'
import { Flex } from '../../components/flex'
import { Icon } from '../../components/icon'
import { Example } from '../components/example'
import { LabeledColumn } from '../components/labeled'

export const meta = { category: 'Data Display' }

const sizes = ['xs', 'sm', 'md', 'lg'] as const

export function Demo() {
	return (
		<>
			<Alert severity="info" closable>
				<AlertTitle>SVG support</AlertTitle>
				<AlertDescription>
					The <Code>&lt;Icon&gt;</Code> component can wrap any SVG icon component. It provides a
					consistent interface for sizing and styling icons.
				</AlertDescription>
			</Alert>

			<Example title="Default">
				<Flex gap="lg" className="dark:text-white">
					<Icon icon={<Search />} />
					<Icon icon={<Heart />} />
					<Icon icon={<Star />} />
				</Flex>
			</Example>

			<Example title="Sizes">
				<Flex gap="lg" className="dark:text-white">
					{sizes.map((s) => (
						<LabeledColumn key={s} label={s}>
							<Icon icon={<Plus />} size={s} />
						</LabeledColumn>
					))}
				</Flex>
			</Example>

			<Example title="Custom size">
				<div className="dark:text-white">
					<Icon icon={<Star />} size={32} />
				</div>
			</Example>
		</>
	)
}
