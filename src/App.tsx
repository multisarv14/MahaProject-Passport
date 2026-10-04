import type { ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store/store'
import { Layout } from './components/Layout'
import Login from './pages/Login'
import CityDashboard from './pages/CityDashboard'
import Registry from './pages/Registry'
import PropertyPassport from './pages/PropertyPassport'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import FieldApp from './pages/FieldApp'
import Sources from './pages/Sources'
import Matching from './pages/Matching'
import Objections from './pages/Objections'
import Recovery from './pages/Recovery'
import { AreaSummary, DistrictDashboard, StateDashboard } from './pages/Leadership'
import Business from './pages/Business'
import Project from './pages/Project'
import Reports from './pages/Reports'
import Notifications from './pages/Notifications'
import Audit from './pages/Audit'
import Admin from './pages/Admin'
import Citizen from './pages/Citizen'

function Home() {
  const { persona } = useStore()
  switch (persona?.role) {
    case 'inspector': return <Navigate to="/field" replace />
    case 'collector': return <Navigate to="/district" replace />
    case 'state_lead': return <Navigate to="/state" replace />
    case 'representative': return <Navigate to="/area" replace />
    case 'dept_data_officer': return <Navigate to="/sources" replace />
    case 'auditor': return <Navigate to="/audit" replace />
    case 'hearing_officer': return <Navigate to="/objections" replace />
    case 'recovery_clerk': return <Navigate to="/recovery" replace />
    case 'business_officer': return <Navigate to="/business" replace />
    case 'citizen': return <Navigate to="/citizen" replace />
    default: return <CityDashboard />
  }
}

function RequireLogin({ children }: { children: ReactNode }) {
  const { persona } = useStore()
  return persona ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/citizen" element={<Citizen />} />
          <Route element={<RequireLogin><Layout /></RequireLogin>}>
            <Route index element={<Home />} />
            <Route path="registry" element={<Registry />} />
            <Route path="property/:id" element={<PropertyPassport />} />
            <Route path="cases" element={<Cases />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="field" element={<FieldApp />} />
            <Route path="field/:id" element={<FieldApp />} />
            <Route path="sources" element={<Sources />} />
            <Route path="matching" element={<Matching />} />
            <Route path="objections" element={<Objections />} />
            <Route path="recovery" element={<Recovery />} />
            <Route path="district" element={<DistrictDashboard />} />
            <Route path="state" element={<StateDashboard />} />
            <Route path="area" element={<AreaSummary />} />
            <Route path="business" element={<Business />} />
            <Route path="project" element={<Project />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="audit" element={<Audit />} />
            <Route path="admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </StoreProvider>
  )
}
