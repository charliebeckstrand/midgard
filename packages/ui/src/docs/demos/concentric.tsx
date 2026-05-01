import { Attached } from '../../components/attached'
import { Button } from '../../components/button'
import { Card, CardBody, CardFooter, CardHeader, CardTitle } from '../../components/card'
import { Checkbox } from '../../components/checkbox'
import { Concentric } from '../../components/concentric'
import { Input } from '../../components/input'
import { Radio } from '../../components/radio'
import { Stack } from '../../components/stack'
import { Switch } from '../../components/switch'
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

			<Example title="Form controls inherit size from a single root — change Card size, everything scales">
				<Stack gap={6}>
					<Card size="sm">
						<CardHeader>
							<CardTitle>sm</CardTitle>
						</CardHeader>
						<CardBody>
							<Stack gap={2}>
								<Input placeholder="Inherits sm" />
								<Stack gap={2} direction="row" align="center">
									<Checkbox />
									<Radio />
									<Switch />
									<Attached>
										<Button variant="outline">Cut</Button>
										<Button variant="outline">Copy</Button>
										<Button variant="outline">Paste</Button>
									</Attached>
								</Stack>
							</Stack>
						</CardBody>
					</Card>

					<Card size="md">
						<CardHeader>
							<CardTitle>md (default)</CardTitle>
						</CardHeader>
						<CardBody>
							<Stack gap={2}>
								<Input placeholder="Inherits md" />
								<Stack gap={2} direction="row" align="center">
									<Checkbox />
									<Radio />
									<Switch />
									<Attached>
										<Button variant="outline">Cut</Button>
										<Button variant="outline">Copy</Button>
										<Button variant="outline">Paste</Button>
									</Attached>
								</Stack>
							</Stack>
						</CardBody>
					</Card>

					<Card size="lg">
						<CardHeader>
							<CardTitle>lg</CardTitle>
						</CardHeader>
						<CardBody>
							<Stack gap={2}>
								<Input placeholder="Inherits lg" />
								<Stack gap={2} direction="row" align="center">
									<Checkbox />
									<Radio />
									<Switch />
									<Attached>
										<Button variant="outline">Cut</Button>
										<Button variant="outline">Copy</Button>
										<Button variant="outline">Paste</Button>
									</Attached>
								</Stack>
							</Stack>
						</CardBody>
					</Card>
				</Stack>
			</Example>

			<Example title="Concentric at depth — outer = inner + padding holds at every nesting level">
				<Concentric size="lg" className="bg-zinc-100 dark:bg-zinc-800/50">
					<Concentric size="md" className="bg-zinc-200 dark:bg-zinc-700/50">
						<Concentric size="sm" className="bg-white dark:bg-zinc-900">
							<Button size="sm">3 levels deep</Button>
						</Concentric>
					</Concentric>
				</Concentric>
			</Example>

			<Example title="Per-control override — explicit size beats inherited">
				<Card size="md">
					<CardBody>
						<Stack gap={2} direction="row" align="center">
							<Button>Inherits md</Button>
							<Button size="lg">Explicit lg</Button>
							<Button>Inherits md</Button>
						</Stack>
					</CardBody>
					<CardFooter>
						<Button variant="plain">Footer</Button>
					</CardFooter>
				</Card>
			</Example>
		</Stack>
	)
}
