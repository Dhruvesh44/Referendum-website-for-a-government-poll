import "dotenv/config";
import express from "express";
import session from "express-session";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import db from "./db.js";

const app = express();
const PORT = process.env.PORT || 3001;

//configuration 
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

//EC login through .env file -> this is in mslr/server/.env
const EC_EMAIL = process.env.EC_EMAIL || "";
const EC_PASSWORD = process.env.EC_PASSWORD || "";

//middleware 
app.use(express.json());

app.use(
  cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
  })
);

app.use(
  session({
    name: "mslr.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 2,
    },
  })
);

// task 2 REST API


const MSLR_BASE = "/mslr";

// get all voters
app.get(`${MSLR_BASE}/voters`, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT voter_id, email, full_name, dob, created_at
      FROM voters
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch voters" });
  }
});

// get a single voter
app.get(`${MSLR_BASE}/voters/:voterID`, async (req, res) => {
  try {
    const { voterID } = req.params;

    const [rows] = await db.query(
      `
      SELECT voter_id, email, full_name, dob, created_at
      FROM voters
      WHERE voter_id = ?
    `,
      [voterID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Voter not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch voter" });
  }
});

// get all referendums
app.get(`${MSLR_BASE}/referendums`, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT referendum_id, title, status, created_at
      FROM referendums
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch referendums" });
  }
});

// get a single referendum
app.get(`${MSLR_BASE}/referendums/:referendumID`, async (req, res) => {
  try {
    const { referendumID } = req.params;

    const [rows] = await db.query(
      `
      SELECT referendum_id, title, status, created_at
      FROM referendums
      WHERE referendum_id = ?
    `,
      [referendumID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Referendum not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch referendum" });
  }
});

// get the referendum results
app.get(`${MSLR_BASE}/referendums/:referendumID/results`, async (req, res) => {
  try {
    const { referendumID } = req.params;

    const [rows] = await db.query(
      `
      SELECT ro.option_id, ro.option_text, COUNT(v.vote_id) AS votes
      FROM referendum_options ro
      LEFT JOIN votes v ON v.option_id = ro.option_id
      WHERE ro.referendum_id = ?
      GROUP BY ro.option_id
    `,
      [referendumID]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No results found" });
    }

    res.json({
      referendum_id: Number(referendumID),
      results: rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

// authorisation helper functionds

function requireLogin(req, res, next) {
  if (!req.session.user)
    return res.status(401).json({ ok: false, error: "Not logged in" });
  next();
}

function requireEC(req, res, next) {
  if (!req.session.user || req.session.user.role !== "ec") {
    return res.status(403).json({ ok: false, error: "EC only" });
  }
  next();
}

function requireVoter(req, res, next) {
  if (!req.session.user || req.session.user.role !== "voter") {
    return res.status(403).json({ ok: false, error: "Voters only" });
  }
  next();
}

// authorasition login

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    //EC login 
    if (EC_EMAIL && EC_PASSWORD && email === EC_EMAIL) {
      if (password === EC_PASSWORD) {
        req.session.user = { voter_id: -1, email, role: "ec" };
        const token = jwt.sign({ role: "ec" }, JWT_SECRET, { expiresIn: "1h" }); //uses jsonwebtoken secrets
        return res.json({ ok: true, role: "ec", token });
      }
      return res.json({ ok: false, error: "Invalid email or password" });
    }

    //Voter login 
    const [rows] = await db.query(
      "SELECT * FROM voters WHERE email = ?",
      [email]
    );

    if (rows.length === 0)
      return res.json({ ok: false, error: "Invalid email or password" });

    const voter = rows[0];

    const ok = await bcrypt.compare(password, voter.password_hash); //bycrypt password hashing
    if (!ok)
      return res.json({ ok: false, error: "Invalid email or password" });

    req.session.user = {
      voter_id: voter.voter_id,
      email: voter.email,
      role: "voter",
    };

    const token = jwt.sign(
      { voter_id: voter.voter_id, role: "voter" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ ok: true, role: "voter", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.json({ logged_in: false });
  res.json({ logged_in: true, user: req.session.user });
});

// voters

async function getOptionsWithVoteCounts(referendumId) {
  const [options] = await db.query(
    `
    SELECT ro.option_id, ro.option_text
    FROM referendum_options ro
    WHERE ro.referendum_id = ?
  `,
    [referendumId]
  );

  const [votes] = await db.query(
    `
    SELECT option_id, COUNT(*) AS votes
    FROM votes
    WHERE referendum_id = ?
    GROUP BY option_id
  `,
    [referendumId]
  );

  const voteMap = new Map(votes.map((v) => [v.option_id, v.votes]));

  return options.map((o) => ({
    ...o,
    text: o.option_text,
    votes: voteMap.get(o.option_id) || 0,
  }));
}

app.get("/api/referendums", requireVoter, async (req, res) => {
  try {
    const voterId = req.session.user.voter_id;

    const [refs] = await db.query(
      "SELECT referendum_id, title, description, status FROM referendums"
    );

    for (const r of refs) {
      r.options = await getOptionsWithVoteCounts(r.referendum_id);

      const [[myVote]] = await db.query(
        "SELECT option_id FROM votes WHERE referendum_id = ? AND voter_id = ?",
        [r.referendum_id, voterId]
      );

      r.my_vote_option_id = myVote ? myVote.option_id : null;
    }

    res.json({ ok: true, referendums: refs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

//  Voting and auto closing referendum at 50%
app.post("/api/vote", requireVoter, async (req, res) => {
  try {
    const voterId = req.session.user.voter_id;
    const { referendum_id, option_id } = req.body;

    const [[ref]] = await db.query(
      "SELECT status FROM referendums WHERE referendum_id = ?",
      [referendum_id]
    );

    if (!ref || ref.status !== "open") {
      return res.json({ ok: false, error: "Referendum is not open." });
    }

    const [[existing]] = await db.query(
      "SELECT vote_id FROM votes WHERE referendum_id = ? AND voter_id = ?",
      [referendum_id, voterId]
    );

    if (existing)
      return res.json({ ok: false, error: "You have already voted." });

    await db.query(
      "INSERT INTO votes (voter_id, referendum_id, option_id) VALUES (?, ?, ?)",
      [voterId, referendum_id, option_id]
    );

    const [[{ total_voters }]] = await db.query(
      "SELECT COUNT(*) AS total_voters FROM voters"
    );

    // check if any option has >= 50% of total voters 
    const [optionCounts] = await db.query(
      `
      SELECT option_id, COUNT(*) AS votes
      FROM votes
      WHERE referendum_id = ?
      GROUP BY option_id
    `,
      [referendum_id]
    );

    const majorityReached = optionCounts.some(
      (o) => o.votes >= Math.ceil(total_voters * 0.5)
    );

    if (majorityReached) {
      await db.query(
        "UPDATE referendums SET status = 'closed' WHERE referendum_id = ?",
        [referendum_id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

//EC

app.get("/api/ec/referendums", requireEC, async (req, res) => {
  try {
    const [refs] = await db.query("SELECT * FROM referendums");
    for (const r of refs) {
      r.options = await getOptionsWithVoteCounts(r.referendum_id);
    }
    res.json({ ok: true, referendums: refs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/api/ec/referendums", requireEC, async (req, res) => {
  try {
    const { title, description, options } = req.body;

    if (!title || !options || options.length < 2) {
      return res.json({ ok: false, error: "Title and at least two options required." });
    }

    const [result] = await db.query(
      "INSERT INTO referendums (title, description, status, locked) VALUES (?, ?, 'closed', 0)",
      [title, description || ""]
    );

    for (const opt of options) {
      await db.query(
        "INSERT INTO referendum_options (referendum_id, option_text) VALUES (?, ?)",
        [result.insertId, opt]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.put("/api/ec/referendums/:id", requireEC, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, options } = req.body;

    const [[ref]] = await db.query(
      "SELECT locked FROM referendums WHERE referendum_id = ?",
      [id]
    );

    if (!ref) return res.json({ ok: false, error: "Referendum not found." });
    if (ref.locked === 1)
      return res.json({ ok: false, error: "Referendum is locked." });

    await db.query(
      "UPDATE referendums SET title = ?, description = ? WHERE referendum_id = ?",
      [title, description || "", id]
    );

    await db.query("DELETE FROM referendum_options WHERE referendum_id = ?", [id]);

    for (const opt of options) {
      await db.query(
        "INSERT INTO referendum_options (referendum_id, option_text) VALUES (?, ?)",
        [id, opt]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post("/api/ec/referendums/:id/status", requireEC, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [[ref]] = await db.query(
      "SELECT locked FROM referendums WHERE referendum_id = ?",
      [id]
    );

    if (!ref) return res.json({ ok: false, error: "Referendum not found." });

    if (status === "open" && ref.locked === 0) {
      await db.query(
        "UPDATE referendums SET status = 'open', locked = 1 WHERE referendum_id = ?",
        [id]
      );
    } else {
      await db.query(
        "UPDATE referendums SET status = ? WHERE referendum_id = ?",
        [status, id]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
