import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, PlusSquare, Clock, Heart,
  Coins, Settings, LogOut, Zap
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import styles from './Sidebar.module.css'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { to: '/new', icon: PlusSquare, label: 'Nuevo render' },
  { to: '/history', icon: Clock, label: 'Historial' },
  { to: '/history?tab=favorites', icon: Heart, label: 'Favoritos' },
  { to: '/credits', icon: Coins, label: 'Créditos' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
]

export default function Sidebar() {
  const { user, logout } = useApp()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>
          <Zap size={14} strokeWidth={2.5} />
        </span>
        <span className={styles.logoText}>Archi.AI</span>
      </div>

      <nav className={styles.nav}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.credits}>
          <span className={styles.creditsLabel}>Créditos</span>
          <span className={styles.creditsValue}>{user?.credits ?? 0}</span>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={14} strokeWidth={1.8} />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  )
}
