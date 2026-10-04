import { Plus } from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Axes, Example } from '../../engine'

export default function Demo() {
	return (
		<>
			<Axes
				of="Button"
				captions={false}
				render={(props, label) => <Button {...props}>{label}</Button>}
			/>

			<Example title="With icon">
				<Button prefix={<Icon icon={<Plus />} />}>Add</Button>
			</Example>

			<Example title="Icon only">
				<Button aria-label="Add">
					<Icon icon={<Plus />} />
				</Button>
			</Example>

			<Example title="Disabled">
				<Button disabled>Disabled</Button>
			</Example>
		</>
	)
}
