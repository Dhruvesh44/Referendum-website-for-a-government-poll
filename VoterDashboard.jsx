import { useEffect, useMemo, useState } from "react";
import ResultsChart from "./components/ResultsChart";

const API_BASE = "http://localhost:3001";

function StatusBadge({ status }) {
  const isOpen = String(status).toLowerCase() === "open";
  const cls = `badge ${isOpen ? "badgeOpen" : "badgeClosed"}`;
  return (
    <span className={cls}>
      <span className="badgeDot" />
      {isOpen ? "OPEN" : "CLOSED"}
    </span>
  );
}

export default function VoterDashboard() {
  const [referendums, setReferendums] = useState([]);
  const [error, setError] = useState("");

  async function loadReferendums() {
    try {
      const res = await fetch(`${API_BASE}/api/referendums`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Failed to load referendums");
        return;
      }

      setError("");
      setReferendums(data.referendums);
    } catch {
      setError("Server error");
    }
  }

  useEffect(() => {
    loadReferendums();
  }, []);

  async function vote(referendumId, optionId) {
    try {
      const res = await fetch(`${API_BASE}/api/vote`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referendum_id: referendumId, option_id: optionId }),
      });

      const data = await res.json();
      if (!data.ok) {
        alert(data.error || "Voting failed");
        return;
      }

      loadReferendums();
    } catch {
      alert("Server error");
    }
  }

  const openCount = useMemo(
    () => referendums.filter((r) => String(r.status).toLowerCase() === "open").length,
    [referendums]
  );

  return (
    <div className="container">
      <div className="pageTitle">
        <h2>Voter Dashboard</h2>
        <div className="subtle">{openCount} open referendum(s)</div>
      </div>

      {error && <div className="card" style={{ borderColor: "rgba(255,107,107,0.4)" }}>{error}</div>}

      <div className="stack">
        {referendums.map((r) => {
          const alreadyVoted = r.my_vote_option_id !== null;
          const isOpen = String(r.status).toLowerCase() === "open";
          const totalVotes = (r.options || []).reduce((acc, o) => acc + (o.votes || 0), 0);

          return (
            <div key={r.referendum_id} className="card">
              <div className="cardHeader">
                <div>
                  <h3>{r.title}</h3>
                  <p>{r.description}</p>
                  <div className="row" style={{ marginTop: 10 }}>
                    <StatusBadge status={r.status} />
                    {alreadyVoted && <span className="badge">You’ve voted</span>}
                    <span className="badge">
                      <span className="badgeDot" />
                      Total votes: {totalVotes}
                    </span>
                  </div>
                </div>
              </div>

              <div className="divider" />

              <ul className="list">
                {(r.options || []).map((o) => {
                  const isMine = r.my_vote_option_id === o.option_id;
                  const disabled = !isOpen || alreadyVoted;

                  return (
                    <li key={o.option_id}>
                      <div className="optionRow">
                        <div>
                          <strong>{o.text}</strong>{" "}
                          <span className="help">({o.votes} votes){isMine ? " — Your vote" : ""}</span>
                        </div>
                        <button
                          className={`btn ${disabled ? "" : "btnPrimary"}`}
                          disabled={disabled}
                          title={
                            !isOpen
                              ? "Voting is closed"
                              : alreadyVoted
                              ? "You can only vote once"
                              : "Cast your vote"
                          }
                          onClick={() => vote(r.referendum_id, o.option_id)}
                        >
                          Vote
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="divider" />

              <ResultsChart options={r.options} />
              <div className="help" style={{ marginTop: 8 }}>
                Tip: results update after you refresh.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
