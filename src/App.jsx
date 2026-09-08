import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Buildings from './pages/Buildings.jsx'
import BuildingDetail from './pages/BuildingDetail.jsx'
import InspectionForm from './pages/InspectionForm.jsx'
import ReportView from './pages/ReportView.jsx'
import Defects from './pages/Defects.jsx'
import DefectDetail from './pages/DefectDetail.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="buildings" element={<Buildings />} />
        <Route path="buildings/:buildingId" element={<BuildingDetail />} />
        <Route path="inspections/:inspectionId" element={<InspectionForm />} />
        <Route path="buildings/:buildingId/report/:inspectionId" element={<ReportView />} />
        <Route path="defects" element={<Defects />} />
        <Route path="defects/:defectId" element={<DefectDetail />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
