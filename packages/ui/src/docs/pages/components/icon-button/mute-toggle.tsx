import { Volume2, VolumeOff } from 'lucide-react'
import { useState } from 'react'
import { IconButton } from 'ui/icon-button'

export default function MuteToggle() {
	const [muted, setMuted] = useState(false)

	return (
		<IconButton
			pressed={muted}
			onPressedChange={setMuted}
			icon={<Volume2 />}
			pressedIcon={<VolumeOff />}
			aria-label="Mute"
		/>
	)
}
