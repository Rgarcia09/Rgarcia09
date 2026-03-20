import { useState } from 'react'
import { User, Bell, Palette, Sliders, Globe, CreditCard } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Button from '../components/Button'
import Input from '../components/Input'
import styles from './Settings.module.css'

const TABS = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'preferences', label: 'Preferencias', icon: Palette },
  { id: 'defaults', label: 'Calidad por defecto', icon: Sliders },
  { id: 'language', label: 'Idioma', icon: Globe },
  { id: 'billing', label: 'Suscripción', icon: CreditCard },
  { id: 'notifications', label: 'Notificaciones', icon: Bell },
]

export default function Settings() {
  const { user } = useApp()
  const [activeTab, setActiveTab] = useState('profile')
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saved, setSaved] = useState(false)
  const [defaultResolution, setDefaultResolution] = useState('high')
  const [defaultLighting, setDefaultLighting] = useState('natural')
  const [language, setLanguage] = useState('es')
  const [theme, setTheme] = useState('light')

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Ajustes</h1>
        <p className={styles.sub}>Configura tu cuenta y preferencias.</p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        <nav className={styles.navPanel}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={[styles.navItem, activeTab === id ? styles.navItemActive : ''].filter(Boolean).join(' ')}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className={styles.panel}>

          {activeTab === 'profile' && (
            <div className={styles.panelContent}>
              <h2 className={styles.panelTitle}>Perfil</h2>
              <p className={styles.panelSub}>Información básica de tu cuenta.</p>

              <div className={styles.avatarRow}>
                <div className={styles.avatar}>
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className={styles.avatarName}>{name || 'Sin nombre'}</div>
                  <button className={styles.changeAvatarBtn}>Cambiar foto</button>
                </div>
              </div>

              <div className={styles.fields}>
                <Input label="Nombre completo" value={name} onChange={e => setName(e.target.value)} />
                <Input label="Correo electrónico" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                <Input label="Empresa u organización" placeholder="Opcional" />
                <Input label="Rol" placeholder="Ej: Arquitecto, visualizador..." />
              </div>

              <div className={styles.actions}>
                <Button onClick={handleSave}>
                  {saved ? 'Guardado ✓' : 'Guardar cambios'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className={styles.panelContent}>
              <h2 className={styles.panelTitle}>Preferencias visuales</h2>
              <p className={styles.panelSub}>Personaliza la apariencia de la plataforma.</p>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingLabel}>Tema de interfaz</div>
                  <div className={styles.settingDesc}>Elige entre modo claro u oscuro.</div>
                </div>
                <div className={styles.segmented}>
                  {['light', 'dark', 'system'].map(t => (
                    <button
                      key={t}
                      className={[styles.segBtn, theme === t ? styles.segBtnActive : ''].filter(Boolean).join(' ')}
                      onClick={() => setTheme(t)}
                    >
                      {t === 'light' ? 'Claro' : t === 'dark' ? 'Oscuro' : 'Sistema'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingLabel}>Vista de historial</div>
                  <div className={styles.settingDesc}>Cómo se muestran los renders en el historial.</div>
                </div>
                <div className={styles.segmented}>
                  {['grid', 'list'].map(v => (
                    <button key={v} className={styles.segBtn}>
                      {v === 'grid' ? 'Galería' : 'Lista'}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.actions}>
                <Button onClick={handleSave}>{saved ? 'Guardado ✓' : 'Guardar'}</Button>
              </div>
            </div>
          )}

          {activeTab === 'defaults' && (
            <div className={styles.panelContent}>
              <h2 className={styles.panelTitle}>Calidad por defecto</h2>
              <p className={styles.panelSub}>Estos valores se usarán como punto de partida en cada nueva generación.</p>

              <div className={styles.fields}>
                <div className={styles.fieldWrap}>
                  <label className={styles.fieldLabel}>Resolución por defecto</label>
                  <select
                    className={styles.select}
                    value={defaultResolution}
                    onChange={e => setDefaultResolution(e.target.value)}
                  >
                    <option value="standard">Estándar — 1024px</option>
                    <option value="high">Alta — 2048px</option>
                    <option value="ultra">Ultra — 4096px</option>
                  </select>
                </div>
                <div className={styles.fieldWrap}>
                  <label className={styles.fieldLabel}>Iluminación por defecto</label>
                  <select
                    className={styles.select}
                    value={defaultLighting}
                    onChange={e => setDefaultLighting(e.target.value)}
                  >
                    <option value="natural">Natural</option>
                    <option value="cinematic">Cinematográfica</option>
                    <option value="soft">Suave</option>
                    <option value="neutral">Neutra</option>
                  </select>
                </div>
                <div className={styles.fieldWrap}>
                  <label className={styles.fieldLabel}>Preservar geometría por defecto</label>
                  <select className={styles.select}>
                    <option value="medium">Media — Balance</option>
                    <option value="low">Baja — Más libertad</option>
                    <option value="high">Alta — Fiel a la estructura</option>
                  </select>
                </div>
              </div>

              <div className={styles.actions}>
                <Button onClick={handleSave}>{saved ? 'Guardado ✓' : 'Guardar preferencias'}</Button>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className={styles.panelContent}>
              <h2 className={styles.panelTitle}>Idioma</h2>
              <p className={styles.panelSub}>Selecciona el idioma de la interfaz.</p>

              <div className={styles.langGrid}>
                {[
                  { code: 'es', name: 'Español' },
                  { code: 'en', name: 'English' },
                  { code: 'pt', name: 'Português' },
                  { code: 'fr', name: 'Français' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    className={[styles.langCard, language === lang.code ? styles.langCardActive : ''].filter(Boolean).join(' ')}
                    onClick={() => setLanguage(lang.code)}
                  >
                    <div className={styles.langName}>{lang.name}</div>
                    <div className={styles.langCode}>{lang.code.toUpperCase()}</div>
                  </button>
                ))}
              </div>

              <div className={styles.actions}>
                <Button onClick={handleSave}>{saved ? 'Guardado ✓' : 'Guardar'}</Button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className={styles.panelContent}>
              <h2 className={styles.panelTitle}>Suscripción</h2>
              <p className={styles.panelSub}>Gestiona tu plan y métodos de pago.</p>

              <div className={styles.billingCard}>
                <div className={styles.billingPlan}>Plan <strong>Pro</strong></div>
                <div className={styles.billingPrice}>$29 / mes</div>
                <div className={styles.billingRenew}>Próxima renovación: 1 de abril de 2026</div>
              </div>

              <div className={styles.billingActions}>
                <Button variant="secondary">Cambiar plan</Button>
                <Button variant="danger">Cancelar suscripción</Button>
              </div>

              <div className={styles.settingRow} style={{ marginTop: 24 }}>
                <div className={styles.settingInfo}>
                  <div className={styles.settingLabel}>Método de pago</div>
                  <div className={styles.settingDesc}>Visa terminada en •••• 4242</div>
                </div>
                <Button variant="secondary" size="sm">Actualizar</Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={styles.panelContent}>
              <h2 className={styles.panelTitle}>Notificaciones</h2>
              <p className={styles.panelSub}>Configura qué notificaciones recibes.</p>

              <div className={styles.notifList}>
                {[
                  { label: 'Render completado', desc: 'Cuando una generación termina', on: true },
                  { label: 'Créditos bajos', desc: 'Cuando tienes menos de 5 créditos', on: true },
                  { label: 'Novedades del producto', desc: 'Nuevas funciones y mejoras', on: false },
                  { label: 'Resumen semanal', desc: 'Estadísticas de uso semanales', on: false },
                ].map(notif => (
                  <div key={notif.label} className={styles.notifItem}>
                    <div className={styles.notifInfo}>
                      <div className={styles.notifLabel}>{notif.label}</div>
                      <div className={styles.notifDesc}>{notif.desc}</div>
                    </div>
                    <div className={[styles.toggleTrack, notif.on ? styles.toggleOn : ''].join(' ')}>
                      <div className={styles.toggleThumb} />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.actions}>
                <Button onClick={handleSave}>{saved ? 'Guardado ✓' : 'Guardar'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
