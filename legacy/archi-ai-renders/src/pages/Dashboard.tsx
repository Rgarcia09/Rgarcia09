import { Link } from 'react-router-dom'
import { Plus, ArrowRight, Heart, Clock } from 'lucide-react'
import { useApp } from '../context/AppContext'
import styles from './Dashboard.module.css'

function formatDate(date: Date) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function Dashboard() {
  const { user, renders, toggleFavorite } = useApp()
  const recent = renders.slice(0, 6)
  const favorites = renders.filter(r => r.isFavorite)

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.greeting}>
            Hola, {user?.name?.split(' ')[0]} —
          </h1>
          <p className={styles.greetingSub}>¿Qué vas a crear hoy?</p>
        </div>
        <div className={styles.topBarActions}>
          <div className={styles.creditsBadge}>
            <span className={styles.creditsNum}>{user?.credits}</span>
            <span className={styles.creditsLabel}>créditos</span>
          </div>
          <Link to="/new" className={styles.newBtn}>
            <Plus size={14} strokeWidth={2.5} />
            Nuevo render
          </Link>
        </div>
      </div>

      {/* Hero CTA */}
      <Link to="/new" className={styles.heroCta}>
        <div className={styles.heroCtaLeft}>
          <div className={styles.heroCtaTitle}>Crear nuevo render</div>
          <div className={styles.heroCtaSub}>Sube una imagen y elige el modo de generación</div>
        </div>
        <ArrowRight size={18} color="var(--gray-400)" />
      </Link>

      {/* Stats strip */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statNum}>{renders.length}</div>
          <div className={styles.statLabel}>Renders totales</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statNum}>{renders.filter(r => r.status === 'done').length}</div>
          <div className={styles.statLabel}>Completados</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statNum}>{favorites.length}</div>
          <div className={styles.statLabel}>Favoritos</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statNum}>{user?.plan === 'pro' ? 'Pro' : user?.plan === 'studio' ? 'Studio' : 'Free'}</div>
          <div className={styles.statLabel}>Plan actual</div>
        </div>
      </div>

      {/* Recent renders */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitle}>
            <Clock size={14} strokeWidth={1.8} />
            Recientes
          </div>
          <Link to="/history" className={styles.seeAll}>Ver todo <ArrowRight size={12} /></Link>
        </div>
        <div className={styles.grid}>
          {recent.map(render => (
            <Link key={render.id} to={`/result/${render.id}`} className={styles.card}>
              <div className={styles.cardThumb}>
                {render.thumbnail ? (
                  <img src={render.thumbnail} alt={render.title} className={styles.cardImg} />
                ) : (
                  <div className={styles.cardPlaceholder} />
                )}
                <button
                  className={[styles.favBtn, render.isFavorite ? styles.favBtnActive : ''].filter(Boolean).join(' ')}
                  onClick={e => { e.preventDefault(); toggleFavorite(render.id) }}
                  aria-label="Favorito"
                >
                  <Heart size={12} strokeWidth={render.isFavorite ? 0 : 1.8} fill={render.isFavorite ? 'currentColor' : 'none'} />
                </button>
                <div className={styles.cardMode}>{render.mode.replace(' Mode', '')}</div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{render.title}</div>
                <div className={styles.cardDate}>{formatDate(render.createdAt)}</div>
              </div>
            </Link>
          ))}
          <Link to="/new" className={styles.addCard}>
            <Plus size={20} color="var(--gray-300)" />
            <span>Nuevo render</span>
          </Link>
        </div>
      </section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitle}>
              <Heart size={14} strokeWidth={1.8} />
              Favoritos
            </div>
          </div>
          <div className={styles.grid}>
            {favorites.map(render => (
              <Link key={render.id} to={`/result/${render.id}`} className={styles.card}>
                <div className={styles.cardThumb}>
                  {render.thumbnail ? (
                    <img src={render.thumbnail} alt={render.title} className={styles.cardImg} />
                  ) : (
                    <div className={styles.cardPlaceholder} />
                  )}
                  <button
                    className={[styles.favBtn, styles.favBtnActive].join(' ')}
                    onClick={e => { e.preventDefault(); toggleFavorite(render.id) }}
                    aria-label="Quitar de favoritos"
                  >
                    <Heart size={12} fill="currentColor" strokeWidth={0} />
                  </button>
                  <div className={styles.cardMode}>{render.mode.replace(' Mode', '')}</div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.cardTitle}>{render.title}</div>
                  <div className={styles.cardDate}>{formatDate(render.createdAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
