import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerApi } from "../api/endpoints";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await registerApi({ name, email, password, role, inviteCode: role === "teacher" ? inviteCode : undefined });
      setMessage("Registrace OK. Teď se přihlas.");
      setTimeout(() => navigate("/login"), 600);
    } catch (caughtError) {
      setError(caughtError.message);
    }
  };

  return (
    <div className="card">
      <h2>Registrace</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="ok">{message}</div>}
      <form onSubmit={handleSubmit} className="form">
        <label>Jméno</label>
        <input value={name} onChange={(event) => setName(event.target.value)} />

        <label>Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />

        <label>Heslo</label>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />

        <label>Role</label>
        <select value={role} onChange={(event) => setRole(event.target.value)}>
          <option value="student">Student</option>
          <option value="teacher">Učitel</option>
        </select>

        {role === "teacher" && (
          <>
            <label>Pozvánkový kód učitele</label>
            <input type="password" value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} />
          </>
        )}

        <button>Registrovat</button>
      </form>
    </div>
  );
}
