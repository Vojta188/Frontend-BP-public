import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const data = await loginApi({ email, password });
      login({ token: data.token, user: data.user });
      navigate("/");
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <div className="card">
      <h2>Přihlášení</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="form">
        <label>Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />

        <label>Heslo</label>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />

        <button>Login</button>
      </form>
      <div className="editorNotice"><strong>Máš kód testu od učitele?</strong><p>Připoj se svým jménem, bez registrace.</p><Link className="linkBtn" to="/pripojit">Připojit se k testu kódem</Link></div>
    </div>
  );
}
