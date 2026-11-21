import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { RestTimerBar } from './components/RestTimerBar'
import { AppShell } from './app/AppShell'
import { CalendarPage } from './features/calendar/CalendarPage'
import { CoachPage } from './features/coach/CoachPage'
import { ExerciseDetailPage } from './features/exercises/ExerciseDetailPage'
import { ExercisesPage } from './features/exercises/ExercisesPage'
import { HomePage } from './features/home/HomePage'
import { MeasurementsPage } from './features/measurements/MeasurementsPage'
import { MorePage } from './features/more/MorePage'
import { ProgramDetailPage } from './features/programs/ProgramDetailPage'
import { ProgramEditorPage } from './features/programs/ProgramEditorPage'
import { ProgramsPage } from './features/programs/ProgramsPage'
import { ProgressPage } from './features/progress/ProgressPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { CalculatorsPage } from './features/tools/CalculatorsPage'
import { WorkoutDetailPage } from './features/workouts/WorkoutDetailPage'
import { WorkoutPage } from './features/workouts/WorkoutPage'

interface AppProps {
  catalogError: string | null
}

export default function App({ catalogError }: AppProps) {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  if (catalogError) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg px-6 text-center">
        <div className="w-full max-w-sm">
          <p className="text-base font-semibold">Не удалось загрузить базу упражнений</p>
          <p className="mt-2 break-words text-xs text-muted">{catalogError}</p>
          <p className="mt-3 text-xs text-muted">
            Проверьте интернет и обновите страницу. Остальные данные не пострадали.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-11 w-full rounded-xl bg-accent text-sm font-semibold text-accent-ink"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exercises/:id" element={<ExerciseDetailPage />} />
          <Route path="coach" element={<CoachPage />} />
          <Route path="programs" element={<ProgramsPage />} />
          <Route path="programs/:id" element={<ProgramDetailPage />} />
          <Route path="programs/:id/edit" element={<ProgramEditorPage />} />
          <Route path="programs/new" element={<ProgramEditorPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="workouts/:id" element={<WorkoutDetailPage />} />
          <Route path="measurements" element={<MeasurementsPage />} />
          <Route path="progress" element={<ProgressPage />} />
          <Route path="tools" element={<CalculatorsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        <Route path="workout/:id" element={<WorkoutPage />} />
      </Routes>
      <RestTimerBar />
    </>
  )
}
