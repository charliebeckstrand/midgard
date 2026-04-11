import { Button } from '../../components/button'
import { Kbd } from '../../components/kbd'
import { Example } from '../components/example'

export const meta = { category: 'Data Display' }

export default function KbdDemo() {
	return (
		<div className="space-y-8">
			<Example title="Default">
				<Kbd>K</Kbd>
			</Example>
			<Example title="Modifier glyphs">
				<div className="flex items-center gap-3">
					<Kbd cmd>K</Kbd>
					<Kbd ctrl>K</Kbd>
					<Kbd ctrl cmd>
						K
					</Kbd>
				</div>
			</Example>
			<Example title="Inside a button">
				<div className="flex flex-wrap items-center gap-3">
					<Button>
						Open <Kbd cmd>O</Kbd>
					</Button>
					<Button variant="soft" color="blue">
						Save <Kbd cmd>S</Kbd>
					</Button>
					<Button variant="outline" color="green">
						Run <Kbd cmd>R</Kbd>
					</Button>
					<Button variant="plain" color="red">
						Delete <Kbd cmd>D</Kbd>
					</Button>
				</div>
			</Example>
		</div>
	)
}
