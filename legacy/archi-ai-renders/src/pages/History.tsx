import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Heart, Trash2, Copy, Search, SlidersHorizontal } from 'lucide-react'
import { useApp } from '../context/AppContext'
import styles from './History.module.css'

const MODES = ['Todos', 'Enhancer Mode', 'Realism Mode', 'Style Mode', 'Geometry Lock', 'Presentation Mode']

function formatDate(date: Date) {
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function History() {
  const { renders, toggleFavorite, deleteRender } = useApp()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [modeFilter, setModeFilter] = useState('Todos')
  const [tab, setTab] = useState(searchParams.get('tab') === 'favorites' ? 'favorites' : 'all')

  let filtered = renders
  if (tab === 'favorites') filtered = filtered.filter(r => r.isFavorite)
  if (modeFilter !== 'Todos') filtered = filtered.filter(r => r.mode === modeFilter)
  if (search) filtered = filtered.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.prompt.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Historial</h1>
          <p className={styles.sub}>{renders.length} renders guardados</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={[styles.tab, tab === 'all' ? styles.tabActive : ''].filter(Boolean).join(' ')}
          onClick={() => setTab('all')}
        >
          Todos ({renders.length})
        </button>
        <button
          className={[styles.tab, tab === 'favorites' ? styles.tabActive : ''].filter(Boolean).join(' ')}
          onClick={() => setTab('favorites')}
        >
          <Heart size={12} /> Favoritos ({renders.filter(r => r.isFavorite).length})
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={13} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por nombre o prompt..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.modeFilters}>
          <SlidersHorizontal size={13} color="var(--gray-400)" />
          {MODES.map(m => (
            <button
              key={m}
              className={[styles.modeFilter, modeFilter === m ? styles.modeFilterActive : ''].filter(Boolean).join(' ')}
              onClick={() => setModeFilter(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            {tab === 'favorites' ? <Heart size={24} /> : <Search size={24} />}
          </div>
          <div className={styles.emptyTitle}>
            {tab === 'favorites' ? 'Sin favoritos aún' : 'No se encontraron resultados'}
          </div>
          <div className={styles.emptyDesc}>
            {tab === 'favorites' ? 'Marca renders como favoritos para verlos aquí.' : 'Intenta con otro término de búsqueda.'}
          </div>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(render => (
            <div key={render.id} className={styles.card}>
              <Link to={`/result/${render.id}`} className={styles.cardThumb}>
                {render.thumbnail ? (
                  <img src={render.thumbnail} alt={render.title} className={styles.cardImg} />
                ) : (
                  <div className={styles.cardPlaceholder} />
                )}
                <div className={styles.cardOverlay}>
                  <span className={styles.cardMode}>{render.mode.replace(' Mode', '')}</span>
                </div>
              </Link>
              <div className={styles.cardBody}>
                <div className={styles.cardMeta}>
                  <Link to={`/result/${render.id}`} className={styles.cardTitle}>{render.title}</Link>
                  <div className={styles.cardDate}>{formatDate(render.createdAt)}</div>
                  {render.prompt && (
                    <div className={styles.cardPrompt}>{render.prompt}</div>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={[styles.actionBtn, render.isFavorite ? styles.actionBtnActive : ''].filter(Boolean).join(' ')}
                    onClick={() => toggleFavorite(render.id)}
                    title="Favorito"
                  >
                    <Heart size={13} strokeWidth={render.isFavorite ? 0 : 1.8} fill={render.isFavorite ? 'currentColor' : 'none'} />
                  </button>
                  <Link to={`/new`} className={styles.actionBtn} title="Duplicar configuración">
                    <Copy size={13} strokeWidth={1.8} />
                  </Link>
                  <button
                    className={[styles.actionBtn, styles.actionBtnDanger].join(' ')}
                    onClick={() => deleteRender(render.id)}
                    title="Eliminar"
                  >
                    <Trash2 size={13} strokeWidth={1.8} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
