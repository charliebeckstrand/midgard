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
import { useState } from 'react'
import { Button } from '../../components/button'
import { Stack } from '../../components/stack'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { code } from '../code'
import { Example } from '../components/example'

export const meta = { category: 'Navigation' }

function FormattingToolbar() {
	const [marks, setMarks] = useState({ bold: false, italic: false, underline: false })
	const [align, setAlign] = useState<'left' | 'center' | 'right'>('left')

	function toggle(key: keyof typeof marks) {
		setMarks((m) => ({ ...m, [key]: !m[key] }))
	}

	return (
		<Toolbar aria-label="Text formatting">
			<ToolbarGroup aria-label="History">
				<ToggleIconButton icon={<Undo />} aria-label="Undo" />
				<ToggleIconButton icon={<Redo />} aria-label="Redo" />
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Marks">
				<ToggleIconButton
					pressed={marks.bold}
					icon={<Bold />}
					onClick={() => toggle('bold')}
					aria-label="Bold"
				/>
				<ToggleIconButton
					pressed={marks.italic}
					icon={<Italic />}
					onClick={() => toggle('italic')}
					aria-label="Italic"
				/>
				<ToggleIconButton
					pressed={marks.underline}
					icon={<Underline />}
					onClick={() => toggle('underline')}
					aria-label="Underline"
				/>
				<ToggleIconButton icon={<Strikethrough />} aria-label="Strikethrough" />
			</ToolbarGroup>
			<ToolbarSeparator />
			<ToolbarGroup aria-label="Alignment">
				<ToggleIconButton
					pressed={align === 'left'}
					icon={<AlignLeft />}
					onClick={() => setAlign('left')}
					aria-label="Align left"
				/>
				<ToggleIconButton
					pressed={align === 'center'}
					icon={<AlignCenter />}
					onClick={() => setAlign('center')}
					aria-label="Align center"
				/>
				<ToggleIconButton
					pressed={align === 'right'}
					icon={<AlignRight />}
					onClick={() => setAlign('right')}
					aria-label="Align right"
				/>
			</ToolbarGroup>
		</Toolbar>
	)
}

export default function ToolbarDemo() {
	return (
		<Stack gap={6}>
			<Example
				title="Default"
				code={code`
					import { Toolbar, ToolbarGroup, ToolbarSeparator } from 'ui/toolbar'
					import { ToggleIconButton } from 'ui/toggle-icon-button'

					<Toolbar aria-label="Text formatting">
					  <ToolbarGroup aria-label="History">
					    <ToggleIconButton icon={<Undo />} aria-label="Undo" />
					    <ToggleIconButton icon={<Redo />} aria-label="Redo" />
					  </ToolbarGroup>
					  <ToolbarSeparator />
					  <ToolbarGroup aria-label="Marks">
					    <ToggleIconButton icon={<Bold />} aria-label="Bold" />
					    <ToggleIconButton icon={<Italic />} aria-label="Italic" />
					    <ToggleIconButton icon={<Underline />} aria-label="Underline" />
					  </ToolbarGroup>
					</Toolbar>
				`}
			>
				<FormattingToolbar />
			</Example>

			<Example
				title="Outline variant"
				code={code`
					<Toolbar variant="outline" aria-label="Actions">
					  <Button variant="plain">New</Button>
					  <Button variant="plain">Open</Button>
					  <ToolbarSeparator />
					  <Button variant="plain">Save</Button>
					</Toolbar>
				`}
			>
				<Toolbar variant="outline" aria-label="File actions">
					<Button variant="plain">New</Button>
					<Button variant="plain">Open</Button>
					<ToolbarSeparator />
					<Button variant="plain">Save</Button>
					<Button variant="plain">Export</Button>
				</Toolbar>
			</Example>

			<Example
				title="Solid variant"
				code={code`
					<Toolbar variant="solid" aria-label="Actions">
					  <Button variant="plain">Copy</Button>
					  <Button variant="plain">Cut</Button>
					  <Button variant="plain">Paste</Button>
					</Toolbar>
				`}
			>
				<Toolbar variant="solid" aria-label="Clipboard">
					<Button variant="plain">Copy</Button>
					<Button variant="plain">Cut</Button>
					<Button variant="plain">Paste</Button>
				</Toolbar>
			</Example>

			<Example
				title="Vertical"
				code={code`
					<Toolbar orientation="vertical" variant="outline" aria-label="Tools">
					  <ToggleIconButton icon={<Bold />} aria-label="Bold" />
					  <ToggleIconButton icon={<Italic />} aria-label="Italic" />
					  <ToolbarSeparator />
					  <ToggleIconButton icon={<AlignLeft />} aria-label="Align left" />
					</Toolbar>
				`}
			>
				<Toolbar orientation="vertical" variant="outline" aria-label="Tools">
					<ToggleIconButton icon={<Bold />} aria-label="Bold" />
					<ToggleIconButton icon={<Italic />} aria-label="Italic" />
					<ToggleIconButton icon={<Underline />} aria-label="Underline" />
					<ToolbarSeparator />
					<ToggleIconButton icon={<AlignLeft />} aria-label="Align left" />
					<ToggleIconButton icon={<AlignCenter />} aria-label="Align center" />
					<ToggleIconButton icon={<AlignRight />} aria-label="Align right" />
				</Toolbar>
			</Example>
		</Stack>
	)
}
