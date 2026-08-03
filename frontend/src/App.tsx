import {
  Navigate,
  Route,
  Routes,
} from "react-router";

import ProtectedRoute from "./components/ProtectedRoute";

import DashboardLayout from "./layouts/DashboardLayout";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CallsPage from "./pages/CallsPage";
import KnowledgePage from "./pages/KnowledgePage";
import AgentPage from "./pages/AgentPage";
import SettingsPage from "./pages/SettingsPage";
import CallDetailPage from "./pages/CallDetailPage";
import PlatformAdminRoute from "./components/PlatformAdminRoute";
import AdminCompaniesPage from "./pages/AdminCompaniesPage";
import AdminLayout from "./layouts/AdminLayout";

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      {/* Espace des entreprises clientes */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />

        <Route
          path="/calls"
          element={<CallsPage />}
        />

        <Route
          path="/calls/:id"
          element={<CallDetailPage />}
        />

        <Route
          path="/knowledge"
          element={<KnowledgePage />}
        />

        <Route
          path="/agent"
          element={<AgentPage />}
        />

        <Route
          path="/settings"
          element={<SettingsPage />}
        />
      </Route>

      {/* Back-office de la plateforme AllenVoice */}
      <Route
        element={
          <PlatformAdminRoute>
            <AdminLayout />
          </PlatformAdminRoute>
        }
      >
        <Route
          path="/admin"
          element={
            <Navigate
              to="/admin/companies"
              replace
            />
          }
        />

        <Route
          path="/admin/companies"
          element={<AdminCompaniesPage />}
        />
      </Route>

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
}