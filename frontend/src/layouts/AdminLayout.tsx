import {
    NavLink,
    Outlet,
    useNavigate,
} from "react-router";

import {
    removeAccessToken,
} from "../api/api";

import "./AdminLayout.css";

export default function AdminLayout() {
    const navigate = useNavigate();

    function handleLogout() {
        removeAccessToken();
        navigate("/login");
    }

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div>
                    <div className="admin-brand">
                        <h1>AllenVoice</h1>
                        <p>Administration plateforme</p>
                    </div>

                    <nav className="admin-nav">
                        <NavLink to="/admin/companies">
                            Entreprises
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

            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
}