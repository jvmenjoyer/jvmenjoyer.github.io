import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AppErrorBoundary } from './components/AppErrorBoundary'
import { ensureCatalog } from './db/catalog'
import './index.css'

async function bootstrap() {
  let catalogError: string | null = null

  try {
    await ensureCatalog()
  } catch (error) {
    console.error('Не удалось подготовить базу упражнений', error)
    catalogError =
      error instanceof Error ? error.message : 'Не удалось загрузить базу упражнений'
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary>
        <HashRouter>
          <App catalogError={catalogError} />
        </HashRouter>
      </AppErrorBoundary>
    </StrictMode>,
  )
}

void bootstrap()
