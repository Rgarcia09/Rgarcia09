import { createContext, useContext, useState, type ReactNode } from 'react'

interface User {
  id: string
  name: string
  email: string
  credits: number
  plan: 'free' | 'pro' | 'studio'
}

interface RenderItem {
  id: string
  title: string
  mode: string
  prompt: string
  status: 'processing' | 'done' | 'error'
  createdAt: Date
  thumbnail?: string
  isFavorite: boolean
  parameters: Record<string, unknown>
}

interface AppContextType {
  user: User | null
  isAuthenticated: boolean
  renders: RenderItem[]
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  addRender: (item: Omit<RenderItem, 'id' | 'createdAt'>) => string
  toggleFavorite: (id: string) => void
  deleteRender: (id: string) => void
}

const AppContext = createContext<AppContextType | null>(null)

const MOCK_USER: User = {
  id: '1',
  name: 'Alex García',
  email: 'alex@estudio.com',
  credits: 48,
  plan: 'pro',
}

const MOCK_RENDERS: RenderItem[] = [
  {
    id: '1',
    title: 'Casa Minimalista — Fachada',
    mode: 'Realism Mode',
    prompt: 'Luz de tarde cálida, jardín con vegetación mediterránea, cielo despejado',
    status: 'done',
    createdAt: new Date('2026-03-19'),
    thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
    isFavorite: true,
    parameters: { realism: 8, intensity: 6, lighting: 'natural' },
  },
  {
    id: '2',
    title: 'Lobby Comercial — Interior',
    mode: 'Enhancer Mode',
    prompt: 'Materiales de lujo, iluminación cinematográfica',
    status: 'done',
    createdAt: new Date('2026-03-18'),
    thumbnail: 'https://images.unsplash.com/photo-1631889993959-41b4e9c6e3c5?w=400&q=80',
    isFavorite: false,
    parameters: { realism: 7, intensity: 8, lighting: 'cinematic' },
  },
  {
    id: '3',
    title: 'Vivienda Colectiva — Vista aérea',
    mode: 'Style Mode',
    prompt: 'Atmósfera nórdica, materiales naturales, luz difusa',
    status: 'done',
    createdAt: new Date('2026-03-17'),
    thumbnail: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80',
    isFavorite: true,
    parameters: { realism: 6, intensity: 5, lighting: 'soft' },
  },
  {
    id: '4',
    title: 'Torre Corporativa — Render conceptual',
    mode: 'Presentation Mode',
    prompt: '',
    status: 'done',
    createdAt: new Date('2026-03-16'),
    thumbnail: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&q=80',
    isFavorite: false,
    parameters: { realism: 5, intensity: 4, lighting: 'neutral' },
  },
]

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [renders, setRenders] = useState<RenderItem[]>(MOCK_RENDERS)

  const login = async (_email: string, _password: string) => {
    await new Promise(r => setTimeout(r, 800))
    setUser(MOCK_USER)
  }

  const logout = () => setUser(null)

  const addRender = (item: Omit<RenderItem, 'id' | 'createdAt'>): string => {
    const id = Date.now().toString()
    const newRender: RenderItem = { ...item, id, createdAt: new Date() }
    setRenders(prev => [newRender, ...prev])
    return id
  }

  const toggleFavorite = (id: string) => {
    setRenders(prev =>
      prev.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r)
    )
  }

  const deleteRender = (id: string) => {
    setRenders(prev => prev.filter(r => r.id !== id))
  }

  return (
    <AppContext.Provider value={{
      user,
      isAuthenticated: !!user,
      renders,
      login,
      logout,
      addRender,
      toggleFavorite,
      deleteRender,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
