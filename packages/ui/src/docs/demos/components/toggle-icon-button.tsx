import { Heart, Moon, Sun, Volume2, VolumeOff } from 'lucide-react'
import { useState } from 'react'
import { ToggleIconButton } from '../../../components/toggle-icon-button'
import { Example } from '../../engine'

export function Demo() {
	const [dark, setDark] = useState(false)
	const [noAnimation, setNoAnimation] = useState(false)
	const [muted, setMuted] = useState(false)

	return (
		<>
			<Example title="Default">
				<ToggleIconButton
					pressed={dark}
					icon={<Moon />}
					pressedIcon={<Sun />}
					onClick={() => setDark(!dark)}
					aria-label="Toggle dark mode"
				/>
			</Example>

			<Example title="Without animation">
				<ToggleIconButton
					pressed={noAnimation}
					icon={<Heart />}
					pressedIcon={<Heart fill="currentColor" />}
					animate={false}
					onClick={() => setNoAnimation(!noAnimation)}
					aria-label="Toggle heart"
				/>
			</Example>

			<Example title="Mute toggle">
				<ToggleIconButton
					pressed={muted}
					icon={<Volume2 />}
					pressedIcon={<VolumeOff />}
					onClick={() => setMuted(!muted)}
					aria-label="Toggle mute"
				/>
			</Example>
		</>
	)
}
