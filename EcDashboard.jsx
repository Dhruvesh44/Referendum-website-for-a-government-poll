import { useEffect, useMemo, useState } from "react";
import ResultsChart from "./components/ResultsChart";

const API_BASE = "http://localhost:3001";

function StatusBadge({ status, locked }) {
  const isOpen = String(status).toLowerCase() === "open";
  return (
    <span className={`badge ${isOpen ? "badgeOpen" : "badgeClosed"}`}>
      <span className="badgeDot" />
      {isOpen ? "OPEN" : "CLOSED"}
      {locked ? <span className="badge badgeLocked" style={{ marginLeft: 10 }}>LOCKED</span> : null}
    </span>
  );
}

function normalizeOptionsForForm(options) {
  return (options || []).map((o) => o.text ?? o.option_text ?? "");
}

export default function EcDashboard() {
  const [referendums, setReferendums] = useState([]);
  const [error, setError] = useState("");

  // create
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createOptions, setCreateOptions] = useState(["", ""]);

  // edit
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOptions, setEditOptions] = useState(["", ""]);

  const editingRef = useMemo(
    () => referendums.find((r) => r.referendum_id === editingId) || null,
    [referendums, editingId]
  );

  async function loadReferendums() {
    try {
      const res = await fetch(`${API_BASE}/api/ec/referendums`, { credentials: "include" });
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

  //create helpers
  const setCreateOptionAt = (i, v) => setCreateOptions((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addCreateOption = () => setCreateOptions((p) => [...p, ""]);
  const removeCreateOption = (i) => setCreateOptions((p) => p.filter((_, idx) => idx !== i));

  async function submitCreate(e) {
    e.preventDefault();
    const cleanedOptions = createOptions.map((o) => o.trim()).filter(Boolean);

    if (!createTitle.trim()) return alert("Title is required.");
    if (cleanedOptions.length < 2) return alert("Please provide at least 2 options.");

    try {
      const res = await fetch(`${API_BASE}/api/ec/referendums`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim(),
          options: cleanedOptions,
        }),
      });

      const data = await res.json();
      if (!data.ok) return alert(data.error || "Failed to create referendum");

      setCreateTitle("");
      setCreateDescription("");
      setCreateOptions(["", ""]);
      loadReferendums();
    } catch {
      alert("Server error");
    }
  }

  // edit helpers
  function startEdit(ref) {
    setEditingId(ref.referendum_id);
    setEditTitle(ref.title ?? "");
    setEditDescription(ref.description ?? "");
    const opts = normalizeOptionsForForm(ref.options);
    setEditOptions(opts.length >= 2 ? opts : ["", ""]);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
    setEditOptions(["", ""]);
  }

  const setEditOptionAt = (i, v) => setEditOptions((p) => p.map((x, idx) => (idx === i ? v : x)));
  const addEditOption = () => setEditOptions((p) => [...p, ""]);
  const removeEditOption = (i) => setEditOptions((p) => p.filter((_, idx) => idx !== i));

  async function submitEdit(e) {
    e.preventDefault();
    if (!editingId) return;

    const cleanedOptions = editOptions.map((o) => o.trim()).filter(Boolean);
    if (!editTitle.trim()) return alert("Title is required.");
    if (cleanedOptions.length < 2) return alert("Please provide at least 2 options.");

    try {
      const res = await fetch(`${API_BASE}/api/ec/referendums/${editingId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          options: cleanedOptions,
        }),
      });

      const data = await res.json();
      if (!data.ok) return alert(data.error || "Failed to update referendum");

      cancelEdit();
      loadReferendums();
    } catch {
      alert("Server error");
    }
  }

  async function updateStatus(id, status) {
    try {
      const res = await fetch(`${API_BASE}/api/ec/referendums/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!data.ok) return alert(data.error || "Failed to update status");

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
        <h2>Election Commission</h2>
        <div className="subtle">{openCount} open referendum(s)</div>
      </div>

      {error && <div className="card" style={{ borderColor: "rgba(255,107,107,0.4)" }}>{error}</div>}

      {/* Create */}
      <div className="card">
        <div className="cardHeader">
          <div>
            <h3>Create Referendum</h3>
            <p>Create a new referendum (starts CLOSED and editable until opened).</p>
          </div>
        </div>

        <div className="divider" />

        <form onSubmit={submitCreate} className="stack">
          <div>
            <div className="label">Title</div>
            <input className="input" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
          </div>

          <div>
            <div className="label">Description</div>
            <textarea className="textarea" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} />
          </div>

          <div>
            <div className="label">Options</div>
            <div className="stack">
              {createOptions.map((opt, idx) => (
                <div key={idx} className="row" style={{ justifyContent: "space-between" }}>
                  <input
                    className="input"
                    style={{ flex: 1 }}
                    value={opt}
                    onChange={(e) => setCreateOptionAt(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                  />
                  <button
                    className="btn"
                    type="button"
                    onClick={() => removeCreateOption(idx)}
                    disabled={createOptions.length <= 2}
                    title={createOptions.length <= 2 ? "At least two options are required" : "Remove option"}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn" type="button" onClick={addCreateOption}>Add option</button>
              <button className="btn btnPrimary" type="submit">Create</button>
            </div>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="stack" style={{ marginTop: 16 }}>
        {referendums.map((r) => {
          const locked = r.locked === 1;
          const isEditing = editingId === r.referendum_id;
          const totalVotes = (r.options || []).reduce((acc, o) => acc + (o.votes || 0), 0);

          return (
            <div key={r.referendum_id} className="card">
              <div className="cardHeader">
                <div>
                  <h3>{r.title}</h3>
                  <p>{r.description}</p>
                  <div className="row" style={{ marginTop: 10 }}>
                    <StatusBadge status={r.status} locked={locked} />
                    <span className="badge">
                      <span className="badgeDot" />
                      Total votes: {totalVotes}
                    </span>
                  </div>
                </div>

                <div className="row">
                  <button
                    className={`btn ${String(r.status).toLowerCase() === "open" ? "" : "btnSuccess"}`}
                    disabled={String(r.status).toLowerCase() === "open"}
                    onClick={() => updateStatus(r.referendum_id, "open")}
                    title={locked ? "Opening locks the referendum from edits" : "Open referendum"}
                  >
                    Open
                  </button>
                  <button
                    className={`btn ${String(r.status).toLowerCase() === "closed" ? "" : "btnDanger"}`}
                    disabled={String(r.status).toLowerCase() === "closed"}
                    onClick={() => updateStatus(r.referendum_id, "closed")}
                    title="Close referendum"
                  >
                    Close
                  </button>
                  {!isEditing ? (
                    <button
                      className="btn"
                      disabled={locked}
                      onClick={() => startEdit(r)}
                      title={locked ? "Locked referendums cannot be edited" : "Edit referendum"}
                    >
                      Edit
                    </button>
                  ) : (
                    <button className="btn" type="button" onClick={cancelEdit}>Cancel</button>
                  )}
                </div>
              </div>

              {isEditing && (
                <>
                  <div className="divider" />
                  <form onSubmit={submitEdit} className="stack">
                    <div>
                      <div className="label">Title</div>
                      <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                    </div>

                    <div>
                      <div className="label">Description</div>
                      <textarea className="textarea" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                    </div>

                    <div>
                      <div className="label">Options</div>
                      <div className="stack">
                        {editOptions.map((opt, idx) => (
                          <div key={idx} className="row" style={{ justifyContent: "space-between" }}>
                            <input
                              className="input"
                              style={{ flex: 1 }}
                              value={opt}
                              onChange={(e) => setEditOptionAt(idx, e.target.value)}
                              placeholder={`Option ${idx + 1}`}
                            />
                            <button
                              className="btn"
                              type="button"
                              onClick={() => removeEditOption(idx)}
                              disabled={editOptions.length <= 2}
                              title={editOptions.length <= 2 ? "At least two options are required" : "Remove option"}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="row" style={{ marginTop: 10 }}>
                        <button className="btn" type="button" onClick={addEditOption}>Add option</button>
                        <button className="btn btnPrimary" type="submit">Save changes</button>
                      </div>

                      {editingRef?.locked === 1 && (
                        <div className="help" style={{ marginTop: 10 }}>
                          This referendum is locked and cannot be edited.
                        </div>
                      )}
                    </div>
                  </form>
                </>
              )}

              <div className="divider" />

              <div className="stack">
                <div>
                  <div className="label">Current Options</div>
                  <ul className="list">
                    {(r.options || []).map((o) => (
                      <li key={o.option_id}>
                        <strong>{o.text ?? o.option_text}</strong> <span className="help">— {o.votes} votes</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <ResultsChart options={r.options} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
