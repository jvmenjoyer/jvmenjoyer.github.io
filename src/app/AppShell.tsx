import {
  ClipboardList,
  Dumbbell,
  Home,
  MoreHorizontal,
  Plus,
  Sparkles,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Toaster } from '@/components/Toaster'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { buildEmptyWorkout, saveWorkout } from '@/db/repo'
import { MOBILE_MORE_PREFIXES, NAV_ITEMS } from './nav'

export function AppShell() {
  const navigate = useNavigate()

  async function startWorkout() {
    const workout = buildEmptyWorkout()
    await saveWorkout(workout)
    navigate(`/workout/${workout.id}`)
  }

  return (
    <div className="min-h-dvh bg-bg text-text">
      <Sidebar onStart={startWorkout} />

      <div className="md:pl-60">
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-5 md:max-w-4xl md:px-8 md:pb-12 md:pt-8">
          <div className="safe-top">
            <Outlet />
          </div>
        </main>
      </div>

      <MobileNav />
      <Toaster />
    </div>
  )
}

function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="#111512" stroke="#263026" />
      <rect x="7" y="14" width="3" height="12" rx="1.5" fill="#c8f169" />
      <rect x="12" y="9" width="3" height="17" rx="1.5" fill="#a9d84f" />
      <rect x="17" y="12" width="3" height="14" rx="1.5" fill="#c8f169" />
      <circle cx="25" cy="10" r="3" fill="#c8f169" />
    </svg>
  )
}

function Sidebar({ onStart }: { onStart: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface/30 px-3 py-5 md:flex">
      <Link to="/" className="mb-6 flex items-center gap-2.5 px-2">
        <Logo />
        <span>
          <span className="block text-sm font-semibold tracking-tight">Athly</span>
          <span className="block text-[10px] text-muted">дневник тренировок</span>
        </span>
      </Link>

      <Button
        variant="primary"
        size="md"
        className="mb-4 w-full"
        leading={<Plus size={17} />}
        onClick={onStart}
      >
        Начать тренировку
      </Button>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors',
                isActive
                  ? 'bg-surface-2 font-medium text-text'
                  : 'text-muted hover:bg-surface-2/60 hover:text-text',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <p className="px-3 pt-4 text-[10px] leading-relaxed text-faint">
        Данные хранятся только на этом устройстве
      </p>
    </aside>
  )
}

function MobileNav() {
  const location = useLocation()
  const moreActive = MOBILE_MORE_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix),
  )

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 backdrop-blur-xl md:hidden">
      <div className="safe-bottom mx-auto flex max-w-md items-end justify-around px-2 pt-2">
        <MobileNavLink to="/" label="Главная" icon={Home} active={location.pathname === '/'} />
        <MobileNavLink
          to="/exercises"
          label="Упражнения"
          icon={Dumbbell}
          active={location.pathname.startsWith('/exercises')}
        />
        <MobileNavLink
          to="/coach"
          label="Тренер"
          icon={Sparkles}
          active={location.pathname.startsWith('/coach')}
        />
        <MobileNavLink
          to="/programs"
          label="Программы"
          icon={ClipboardList}
          active={location.pathname.startsWith('/programs')}
        />
        <MobileNavLink to="/more" label="Ещё" icon={MoreHorizontal} active={moreActive} />
      </div>
    </nav>
  )
}

function MobileNavLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string
  label: string
  icon: typeof Home
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex w-16 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition-colors',
        active ? 'text-accent' : 'text-muted hover:text-text',
      )}
    >
      <Icon size={21} />
      <span>{label}</span>
    </Link>
  )
}
