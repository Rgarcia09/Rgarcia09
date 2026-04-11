import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Dashboard from './pages/Dashboard'
import NewRender from './pages/NewRender'
import Result from './pages/Result'
import History from './pages/History'
import Credits from './pages/Credits'
import Settings from './pages/Settings'
import AppLayout from './components/AppLayout'
import DAW from './pages/DAW'

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/daw" element={<DAW />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/new" element={<NewRender />} />
            <Route path="/result/:id" element={<Result />} />
            <Route path="/history" element={<History />} />
            <Route path="/credits" element={<Credits />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  )
}

export default App
