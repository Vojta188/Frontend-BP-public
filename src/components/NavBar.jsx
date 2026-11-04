import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const guestPage = location.pathname === "/pripojit" || location.pathname.startsWith("/pripojit/");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="navbar">
      <div className="navbar-inner">
        <Link to={guestPage ? "/pripojit" : "/"} className="brand">TestCreator</Link>
        <div className="nav-right">
          {guestPage ? <span className="muted">Připojení k testu</span> : user ? (
            <>
              <span className="muted">{user.name} ({user.role})</span>
              <button onClick={handleLogout}>Odhlásit</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/registrace">Registrace</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
