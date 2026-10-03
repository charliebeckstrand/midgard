import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { DemoRoute } from '../../engine/app'
import { demoPath } from '../../engine/demo-id'
import { defaultDemo } from '../../engine/registry'

// The root path shows the first demo. A link from before path routes
// (`/#stepper`) moves to the path of its demo.
export default function Home() {
	const navigate = useNavigate()

	useEffect(() => {
		const id = window.location.hash.slice(1)

		if (id) navigate(demoPath(id), { replace: true })
	}, [navigate])

	return <DemoRoute id={defaultDemo} />
}
