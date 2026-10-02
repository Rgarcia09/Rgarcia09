import { Link } from 'react-router-dom'
import { ArrowRight, Zap, Shield, Sparkles, Layers, ChevronRight, Check } from 'lucide-react'
import styles from './Landing.module.css'

const benefits = [
  { icon: Shield, title: 'Mantén la geometría', desc: 'La estructura y composición original se preserva con alta fidelidad.' },
  { icon: Sparkles, title: 'Mejora materiales e iluminación', desc: 'Texturas, reflexiones y luz natural o artificial de nivel profesional.' },
  { icon: Zap, title: 'Resultados más realistas', desc: 'De visualización conceptual a render fotorrealista en segundos.' },
  { icon: Layers, title: 'Flujo rápido e intuitivo', desc: 'Sube, selecciona, genera. Sin curva de aprendizaje.' },
]

const modes = [
  { name: 'Enhancer Mode', desc: 'Mejora un render existente' },
  { name: 'Realism Mode', desc: 'Convierte conceptos en visualizaciones realistas' },
  { name: 'Style Mode', desc: 'Aplica lenguajes visuales y atmósferas' },
  { name: 'Geometry Lock', desc: 'Preserva composición y geometría' },
  { name: 'Presentation Mode', desc: 'Optimiza para láminas y presentaciones' },
]

const plans = [
  {
    name: 'Starter',
    price: 'Gratis',
    priceNote: '',
    credits: '10 créditos',
    features: ['10 generaciones por mes', 'Resolución estándar', 'Historial 7 días'],
    cta: 'Comenzar gratis',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    priceNote: '/ mes',
    credits: '120 créditos',
    features: ['120 generaciones por mes', 'Alta resolución', 'Historial ilimitado', 'Todos los modos', 'Prioridad en cola'],
    cta: 'Empezar con Pro',
    highlighted: true,
  },
  {
    name: 'Studio',
    price: '$89',
    priceNote: '/ mes',
    credits: 'Créditos ilimitados',
    features: ['Generaciones ilimitadas', 'Máxima resolución', 'API Access', 'Soporte prioritario', 'Facturación por equipo'],
    cta: 'Contactar',
    highlighted: false,
  },
]

export default function Landing() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLogo}>
            <span className={styles.headerLogoMark}>
              <Zap size={13} strokeWidth={2.5} />
            </span>
            <span className={styles.headerLogoText}>Archi.AI</span>
          </div>
          <nav className={styles.headerNav}>
            <a href="#modos" className={styles.headerLink}>Modos</a>
            <a href="#precios" className={styles.headerLink}>Precios</a>
          </nav>
          <div className={styles.headerActions}>
            <Link to="/login" className={styles.loginLink}>Entrar</Link>
            <Link to="/signup" className={styles.signupBtn}>
              Empezar <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Inteligencia artificial para arquitectos
          </div>
          <h1 className={styles.heroTitle}>
            Transforma tus renders en imágenes más realistas, limpias y profesionales.
          </h1>
          <p className={styles.heroSub}>
            Mejora, transforma y genera visualizaciones arquitectónicas con IA. Mantén la geometría. Eleva la calidad.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/signup" className={styles.ctaPrimary}>
              Probar ahora <ArrowRight size={15} />
            </Link>
            <a href="#ejemplos" className={styles.ctaSecondary}>
              Ver ejemplos
            </a>
          </div>
          <p className={styles.heroNote}>Sin tarjeta de crédito. 10 generaciones gratuitas.</p>
        </div>
      </section>

      {/* Before / After */}
      <section className={styles.beforeAfter} id="ejemplos">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Resultado</div>
          <h2 className={styles.sectionTitle}>Del render conceptual a la imagen profesional</h2>
          <p className={styles.sectionSub}>La geometría se mantiene. La calidad visual se transforma.</p>

          <div className={styles.compareGrid}>
            <div className={styles.compareCard}>
              <div className={styles.compareTag}>Antes</div>
              <div className={styles.comparePlaceholderBefore}>
                <div className={styles.comparePlaceholderLines}>
                  <div className={styles.compareLine} style={{ width: '60%', top: '30%' }} />
                  <div className={styles.compareLine} style={{ width: '80%', top: '50%' }} />
                  <div className={styles.compareLine} style={{ width: '45%', top: '70%' }} />
                  <div className={styles.compareBox} style={{ width: '55%', height: '45%', top: '25%', left: '10%' }} />
                  <div className={styles.compareBox} style={{ width: '30%', height: '60%', top: '20%', left: '65%' }} />
                </div>
                <span className={styles.comparePlaceholderLabel}>Render conceptual / boceto</span>
              </div>
            </div>
            <div className={styles.compareArrow}>
              <ChevronRight size={20} color="var(--gray-400)" />
            </div>
            <div className={styles.compareCard}>
              <div className={styles.compareTag + ' ' + styles.compareTagAfter}>Después</div>
              <div className={styles.comparePlaceholderAfter}>
                <div className={styles.compareAfterGradient} />
                <div className={styles.compareAfterOverlay}>
                  <div className={styles.compareAfterBuilding} />
                  <div className={styles.compareAfterSky} />
                </div>
                <span className={styles.comparePlaceholderLabel + ' ' + styles.comparePlaceholderLabelAfter}>
                  Visualización fotorrealista
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={styles.benefits}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Por qué Archi.AI</div>
          <h2 className={styles.sectionTitle}>Todo lo que necesitas para presentar mejor</h2>
          <div className={styles.benefitsGrid}>
            {benefits.map(({ icon: Icon, title, desc }) => (
              <div key={title} className={styles.benefitCard}>
                <div className={styles.benefitIcon}>
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <h3 className={styles.benefitTitle}>{title}</h3>
                <p className={styles.benefitDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modes */}
      <section className={styles.modes} id="modos">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Modos disponibles</div>
          <h2 className={styles.sectionTitle}>Elige el modo según tu necesidad</h2>
          <div className={styles.modesGrid}>
            {modes.map(({ name, desc }) => (
              <div key={name} className={styles.modeCard}>
                <div className={styles.modeCheck}>
                  <Check size={12} strokeWidth={2.5} />
                </div>
                <div>
                  <div className={styles.modeName}>{name}</div>
                  <div className={styles.modeDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className={styles.flow}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Cómo funciona</div>
          <h2 className={styles.sectionTitle}>Cuatro pasos, resultado listo</h2>
          <div className={styles.flowSteps}>
            {['Sube tu imagen', 'Selecciona el modo', 'Describe el resultado', 'Genera imagen'].map((step, i) => (
              <div key={step} className={styles.flowStep}>
                <div className={styles.flowStepNum}>{i + 1}</div>
                <div className={styles.flowStepText}>{step}</div>
                {i < 3 && <div className={styles.flowConnector} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing} id="precios">
        <div className={styles.sectionInner}>
          <div className={styles.sectionLabel}>Planes</div>
          <h2 className={styles.sectionTitle}>Simple y transparente</h2>
          <p className={styles.sectionSub}>Sin sorpresas. Cancela cuando quieras.</p>
          <div className={styles.plansGrid}>
            {plans.map(plan => (
              <div key={plan.name} className={[styles.planCard, plan.highlighted ? styles.planHighlighted : ''].filter(Boolean).join(' ')}>
                {plan.highlighted && <div className={styles.planBadge}>Más popular</div>}
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.planPrice}>
                  <span className={styles.planPriceAmount}>{plan.price}</span>
                  {plan.priceNote && <span className={styles.planPriceNote}>{plan.priceNote}</span>}
                </div>
                <div className={styles.planCredits}>{plan.credits}</div>
                <ul className={styles.planFeatures}>
                  {plan.features.map(f => (
                    <li key={f} className={styles.planFeature}>
                      <Check size={12} strokeWidth={2.5} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={[styles.planCta, plan.highlighted ? styles.planCtaHighlighted : ''].filter(Boolean).join(' ')}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className={styles.ctaSection}>
        <div className={styles.sectionInner}>
          <h2 className={styles.ctaTitle}>Empieza a generar imágenes mejores hoy</h2>
          <p className={styles.ctaSub}>10 créditos gratuitos. Sin tarjeta de crédito.</p>
          <Link to="/signup" className={styles.ctaPrimary} style={{ display: 'inline-flex' }}>
            Probar gratis <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <span className={styles.headerLogoMark}>
              <Zap size={11} strokeWidth={2.5} />
            </span>
            <span className={styles.headerLogoText}>Archi.AI</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="#">Privacidad</a>
            <a href="#">Términos</a>
            <a href="#">Contacto</a>
          </div>
          <span className={styles.footerCopy}>© 2026 Archi.AI</span>
        </div>
      </footer>
    </div>
  )
}
