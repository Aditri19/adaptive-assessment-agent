import { useState, useEffect, FormEvent } from "react";
import { 
  Award, 
  BookOpen, 
  Brain, 
  CheckCircle, 
  Compass, 
  Cpu, 
  ExternalLink, 
  GraduationCap, 
  History, 
  Key, 
  Lightbulb, 
  LogOut, 
  Play, 
  RefreshCw, 
  Send, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle,
  User as UserIcon,
  ChevronRight,
  Database,
  Lock
} from "lucide-react";
import { Challenge, EvaluationReview, ReflectionUpdate, Session, SessionInteraction, User } from "./types";

export default function App() {
  // Authentication State
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem("ace_token"));
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  
  // Auth Form State
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState<string>("");
  
  // App Setup / Topic State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [newTopic, setNewTopic] = useState<string>("Learning Python");
  const [newGoal, setNewGoal] = useState<string>("Master basic variables, loops, lists, and simple print statements step-by-step.");
  const [initialDiff, setInitialDiff] = useState<number>(1);
  const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);

  // Active Challenge / Submission State
  const [userResponseText, setUserResponseText] = useState<string>("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState<boolean>(false);
  const [evaluationFeedbackMsg, setEvaluationFeedbackMsg] = useState<string | null>(null);
  const [activeInteractionIndex, setActiveInteractionIndex] = useState<number>(-1);

  // Background Loading status
  const [loadingSessions, setLoadingSessions] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Flask Integration Hub State
  const [showFlaskHub, setShowFlaskHub] = useState<boolean>(false);

  // Setup Auth Header helper
  const getAuthHeaders = () => {
    return {
      "Content-Type": "application/json",
      "Authorization": authToken ? `Bearer ${authToken}` : ""
    };
  };

  // 1. Check & Load Logged In Scholar
  useEffect(() => {
    if (authToken) {
      localStorage.setItem("ace_token", authToken);
      fetchUserProfile();
    } else {
      localStorage.removeItem("ace_token");
      setCurrentUser(null);
    }
  }, [authToken]);

  // Fetch Scholar Profile
  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const u = await response.json();
        setCurrentUser(u);
        fetchSessions();
      } else {
        // Token stale, logout
        handleLogout();
      }
    } catch (err) {
      console.error("Failed to load user profile:", err);
      handleLogout();
    }
  };

  // 2. Fetch Sessions List
  const fetchSessions = async () => {
    if (!authToken) return;
    setLoadingSessions(true);
    try {
      const resp = await fetch("/api/sessions", {
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        const list = await resp.json();
        setSessions(list);
        // If there's an active session, refresh its state to match latest response
        setActiveSession((curr) => {
          if (!curr) return null;
          const matched = list.find((s: Session) => s.sessionId === curr.sessionId);
          return matched || curr;
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  };

  // 3. User Login/Register Action
  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (!usernameInput.trim() || !passwordInput) {
      setAuthError("Please provide both username and password.");
      return;
    }

    const endpoint = isRegisterMode ? "/api/auth/register" : "/api/auth/login";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setAuthError(data.error || "Authentication failed.");
        return;
      }

      setAuthToken(data.token);
      setUsernameInput("");
      setPasswordInput("");
    } catch (err) {
      setAuthError("Failed to make authentication request.");
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setActiveSession(null);
    setSessions([]);
    localStorage.removeItem("ace_token");
  };

  // 4. Create New Learning Session
  const handleCreateSession = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsCreatingSession(true);

    try {
      const resp = await fetch("/api/sessions", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          topic: newTopic,
          targetGoal: newGoal,
          initialDifficulty: initialDiff
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        setErrorMessage(data.error || "Failed to create session.");
        return;
      }

      setActiveSession(data);
      setUserResponseText("");
      setActiveInteractionIndex(-1);
      fetchSessions();
    } catch (err) {
      setErrorMessage("Network error during session generation.");
    } finally {
      setIsCreatingSession(false);
    }
  };

  // 5. Submit response & run reasoning agent cycle
  const handleSubmitChallengeResponse = async () => {
    if (!activeSession || !userResponseText.trim()) return;
    setErrorMessage(null);
    setIsSubmittingResponse(true);
    setEvaluationFeedbackMsg("Activating Adaptive Multi-Agent Cycle: Evaluation phase initializing...");

    try {
      const resp = await fetch(`/api/sessions/${activeSession.sessionId}/submit`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ userResponse: userResponseText })
      });

      const updated = await resp.json();
      if (!resp.ok) {
        setErrorMessage(updated.error || "Evaluation failed.");
        return;
      }

      setActiveSession(updated);
      setUserResponseText("");
      // Select the index of the newly added interaction to highlight detail feedback!
      setActiveInteractionIndex(updated.interactions.length - 1);
      fetchSessions();
      setEvaluationFeedbackMsg("Success! Strategy Agent updated weaknesses and generated next challenge.");
      setTimeout(() => setEvaluationFeedbackMsg(null), 6000);
    } catch (err) {
      setErrorMessage("Connection timed out while waiting for multi-agent reasoning.");
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  // Complete session early
  const handleMarkComplete = async () => {
    if (!activeSession) return;
    try {
      const resp = await fetch(`/api/sessions/${activeSession.sessionId}/complete`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        const updated = await resp.json();
        setActiveSession(updated);
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete matching history item
  const handleDeleteSession = async (sid: string) => {
    if (!confirm("Are you sure you want to delete this learning session? All historical progress will be lost.")) return;
    try {
      const resp = await fetch(`/api/sessions/${sid}`, {
        method: "DELETE",
        headers: getAuthHeaders()
      });
      if (resp.ok) {
        if (activeSession?.sessionId === sid) {
          setActiveSession(null);
        }
        fetchSessions();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Help calculate average values
  const getOverallAverages = () => {
    if (!activeSession || activeSession.progressHistory.length === 0) {
      return { accuracy: 0, clarity: 0, reasoning: 0, approach: 0, average: 0 };
    }
    const count = activeSession.progressHistory.length;
    let sumAcc = 0, sumClar = 0, sumReas = 0, sumApp = 0, sumTotal = 0;
    activeSession.progressHistory.forEach(h => {
      sumAcc += h.scores.accuracy;
      sumClar += h.scores.clarity;
      sumReas += h.scores.reasoning;
      sumApp += h.scores.approach;
      sumTotal += h.scores.average;
    });
    return {
      accuracy: Math.round((sumAcc / count) * 20), // Convert 5 star to percent
      clarity: Math.round((sumClar / count) * 20),
      reasoning: Math.round((sumReas / count) * 20),
      approach: Math.round((sumApp / count) * 20),
      average: Number((sumTotal / count).toFixed(1))
    };
  };

  const currentStats = getOverallAverages();

  // Get difficulty word
  const getDifficultyKeyword = (level: number) => {
    switch(level) {
      case 1: return "Novice";
      case 2: return "Competent";
      case 3: return "Proficient";
      case 4: return "Advanced";
      case 5: return "Master/Guru";
      default: return `Level ${level}`;
    }
  };

  // Custom pre-configured topics to start fast
  const demoTopics = [
    {
      title: "Learning Python",
      goal: "Master basic variables, loops, lists, and simple print statements step-by-step.",
      diff: 1
    },
    {
      title: "Learning JavaScript",
      goal: "Learn basic variables, functions, HTML elements, and console.log exercises easily.",
      diff: 1
    },
    {
      title: "Learning Java",
      goal: "Grasp fundamental classes, printing statements, methods, and integers simply.",
      diff: 1
    },
    {
      title: "Machine Learning & AI",
      goal: "Discover basic ideas like models, training data, predictions, and test sets.",
      diff: 1
    }
  ];

  // If scholar is not logged in, show elegant pastel-themed auth screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FCFAF2] text-[#2D2219] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
        {/* Subtle royal blue glow background */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#D0E5FF]/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#E6F0FA]/20 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-md bg-white border border-[#EADFD5] rounded-3xl p-8 relative shadow-sm">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#D0E5FF] rounded-2xl flex items-center justify-center font-bold text-[#1D467D] shadow-sm mx-auto mb-4 border border-[#BACFEE]/30 animate-pulse">
              <Brain className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#2D2219] mb-1">Beginner Coding Coach</h1>
            <p className="text-xs text-[#5C4D3C]">
              A friendly, pastel space to learn Python, JavaScript, Java, and ML with easy exercises and tips.
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5C4D3C] mb-1.5">Username</label>
              <div className="relative">
                <input
                  id="auth-username"
                  type="text"
                  required
                  placeholder="e.g. happy_learner"
                  className="w-full bg-[#FCFAF2] border border-[#EADFD5] rounded-xl px-4 py-2.5 text-[#2D2219] placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#A6CEF7] transition-all"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                />
                <UserIcon className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-[#5C4D3C]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#5C4D3C]">Credential Key / Password</label>
              </div>
              <div className="relative">
                <input
                  id="auth-password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#FCFAF2] border border-[#EADFD5] rounded-xl px-4 py-2.5 text-[#2D2219] placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#A6CEF7] transition-all"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                />
                <Lock className="absolute right-3.5 top-3.5 w-3.5 h-3.5 text-[#5C4D3C]" />
              </div>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <p>{authError}</p>
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              className="w-full bg-[#D0E5FF] hover:bg-[#BCCFF4] text-[#1D467D] font-semibold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 border border-[#BACFEE]/30 cursor-pointer"
            >
              <span>{isRegisterMode ? "Create Free Account" : "Access Learning Workspace"}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-[#EADFD5]/65 text-center">
            <button
              id="auth-toggle-mode"
              type="button"
              className="text-[11px] text-[#1D467D] font-medium hover:underline focus:outline-none"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError(null);
              }}
            >
              {isRegisterMode ? "Already a member? Log in here" : "New student? Sign up now"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loaded Active Session details mapping
  const latestInteraction = activeSession && activeSession.interactions.length > 0 
    ? activeSession.interactions[activeSession.interactions.length - 1] 
    : null;

  // Highlighted interaction view (can look at historical ones)
  const selectedInteraction = activeSession && activeInteractionIndex >= 0 && activeInteractionIndex < activeSession.interactions.length
    ? activeSession.interactions[activeInteractionIndex]
    : latestInteraction;

  return (
    <div className="min-h-screen bg-[#FCFAF2] text-[#2D2219] p-6 font-sans relative overflow-x-hidden">
      {/* Subtle blue background decoration */}
      <div className="absolute top-[-100px] right-[-200px] w-[600px] h-[600px] bg-[#D0E5FF]/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Main Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-[#EADFD5] pb-5 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-[#D0E5FF] rounded-xl flex items-center justify-center font-bold text-[#1D467D] shadow-sm text-lg border border-[#BACFEE]/30 animate-pulse">
            BC
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#2D2219] flex items-center gap-1.5">
              Beginner Coding Coach
              <span className="text-xs bg-[#D0E5FF]/50 text-[#1D467D] px-2.5 py-0.5 rounded-full border border-[#A6CEF7]/30 font-semibold">
                Friendly Learning
              </span>
            </h1>
            <p className="text-[#5C4D3C] text-xs">
              Take small, easy challenges and let our gentle guide help you build confidence step-by-step.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Active status */}
          <div className="flex items-center gap-2 bg-[#E6F0FA] border border-[#A6CEF7]/30 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-[#1D467D] uppercase tracking-widest">Active & Ready</span>
          </div>

          <div className="bg-white border border-[#EADFD5] rounded-xl px-3 py-1 text-xs flex items-center gap-2.5 shadow-sm">
            <span className="w-6 h-6 bg-[#FCFAF2] rounded-lg flex items-center justify-center font-mono text-[10px] text-[#1D467D] border border-[#EADFD5]">
              <UserIcon className="w-3.5 h-3.5" />
            </span>
            <div className="text-left leading-none">
              <p className="text-[9px] text-[#5C4D3C] uppercase font-bold tracking-widest mb-0.5">Learner Profile</p>
              <p className="font-semibold text-[#2D2219] font-mono text-xs">{currentUser.username}</p>
            </div>
          </div>

          <button
            id="logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-white hover:bg-[#E6F0FA] hover:text-[#1D467D] border border-[#EADFD5] font-medium text-xs px-3 py-2 rounded-xl text-[#5C4D3C] transition-all cursor-pointer shadow-sm"
            title="Log Out Profile"
          >
            <LogOut className="w-3.5 h-3.5 text-[#5C4D3C] shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Dashboard / Create Screen */}
      {!activeSession ? (
        <div className="w-full max-w-4xl mx-auto space-y-6 mt-8">
          {/* Setup Panel */}
          <div className="bg-white border border-[#EADFD5] rounded-3xl p-6 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D0E5FF]/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#E6F0FA] flex items-center justify-center border border-[#A6CEF7]/30">
                <Compass className="w-4 h-4 text-[#1D467D]" />
              </div>
              <h2 className="text-lg font-bold text-[#2D2219]">Start a New Learning Session</h2>
            </div>
            
            <p className="text-[#5C4D3C] text-sm mb-6">
              Pick what you want to study. We will prepare an easy, beginner-friendly practice question tailored directly for you!
            </p>

            <form onSubmit={handleCreateSession} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-2">
                    Learning Focus / Topic
                  </label>
                  <input
                    id="new-session-topic"
                    type="text"
                    required
                    placeholder="e.g. Learning Python, Learning JavaScript"
                    className="w-full bg-[#FCFAF2] border border-[#EADFD5] rounded-xl px-4 py-3 text-[#2D2219] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#A6CEF7]"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-2">
                    Initial Difficulty Level
                  </label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <button
                        id={`diff-btn-${level}`}
                        key={level}
                        type="button"
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 min-h-[52px] ${
                          initialDiff === level
                            ? "bg-[#D0E5FF] text-[#1D467D] border-[#BACFEE] shadow-sm font-extrabold"
                            : "bg-[#FCFAF2] text-[#5C4D3C] border-[#EADFD5] hover:bg-[#E6F0FA]/20"
                        }`}
                        onClick={() => setInitialDiff(level)}
                      >
                        <span className="text-sm font-black">{level}</span>
                        <span className="text-[9px] uppercase tracking-wider opacity-90 block truncate max-w-full">
                          {level === 1 ? "Novice" : level === 2 ? "Competent" : level === 3 ? "Proficient" : level === 4 ? "Advanced" : "Guru"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-2 flex justify-between items-center">
                  <span>Session Learning Goal</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">Optional — auto-generated if blank</span>
                </label>
                <textarea
                  id="new-session-goal"
                  rows={2}
                  placeholder="e.g. I want to learn the basic rules of variables and take it step by step! (Leave blank to generate adaptively)"
                  className="w-full bg-[#FCFAF2] border border-[#EADFD5] rounded-xl px-4 py-3 text-[#2D2219] placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#A6CEF7]"
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                />
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs py-2 px-3 rounded-xl">
                  {errorMessage}
                </div>
              )}

              <button
                id="create-session-btn"
                type="submit"
                disabled={isCreatingSession}
                className="w-full bg-[#D0E5FF] hover:bg-[#BCCFF4] text-[#1D467D] font-bold py-3.5 px-4 rounded-xl transition-all shadow-sm flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 border border-[#BACFEE]/30"
              >
                {isCreatingSession ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#1D467D]" />
                    <span>Preparing friendly challenge, please wait a moment...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current text-[#1D467D]" />
                    <span>Start Learning Now!</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Selection presets */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-3">Or choose a recommended program preset</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {demoTopics.map((p, idx) => (
                <button
                  id={`preset-btn-${idx}`}
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewTopic(p.title);
                    setNewGoal(p.goal);
                    setInitialDiff(p.diff);
                  }}
                  className="bg-white hover:bg-[#E6F0FA]/20 border border-[#EADFD5] text-left p-4.5 rounded-2xl transition-all group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-[9px] font-sans text-[#1D467D] bg-[#E6F0FA] px-2 py-0.5 rounded border border-[#A6CEF7]/40 uppercase tracking-widest mb-2 inline-block">
                      {getDifficultyKeyword(p.diff)} Preset
                    </span>
                    <h4 className="text-sm font-semibold text-[#2D2219] group-hover:text-[#1D467D] transition-colors mb-1">{p.title}</h4>
                    <p className="text-[#5C4D3C] text-xs leading-relaxed line-clamp-3">{p.goal}</p>
                  </div>
                  <div className="mt-3 text-xs text-[#1D467D] font-semibold flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <span>Apply parameters</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Existing User Sessions History */}
          <div className="bg-white border border-[#EADFD5] rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#2D2219] flex items-center gap-2">
                <History className="w-4 h-4 text-[#5C4D3C]" />
                Your Practice History ({sessions.length})
              </h3>
              {loadingSessions && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1D467D]" />}
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-8 bg-[#FCFAF2] rounded-2xl border border-[#EADFD5]">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-[#5C4D3C] font-semibold">No finished or active practice sessions. Create one above to begin!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map((snap) => (
                  <div
                    id={`sess-row-${snap.sessionId}`}
                    key={snap.sessionId}
                    className="flex justify-between items-center bg-[#FCFAF2] p-4 rounded-xl border border-[#EADFD5] hover:border-[#A6CEF7] hover:bg-white transition-all font-sans"
                  >
                    <div className="min-w-0 flex-1 font-sans">
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <span className={`text-[9px] px-2 py-0.5 rounded uppercase font-bold tracking-wider ${
                          snap.status === "completed" 
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-amber-100 text-amber-700 border border-amber-200"
                        }`}>
                          {snap.status}
                        </span>
                        <h4 className="text-sm font-semibold text-[#2D2219] truncate">{snap.topic}</h4>
                        <span className="text-[11px] text-[#5C4D3C]">• Level {snap.currentDifficulty}/5</span>
                      </div>
                      <p className="text-[11px] text-[#5C4D3C] truncate opacity-80 mb-1">{snap.targetGoal}</p>
                      <span className="text-[10px] text-slate-400">
                        {snap.interactions.length} steps logged • Last updated {new Date(snap.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 ml-4 font-sans">
                      <button
                        id={`resume-btn-${snap.sessionId}`}
                        type="button"
                        onClick={() => {
                          setActiveSession(snap);
                          setUserResponseText("");
                          setActiveInteractionIndex(-1);
                        }}
                        className="bg-[#D0E5FF]/30 hover:bg-[#D0E5FF] text-[#1D467D] border border-[#BACFEE]/30 text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                      >
                        {snap.status === "completed" ? "Review" : "Resume"}
                      </button>
                      <button
                        id={`delete-btn-${snap.sessionId}`}
                        type="button"
                        onClick={() => handleDeleteSession(snap.sessionId)}
                        className="text-slate-400 hover:text-[#1D467D] p-1.5 rounded-lg hover:bg-[#E6F0FA]/50 transition-colors cursor-pointer"
                        title="Delete Session"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Python Flask Full-Stack Support & Export Guide */}
          <div className="bg-white border border-[#EADFD5] rounded-3xl p-6 relative overflow-hidden shadow-sm font-sans">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 font-sans">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#E6F0FA] rounded-xl flex items-center justify-center border border-[#A6CEF7]/30">
                  <Database className="w-5 h-5 text-[#1D467D]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#2D2219] flex items-center gap-2">
                    Python Flask Full-Stack Support
                    <span className="text-[10px] uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200 font-bold">
                      Local Stack Ready
                    </span>
                  </h3>
                  <p className="text-[#5C4D3C] text-xs">
                    This workspace has a fully equivalent Python Flask + React setup! Export the project and activate Flask locally.
                  </p>
                </div>
              </div>
              
              <button
                id="toggle-flask-hub"
                type="button"
                onClick={() => setShowFlaskHub(!showFlaskHub)}
                className="bg-white hover:bg-[#E6F0FA]/20 border border-[#EADFD5] text-xs text-[#1D467D] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-sm font-sans"
              >
                {showFlaskHub ? "Close Flask Instructions" : "Examine Flask Server Setup"}
              </button>
            </div>

            {showFlaskHub && (
              <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-5 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                      1. What is in this workspace?
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      To keep the sandbox live preview extremely interactive inside our web iframe container, we are running the <strong className="text-indigo-400">TypeScript Express</strong> web server on <strong className="text-white">Port 3000</strong>.
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      However, we have crafted a fully-functional, equivalent Python backend in <code className="text-amber-400 font-bold">/flask_server.py</code> and <code className="text-amber-400 font-bold">/requirements.txt</code>! Once you export this project as a ZIP, you can run the Flask server as a 100% plug-and-play drop-in replacement!
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
                      2. Hot-Swap Steps (Local Execution)
                    </h4>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-300">
                      <p className="text-slate-500 mb-1"># Step A: Install Python dependencies</p>
                      <p className="text-indigo-400 mb-3">pip install -r requirements.txt</p>
                      
                      <p className="text-slate-500 mb-1"># Step B: Securely set Google Gemini credentials</p>
                      <p className="text-indigo-400 mb-3">export GEMINI_API_KEY="your_api_key_here"</p>
                      
                      <p className="text-slate-500 mb-1"># Step C: Boot the Flask Python backend (Port 3000)</p>
                      <p className="text-indigo-400 mb-3">python flask_server.py</p>
                      
                      <p className="text-slate-500 mb-1"># Step D: Launch the Vite + React client side</p>
                      <p className="text-indigo-400">npm run dev</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400 font-mono">🐍 File preview: /flask_server.py</span>
                    <span className="text-[10px] text-slate-500 font-mono">Uses flask, PyJWT, bcrypt & google-genai 3.5</span>
                  </div>
                  <div className="text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto bg-slate-950 text-slate-400 p-3 rounded-lg border border-slate-900 leading-normal scrollbar-none select-text">
{`import os
import json
import jwt
import bcrypt
from flask import Flask, request, jsonify
from google import genai

app = Flask(__name__)

# Authentication & DB state matching the Node server logic
JWT_SECRET = os.environ.get("JWT_SECRET", "adaptive-agentic-evaluation-secret-key-999")
USERS_FILE = os.path.join(os.getcwd(), "users_db.json")
SESSIONS_FILE = os.path.join(os.getcwd(), "sessions_db.json")

# Fully equivalent JWT authorization decorators, password checks, 
# and multi-agent AI adaptive algorithms initialized with Pydantic!
# ...
# Complete file has been placed at /flask_server.py for local export!`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Bento Grid Layout Dashboard */
        <div className="space-y-6 font-sans">
          
          {/* Sub Header / Control panel */}
          <div className="bg-white border border-[#EADFD5] rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div className="flex items-center gap-2 ml-1">
              <button
                id="back-lobby-btn"
                type="button"
                onClick={() => {
                  setActiveSession(null);
                }}
                className="text-xs text-[#1D467D] font-bold hover:underline py-1.5 px-2.5 hover:bg-[#E6F0FA]/20 rounded-lg transition-all cursor-pointer font-sans"
              >
                ← Back to Workspace Lobby
              </button>
              <span className="text-[#EADFD5]">|</span>
              <span className="text-xs text-[#5C4D3C]">
                Active Topic: <strong className="text-[#2D2219] font-bold">{activeSession.topic}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 font-sans">
              {activeSession.status === "active" ? (
                <button
                  id="mark-completed-btn"
                  onClick={handleMarkComplete}
                  className="bg-[#E6F0FA] hover:bg-[#A6CEF7]/40 border border-[#A6CEF7]/35 text-[#1D467D] text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                >
                  Conclude Training Loop
                </button>
              ) : (
                <span className="text-xs bg-green-100 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg font-semibold">
                  ✓ Program Completed
                </span>
              )}
            </div>
          </div>

          {evaluationFeedbackMsg && (
            <div className="bg-[#D0E5FF] text-[#1D467D] font-semibold text-xs py-3.5 px-6 rounded-xl flex items-center gap-3 shadow-sm animate-bounce border border-[#BACFEE]/30">
              <Cpu className="w-4 h-4 text-[#1D467D] animate-spin shrink-0" />
              <span>{evaluationFeedbackMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs py-3.5 px-6 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Core Bento Grid Structure - 12 Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch font-sans">
            
            {/* Cell 1: Active Challenge / Review Card (col-span-8 row-span-3) */}
            <div className="lg:col-span-8 bg-white border border-[#EADFD5] rounded-3xl p-6 flex flex-col justify-between hover:border-[#A6CEF7] transition-all relative overflow-hidden min-h-[500px] shadow-sm">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#D0E5FF]/10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div>
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4 font-sans">
                  <div className="flex items-center gap-2.5">
                    {selectedInteraction ? (
                      <span className="text-[10px] bg-green-50 text-green-700 px-2.5 py-1 rounded border border-green-200 font-bold uppercase tracking-wider">
                        Reviewing Question #{activeInteractionIndex + 1} (Completed)
                      </span>
                    ) : (
                      <span className="text-[10px] bg-[#E6F0FA] text-[#1D467D] px-2.5 py-1 rounded border border-[#A6CEF7]/40 font-bold uppercase tracking-wider">
                        {activeSession.activeChallenge ? "Your Active Practice Topic" : "Cognitive Progress Review"}
                      </span>
                    )}
                    <span className="text-xs text-[#5C4D3C] font-semibold">
                      Suggested time: {(selectedInteraction ? selectedInteraction.challenge.estimatedTimeMin : activeSession.activeChallenge?.estimatedTimeMin) || 5} min
                    </span>
                  </div>

                  <span className="text-xs text-[#5C4D3C] bg-[#FCFAF2] border border-[#EADFD5] px-2.5 py-1 rounded-full font-semibold">
                    Practice Level: <span className="text-[#1D467D] font-black">Level {(selectedInteraction ? selectedInteraction.challenge.difficulty : activeSession.currentDifficulty)}/5</span>
                  </span>
                </div>

                {selectedInteraction ? (
                  // Viewing a Completed Challenge and User's past solution
                  <>
                    <h2 className="text-xl md:text-2xl font-bold mb-3 text-[#2D2219] leading-tight font-sans">
                      {selectedInteraction.challenge.title}
                    </h2>
                    
                    <div className="inline-block py-1 px-2.5 bg-[#FCFAF2] border border-[#EADFD5] text-[10px] text-[#1D467D] rounded-md mb-4 uppercase tracking-widest font-bold">
                      Format: {selectedInteraction.challenge.type.replace("_", " ")}
                    </div>

                    <div className="text-[#5C4D3C] text-sm leading-relaxed mb-6 space-y-3 font-sans">
                      <p>{selectedInteraction.challenge.description}</p>
                    </div>

                    {selectedInteraction.challenge.context && (
                      <div className="mb-6 font-sans">
                        <div className="flex justify-between items-center bg-[#FCFAF2] border-t border-x border-[#EADFD5] px-4 py-2 rounded-t-xl text-[#5C4D3C] text-[10px] uppercase tracking-widest font-bold">
                          <span>Practice Code / Question Context</span>
                        </div>
                        <pre className="bg-[#FCFAF2] p-4 border border-[#EADFD5] rounded-b-xl font-mono text-xs text-[#2D2219] overflow-x-auto leading-relaxed select-all">
                          <code>{selectedInteraction.challenge.context}</code>
                        </pre>
                      </div>
                    )}

                    {/* Show what the user submitted */}
                    <div className="mt-4 p-4.5 bg-[#FDF6F0] border border-[#EADFD5] rounded-2xl font-sans">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-2 font-semibold">Your Submitted Solution:</h4>
                      <pre className="bg-white p-3.5 border border-[#EADFD5] rounded-xl font-mono text-xs text-[#2D2219] overflow-x-auto leading-relaxed select-all">
                        <code>{selectedInteraction.userResponse || "(Empty Response)"}</code>
                      </pre>
                    </div>
                  </>
                ) : activeSession.activeChallenge ? (
                  // Active unsolved challenge
                  <>
                    <h2 className="text-xl md:text-2xl font-bold mb-3 text-[#2D2219] leading-tight font-sans">
                      {activeSession.activeChallenge.title}
                    </h2>
                    
                    {/* Badge type indicators */}
                    <div className="inline-block py-1 px-2.5 bg-[#FCFAF2] border border-[#EADFD5] text-[10px] text-[#1D467D] rounded-md mb-4 uppercase tracking-widest font-bold">
                      Format: {activeSession.activeChallenge.type.replace("_", " ")}
                    </div>

                    <div className="text-[#5C4D3C] text-sm leading-relaxed mb-6 space-y-3 font-sans">
                      <p>{activeSession.activeChallenge.description}</p>
                    </div>

                    {/* Code context playground view container */}
                    {activeSession.activeChallenge.context && (
                      <div className="mb-6 font-sans">
                        <div className="flex justify-between items-center bg-[#FCFAF2] border-t border-x border-[#EADFD5] px-4 py-2 rounded-t-xl text-[#5C4D3C] text-[10px] uppercase tracking-widest font-bold">
                          <span>Practice Code / Question Context</span>
                          <span className="normal-case text-xs text-[#1D467D] font-bold">Use this as your starting reference</span>
                        </div>
                        <pre className="bg-[#FCFAF2] p-4 border border-[#EADFD5] rounded-b-xl font-mono text-xs text-[#2D2219] overflow-x-auto leading-relaxed select-all">
                          <code>{activeSession.activeChallenge.context}</code>
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16 space-y-4 font-sans">
                    <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                    <h3 className="text-lg font-bold text-[#2D2219]">Session completed successfully!</h3>
                    <p className="text-[#5C4D3C] text-sm max-w-md mx-auto">
                      You have completed the exercises for this topic. Click "Conclude" or go back to lobby to select another topic!
                    </p>
                  </div>
                )}
              </div>

              {/* Task response container or Action buttons */}
              {selectedInteraction ? (
                // When we are reviewing a past question, show "Proceed to Next Challenge" button
                <div className="mt-6 flex flex-wrap justify-between items-center gap-4 bg-[#FCFAF2] p-4.5 border border-[#EADFD5] rounded-2xl font-sans">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-[#1D467D] rounded-full animate-ping"></div>
                    <span className="text-xs text-[#5C4D3C] font-semibold">Review complete? Ready for your next personalized adaptive challenge?</span>
                  </div>
                  {activeSession.status === "active" && activeSession.activeChallenge ? (
                    <button
                      id="proceed-next-challenge-btn"
                      onClick={() => {
                        setActiveInteractionIndex(-1);
                        setUserResponseText("");
                      }}
                      className="bg-[#D0E5FF] hover:bg-[#BCCFF4] border border-[#BACFEE]/30 text-[#1D467D] text-xs font-black py-3 px-6 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Next Question →</span>
                    </button>
                  ) : (
                    <span className="text-xs text-[#5C4D3C] italic font-semibold">This session is completed!</span>
                  )}
                </div>
              ) : activeSession.status === "active" && activeSession.activeChallenge ? (
                <div className="mt-6 space-y-3.5 font-sans">
                  <div className="flex justify-between items-center px-1">
                    <label id="response-input-label" htmlFor="response-textarea" className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C]">
                      Your Answer or Code Solution
                    </label>
                    <span className="text-[10px] text-[#5C4D3C] font-semibold">
                      {userResponseText.length} characters
                    </span>
                  </div>

                  <div className="relative">
                    <textarea
                      id="response-textarea"
                      rows={5}
                      required
                      className="w-full bg-[#FCFAF2]/55 border border-[#EADFD5] rounded-xl p-4 text-sm text-[#2D2219] placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#A6CEF7] focus:border-transparent transition-all font-sans leading-relaxed"
                      placeholder="Type your code solution, fill-in-the-blank answer, or simple explanation here..."
                      value={userResponseText}
                      onChange={(e) => setUserResponseText(e.target.value)}
                      disabled={isSubmittingResponse}
                    />
                  </div>

                  <div className="flex justify-end items-center gap-3">
                    <button
                      id="challenge-submit-btn"
                      onClick={handleSubmitChallengeResponse}
                      disabled={isSubmittingResponse || !userResponseText.trim()}
                      className="bg-[#D0E5FF] hover:bg-[#A6CEF7] border border-[#BACFEE]/30 disabled:opacity-50 text-[#1D467D] text-xs font-bold py-3 px-5 rounded-xl transition-all shadow-sm hover:shadow-[#A6CEF7]/15 flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmittingResponse ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#1D467D]" />
                          <span>Checking details & updating next questions...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-[#1D467D] fill-current" />
                          <span>Submit Answer & See Evaluation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FCFAF2] p-4 border border-[#EADFD5] rounded-xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                  <p className="italic text-xs text-[#5C4D3C]">
                    Practice question submitted! Check your feedback results on the right.
                  </p>
                </div>
              )}
            </div>

            {/* Cell 2: Evaluation Rubric Card (col-span-4 row-span-4) */}
            <div className="lg:col-span-4 bg-white border border-[#EADFD5] rounded-3xl p-6 flex flex-col hover:border-[#A6CEF7] transition-all min-h-[500px] shadow-sm font-sans">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#1D467D]" />
                  Your Scoring Indicators
                </h3>
              </div>

              {activeSession.progressHistory.length === 0 ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center py-12 p-3 bg-[#FCFAF2] rounded-2xl border border-[#EADFD5] text-[#5C4D3C] text-xs">
                  <Brain className="w-9 h-9 text-[#1D467D] animate-bounce mb-3" />
                  <p className="font-sans font-medium">Waiting for your first response to show performance indicators...</p>
                </div>
              ) : (
                <div className="space-y-6 flex-1 flex flex-col justify-between font-sans">
                  
                  {/* Gauge metrics */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-sans font-semibold">
                        <span className="text-[#5C4D3C]">Technical Correctness</span>
                        <span className="text-[#1D467D] font-bold">{currentStats.accuracy}%</span>
                      </div>
                      <div className="h-2.5 bg-[#FCFAF2] rounded-full overflow-hidden border border-[#EADFD5]">
                        <div className="h-full bg-[#D0E5FF] rounded-full transition-all duration-1000" style={{ width: `${currentStats.accuracy}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-sans font-semibold">
                        <span className="text-[#5C4D3C]">Clarity & Style</span>
                        <span className="text-[#1D467D] font-bold">{currentStats.clarity}%</span>
                      </div>
                      <div className="h-2.5 bg-[#FCFAF2] rounded-full overflow-hidden border border-[#EADFD5]">
                        <div className="h-full bg-[#D0E5FF] rounded-full transition-all duration-1000" style={{ width: `${currentStats.clarity}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-sans font-semibold">
                        <span className="text-[#5C4D3C]">Step Reasoning</span>
                        <span className="text-[#1D467D] font-bold">{currentStats.reasoning}%</span>
                      </div>
                      <div className="h-2.5 bg-[#FCFAF2] rounded-full overflow-hidden border border-[#EADFD5]">
                        <div className="h-full bg-[#D0E5FF] rounded-full transition-all duration-1000" style={{ width: `${currentStats.reasoning}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5 font-sans font-semibold">
                        <span className="text-[#5C4D3C]">Methodical Approach</span>
                        <span className="text-[#1D467D] font-bold">{currentStats.approach}%</span>
                      </div>
                      <div className="h-2.5 bg-[#FCFAF2] rounded-full overflow-hidden border border-[#EADFD5]">
                        <div className="h-full bg-[#D0E5FF] rounded-full transition-all duration-1000" style={{ width: `${currentStats.approach}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Summary observation block */}
                  <div className="pt-5 border-t border-[#EADFD5] mt-6 font-sans">
                    <p className="text-[10px] uppercase font-bold text-[#5C4D3C] tracking-widest mb-2 font-sans">Evaluation Summary Notes</p>
                    <p className="text-xs text-[#5C4D3C] leading-relaxed italic bg-[#FCFAF2] p-3 rounded-xl border border-[#EADFD5]">
                      {selectedInteraction?.evaluation.feedback.overallSummary || "Submit your response above to receive customized grading notes!"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cell 3: Multi-Agent Reflection & Strategy timeline (col-span-4 solid coloring) */}
            <div className="lg:col-span-4 bg-[#FDF6F0] border border-[#EADFD5] rounded-3xl p-6 text-[#2D2219] hover:border-[#A6CEF7] transition-all flex flex-col justify-between min-h-[350px] shadow-sm font-sans">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C] flex items-center gap-1.5 font-sans">
                    <Cpu className="w-4 h-4 text-[#1D467D]" />
                    Interactive Plan Stages
                  </h3>
                  <span className="text-[10px] bg-[#E6F0FA] text-[#1D467D] rounded px-2 py-0.5 border border-[#A6CEF7]/40 font-bold font-sans">
                    DECISION LOG
                  </span>
                </div>

                <div className="space-y-4 font-sans text-xs text-[#5C4D3C]">
                  <div className="flex items-start gap-2.5">
                    <span className="text-[#1D467D] font-black tracking-tighter">[1]</span>
                    <div>
                      <strong className="text-[#2D2219] uppercase font-bold">GENERATE:</strong>
                      <p className="opacity-90 text-[11px] leading-relaxed text-[#5C4D3C]">
                        Challenge synthesized adaptively for weakness mapping.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="text-[#1D467D] font-black tracking-tighter">[2]</span>
                    <div>
                      <strong className="text-[#2D2219] uppercase font-bold">EVALUATE:</strong>
                      <p className="opacity-90 text-[11px] leading-relaxed text-[#5C4D3C]">
                        {selectedInteraction ? "Rubrics evaluated student proposal response." : "Awaiting student response to compile rubrics."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="text-[#1D467D] font-black tracking-tighter">[3]</span>
                    <div>
                      <strong className="text-[#2D2219] uppercase font-bold">REFLECT:</strong>
                      <p className="opacity-90 text-[11px] leading-relaxed text-[#5C4D3C]">
                        {selectedInteraction?.reflection.agentReflectionLog 
                          ? `${selectedInteraction.reflection.agentReflectionLog.substring(0, 100)}...`
                          : "Reviewing performance for gaps."
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="text-[#1D467D] font-black tracking-tighter">[!]</span>
                    <div>
                      <strong className="text-[#1D467D] font-bold bg-[#E6F0FA] px-1.5 py-0.5 rounded text-[10px]">COACH DECISION:</strong>
                      <p className="text-[#1D467D] mt-1 text-[11px] font-bold underline leading-relaxed">
                        {selectedInteraction?.reflection.nextAgentInstruction || "Initialize with conceptual benchmarks."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#EADFD5] flex justify-between items-center font-sans">
                <span className="text-[9px] text-[#5C4D3C]">REAL-TIME ADAPTIVE FEEDBACK</span>
                <span className="px-2.5 py-1 bg-white border border-[#EADFD5] text-[#1D467D] rounded-full text-[10px] font-bold shadow-sm">
                  SYSTEM READY
                </span>
              </div>
            </div>

            {/* Cell 4: Weakness & Strength Tracker Cell (col-span-4) */}
            <div className="lg:col-span-4 bg-white border border-[#EADFD5] rounded-3xl p-6 flex flex-col justify-between hover:border-[#A6CEF7] transition-all min-h-[350px] shadow-sm font-sans">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-4 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#1D467D]" />
                  Your Skill Tracker
                </h3>

                <div className="space-y-4">
                  <div>
                    <span className="block text-[10px] text-[#1D467D] font-bold uppercase tracking-wider mb-2">
                      ▲ Gaps to Practice
                    </span>
                    {activeSession.overallWeaknesses.length === 0 ? (
                      <p className="text-xs text-[#5C4D3C] italic">No skill gaps identified yet. Complete questions to analyze details!</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {activeSession.overallWeaknesses.map((w, idx) => (
                          <span key={idx} className="bg-[#E6F0FA] text-[#1D467D] border border-[#BACFEE]/30 text-xs px-2.5 py-1 rounded-lg font-semibold">
                            {w}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <span className="block text-[10px] text-green-700 font-bold uppercase tracking-wider mb-2">
                      ▼ Your Confirmed Strengths
                    </span>
                    {activeSession.overallStrengths.length === 0 ? (
                      <p className="text-xs text-[#5C4D3C] italic">Submit answers to identify and trace your strengths!</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {activeSession.overallStrengths.map((s, idx) => (
                          <span key={idx} className="bg-green-50 text-green-700 border border-green-200 text-xs px-2.5 py-1 rounded-lg font-semibold">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cognitive statistics footer */}
              <div className="bg-[#FCFAF2] p-4 border border-[#EADFD5] rounded-xl mt-4">
                <div className="flex justify-between items-center text-[11px] font-sans">
                  <span className="text-[#5C4D3C] font-semibold">Exercises Completed:</span>
                  <span className="text-[#1D467D] font-black">{activeSession.interactions.length}</span>
                </div>
              </div>
            </div>

            {/* Cell 5: Free Curated Learning Resources Panel Grounded in web queries (col-span-4) */}
            <div className="lg:col-span-4 bg-white border border-[#EADFD5] rounded-3xl p-6 flex flex-col justify-between hover:border-[#A6CEF7] transition-all min-h-[350px] shadow-sm font-sans">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-4 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#1D467D]" />
                  Best Learning Resources
                </h3>

                <p className="text-xs text-[#5C4D3C] leading-relaxed mb-4">
                  These high-quality, free tutorials are handpicked to help resolve any areas where you had questions.
                </p>

                {selectedInteraction?.reflection.dynamicLearningResources && 
                selectedInteraction.reflection.dynamicLearningResources.length > 0 ? (
                  <div className="space-y-3">
                    {selectedInteraction.reflection.dynamicLearningResources.map((resItem, idx) => (
                      <a
                        id={`resource-link-${idx}`}
                        key={idx}
                        href={resItem.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-[#FCFAF2] p-3 rounded-xl border border-[#EADFD5] hover:border-[#A6CEF7] hover:bg-white transition-all group shadow-xs"
                      >
                        <div className="flex justify-between items-start mb-1 font-sans">
                          <span className="text-[9px] bg-[#E6F0FA] text-[#1D467D] px-1.5 py-0.5 border border-[#A6CEF7]/35 rounded uppercase font-bold tracking-wider mb-1 inline-block">
                            {resItem.type}
                          </span>
                          <ExternalLink className="w-3 h-3 text-[#5C4D3C] group-hover:text-[#1D467D] transition-colors" />
                        </div>
                        <h4 className="text-xs font-semibold text-[#2D2219] group-hover:text-[#1D467D] transition-colors truncate">
                          {resItem.title}
                        </h4>
                        <p className="text-[#5C4D3C] text-[11px] line-clamp-2 leading-relaxed mt-1">
                          {resItem.description}
                        </p>
                        <p className="text-[#1D467D] text-[10px] mt-1 italic truncate font-semibold">
                          Why: {resItem.relevance}
                        </p>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-[#FCFAF2] rounded-xl border border-[#EADFD5] text-[#5C4D3C] text-xs font-sans">
                    <Lightbulb className="w-6 h-6 text-[#A6CEF7] mx-auto mb-2" />
                    <span>Submit your first reply to unlock personalized resources!</span>
                  </div>
                )}
              </div>

              <div className="text-[9px] text-[#5C4D3C]/75 text-center font-sans mt-4">
                * All recommended resources are completely free to read.
              </div>
            </div>

          </div>

          {/* Core Interactive Session Steps Timeline (Lower horizontal strip Bento) */}
          <div className="bg-white border border-[#EADFD5] rounded-3xl p-6 shadow-sm font-sans">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#5C4D3C] mb-4 flex items-center gap-1.5">
              <History className="w-4.5 h-4.5 text-[#1D467D]" />
              Your Session History Timeline ({activeSession.interactions.length})
            </h3>

            {activeSession.interactions.length === 0 ? (
              <div className="text-center py-6 bg-[#FCFAF2] rounded-2xl border border-[#EADFD5] text-[#5C4D3C] text-xs">
                No progress logged yet. Submit your first challenge reply above!
              </div>
            ) : (
              <div className="space-y-4">
                {/* Horizontal bubble nodes */}
                <div className="flex gap-2.5 overflow-x-auto pb-4 select-none">
                  {activeSession.interactions.map((hist, idx) => {
                    const isSelected = activeInteractionIndex === idx || (activeInteractionIndex === -1 && idx === activeSession.interactions.length - 1);
                    return (
                      <button
                        id={`timeline-node-${idx}`}
                        key={hist.id}
                        onClick={() => setActiveInteractionIndex(idx)}
                        className={`text-left p-3.5 rounded-xl border min-w-[200px] shrink-0 transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-[#D0E5FF] border-[#BACFEE]/60 text-[#1D467D] shadow-sm"
                            : "bg-[#FCFAF2] text-[#5C4D3C] border-[#EADFD5] hover:border-[#A6CEF7]"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5 text-[9px] font-bold tracking-widest">
                          <span className={isSelected ? "text-[#1D467D]" : "text-[#1D467D]/80"}>STEP #{idx + 1}</span>
                          <span className="opacity-80">{new Date(hist.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        </div>
                        <h4 className={`text-xs font-bold truncate mb-1 ${isSelected ? "text-[#2D2219]" : "text-[#5C4D3C]"}`}>{hist.challenge.title}</h4>
                        <div className="flex justify-between items-center text-[10px]">
                          <span>Level {hist.challenge.difficulty}/5</span>
                          <strong>Score: {hist.evaluation.scores.average}/5</strong>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected historic interaction card view detail */}
                <div className="bg-[#FCFAF2] p-5 rounded-2xl border border-[#EADFD5]">
                  <div className="flex justify-between items-center border-b border-[#EADFD5] pb-3 mb-4 flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#2D2219]">
                        Detailed Coach Review for Step #{activeInteractionIndex >= 0 ? activeInteractionIndex + 1 : activeSession.interactions.length}
                      </h4>
                      <p className="text-[11px] text-[#5C4D3C] leading-none mt-1">
                        Challenge prompt: "{selectedInteraction?.challenge.title}" • Evaluated at {selectedInteraction && new Date(selectedInteraction.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-widest font-bold text-[#5C4D3C]">Average Score</p>
                      <span className="text-lg font-bold text-[#1D467D] font-mono">{selectedInteraction?.evaluation.scores.average.toFixed(1) || "0.0"} / 5.0</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#5C4D3C] leading-relaxed">
                    
                    {/* Strengths & Improvements */}
                    <div className="space-y-4">
                      <div>
                        <strong className="text-green-700 flex items-center gap-1.5 font-bold mb-1.5">
                          ✓ Key Strengths:
                        </strong>
                        <ul className="list-disc pl-5 space-y-1 text-[#5C4D3C]">
                          {selectedInteraction?.evaluation.feedback.strengths.map((str, i) => (
                            <li key={i}>{str}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <strong className="text-[#1D467D] flex items-center gap-1.5 font-bold mb-1.5">
                          ▲ Suggestion to try:
                        </strong>
                        <ul className="list-disc pl-5 space-y-1 text-[#5C4D3C]">
                          {selectedInteraction?.evaluation.feedback.improvements.map((imp, i) => (
                            <li key={i}>{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Breakdown per category text critique */}
                    <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-[#EADFD5] md:pl-6 pt-4 md:pt-0">
                      <div>
                        <strong className="text-[#2D2219] block mb-0.5 font-bold">Accuracy ({selectedInteraction?.evaluation.scores.accuracy}/5)</strong>
                        <p className="text-[11px] text-[#5C4D3C]">{selectedInteraction?.evaluation.feedback.detailedAnalysis.accuracy}</p>
                      </div>
                      <div>
                        <strong className="text-[#2D2219] block mb-0.5 font-bold">Clarity & Style ({selectedInteraction?.evaluation.scores.clarity}/5)</strong>
                        <p className="text-[11px] text-[#5C4D3C]">{selectedInteraction?.evaluation.feedback.detailedAnalysis.clarity}</p>
                      </div>
                      <div>
                        <strong className="text-[#2D2219] block mb-0.5 font-bold">Reasoning Depth ({selectedInteraction?.evaluation.scores.reasoning}/5)</strong>
                        <p className="text-[11px] text-[#5C4D3C]">{selectedInteraction?.evaluation.feedback.detailedAnalysis.reasoning}</p>
                      </div>
                      <div>
                        <strong className="text-[#2D2219] block mb-0.5 font-bold">Methodical Approach ({selectedInteraction?.evaluation.scores.approach}/5)</strong>
                        <p className="text-[11px] text-[#5C4D3C]">{selectedInteraction?.evaluation.feedback.detailedAnalysis.approach}</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
