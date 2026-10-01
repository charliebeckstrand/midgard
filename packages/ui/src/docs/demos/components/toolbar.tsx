import {
	AlignCenter,
	AlignLeft,
	AlignRight,
	Bold,
	Italic,
	Redo,
	Strikethrough,
	Underline,
	Undo,
} from 'lucide-react'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../../components/toolbar'
import { Axes, Example } from '../../engine'

function FormattingToolbarExample() {
	return (
		<Toolbar aria-label="Text formatting">
			<ToolbarGroup aria-label="History">
				<Button variant="plain" aria-label="Undo">
					<Icon icon={<Undo />} />
				</Button>
				<Button variant="plain" aria-label="Redo">
					<Icon icon={<Redo />} />
				</Button>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Marks">
				<Button variant="plain" aria-label="Bold" aria-pressed={false}>
					<Icon icon={<Bold />} />
				</Button>
				<Button variant="plain" aria-label="Italic" aria-pressed={false}>
					<Icon icon={<Italic />} />
				</Button>
				<Button variant="plain" aria-label="Underline" aria-pressed={false}>
					<Icon icon={<Underline />} />
				</Button>
				<Button variant="plain" aria-label="Strikethrough" aria-pressed={false}>
					<Icon icon={<Strikethrough />} />
				</Button>
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Alignment">
				<Button variant="plain" aria-label="Align left" aria-pressed={false}>
					<Icon icon={<AlignLeft />} />
				</Button>
				<Button variant="plain" aria-label="Align center" aria-pressed={false}>
					<Icon icon={<AlignCenter />} />
				</Button>
				<Button variant="plain" aria-label="Align right" aria-pressed={false}>
					<Icon icon={<AlignRight />} />
				</Button>
			</ToolbarGroup>
		</Toolbar>
	)
}

export function Demo() {
	return (
		<>
			<Axes
				of="Toolbar"
				render={(props, label) => (
					<Toolbar {...props} aria-label={`${label} toolbar`}>
						<Button variant="plain" aria-label="Bold" aria-pressed={false}>
							<Icon icon={<Bold />} />
						</Button>
						<Button variant="plain" aria-label="Italic" aria-pressed={false}>
							<Icon icon={<Italic />} />
						</Button>
						<Button variant="plain" aria-label="Underline" aria-pressed={false}>
							<Icon icon={<Underline />} />
						</Button>
						<ToolbarSeparator />
						<Button variant="plain" aria-label="Align left" aria-pressed={false}>
							<Icon icon={<AlignLeft />} />
						</Button>
						<Button variant="plain" aria-label="Align right" aria-pressed={false}>
							<Icon icon={<AlignRight />} />
						</Button>
					</Toolbar>
				)}
			/>

			<Example title="With groups">
				<FormattingToolbarExample />
			</Example>
		</>
	)
}
