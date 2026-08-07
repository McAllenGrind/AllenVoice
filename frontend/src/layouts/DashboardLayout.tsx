import {
  type ReactNode,
} from "react";

import {
  NavLink,
  Outlet,
  useNavigate,
} from "react-router";

import {
  removeAccessToken,
} from "../api/api";

import "./DashboardLayout.css";

type NavigationIconName =
  | "dashboard"
  | "agent"
  | "knowledge"
  | "calls"
  | "statistics"
  | "settings";

interface SidebarLinkProps {
  to: string;
  icon: NavigationIconName;
  children: ReactNode;
}

function AllenVoiceMark() {
  return (
    <svg
      aria-hidden="true"
      className="allenvoice-mark"
      viewBox="0 0 32 32"
    >
      <path d="M3 16h3" />
      <path d="M8 11v10" />
      <path d="M12 7v18" />
      <path d="M16 3v26" />
      <path d="M20 8v16" />
      <path d="M24 12v8" />
      <path d="M28 15v2" />
    </svg>
  );
}

function NavigationIcon({
  name,
}: {
  name: NavigationIconName;
}) {
  const commonProps = {
    "aria-hidden": true,
    className: "sidebar-link-icon",
    viewBox: "0 0 24 24",
  } as const;

  switch (name) {
    case "dashboard":
      return (
        <svg {...commonProps}>
          <path d="M4 13h6V4H4v9Z" />
          <path d="M14 20h6V11h-6v9Z" />
          <path d="M4 20h6v-3H4v3Z" />
          <path d="M14 7h6V4h-6v3Z" />
        </svg>
      );

    case "agent":
      return (
        <svg {...commonProps}>
          <path d="M12 3v3" />
          <rect
            height="12"
            rx="3"
            width="16"
            x="4"
            y="7"
          />
          <path d="M8 12h.01" />
          <path d="M16 12h.01" />
          <path d="M9 16h6" />
        </svg>
      );

    case "knowledge":
      return (
        <svg {...commonProps}>
          <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5v-17Z" />
          <path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H20" />
          <path d="M9 7h7" />
          <path d="M9 11h5" />
        </svg>
      );

    case "calls":
      return (
        <svg {...commonProps}>
          <path d="M7.4 3.5 10 8l-2.2 2.2a15.2 15.2 0 0 0 6 6L16 14l4.5 2.6-.9 3.1a2 2 0 0 1-2 1.4C9.5 20.5 3.5 14.5 2.9 6.4a2 2 0 0 1 1.4-2l3.1-.9Z" />
        </svg>
      );

    case "statistics":
      return (
        <svg {...commonProps}>
          <path d="M4 19V9" />
          <path d="M9.5 19V5" />
          <path d="M15 19v-7" />
          <path d="M20.5 19V3" />
        </svg>
      );

    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );
  }
}

function SidebarLink({
  to,
  icon,
  children,
}: SidebarLinkProps) {
  return (
    <NavLink
      className={({ isActive }) =>
        `sidebar-link${isActive ? " sidebar-link--active" : ""}`
      }
      to={to}
    >
      <NavigationIcon name={icon} />
      <span>{children}</span>
    </NavLink>
  );
}

export default function DashboardLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    removeAccessToken();
    navigate("/login");
  }

  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-main">
          <NavLink
            aria-label="AllenVoice — Tableau de bord"
            className="dashboard-brand"
            to="/dashboard"
          >
            <AllenVoiceMark />
            <span>AllenVoice</span>
          </NavLink>

          <nav
            aria-label="Navigation principale"
            className="sidebar-nav"
          >
            <SidebarLink
              icon="dashboard"
              to="/dashboard"
            >
              Tableau de bord
            </SidebarLink>

            <SidebarLink
              icon="agent"
              to="/agent"
            >
              Agent
            </SidebarLink>

            <SidebarLink
              icon="knowledge"
              to="/knowledge"
            >
              Connaissances
            </SidebarLink>

            <SidebarLink
              icon="calls"
              to="/calls"
            >
              Historique des appels
            </SidebarLink>

            <SidebarLink
              icon="statistics"
              to="/statistics"
            >
              Statistique
            </SidebarLink>

            <SidebarLink
              icon="settings"
              to="/settings"
            >
              Paramètres
            </SidebarLink>
          </nav>
        </div>

        <button
          className="sidebar-logout"
          onClick={handleLogout}
          type="button"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
          >
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
          </svg>
          <span>Déconnexion</span>
        </button>
      </aside>

      <main className="dashboard-content">
        <div className="dashboard-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
