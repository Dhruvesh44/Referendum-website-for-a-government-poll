import { useState } from "react";

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    const [k, ...v] = c.split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
}

function Login({ onLoggedIn }) {
  const [email, setEmail] = useState(getCookie("lastEmail") || "");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setMsg("");

    // Remember last email using a cookie (instead of localStorage)
    setCookie("lastEmail", email);

    fetch("http://localhost:3001/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setPassword("");
          onLoggedIn(data.role);
        } else {
          setMsg(data.error || "Login failed.");
        }
      })
      .catch(() => setMsg("Server not reachable."));
  };

  return (
    <div style={{ padding: 20, maxWidth: 420 }}>
      <h2>Login</h2>

      {msg && (
        <div style={{ marginBottom: 10, color: "crimson" }}>
          <b>{msg}</b>
        </div>
      )}

      <form onSubmit={submit}>
        <div style={{ marginBottom: 10 }}>
          <label>Email</label>
          <br />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
            required
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
            required
          />
        </div>

        <button type="submit">Log in</button>
      </form>

      <p style={{ marginTop: 10, fontSize: 13 }}>
        Voters log in using their email and password. Election Commission uses the default credentials.
      </p>
    </div>
  );
}

export default Login;
