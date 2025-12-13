import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import '@fontsource-variable/inter'
import '../styles.css'

export const Route = createRootRoute({
  component: () => (
    <>
      <div className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-sm">
        <img
          src="/mitate-logo.png"
          alt="Mitate Logo"
          className="h-8 w-8 rounded-lg"
        />
        <span className="font-bold text-lg">Mitate (見立て)</span>
      </div>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
