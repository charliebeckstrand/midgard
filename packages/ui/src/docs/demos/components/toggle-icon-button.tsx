import { Heart, Moon, Sun, Volume2, VolumeOff } from 'lucide-react'
import { useState } from 'react'
import { ToggleIconButton } from '../../../components/toggle-icon-button'
import { Axes, Example } from '../../engine'

export function Demo() {
	const [dark, setDark] = useState(false)
	const [muted, setMuted] = useState(false)

	return (
		<>
			<Axes
				of="ToggleIconButton"
				omit={['pressed', 'defaultPressed']}
				render={(props, label) => (
					<ToggleIconButton
						{...props}
						icon={<Heart />}
						pressedIcon={<Heart fill="currentColor" />}
						aria-label={label}
					/>
				)}
			/>

			<Example title="Theme toggle">
				<ToggleIconButton
					pressed={dark}
					icon={<Moon />}
					pressedIcon={<Sun />}
					onClick={() => setDark(!dark)}
					aria-label="Toggle dark mode"
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
