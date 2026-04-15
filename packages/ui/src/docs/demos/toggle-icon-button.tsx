'use client'

import { Heart, Moon, Sun, Volume2, VolumeOff } from 'lucide-react'
import { useState } from 'react'
import { Stack } from '../../components/stack'
import { ToggleIconButton } from '../../components/toggle-icon-button'
import { Example } from '../components/example'

export const meta = { category: 'Other' }

export default function ToggleIconButtonDemo() {
	const [dark, setDark] = useState(false)
	const [noAnimation, setNoAnimation] = useState(false)
	const [muted, setMuted] = useState(false)

	return (
		<Stack gap={8}>
			<Example title="Default">
				<ToggleIconButton
					pressed={dark}
					icon={<Moon />}
					activeIcon={<Sun />}
					onClick={() => setDark(!dark)}
					aria-label="Toggle dark mode"
				/>
			</Example>

			<Example title="Without animation">
				<ToggleIconButton
					pressed={noAnimation}
					icon={<Heart />}
					activeIcon={<Heart fill="currentColor" />}
					animate={false}
					onClick={() => setNoAnimation(!noAnimation)}
					aria-label="Toggle heart"
				/>
			</Example>

			<Example title="Mute toggle">
				<ToggleIconButton
					pressed={muted}
					icon={<Volume2 />}
					activeIcon={<VolumeOff />}
					onClick={() => setMuted(!muted)}
					aria-label="Toggle mute"
				/>
			</Example>
		</Stack>
	)
}
