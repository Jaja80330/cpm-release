import './i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import BusInspectorPage from './pages/BusInspectorPage'
import './styles/global.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/700.css'

// Si la fenêtre est ouverte en mode Bus Inspector, on rend directement la page 3D
// sans passer par l'auth/sidebar de l'app principale.
const params = new URLSearchParams(window.location.search)
const isBusInspector = params.get('busInspector') === '1'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isBusInspector ? <BusInspectorPage /> : <App />}
  </React.StrictMode>
)
