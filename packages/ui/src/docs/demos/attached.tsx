import { Attached } from '../../components/attached'
import { Button } from '../../components/button'
import { Concentric } from '../../components/concentric'
import { Stack } from '../../components/stack'
import { Example } from '../components/example'

export const meta = { category: 'Layout' }

export default function AttachedDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default — three buttons joined horizontally">
				<Attached>
					<Button variant="outline">Cut</Button>
					<Button variant="outline">Copy</Button>
					<Button variant="outline">Paste</Button>
				</Attached>
			</Example>

			<Example title="Two children — start + end positions">
				<Attached>
					<Button variant="outline">Previous</Button>
					<Button variant="outline">Next</Button>
				</Attached>
			</Example>

			<Example title="Single child — 'only' position keeps both end caps rounded">
				<Attached>
					<Button variant="outline">Only one</Button>
				</Attached>
			</Example>

			<Example title="Vertical orientation — top/bottom rather than start/end">
				<Attached orientation="vertical">
					<Button variant="outline">Up</Button>
					<Button variant="outline">Middle</Button>
					<Button variant="outline">Down</Button>
				</Attached>
			</Example>

			<Example title="Three sizes — explicit size prop drives end-cap radii">
				<Stack gap={4}>
					<Attached size="sm">
						<Button variant="outline" size="sm">
							sm
						</Button>
						<Button variant="outline" size="sm">
							sm
						</Button>
						<Button variant="outline" size="sm">
							sm
						</Button>
					</Attached>
					<Attached size="md">
						<Button variant="outline" size="md">
							md
						</Button>
						<Button variant="outline" size="md">
							md
						</Button>
						<Button variant="outline" size="md">
							md
						</Button>
					</Attached>
					<Attached size="lg">
						<Button variant="outline" size="lg">
							lg
						</Button>
						<Button variant="outline" size="lg">
							lg
						</Button>
						<Button variant="outline" size="lg">
							lg
						</Button>
					</Attached>
				</Stack>
			</Example>

			<Example title="Inside Concentric — Attached inherits size when omitted">
				<Concentric size="lg" className="bg-zinc-100 dark:bg-zinc-800/50">
					<Attached>
						<Button variant="outline">First</Button>
						<Button variant="outline">Second</Button>
						<Button variant="outline">Third</Button>
					</Attached>
				</Concentric>
			</Example>
		</Stack>
	)
}
