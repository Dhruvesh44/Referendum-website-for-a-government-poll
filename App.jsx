import "./App.css";

import { useEffect, useState } from "react";
import Login from "./Login";
import Register from "./Register";
import VoterDashboard from "./VoterDashboard";
import EcDashboard from "./EcDashboard";

// cookies
function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie =
    `${name}=${encodeURIComponent(value)}; Expires=${expires}; Path=/; SameSite=Lax`;
}

function deleteCookie(name) {
  // set expiry in the past so theyre remembered
  document.cookie = `${name}=; Expires=Thu, 01 Jan 2020 00:00:00 GMT; Path=/; SameSite=Lax`;
}

function App() {
  const [page, setPage] = useState("login"); // login, register, voter, ec
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState(null); // (id,email,name) or null
  const [checkingSession, setCheckingSession] = useState(true);

  const refreshMe = () => {
    setCheckingSession(true);
    fetch("http://localhost:3001/api/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.logged_in && data.user) {
          setUser(data.user);

          //remember last successful login email (cookie)
          if (data.user.email) setCookie("lastEmail", data.user.email);

          // automatically route only when currently on authorisation pages
          if (page === "login" || page === "register") {
            setPage(data.user.role === "ec" ? "ec" : "voter");
          }
        } else {
          setUser(null);
          // if user isn't logged in, never allow staying on dashboard pages
          if (page === "voter" || page === "ec") setPage("login");
        }
      })
      .catch(() => {
        setUser(null);
        if (page === "voter" || page === "ec") setPage("login");
        setMsg("Could not check session (server not reachable).");
      })
      .finally(() => setCheckingSession(false));
  };

  useEffect(() => {
    refreshMe();
  }, []);

  // enforce permissions whenever page or user changes
  useEffect(() => {
    if (checkingSession) return;

    if (page === "voter") {
      if (!user) {
        setMsg("Please log in to access the voter dashboard.");
        setPage("login");
      } else if (user.role !== "voter") {
        setMsg("Access denied: only voters can access the voter dashboard.");
        setPage(user.role === "ec" ? "ec" : "login");
      }
    }

    if (page === "ec") {
      if (!user) {
        setMsg("Please log in to access the EC dashboard.");
        setPage("login");
      } else if (user.role !== "ec") {
        setMsg("Access denied: only the Election Commission can access the EC dashboard.");
        setPage("voter");
      }
    }
  }, [page, user, checkingSession]);

  const logout = () => {
    setMsg("");
    fetch("http://localhost:3001/api/logout", {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.json())
      .then(() => {
        setUser(null);

        //privacy
        deleteCookie("lastEmail");

        setMsg("Logged out.");
        setPage("login");
      })
      .catch(() => setMsg("Logout failed (server not reachable)."));
  };

  const renderContent = () => {
    if (checkingSession) {
      return (
        <div style={{ padding: 20 }}>
          <p>Checking session…</p>
        </div>
      );
    }

    if (page === "login") {
      return (
        <Login
          onLoggedIn={(role) => {
            // after login, pull /api/me so UI is consistent
            refreshMe();
            setPage(role === "ec" ? "ec" : "voter");
          }}
        />
      );
    }

    if (page === "register") {
      return <Register onRegistered={() => setPage("login")} />;
    }

    if (page === "voter") {
      return <VoterDashboard />;
    }

    if (page === "ec") {
      return <EcDashboard />;
    }

    return null;
  };

  return (
    <div>
      <div style={{ padding: 15, borderBottom: "1px solid #ddd" }}>
        <button onClick={() => setPage("login")} disabled={checkingSession}>
          Login
        </button>{" "}
        <button onClick={() => setPage("register")} disabled={checkingSession}>
          Register
        </button>{" "}

        {/* Only show correct dashboard buttons if logged in and role matches */}
        {user?.role === "voter" && (
          <button onClick={() => setPage("voter")} disabled={checkingSession}>
            Voter Dashboard
          </button>
        )}{" "}

        {user?.role === "ec" && (
          <button onClick={() => setPage("ec")} disabled={checkingSession}>
            EC Dashboard
          </button>
        )}{" "}

        {/* Only show Logout if logged in */}
        {user && (
          <button onClick={logout} disabled={checkingSession}>
            Logout
          </button>
        )}

        {user && (
          <span style={{ marginLeft: 10, fontSize: 13 }}>
            Signed in as <b>{user.email}</b> ({user.role})
          </span>
        )}

        {msg && (
          <span style={{ marginLeft: 10 }}>
            <b>{msg}</b>
          </span>
        )}
      </div>

      {renderContent()}
    </div>
  );
}

export default App;
