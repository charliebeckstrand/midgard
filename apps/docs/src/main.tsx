import { createRoot } from 'react-dom/client'
import { App } from './shell/app'
import './app.css'

const root = document.getElementById('root')

if (root) createRoot(root).render(<App />)
