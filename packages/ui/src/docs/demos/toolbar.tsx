'use client'

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
import { Button } from '../../components/button'
import { Icon } from '../../components/icon'
import { Stack } from '../../components/stack'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

function FormattingToolbar() {
	return (
		<Toolbar aria-label="Text formatting">
			<ToolbarGroup aria-label="History">
				<Button variant="plain" aria-label="Undo" aria-pressed={false}>
					<Icon icon={<Undo />} />
				</Button>
				<Button variant="plain" aria-label="Redo" aria-pressed={false}>
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

export default function ToolbarDemo() {
	return (
		<Stack gap={6}>
			<Example title="Default">
				<FormattingToolbar />
			</Example>

			<Example title="Outline variant">
				<Toolbar variant="outline" aria-label="File actions">
					<Button variant="plain" aria-label="New">
						New
					</Button>
					<Button variant="plain" aria-label="Open">
						Open
					</Button>
					<ToolbarSeparator />
					<Button variant="plain" aria-label="Save">
						Save
					</Button>
					<Button variant="plain" aria-label="Export">
						Export
					</Button>
				</Toolbar>
			</Example>

			<Example title="Solid variant">
				<Toolbar variant="solid" aria-label="Clipboard">
					<Button variant="plain" aria-label="Copy">
						Copy
					</Button>
					<Button variant="plain" aria-label="Cut">
						Cut
					</Button>
					<Button variant="plain" aria-label="Paste">
						Paste
					</Button>
				</Toolbar>
			</Example>

			<Example title="Vertical">
				<Toolbar orientation="vertical" variant="outline" aria-label="Tools">
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
					<Button variant="plain" aria-label="Align center" aria-pressed={false}>
						<Icon icon={<AlignCenter />} />
					</Button>
					<Button variant="plain" aria-label="Align right" aria-pressed={false}>
						<Icon icon={<AlignRight />} />
					</Button>
				</Toolbar>
			</Example>
		</Stack>
	)
}
