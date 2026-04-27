import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { initialPreload } from './registry'
import './app.css'

const root = document.getElementById('root')

if (!root) throw new Error('Missing #root element')

initialPreload
	.catch(() => {})
	.then(() => {
		createRoot(root).render(
			<StrictMode>
				<App />
			</StrictMode>,
		)
	})
