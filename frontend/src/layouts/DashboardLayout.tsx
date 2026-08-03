import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router";

import {
  removeAccessToken,
} from "../api/api";

import "./DashboardLayout.css";

export default function DashboardLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    removeAccessToken();
    navigate("/login");
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div>
          <h1>AllenVoice</h1>

          <nav className="sidebar-nav">
            <NavLink to="/dashboard">
              Dashboard
            </NavLink>

            <NavLink to="/calls">
              Appels
            </NavLink>

            <NavLink to="/knowledge">
              Base de connaissances
            </NavLink>

            <NavLink to="/agent">
              Agent IA
            </NavLink>

            <NavLink to="/settings">
              Paramètres
            </NavLink>
          </nav>
        </div>

        <button
          type="button"
          onClick={handleLogout}
        >
          Se déconnecter
        </button>
      </aside>

      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}