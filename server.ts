import express from "express";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { createServer as createViteServer } from "vite";
import { generateChallenge, evaluateResponse, reflectAndRefine, getGoalForTopicAndDiff } from "./src/server/ai.js";
import { Session, SessionInteraction, User } from "./src/types.js";

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "adaptive-agentic-evaluation-secret-key-999";

app.use(express.json());

// ----------------------------------------------------
// User Accounts DB Persistence
// ----------------------------------------------------
interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

let users = new Map<string, UserRecord>();
const USERS_FILE = path.join(process.cwd(), "users_db.json");

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      users = new Map<string, UserRecord>(Object.entries(parsed));
      console.log(`Loaded ${users.size} user accounts from disk.`);
    }
  } catch (error) {
    console.error("Error loading users database:", error);
  }
}

function saveUsers() {
  try {
    const obj = Object.fromEntries(users);
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving users database:", error);
  }
}

// ----------------------------------------------------
// Learning Sessions DB Persistence
// ----------------------------------------------------
let sessions = new Map<string, Session>();
const DB_FILE = path.join(process.cwd(), "sessions_db.json");

function loadSessions() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(data);
      sessions = new Map<string, Session>(Object.entries(parsed));
      console.log(`Loaded ${sessions.size} learning sessions from local disk.`);
    }
  } catch (error) {
    console.error("Error loading sessions database:", error);
  }
}

function saveSessions() {
  try {
    const obj = Object.fromEntries(sessions);
    fs.writeFileSync(DB_FILE, JSON.stringify(obj, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving sessions database:", error);
  }
}

// Initialize persistence stores
loadUsers();
loadSessions();

// ----------------------------------------------------
// Security JWT Bearer Auth Middleware
// ----------------------------------------------------
export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    username: string;
  };
}

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access Denied: Authentication token required.", requireAuth: true });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Session expired or invalid token.", requireAuth: true });
    }
    (req as AuthenticatedRequest).user = decoded as { id: string; username: string };
    next();
  });
}

// ----------------------------------------------------
// Authentication API Routes
// ----------------------------------------------------
app.post("/api/auth/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Both username and password are required." });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 characters long." });
    }
    if (password.length < 5) {
      return res.status(400).json({ error: "Password must be at least 5 characters long." });
    }

    const normalized = trimmedUsername.toLowerCase();
    const duplicate = Array.from(users.values()).some((u) => u.username.toLowerCase() === normalized);
    if (duplicate) {
      return res.status(400).json({ error: "Username is already taken by another scholar." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = `usr_${Math.random().toString(36).substring(2, 9)}`;

    const newUser: UserRecord = {
      id: userId,
      username: trimmedUsername,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    users.set(userId, newUser);
    saveUsers();

    const token = jwt.sign({ id: userId, username: newUser.username }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      token,
      user: {
        id: userId,
        username: newUser.username,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error during registration workflow." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Please offer both username and password parameters." });
    }

    const normalized = username.trim().toLowerCase();
    const record = Array.from(users.values()).find((u) => u.username.toLowerCase() === normalized);

    if (!record) {
      return res.status(401).json({ error: "Invalid username or password credentials." });
    }

    const isMatch = await bcrypt.compare(password, record.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid username or password credentials." });
    }

    const token = jwt.sign({ id: record.id, username: record.username }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      token,
      user: {
        id: record.id,
        username: record.username,
        createdAt: record.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal error processing login authentication request." });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.user) {
    return res.status(401).json({ error: "No authenticated user session." });
  }
  res.json({
    id: authReq.user.id,
    username: authReq.user.username,
  });
});

// ----------------------------------------------------
// Core Dynamic Learning Sessions API (Auth Protected)
// ----------------------------------------------------

// Create a new learning session
app.post("/api/sessions", authenticateToken, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user!.id;
    const { topic, targetGoal, initialDifficulty } = req.body;

    const sessionId = `sess_${Math.random().toString(36).substring(2, 9)}`;
    const sessionTopic = topic || "Learning Python";
    const sessionDiff = Number(initialDifficulty) || 1;
    const computedGoal = targetGoal || getGoalForTopicAndDiff(sessionTopic, sessionDiff);

    const newSession: Session = {
      sessionId,
      userId,
      userName: authReq.user!.username,
      topic: sessionTopic,
      targetGoal: computedGoal,
      currentDifficulty: sessionDiff,
      overallWeaknesses: [],
      overallStrengths: [],
      progressHistory: [],
      interactions: [],
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`[Cognitive Coach] Initiating session for user ${newSession.userName} on: ${newSession.topic}`);

    // Pre-generate the FIRST challenge adaptively
    const firstChallenge = await generateChallenge(newSession);
    newSession.activeChallenge = firstChallenge;

    sessions.set(sessionId, newSession);
    saveSessions();

    res.status(201).json(newSession);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Failed to initialize learning session" });
  }
});

// Get user-isolated matching sessions
app.get("/api/sessions", authenticateToken, (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.id;

  const list = Array.from(sessions.values())
    .filter((s) => s.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  res.json(list);
});

// Get active session details (requires checking ownership)
app.get("/api/sessions/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.id;

  const session = sessions.get(id);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  if (session.userId !== userId) {
    return res.status(403).json({ error: "Access Denied: You do not own this scholastic session." });
  }

  res.json(session);
});

// Submit response: trigger reasoning loop pipeline
app.post("/api/sessions/:id/submit", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { userResponse } = req.body;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.id;

  const session = sessions.get(id);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  if (session.userId !== userId) {
    return res.status(403).json({ error: "Access Denied: You do not own this scholastic session." });
  }

  if (session.status === "completed") {
    return res.status(400).json({ error: "This learning session is already completed." });
  }

  const activeChallenge = session.activeChallenge;
  if (!activeChallenge) {
    return res.status(400).json({ error: "No active challenge currently exists." });
  }

  try {
    console.log(`[Reasoning Loop] Evaluating response for user ${session.userName}, challenge: "${activeChallenge.title}"`);

    // Agent 1: Evaluation Agent evaluates response using rubrics
    const evaluation = await evaluateResponse(activeChallenge, userResponse || "");

    // Agent 2: Reflection Agent searches web dynamically for free resource URLs + plans the next strategy
    const reflection = await reflectAndRefine(session, activeChallenge, userResponse || "", evaluation);

    // Packaging interaction history record
    const interaction: SessionInteraction = {
      id: `inter_${Math.random().toString(36).substring(2, 9)}`,
      challenge: { ...activeChallenge },
      userResponse: userResponse || "",
      evaluation,
      reflection,
      timestamp: new Date().toISOString(),
    };

    // Update cumulative weakness logs and strengths
    const overallWeaknesses = Array.from(new Set([...session.overallWeaknesses, ...reflection.weaknessesIdentified]));
    const overallStrengths = Array.from(new Set([...session.overallStrengths, ...reflection.strengthsConfirmed]));

    session.overallWeaknesses = overallWeaknesses;
    session.overallStrengths = overallStrengths;

    // Append history data points
    session.progressHistory.push({
      interactionIndex: session.interactions.length + 1,
      scores: { ...evaluation.scores },
      difficulty: activeChallenge.difficulty,
    });

    // Update session current difficulty level
    let nextDifficulty = session.currentDifficulty;
    if (reflection.suggestedDifficultyAdjustment === "increase") {
      nextDifficulty = Math.min(5, nextDifficulty + 1);
    } else if (reflection.suggestedDifficultyAdjustment === "decrease") {
      nextDifficulty = Math.max(1, nextDifficulty - 1);
    }
    session.currentDifficulty = nextDifficulty;

    // Keep changing the Session learning goals according to the difficulty levels selected by the user
    session.targetGoal = getGoalForTopicAndDiff(session.topic, nextDifficulty);

    session.interactions.push(interaction);
    session.updatedAt = new Date().toISOString();

    // Agent 3: Generate the NEXT customized challenge
    console.log(`[Reasoning Loop] Adaptively creating next challenge at Level ${session.currentDifficulty}`);
    const nextChallenge = await generateChallenge(session);
    session.activeChallenge = nextChallenge;

    sessions.set(id, session);
    saveSessions();

    res.json(session);
  } catch (error) {
    console.error("Error in multi-agent cycle:", error);
    res.status(500).json({ error: "Evaluation cycle processing error." });
  }
});

// Mark session as completed
app.post("/api/sessions/:id/complete", authenticateToken, (req, res) => {
  const { id } = req.params;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.id;

  const session = sessions.get(id);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  if (session.userId !== userId) {
    return res.status(403).json({ error: "Access Denied: You do not own this scholastic session." });
  }

  session.status = "completed";
  session.activeChallenge = null;
  session.updatedAt = new Date().toISOString();

  sessions.set(id, session);
  saveSessions();
  res.json(session);
});

// Delete session
app.delete("/api/sessions/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user!.id;

  const session = sessions.get(id);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }

  if (session.userId !== userId) {
    return res.status(403).json({ error: "Access Denied: You do not own this scholastic session." });
  }

  const deleted = sessions.delete(id);
  if (deleted) {
    saveSessions();
    res.json({ message: "Session successfully deleted" });
  } else {
    res.status(500).json({ error: "Failed to delete session state files." });
  }
});

// Vite middleware development configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Adaptive Assessment System running on port http://0.0.0.0:${PORT}`);
  });
}

startServer();
