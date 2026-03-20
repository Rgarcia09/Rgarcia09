import { Check, Zap, TrendingUp } from 'lucide-react'
import { useApp } from '../context/AppContext'
import styles from './Credits.module.css'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Gratis',
    priceNote: '',
    credits: 10,
    features: ['10 generaciones / mes', 'Resolución estándar', 'Historial 7 días', 'Enhancer Mode'],
    current: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$29',
    priceNote: '/ mes',
    credits: 120,
    features: ['120 generaciones / mes', 'Alta resolución (2048px)', 'Historial ilimitado', 'Todos los modos', 'Prioridad en cola'],
    current: true,
  },
  {
    id: 'studio',
    name: 'Studio',
    price: '$89',
    priceNote: '/ mes',
    credits: -1,
    features: ['Generaciones ilimitadas', 'Máxima resolución (4096px)', 'API Access', 'Soporte prioritario', 'Facturación por equipo'],
    current: false,
  },
]

const CREDIT_PACKS = [
  { credits: 20, price: '$8', per: '$0.40 / crédito' },
  { credits: 60, price: '$20', per: '$0.33 / crédito', badge: 'Ahorra 18%' },
  { credits: 150, price: '$45', per: '$0.30 / crédito', badge: 'Mejor valor' },
]

const HISTORY = [
  { date: '19 mar 2026', action: 'Generación — Enhancer Mode', credits: -1 },
  { date: '18 mar 2026', action: 'Generación — Realism Mode', credits: -2 },
  { date: '18 mar 2026', action: 'Generación — Style Mode', credits: -1 },
  { date: '15 mar 2026', action: 'Recarga Pro — Marzo 2026', credits: +120 },
]

export default function Credits() {
  const { user } = useApp()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Créditos y plan</h1>
        <p className={styles.sub}>Gestiona tu suscripción y créditos disponibles.</p>
      </div>

      {/* Balance */}
      <div className={styles.balanceCard}>
        <div className={styles.balanceLeft}>
          <div className={styles.balanceLabel}>Créditos disponibles</div>
          <div className={styles.balanceNum}>{user?.credits ?? 0}</div>
          <div className={styles.balancePlan}>
            Plan <strong>{user?.plan === 'pro' ? 'Pro' : user?.plan === 'studio' ? 'Studio' : 'Starter'}</strong>
            {' · '}
            Próxima recarga el 1 de abril
          </div>
        </div>
        <div className={styles.balanceRight}>
          <div className={styles.balanceBar}>
            <div
              className={styles.balanceBarFill}
              style={{ width: `${Math.min(((user?.credits ?? 0) / 120) * 100, 100)}%` }}
            />
          </div>
          <div className={styles.balanceBarMeta}>
            {user?.credits} / 120 créditos mensuales
          </div>
        </div>
      </div>

      {/* Credit packs */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <Zap size={15} strokeWidth={1.8} />
            Packs de créditos
          </h2>
          <p className={styles.sectionSub}>Añade créditos sin cambiar de plan.</p>
        </div>
        <div className={styles.packsGrid}>
          {CREDIT_PACKS.map(pack => (
            <div key={pack.credits} className={styles.packCard}>
              {pack.badge && <div className={styles.packBadge}>{pack.badge}</div>}
              <div className={styles.packCredits}>{pack.credits} créditos</div>
              <div className={styles.packPrice}>{pack.price}</div>
              <div className={styles.packPer}>{pack.per}</div>
              <button className={styles.packBtn}>Comprar</button>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <TrendingUp size={15} strokeWidth={1.8} />
            Planes
          </h2>
          <p className={styles.sectionSub}>Cambia de plan en cualquier momento.</p>
        </div>
        <div className={styles.plansGrid}>
          {PLANS.map(plan => (
            <div key={plan.id} className={[styles.planCard, plan.current ? styles.planCurrent : ''].filter(Boolean).join(' ')}>
              {plan.current && <div className={styles.currentBadge}>Plan actual</div>}
              <div className={styles.planName}>{plan.name}</div>
              <div className={styles.planPrice}>
                {plan.price}
                {plan.priceNote && <span className={styles.planPriceNote}>{plan.priceNote}</span>}
              </div>
              <div className={styles.planCredits}>
                {plan.credits === -1 ? 'Ilimitado' : `${plan.credits} créditos / mes`}
              </div>
              <ul className={styles.planFeatures}>
                {plan.features.map(f => (
                  <li key={f} className={styles.planFeature}>
                    <Check size={11} strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={[styles.planBtn, plan.current ? styles.planBtnCurrent : ''].filter(Boolean).join(' ')}
                disabled={plan.current}
              >
                {plan.current ? 'Plan actual' : plan.id === 'studio' ? 'Contactar' : `Cambiar a ${plan.name}`}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Usage history */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Historial de uso</h2>
        </div>
        <div className={styles.historyList}>
          {HISTORY.map((item, i) => (
            <div key={i} className={styles.historyItem}>
              <div className={styles.historyLeft}>
                <div className={styles.historyAction}>{item.action}</div>
                <div className={styles.historyDate}>{item.date}</div>
              </div>
              <div className={[
                styles.historyCredits,
                item.credits < 0 ? styles.creditsMinus : styles.creditsPlus
              ].join(' ')}>
                {item.credits > 0 ? `+${item.credits}` : item.credits}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
