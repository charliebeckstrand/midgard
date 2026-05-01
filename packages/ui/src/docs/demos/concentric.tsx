import { Button } from '../../components/button'
import { Concentric } from '../../components/concentric'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function ConcentricDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default — md size, button inside">
				<Concentric className="bg-zinc-100 dark:bg-zinc-800/50">
					<Button>Inner content</Button>
				</Concentric>
			</Example>

			<Example title="Three sizes — outer radius scales with inner + padding">
				<Stack gap={4}>
					<Concentric size="sm" className="bg-zinc-100 dark:bg-zinc-800/50">
						<Button size="sm">sm</Button>
					</Concentric>
					<Concentric size="md" className="bg-zinc-100 dark:bg-zinc-800/50">
						<Button size="md">md</Button>
					</Concentric>
					<Concentric size="lg" className="bg-zinc-100 dark:bg-zinc-800/50">
						<Button size="lg">lg</Button>
					</Concentric>
				</Stack>
			</Example>

			<Example title="Nested — inner Concentric overrides parent size">
				<Concentric size="lg" className="bg-zinc-100 dark:bg-zinc-800/50">
					<Concentric size="sm" className="bg-white dark:bg-zinc-900">
						<Button size="sm">Nested at sm</Button>
					</Concentric>
				</Concentric>
			</Example>

			<Example title="Flush — child paints the surface itself, no wrapper padding">
				<Concentric size="md" flush className="bg-zinc-100 dark:bg-zinc-800/50">
					<Button>No surrounding gap</Button>
				</Concentric>
			</Example>
		</Stack>
	)
}
