import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/cn'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted',
    isActive && 'bg-muted text-foreground',
  )

export function Layout() {
  const { isSignedIn, signOut } = useAuth()
  const { settings } = useSettings()
  useTheme(settings.theme, settings.palette)

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-card/80 shadow-card backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4">
          <NavLink to="/" className="text-lg font-semibold">
            Birthday Gift Tracker
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/settings" className={navLinkClass}>
              Settings
            </NavLink>
            <NavLink to="/about" className={navLinkClass}>
              About
            </NavLink>
            {isSignedIn && (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                <LogOut aria-hidden className="size-4" />
                Sign out
              </Button>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
