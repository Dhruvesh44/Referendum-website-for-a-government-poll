import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function Register({ onRegistered }) {
  const scannerId = "qr-reader";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [scc, setScc] = useState("");

  const [msg, setMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [scannerOn, setScannerOn] = useState(false);
  const qrRef = useRef(null);

  // basic validation
  const validate = () => {
    const errs = {};

    if (!email.includes("@")) errs.email = "Please enter a valid email address.";
    if (fullName.trim().length < 2) errs.fullName = "Please enter your full name.";
    if (!dob) errs.dob = "Please select your date of birth.";

    // check if person is 18+ when registering
    if (dob) {
      const dobDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
      if (age < 18) errs.dob = "You must be at least 18 to register.";
    }

    //password checks/errors
    if (password.length < 6) errs.password = "Password must be at least 6 characters.";
    if (password !== confirm) errs.confirm = "Passwords do not match.";
    if (!scc.trim()) errs.scc = "Please enter your SCC (or scan the QR code).";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };
  //qr scanner
  const stopScanner = async () => {
    try {
      if (qrRef.current) {
        await qrRef.current.stop();
        await qrRef.current.clear();
        qrRef.current = null;
      }
    } catch (e) {
      // ignore cleanup errors
    } finally {
      setScannerOn(false);
    }
  };

  const startScanner = async () => {
    setMsg("");
    setFieldErrors((prev) => ({ ...prev, scc: undefined }));

    // if already running, stop first
    if (scannerOn) {
      await stopScanner();
      return;
    }

    try {
      const qr = new Html5Qrcode(scannerId);
      qrRef.current = qr;
      setScannerOn(true);

      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          setScc(decodedText);
          setMsg("SCC scanned successfully.");
          stopScanner();
        },
        () => {}
      );
    } catch (err) {
      console.error("QR start error:", err);
      setMsg("Could not start camera: " + (err?.message || String(err)));
      await stopScanner();
    }
  };

  // ensure container exists and scanner is cleaned up if component unmounts
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!validate()) {
      setMsg("Please fix the highlighted fields.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("http://localhost:3001/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          fullName,
          dob,
          password,
          scc
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setMsg("Registration successful. You can now log in.");
        setEmail("");
        setFullName("");
        setDob("");
        setPassword("");
        setConfirm("");
        setScc("");
        setFieldErrors({});
        if (onRegistered) onRegistered();
      } else {
        setMsg(data.error || "Registration failed.");
      }
    } catch (err) {
      setMsg("Could not reach server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <h2>Register</h2>

      {msg && (
        <div style={{ marginBottom: 10, color: msg.includes("successful") ? "green" : "crimson" }}>
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
            disabled={submitting}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%" }}
          />
          {fieldErrors.email && <div style={{ color: "crimson", fontSize: 12 }}>{fieldErrors.email}</div>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Full name</label>
          <br />
          <input
            value={fullName}
            disabled={submitting}
            onChange={(e) => setFullName(e.target.value)}
            style={{ width: "100%" }}
          />
          {fieldErrors.fullName && <div style={{ color: "crimson", fontSize: 12 }}>{fieldErrors.fullName}</div>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Date of birth</label>
          <br />
          <input
            type="date"
            value={dob}
            disabled={submitting}
            onChange={(e) => setDob(e.target.value)}
          />
          {fieldErrors.dob && <div style={{ color: "crimson", fontSize: 12 }}>{fieldErrors.dob}</div>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Password</label>
          <br />
          <input
            type="password"
            value={password}
            disabled={submitting}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%" }}
          />
          {fieldErrors.password && <div style={{ color: "crimson", fontSize: 12 }}>{fieldErrors.password}</div>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Confirm password</label>
          <br />
          <input
            type="password"
            value={confirm}
            disabled={submitting}
            onChange={(e) => setConfirm(e.target.value)}
            style={{ width: "100%" }}
          />
          {fieldErrors.confirm && <div style={{ color: "crimson", fontSize: 12 }}>{fieldErrors.confirm}</div>}
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>SCC</label>
          <br />
          <input
            value={scc}
            disabled={submitting}
            onChange={(e) => setScc(e.target.value)}
            style={{ width: "100%" }}
          />
          {fieldErrors.scc && <div style={{ color: "crimson", fontSize: 12 }}>{fieldErrors.scc}</div>}

          <div style={{ marginTop: 8 }}>
            <button type="button" onClick={startScanner} disabled={submitting}>
              {scannerOn ? "Stop camera" : "Scan QR with camera"}
            </button>
          </div>

          {/* Keep  container mounted so Html qrcode can always find it */}
          <div style={{ display: scannerOn ? "block" : "none", marginTop: 10 }}>
            <div id={scannerId} />
            <div style={{ fontSize: 12, marginTop: 6 }}>
              Tip: use good lighting or increase your brightness if it doesn't scan.
            </div>
          </div>
        </div>

        <button type="submit" disabled={submitting}>
          {submitting ? "Registering…" : "Register"}
        </button>
      </form>
    </div>
  );
}
