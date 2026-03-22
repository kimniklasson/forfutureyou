import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { runGlobalExerciseMigration } from './data/migration/exerciseGlobalMigration'

// Migrate localStorage data before React renders
runGlobalExerciseMigration()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
