import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Building2, AlertTriangle, LogOut } from 'lucide-react'
import { useAuth } from '../lib/AuthContext.jsx'

export default function Layout() {
  const { profile, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">DoorCheck</span>
        <div className="app-header-right">
          {profile?.companies?.name && <span className="company-name">{profile.companies.name}</span>}
          <button className="icon-button" onClick={signOut} title="Sign out">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <LayoutDashboard size={22} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/buildings" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <Building2 size={22} />
          <span>Buildings</span>
        </NavLink>
        <NavLink to="/defects" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <AlertTriangle size={22} />
          <span>Defects</span>
        </NavLink>
      </nav>
    </div>
  )
}
