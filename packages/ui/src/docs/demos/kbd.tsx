import { Button } from '../../components/button'
import { Kbd } from '../../components/kbd'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

export default function KbdDemo() {
	return (
		<div className="space-y-8">
			<Example
				title="Default"
				code={code`
					import { Kbd } from 'ui/kbd'

					<Kbd>K</Kbd>
				`}
			>
				<Kbd>K</Kbd>
			</Example>
			<Example
				title="Modifier glyphs"
				code={code`
					import { Kbd } from 'ui/kbd'

					<Kbd cmd>K</Kbd>
					<Kbd ctrl>K</Kbd>
					<Kbd ctrl cmd>K</Kbd>
				`}
			>
				<div className="flex items-center gap-3">
					<Kbd cmd>K</Kbd>
					<Kbd ctrl>K</Kbd>
					<Kbd ctrl cmd>
						K
					</Kbd>
				</div>
			</Example>
			<Example
				title="Inside a button"
				code={code`
					import { Button } from 'ui/button'
					import { Kbd } from 'ui/kbd'

					<Button>Save <Kbd cmd>S</Kbd></Button>
					<Button variant="soft" color="blue">Open <Kbd cmd>O</Kbd></Button>
					<Button variant="outline" color="green">Run <Kbd cmd>R</Kbd></Button>
					<Button variant="plain" color="red">Delete <Kbd cmd>D</Kbd></Button>
				`}
			>
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
