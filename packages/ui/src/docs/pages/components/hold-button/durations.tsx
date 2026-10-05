import { HoldButton } from 'ui/hold-button'

export default function Durations() {
	return (
		<>
			<HoldButton duration={500}>Fast</HoldButton>
			<HoldButton duration={1000}>Default</HoldButton>
			<HoldButton duration={3000}>Slow</HoldButton>
		</>
	)
}
