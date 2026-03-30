'use client'

export type ShinyTextProps = {
	text: string
	disabled?: boolean
	speed?: number
	className?: string
}

export function ShinyText({ text, disabled = false, speed = 5, className = '' }: ShinyTextProps) {
	return (
		<span
			className={className}
			style={{
				backgroundSize: '250% 100%',
				backgroundClip: 'text',
				WebkitBackgroundClip: 'text',
				WebkitTextFillColor: 'transparent',
				backgroundImage:
					'linear-gradient(120deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 60%)',
				animation: disabled ? 'none' : `shiny-text ${speed}s linear infinite`,
			}}
		>
			{text}
			<style>{`
				@keyframes shiny-text {
					0% { background-position: 100% center; }
					100% { background-position: -100% center; }
				}
			`}</style>
		</span>
	)
}

export default ShinyText
