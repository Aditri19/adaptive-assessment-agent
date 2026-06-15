import os
import json
import time
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from typing import List, Literal, Optional
from flask import Flask, request, jsonify
from flask_cors import CORS
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

app = Flask(__name__)
# Enable CORS for all routes (to support running the front-end on a different port if needed)
CORS(app)

PORT = 3000
JWT_SECRET = os.environ.get("JWT_SECRET", "adaptive-agentic-evaluation-secret-key-999")
USERS_FILE = os.path.join(os.getcwd(), "users_db.json")
SESSIONS_FILE = os.path.join(os.getcwd(), "sessions_db.json")

# ----------------------------------------------------
# Pydantic Schemas for Structured Gemini Outputs
# ----------------------------------------------------
class Rubric(BaseModel):
    accuracy: str
    clarity: str
    reasoning: str
    approach: str

class ChallengeResponse(BaseModel):
    id: str
    type: Literal['scenario', 'conceptual', 'coding_debugging', 'architecture_design', 'critical_thinking']
    title: str
    description: str
    context: str
    difficulty: int
    rubric: Rubric
    estimatedTimeMin: int

class Scores(BaseModel):
    accuracy: int
    clarity: int
    reasoning: int
    approach: int
    average: float

class DetailedAnalysis(BaseModel):
    accuracy: str
    clarity: str
    reasoning: str
    approach: str

class Feedback(BaseModel):
    overallSummary: str
    strengths: List[str]
    improvements: List[str]
    detailedAnalysis: DetailedAnalysis

class EvaluationResponse(BaseModel):
    scores: Scores
    feedback: Feedback

class LearningResource(BaseModel):
    title: str
    url: str
    description: str
    type: Literal['article', 'video', 'documentation', 'tutorial', 'interactive_module']
    relevance: str

class ReflectionResponse(BaseModel):
    agentReflectionLog: str
    weaknessesIdentified: List[str]
    strengthsConfirmed: List[str]
    suggestedDifficultyAdjustment: Literal['increase', 'decrease', 'maintain']
    dynamicLearningResources: List[LearningResource]
    nextAgentInstruction: str


# ----------------------------------------------------
# DB Persistence Layer
# ----------------------------------------------------
users_db = {}
sessions_db = {}

def load_db():
    global users_db, sessions_db
    # Load Users
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, "r", encoding="utf-8") as f:
                users_db = json.load(f)
            print(f"Loaded {len(users_db)} user accounts from local disk.")
        except Exception as e:
            print(f"Error loading users DB: {e}")
    
    # Load Sessions
    if os.path.exists(SESSIONS_FILE):
        try:
            with open(SESSIONS_FILE, "r", encoding="utf-8") as f:
                sessions_db = json.load(f)
            print(f"Loaded {len(sessions_db)} sessions from local disk.")
        except Exception as e:
            print(f"Error loading sessions DB: {e}")

def save_users():
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users_db, f, indent=2)
    except Exception as e:
        print(f"Error saving users DB: {e}")

def save_sessions():
    try:
        with open(SESSIONS_FILE, "w", encoding="utf-8") as f:
            json.dump(sessions_db, f, indent=2)
    except Exception as e:
        print(f"Error saving sessions DB: {e}")

# Initial load
load_db()


# ----------------------------------------------------
# Security / Authentication Helpers
# ----------------------------------------------------
def authenticate_token(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Access Denied: Authentication token required.", "requireAuth": True}), 401
        
        token = auth_header.split(" ")[1]
        try:
            decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = decoded
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session expired.", "requireAuth": True}), 403
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token.", "requireAuth": True}), 403
        
        return f(*args, **kwargs)
    return decorated


# ----------------------------------------------------
# AI Multi-Agent Logic
# ----------------------------------------------------
def get_ai_client():
    key = os.environ.get("GEMINI_API_KEY")
    if not key or key == "MY_GEMINI_API_KEY":
        return None
    # Use google-genai Client
    return genai.Client(api_key=key)

def determine_adaptive_challenge_params(session):
    interactions = session.get("interactions", [])
    current_difficulty = session.get("currentDifficulty", 1)
    
    recommended_type = 'scenario'
    reasoning_justification = "Starting with a comprehensive scenario to benchmark your baseline capabilities."
    
    if not interactions:
        return {
            "recommendedType": recommended_type,
            "difficulty": current_difficulty,
            "reasoningJustification": reasoning_justification
        }
    
    # Calculate historical average scores
    sum_accuracy = sum_clarity = sum_reasoning = sum_approach = 0
    count = len(interactions)
    
    for inter in interactions:
        eval_scores = inter.get("evaluation", {}).get("scores", {})
        sum_accuracy += eval_scores.get("accuracy", 3)
        sum_clarity += eval_scores.get("clarity", 3)
        sum_reasoning += eval_scores.get("reasoning", 3)
        sum_approach += eval_scores.get("approach", 3)
        
    avg_accuracy = sum_accuracy / count
    avg_clarity = sum_clarity / count
    avg_reasoning = sum_reasoning / count
    avg_approach = sum_approach / count
    
    scores = [
        {"category": "accuracy", "score": avg_accuracy, "type": "coding_debugging"},
        {"category": "clarity", "score": avg_clarity, "type": "conceptual"},
        {"category": "reasoning", "score": avg_reasoning, "type": "critical_thinking"},
        {"category": "approach", "score": avg_approach, "type": "architecture_design"}
    ]
    # Find category with lowest score
    scores.sort(key=lambda s: s["score"])
    lowest = scores[0]
    
    if lowest["score"] >= 4.5:
        recommended_type = "architecture_design"
        reasoning_justification = f"Excellent: average score is a stellar {lowest['score']:.1f}/5. Pushing bounds with System Architecture."
    else:
        recommended_type = lowest["type"]
        reasoning_justification = f"Constructive improvement flagged in user {lowest['category']} (avg: {lowest['score']:.1f}/5). Tailoring a specialized '{lowest['type']}' challenge."
        
    return {
        "recommendedType": recommended_type,
        "difficulty": current_difficulty,
        "reasoningJustification": reasoning_justification
    }

def get_simulated_challenge(session, params):
    diff = params["difficulty"]
    topic = session.get("topic", "Distributed Systems")
    ctype = params["recommendedType"]
    
    challenge_id = f"chal_{''.join(random.choices(string.ascii_lowercase + string.digits, k=6))}"
    
    title = f"Exploring {topic} (Level {diff})"
    desc = f"Evaluate key performance guarantees and system bottlenecks in {topic}."
    context = f"// Mock Starter Context for {topic} at Level {diff}\n"
    
    if ctype == "coding_debugging":
        title = f"Debugging {topic} Bottlenecks (Level {diff})"
        desc = f"Look for race conditions or resource leaks in the {topic} module."
        context = "let val = 0; async function step() { val += 1; }"
    elif ctype == "conceptual":
        title = f"Conceptual Analysis of {topic} (Level {diff})"
        desc = f"Critically evaluate state replication paradigms."
        context = "/* Concept review */"
        
    return {
        "id": challenge_id,
        "type": ctype,
        "title": title,
        "description": desc,
        "context": context,
        "difficulty": diff,
        "rubric": {
            "accuracy": "Validates syntactical accuracy and precision.",
            "clarity": "Logical structure and readable explanations.",
            "reasoning": "Depth of analytical claims and trade-off checks.",
            "approach": "System engineering steps and design soundness."
        },
        "estimatedTimeMin": 10 + diff * 5
    }

import random
import string

def get_simulated_evaluation(challenge, response):
    scores = {
        "accuracy": random.randint(3, 5),
        "clarity": random.randint(3, 5),
        "reasoning": random.randint(3, 5),
        "approach": random.randint(3, 5)
    }
    avg = sum(scores.values()) / 4.0
    scores["average"] = round(avg, 1)
    
    return {
        "scores": scores,
        "feedback": {
            "overallSummary": f"Demonstrated fair grasp of {challenge['title']}. Clear explanation structure.",
            "strengths": ["Clear phrasing", "Good structure"],
            "improvements": ["Elaborate on edge cases", "Discuss latency parameters"],
            "detailedAnalysis": {
                "accuracy": "Shows correctness with minor details missed.",
                "clarity": "Easily readable, clear outline.",
                "reasoning": "Strong logical flow.",
                "approach": "Reasonable strategy selected."
            }
        }
    }

def get_simulated_reflection(session, challenge, eval_res):
    avg = eval_res["scores"]["average"]
    adj = "maintain"
    if avg >= 4.0:
        adj = "increase"
    elif avg < 2.5:
        adj = "decrease"
        
    return {
        "agentReflectionLog": "User exhibits stable comprehension, recommend maintaining/raising difficulty gradually.",
        "weaknessesIdentified": ["Minor edge case coverage"],
        "strengthsConfirmed": ["Main-line scenario design"],
        "suggestedDifficultyAdjustment": adj,
        "dynamicLearningResources": [
            {
                "title": f"Complete Guide to {session['topic']}",
                "url": "https://wikipedia.org",
                "description": "Comprehensive reference document",
                "type": "documentation",
                "relevance": "Provides deep design details"
            }
        ],
        "nextAgentInstruction": f"Maintain progress on {session['topic']}. Serve slightly harder scenarios next session."
    }

# --- Core Challenge Generator Agent ---
def generate_challenge_api(session_dict):
    params = determine_adaptive_challenge_params(session_dict)
    client = get_ai_client()
    
    if not client:
        return get_simulated_challenge(session_dict, params)
        
    prev_text = ""
    for idx, inter in enumerate(session_dict.get("interactions", [])):
        prev_text += f"[Challenge #{idx+1}: {inter['challenge']['title']}]\n"
        prev_text += f"User Response (first 100 chars): {inter['userResponse'][:100]}\n"
        prev_text += f"Avg Score: {inter['evaluation']['scores']['average']}/5\n\n"
        
    latest_interaction = session_dict["interactions"][-1] if session_dict.get("interactions") else None
    next_instruction = "Start with an illuminating scenario that assesses foundational principles."
    if latest_interaction:
        next_instruction = latest_interaction.get("reflection", {}).get("nextAgentInstruction", next_instruction)
        
    strengths_text = ", ".join(session_dict.get("overallStrengths", [])) or "None recorded"
    weaknesses_text = ", ".join(session_dict.get("overallWeaknesses", [])) or "None recorded"
    
    # Check if topic is easy or level is 1 or 2, and explicitly request easier questions
    is_beginner_level = params['difficulty'] <= 2
    beginner_guidelines = ""
    if is_beginner_level:
        beginner_guidelines = f"""IMPORTANT FOR BEGINNERS (Level {params['difficulty']}):
- Generate a VERY simple, low-barrier, beginner-friendly exercise.
- Make it extremely short and easy (e.g., single-line solutions, 1-2 line simple code).
- Use exciting and fun formats like:
  * "Fill in the blank" (e.g., provide a code line with ____ and ask to fill).
  * "Debug the code" (e.g., correct a single syntax typo in exactly 1 line of code).
  * "Name the algorithm index / concept" (e.g., identify an elementary term).
  * "Write a program to..." (e.g. write a basic print statement or single variable definition).
  * "Multiple Choice Question" (MCQ with option A, B, C, D).
  * Core language theory question.
- Keep sentences short and clear. Use extremely simple words. Avoid complex microservice or massive cloud setup scenario details."""
    else:
        beginner_guidelines = f"Generate a regular tech exercise appropriate for Level {params['difficulty']}."

    prompt = f"""You are a friendly 'Challenge Generator Agent' in a learning ecosystem.
Create a highly personalized, targeted, encouraging, and clear challenge matching the user's study focus and learning goals.

STUDENT PROFILE:
- Topic: {session_dict['topic']}
- Target Goal: {session_dict['targetGoal']}
- Current Difficulty Level: {params['difficulty']} out of 5
- Confirmed Strengths: {strengths_text}
- Programmatic Recommendation: Challenge type {params['recommendedType']} because: {params['reasoningJustification']}
- Weaknesses to resolve: {weaknesses_text}

BEGINNER ADAPTIVE GUIDELINES:
{beginner_guidelines}

PREVIOUS INTERACTION HISTORY:
{prev_text or 'No interactions yet.'}

STRATEGY DIRECTIVE:
{next_instruction}

Generate a unique challenge matching the schema exactly. Write friendly, simple instructions, and keep it delightful and clear for beginners."""

    try:
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are the Challenge Generator Agent of the Adaptive Assessment System. You must always render valid JSON matching the schema. Focus on simple, helpful, and friendly exercises for beginning students.",
                response_mime_type="application/json",
                response_schema=ChallengeResponse,
            ),
        )
        # Parse result directly from the structured JSON response
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in Gemini generate_challenge: {e}")
        return get_simulated_challenge(session_dict, params)

# --- Core Evaluator Agent ---
def evaluate_response_api(challenge, user_response):
    client = get_ai_client()
    if not client:
        return get_simulated_evaluation(challenge, user_response)
        
    prompt = f"""You are the specialized 'Evaluation Agent'. Evaluate the user's answer:

CHALLENGE DETAILS:
- Title: {challenge['title']}
- Problem: {challenge['description']}

RUBRICS:
- ACCURACY: {challenge['rubric']['accuracy']}
- CLARITY: {challenge['rubric']['clarity']}
- REASONING: {challenge['rubric']['reasoning']}
- APPROACH: {challenge['rubric']['approach']}

USER RESPONSE SUBMITTED:
{user_response}

Grade the response in categories from 1 to 5. Compute the average and provide detailed feedback."""

    try:
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="Assess accuracy, clarity, reasoning, and approach. Return structured ratings and feedback in JSON schema.",
                response_mime_type="application/json",
                response_schema=EvaluationResponse,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in Gemini evaluate_response: {e}")
        return get_simulated_evaluation(challenge, user_response)

# --- Core Reflection Agent ---
def reflect_and_refine_api(session_dict, last_challenge, last_response, eval_result):
    client = get_ai_client()
    if not client:
        return get_simulated_reflection(session_dict, last_challenge, eval_result)
        
    prompt = f"""You are a friendly 'Reflection & Strategy Agent'.
Analyze performance on challenge "{last_challenge['title']}" under Topic "{session_dict['topic']}".
Scores: Accuracy: {eval_result['scores']['accuracy']}, Clarity: {eval_result['scores']['clarity']}, Reasoning: {eval_result['scores']['reasoning']}, Approach: {eval_result['scores']['approach']}/5.

YOUR ROLE:
1. Conduct friendly, simple reflection on progress using short sentences.
2. Formulate 2-3 highly reliable, helpful, free online learning references (such as official tutorials or guides on python.org, developer.mozilla.org, wikipedia.org, etc.) with precise URLs that explain the concepts they struggle with.
3. Suggest difficulty adjustment ('increase', 'decrease', or 'maintain') for the upcoming challenge.
4. Detail confirmed strengths and weaknesses.
5. Formulate the raw 'nextAgentInstruction' - a specific targeted feedback directive guiding the next Challenge Generator Agent on how to structure the upcoming exercise.

Format the result strictly in JSON matching the schema."""

    try:
        response = client.models.generate_content(
            model='gemini-3.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction="You are the expert Reflection & Strategy Agent. Analyze performance, supply dynamic online documentation links, and dictate plans. Keep links authentic and response extremely fast.",
                response_mime_type="application/json",
                response_schema=ReflectionResponse,
            ),
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error in Gemini reflect_and_refine: {e}")
        return get_simulated_reflection(session_dict, last_challenge, eval_result)


# ----------------------------------------------------
# API Route Controllers (Standard Flask setup)
# ----------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "language": "python-flask"})

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return jsonify({"error": "Both username and password are required."}), 400
        
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters long."}), 400
        
    if len(password) < 5:
        return jsonify({"error": "Password must be at least 5 characters long."}), 400
        
    normalized = username.lower()
    for uid, user in users_db.items():
        if user.get("username", "").lower() == normalized:
            return jsonify({"error": "Username is already taken by another scholar."}), 400
            
    # Hash password matching bcrypt specifications
    salt = bcrypt.gensalt(10)
    pwd_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
    
    user_id = f"usr_{''.join(random.choices(string.ascii_lowercase + string.digits, k=7))}"
    
    user_record = {
        "id": user_id,
        "username": username,
        "passwordHash": pwd_hash,
        "createdAt": datetime.utcnow().isoformat() + "Z"
    }
    
    users_db[user_id] = user_record
    save_users()
    
    # Create Token
    token = jwt.encode(
        {"id": user_id, "username": username, "exp": datetime.utcnow() + timedelta(days=7)},
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return jsonify({
        "token": token,
        "user": {
            "id": user_id,
            "username": username,
            "createdAt": user_record["createdAt"]
        }
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")
    
    if not username or not password:
        return jsonify({"error": "Please offer both username and password parameters."}), 400
        
    normalized = username.lower()
    matched_user = None
    for uid, user in users_db.items():
        if user.get("username", "").lower() == normalized:
            matched_user = user
            break
            
    if not matched_user:
        return jsonify({"error": "Invalid username or password credentials."}), 401
        
    # Verify password
    try:
        pw_match = bcrypt.checkpw(password.encode("utf-8"), matched_user["passwordHash"].encode("utf-8"))
    except Exception:
        pw_match = False
        
    if not pw_match:
        return jsonify({"error": "Invalid username or password credentials."}), 401
        
    token = jwt.encode(
        {"id": matched_user["id"], "username": matched_user["username"], "exp": datetime.utcnow() + timedelta(days=7)},
        JWT_SECRET,
        algorithm="HS256"
    )
    
    return jsonify({
        "token": token,
        "user": {
            "id": matched_user["id"],
            "username": matched_user["username"],
            "createdAt": matched_user["createdAt"]
        }
    })

@app.route("/api/auth/me", methods=["GET"])
@authenticate_token
def get_me():
    return jsonify({
        "id": request.user.get("id"),
        "username": request.user.get("username")
    })

@app.route("/api/sessions", methods=["GET"])
@authenticate_token
def get_sessions():
    user_id = request.user.get("id")
    user_sessions = [sess for sess in sessions_db.values() if sess.get("userId") == user_id]
    user_sessions.sort(key=lambda s: s.get("createdAt", ""), reverse=True)
    return jsonify(user_sessions)

@app.route("/api/sessions", methods=["POST"])
@authenticate_token
def create_session():
    user_id = request.user.get("id")
    username = request.user.get("username")
    data = request.json or {}
    
    topic = data.get("topic", "Dynamic Distributed Systems")
    target_goal = data.get("targetGoal", "Explore state replication tradeoffs")
    initial_diff = int(data.get("initialDifficulty", 2))
    
    session_id = f"sess_{''.join(random.choices(string.ascii_lowercase + string.digits, k=7))}"
    
    new_session = {
        "sessionId": session_id,
        "userId": user_id,
        "userName": username,
        "topic": topic,
        "targetGoal": target_goal,
        "currentDifficulty": initial_diff,
        "overallWeaknesses": [],
        "overallStrengths": [],
        "progressHistory": [],
        "interactions": [],
        "status": "active",
        "createdAt": datetime.utcnow().isoformat() + "Z",
        "updatedAt": datetime.utcnow().isoformat() + "Z"
    }
    
    # Generate the FIRST challenge adaptively
    first_challenge = generate_challenge_api(new_session)
    new_session["activeChallenge"] = first_challenge
    
    sessions_db[session_id] = new_session
    save_sessions()
    
    return jsonify(new_session), 201

@app.route("/api/sessions/<session_id>/submit", methods=["POST"])
@authenticate_token
def submit_response(session_id):
    session = sessions_db.get(session_id)
    if not session:
        return jsonify({"error": "Session not found."}), 404
        
    # Check session authorization
    if session.get("userId") != request.user.get("id"):
        return jsonify({"error": "Unauthorized access to this learning track."}), 403
        
    if session.get("status") == "completed":
        return jsonify({"error": "This session is already marked completed."}), 400
        
    data = request.json or {}
    user_response = data.get("userResponse", "").strip() or data.get("response", "").strip()
    
    if not user_response:
        return jsonify({"error": "Response content can not be empty."}), 400
        
    active_challenge = session.get("activeChallenge")
    if not active_challenge:
        return jsonify({"error": "No active assessment question currently open."}), 400
        
    # Agent 2: Evaluate answer
    eval_result = evaluate_response_api(active_challenge, user_response)
    
    # Agent 3: Reflection & Strategy adaptation
    reflection_result = reflect_and_refine_api(session, active_challenge, user_response, eval_result)
    
    # Append Interaction logs
    interaction_id = f"inter_{''.join(random.choices(string.ascii_lowercase + string.digits, k=7))}"
    interaction_record = {
        "id": interaction_id,
        "challenge": active_challenge,
        "userResponse": user_response,
        "evaluation": eval_result,
        "reflection": reflection_result,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
    
    # Append Progress history item
    progress_item = {
        "interactionIndex": len(session.get("interactions", [])) + 1,
        "scores": eval_result["scores"],
        "difficulty": active_challenge["difficulty"]
    }
    session["progressHistory"] = session.get("progressHistory", [])
    session["progressHistory"].append(progress_item)

    session["interactions"] = session.get("interactions", [])
    session["interactions"].append(interaction_record)
    
    # Update Session overall weaknesses and strengths incrementally
    new_weaknesses = reflection_result.get("weaknessesIdentified", [])
    new_strengths = reflection_result.get("strengthsConfirmed", [])
    
    session["overallWeaknesses"] = list(set(session.get("overallWeaknesses", []) + new_weaknesses))
    session["overallStrengths"] = list(set(session.get("overallStrengths", []) + new_strengths))
    
    # Apply self-adjustment to difficulty level if requested
    adj = reflection_result.get("suggestedDifficultyAdjustment", "maintain")
    current_diff = session.get("currentDifficulty", 1)
    if adj == "increase":
        session["currentDifficulty"] = min(5, current_diff + 1)
    elif adj == "decrease":
        session["currentDifficulty"] = max(1, current_diff - 1)
        
    # Pre-generate next challenge adaptively
    next_challenge = generate_challenge_api(session)
    session["activeChallenge"] = next_challenge
    
    session["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    
    sessions_db[session_id] = session
    save_sessions()
    
    return jsonify({
        "evaluation": eval_result,
        "reflection": reflection_result,
        "session": session
    })

@app.route("/api/sessions/<session_id>/complete", methods=["PUT"])
@authenticate_token
def conclude_session(session_id):
    session = sessions_db.get(session_id)
    if not session:
        return jsonify({"error": "Session record not found."}), 404
        
    if session.get("userId") != request.user.get("id"):
        return jsonify({"error": "Unauthorized."}), 403
        
    session["status"] = "completed"
    session["activeChallenge"] = None
    session["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    
    sessions_db[session_id] = session
    save_sessions()
    
    return jsonify(session)

@app.route("/api/sessions/<session_id>", methods=["DELETE"])
@authenticate_token
def delete_session(session_id):
    session = sessions_db.get(session_id)
    if not session:
        return jsonify({"error": "Session not found."}), 404
        
    if session.get("userId") != request.user.get("id"):
        return jsonify({"error": "Unauthorized."}), 403
        
    del sessions_db[session_id]
    save_sessions()
    
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=True)
