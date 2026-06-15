import { GoogleGenAI, Type } from "@google/genai";
import { Challenge, EvaluationReview, ReflectionUpdate, Session } from "../types.js";

// Lazy-initialized GoogleGenAI client
let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. Falling back to simulated mode.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// ----------------------------------------------------
// Reliable Asynchronous Timeout Wrapper 
// Avoids hanging or stuck loaders by serving simulation fallbacks if LLM calls take > 5s
// ----------------------------------------------------
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout Fallback] Operation timed out after ${timeoutMs}ms. Serving simulated fallback.`);
      resolve(fallback);
    }, timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

// ----------------------------------------------------
// Specialized Adaptive Analytics Core
// Programmatically determines target challenge types and difficulty level
// based on detailed analysis of the user's historical scores.
// ----------------------------------------------------
export function determineAdaptiveChallengeParameters(session: Session) {
  // Default values
  let recommendedType: 'scenario' | 'conceptual' | 'coding_debugging' | 'architecture_design' | 'critical_thinking' = 'scenario';
  let reasoningJustification = "Starting with a comprehensive scenario to benchmark your baseline capabilities.";
  
  if (!session.interactions || session.interactions.length === 0) {
    return { recommendedType, difficulty: session.currentDifficulty, reasoningJustification };
  }
  
  // Calculate historical averages per rubric item
  let sumAccuracy = 0, sumClarity = 0, sumReasoning = 0, sumApproach = 0;
  const count = session.interactions.length;
  
  for (const inter of session.interactions) {
    sumAccuracy += inter.evaluation.scores.accuracy;
    sumClarity += inter.evaluation.scores.clarity;
    sumReasoning += inter.evaluation.scores.reasoning;
    sumApproach += inter.evaluation.scores.approach;
  }
  
  const avgAccuracy = sumAccuracy / count;
  const avgClarity = sumClarity / count;
  const avgReasoning = sumReasoning / count;
  const avgApproach = sumApproach / count;
  
  // Find the category with the lowest score
  const scores = [
    { category: 'accuracy', score: avgAccuracy, type: 'coding_debugging' as const, note: "technical correctness, logical errors, or edge cases" },
    { category: 'clarity', score: avgClarity, type: 'conceptual' as const, note: "communicative structural clarity and readability" },
    { category: 'reasoning', score: avgReasoning, type: 'critical_thinking' as const, note: "deep engineering logic and comparative reasoning" },
    { category: 'approach', score: avgApproach, type: 'architecture_design' as const, note: "modular system design and workflow architecture integrity" }
  ];
  
  scores.sort((a, b) => a.score - b.score);
  const lowest = scores[0];
  
  // If the lowest score is quite strong (>= 4.5), we can challenge them with system architecture
  if (lowest.score >= 4.5) {
    recommendedType = 'architecture_design';
    reasoningJustification = `Excellent: average score is a stellar ${lowest.score.toFixed(1)}/5. Pushing bounds with System Architecture.`;
  } else {
    recommendedType = lowest.type;
    reasoningJustification = `The system flagged a constructive improvement opportunity in user **${lowest.category}** (avg: ${lowest.score.toFixed(1)}/5). Dynamically serving a specialized "**${lowest.type}**" challenge tailored to resolve this gap.`;
  }
  
  return {
    recommendedType,
    difficulty: session.currentDifficulty,
    reasoningJustification
  };
}

// ----------------------------------------------------
// Specialized Agent 1: CHALLENGE GENERATOR
// Generates a customized, highly specific challenge
// ----------------------------------------------------
export async function generateChallenge(session: Session): Promise<Challenge> {
  const adaptiveParams = determineAdaptiveChallengeParameters(session);
  const ai = getAI();
  if (process.env.GEMINI_API_KEY === undefined || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return getSimulatedChallenge(session);
  }

  const prevHistoryText = session.interactions.map((inter, idx) => {
    return `[Challenge #${idx + 1}: ${inter.challenge.title}]
Difficulty: ${inter.challenge.difficulty}/5
User Response (first 150 chars): "${inter.userResponse.substring(0, 150)}..."
Evaluation Scores: Accuracy ${inter.evaluation.scores.accuracy}/5, Clarity ${inter.evaluation.scores.clarity}/5, Reasoning ${inter.evaluation.scores.reasoning}/5, Approach ${inter.evaluation.scores.approach}/5`;
  }).join("\n\n");

  const latestReflection = session.interactions.length > 0 
    ? session.interactions[session.interactions.length - 1].reflection
    : null;

  const nextInstruction = latestReflection?.nextAgentInstruction || "Start with an illuminating scenario that assesses foundational principles.";
  const strengthsText = session.overallStrengths.join(", ") || "None recorded yet";
  const weaknessesText = session.overallWeaknesses.join(", ") || "None recorded yet";

  // Check if topic is easy or level is 1 or 2, and explicitly request easier questions
  const isBeginnerLevel = adaptiveParams.difficulty <= 2;
  const beginnerGuidelines = isBeginnerLevel 
    ? `IMPORTANT FOR BEGINNERS (Level ${adaptiveParams.difficulty}):
- Generate a VERY simple, low-barrier, beginner-friendly exercise.
- Make it extremely short and easy (e.g., single-line solutions, 1-2 line simple code).
- Use exciting and fun formats like:
  * "Fill in the blank" (e.g., provide a code line with ____ and ask to fill).
  * "Debug the code" (e.g., correct a single syntax typo in exactly 1 line of code).
  * "Name the algorithm index / concept" (e.g., identify an elementary term).
  * "Write a program to..." (e.g. write a basic print statement or single variable definition).
  * "Multiple Choice Question" (MCQ with option A, B, C, D).
  * Core language theory question.
- Keep sentences short and clear. Use extremely simple words. Avoid complex microservice or massive cloud setup scenario details.`
    : `Generate a regular tech exercise appropriate for Level ${adaptiveParams.difficulty}.`;

  const prompt = `You are a friendly 'Challenge Generator Agent' in a learning ecosystem.
Your role: Create a highly personalized, encouraging, and clear challenge matching the user's study focus, session target goal, and exact current level.

STUDENT PROFILE & ASSESSMENT CRITERIA:
- Topic of study: ${session.topic}
- Target learning/assessment goal: ${session.targetGoal}
- Current Assessment Difficulty Level: ${adaptiveParams.difficulty} out of 5 (1 = Novice, 2 = Competent, 3 = Proficient, 4 = Advanced, 5 = Master/Guru)
- Confirmed Strengths: ${strengthsText}
- Programmatic Selection Recommendation: Create a challenge of type "${adaptiveParams.recommendedType}" because: "${adaptiveParams.reasoningJustification}"
- Specific Weaknesses/Gaps to target: ${weaknessesText}

BEGINNER ADAPTIVE GUIDELINES:
${beginnerGuidelines}

PREVIOUS INTERACTION HISTORY:
${prevHistoryText || "No previous challenges yet in this session."}

DYNAMIC COACH STRATEGY INSTRUCTION:
"${nextInstruction}"

Strictly generate a unique challenge in JSON format conforming EXACTLY to the requested schema. Make sure the 'context' contains starter code, simple variables, or a template, and that 'description' provides a simple and motivating question. Assign a randomized unique string to 'id' (e.g. 'chal_' followed by random letters/numbers). Let's keep the experience delightful and clear for beginners.`;

  try {
    const apiCall = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are the Challenge Generator Agent of the Adaptive Assessment System. You must always render valid JSON matching the specified schema. Keep instructions extremely clear, helpful, and friendly. Avoid technical jargon or overcomplicating things, especially for beginners.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING, description: "A unique challenge identifier, e.g. 'chal_a3f91b'" },
            type: { 
              type: Type.STRING, 
              enum: ['scenario', 'conceptual', 'coding_debugging', 'architecture_design', 'critical_thinking'],
              description: "The stylistic type of assessment"
            },
            title: { type: Type.STRING, description: "A catchy, motivating title for the challenge" },
            description: { type: Type.STRING, description: "The core challenge instruction, constraints, and problem statement" },
            context: { type: Type.STRING, description: "Starter code, source data, system config, or code file contents/snippets for the user to work on" },
            difficulty: { type: Type.INTEGER, description: "Target difficulty (1 to 5)" },
            rubric: {
              type: Type.OBJECT,
              properties: {
                accuracy: { type: Type.STRING, description: "Specific technical criteria for accuracy" },
                clarity: { type: Type.STRING, description: "Specific criteria for readability and structure" },
                reasoning: { type: Type.STRING, description: "Criteria for justification/depth of logic" },
                approach: { type: Type.STRING, description: "Criteria for procedural approach and optimal pathing" }
              },
              required: ['accuracy', 'clarity', 'reasoning', 'approach']
            },
            estimatedTimeMin: { type: Type.INTEGER, description: "Estimated time to complete this challenge in minutes" }
          },
          required: ['id', 'type', 'title', 'description', 'context', 'difficulty', 'rubric', 'estimatedTimeMin']
        }
      }
    }).then((response) => {
      const parsed = JSON.parse(response.text);
      return parsed as Challenge;
    });

    return await withTimeout(apiCall, 5000, getSimulatedChallenge(session));
  } catch (error) {
    console.error("Error in generateChallenge of Specialized Agent:", error);
    return getSimulatedChallenge(session);
  }
}

// ----------------------------------------------------
// Specialized Agent 2: EVALUATOR AGENT
// Evaluates the response using structured rubric
// ----------------------------------------------------
export async function evaluateResponse(challenge: Challenge, userResponse: string): Promise<EvaluationReview> {
  const ai = getAI();
  if (process.env.GEMINI_API_KEY === undefined || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return getSimulatedEvaluation(challenge, userResponse);
  }

  const prompt = `You are the specialized 'Evaluation Agent' of an Adaptive learning system.
Evaluate the user's response based on the following challenge and its precise evaluation rubrics.

CHALLENGE DETAILS:
- Title: ${challenge.title}
- Type: ${challenge.type}
- Difficulty: ${challenge.difficulty}/5
- Problem Statement:
${challenge.description}

EVALUATION RUBRIC DEFINITIONS:
- ACCURACY: ${challenge.rubric.accuracy}
- CLARITY: ${challenge.rubric.clarity}
- REASONING: ${challenge.rubric.reasoning}
- APPROACH: ${challenge.rubric.approach}

USER RESPONSE SUBMITTED:
------------------------------------------
${userResponse}
------------------------------------------

YOUR TASK:
Grade the response in each of the 4 categories from 1 to 5 (1 = Completely missed, 2 = Major gaps, 3 = Average/Meets baseline, 4 = Strong/High proficiency, 5 = Masterful/No errors).

CRITICAL GRADING PHILOSOPHY:
- Be encouraging, validating, and fair!
- Under no circumstances should you penalize the user for brevity if their answer is functionally correct, concise, and complete. A concise, elegant one-liner code or single sentence is a masterful 5/5.
- Dedicate high grades (4/5 or 5/5) to correct answers. Only deduct points for actual semantic errors or explicit omissions.
- Let's help make the learner feel rewarded for brilliant solutions!

Calculate the overall average score.
Provide:
1. Overall summary detailing strengths and missing elements of the answer.
2. 2-3 specific Bullet points of strengths.
3. 2-3 specific Bullet points of constructive improvements.
4. Detailed written feedback for each rubric category.

Be constructive, intellectually rigorous, and objective. State why they earned the specific scores. Return valid JSON conforming to the schema.`;

  try {
    const apiCall = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are the expert Evaluator Agent. Assess with fair and encouraging standards, adhering to technical correctness. Do NOT penalize the learner for brevity. A correct concise answer is a masterful 5/5. Return structured ratings and encouraging advice in JSON.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            scores: {
              type: Type.OBJECT,
              properties: {
                accuracy: { type: Type.INTEGER, description: "Score from 1 to 5" },
                clarity: { type: Type.INTEGER, description: "Score from 1 to 5" },
                reasoning: { type: Type.INTEGER, description: "Score from 1 to 5" },
                approach: { type: Type.INTEGER, description: "Score from 1 to 5" },
                average: { type: Type.NUMBER, description: "Computed average of the four scores" }
              },
              required: ['accuracy', 'clarity', 'reasoning', 'approach', 'average']
            },
            feedback: {
              type: Type.OBJECT,
              properties: {
                overallSummary: { type: Type.STRING, description: "Brief high-level summary of performance" },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific things they got right" },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific steps to implement for improvement" },
                detailedAnalysis: {
                  type: Type.OBJECT,
                  properties: {
                    accuracy: { type: Type.STRING },
                    clarity: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    approach: { type: Type.STRING }
                  },
                  required: ['accuracy', 'clarity', 'reasoning', 'approach']
                }
              },
              required: ['overallSummary', 'strengths', 'improvements', 'detailedAnalysis']
            }
          },
          required: ['scores', 'feedback']
        }
      }
    }).then((response) => {
      const parsed = JSON.parse(response.text);
      return parsed as EvaluationReview;
    });

    return await withTimeout(apiCall, 5000, getSimulatedEvaluation(challenge, userResponse));
  } catch (error) {
    console.error("Error in evaluateResponse:", error);
    return getSimulatedEvaluation(challenge, userResponse);
  }
}

// ----------------------------------------------------
// Specialized Agent 3: REFLECTION & STRATEGY AGENT
// Reflects on performance, searches tutorials/resources,
// updates overall session state, recommends curriculum
// ----------------------------------------------------
export async function reflectAndRefine(
  session: Session, 
  lastChallenge: Challenge, 
  lastResponse: string, 
  evalResult: EvaluationReview
): Promise<ReflectionUpdate> {
  const ai = getAI();
  if (process.env.GEMINI_API_KEY === undefined || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
    return getSimulatedReflection(session, lastChallenge, lastResponse, evalResult);
  }

  const targetTopic = session.topic;
  const prompt = `You are a friendly 'Reflection & Strategy Agent'.
You analyze the user's response to the challenge: "${lastChallenge.title}" under Topic: "${targetTopic}".
The user scored:
- Accuracy: ${evalResult.scores.accuracy}/5
- Clarity: ${evalResult.scores.clarity}/5
- Reasoning: ${evalResult.scores.reasoning}/5
- Approach: ${evalResult.scores.approach}/5

YOUR ROLE:
1. Conduct friendly, simple reflection on this student's progress. Use short sentences and encouraging terms suitable for beginners.
2. Formulate 2-3 highly reliable, helpful, free online learning references (such as official tutorials or guides on python.org, developer.mozilla.org, wikipedia.org, etc.) with precise URLs that explain the concepts they struggle with.
3. Determine if the challenge difficulty should be adjusted ('increase', 'decrease', or 'maintain') for the NEXT interaction. If average score is >= 4.0, suggest 'increase'. If average score is < 2.5, suggest 'decrease'. Otherwise 'maintain'.
4. Detail confirmed strengths and weaknesses.
5. Formulate the raw 'nextAgentInstruction' - a specific targeted feedback directive guiding the next Challenge Generator Agent on how to structure the upcoming exercise (e.g. "Create a simple fill-in-the-blank python lists exercise because they need help with array indexing.").

Strictly format the result in JSON matching the requested schema.`;

  try {
    const apiCall = ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: `You are the expert Reflection & Strategy Agent. You analyze student performance and provide direct high-quality references to free learning materials (e.g. MDN Web Docs, LearnPython, Python Tutorial, Wikipedia) and guide future exercises. Keep responses friendly, clear, and extremely fast.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            agentReflectionLog: { type: Type.STRING, description: "Internal cognitive log of how the user's thinking has evolved and structural tips" },
            weaknessesIdentified: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific sub-topics or skills that need urgent work" },
            strengthsConfirmed: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific sub-topics or skills they have mastered" },
            suggestedDifficultyAdjustment: { 
              type: Type.STRING, 
              enum: ['increase', 'decrease', 'maintain'],
              description: "Whether to adapt the level of the next challenge"
            },
            dynamicLearningResources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Name of the resource article or tutorial" },
                  url: { type: Type.STRING, description: "Valid HTTP/HTTPS URL from official/academic web sources" },
                  description: { type: Type.STRING, description: "Brief description of the material" },
                  type: { 
                    type: Type.STRING, 
                    enum: ['article', 'video', 'documentation', 'tutorial', 'interactive_module'] 
                  },
                  relevance: { type: Type.STRING, description: "Explaining exactly why this helps their identified weakness" }
                },
                required: ['title', 'url', 'description', 'type', 'relevance']
              }
            },
            nextAgentInstruction: { type: Type.STRING, description: "Explicit instruction to pass to the next Challenge Generator agent" }
          },
          required: ['agentReflectionLog', 'weaknessesIdentified', 'strengthsConfirmed', 'suggestedDifficultyAdjustment', 'dynamicLearningResources', 'nextAgentInstruction']
        }
      }
    }).then((response) => {
      const parsed = JSON.parse(response.text);
      return parsed as ReflectionUpdate;
    });

    return await withTimeout(apiCall, 5000, getSimulatedReflection(session, lastChallenge, lastResponse, evalResult));
  } catch (error) {
    console.error("Error in reflectAndRefine:", error);
    return getSimulatedReflection(session, lastChallenge, lastResponse, evalResult);
  }
}

// ----------------------------------------------------
// Fallback / Simulated Generators when API Key is missing
// ----------------------------------------------------

export function getGoalForTopicAndDiff(topic: string, diff: number): string {
  const topicLower = topic.toLowerCase();
  if (topicLower.includes("python")) {
    switch (diff) {
      case 1: return "Master basic variables, loop syntax, lists, and simple print statements step-by-step.";
      case 2: return "Gain comfort with function definitions, positional and default parameters, and code organization rules.";
      case 3: return "Grasp Object Oriented Programming paradigms, constructors, instances, and self binding in simple classes.";
      case 4: return "Write expressive and readable list comprehensions to map, clean, and filter values concisely.";
      case 5: return "Master advanced Python patterns: custom exception classes, exception raising, and clean try-except flow control.";
      default: return "Master advanced Python patterns.";
    }
  } else if (topicLower.includes("javascript") || topicLower.includes("js")) {
    switch (diff) {
      case 1: return "Fix basic quote mismatch rules, simple string formatting, and alert/console logs.";
      case 2: return "Review let vs const reassignability rules, block scoped variables, and script execution contexts.";
      case 3: return "Understand modern ES6 array transformers like map, filter, and basic callback arrow execution blocks.";
      case 4: return "Explore asynchronous code, promise construction, timeouts, and simple resolve states.";
      case 5: return "Master JS closure patterns, private encapsulated state, and clean high-order function structures.";
      default: return "Master JS closure patterns.";
    }
  } else if (topicLower.includes("java")) {
    switch (diff) {
      case 1: return "Build console programs, main method syntax, and simple println outputs.";
      case 2: return "Differentiate primitive types double and int, variable layout, and type safety constraints.";
      case 3: return "Access and query array elements, length variables, and loop iteration limits.";
      case 4: return "Design inherits structures, subclasses extending parental base blueprints.";
      case 5: return "Implement try-catch blocks protecting against arithmetic errors and custom exception handlers.";
      default: return "Implement try-catch blocks and custom exception handlers.";
    }
  } else if (topicLower.includes("machine learning") || topicLower.includes("ai") || topicLower.includes("intelligence")) {
    switch (diff) {
      case 1: return "Define baseline terms: understanding models, training procedures, and patterns.";
      case 2: return "Distinguish prediction tasks by reviewing Supervised vs Unsupervised learning workflows.";
      case 3: return "Analyze general performance: why independent test splitting is key to avoiding overfitting.";
      case 4: return "Calculate numeric performance metrics: Mean Squared Error calculations.";
      case 5: return "Review neural networks regularization: Dropout, early stopping parameters, and weight decay.";
      default: return "Review neural networks regularization.";
    }
  } else {
    switch (diff) {
      case 1: return `Build essential terminology, baseline definitions, and core rules for ${topic}.`;
      case 2: return `Understand basic usage commands, initial steps, and setup verification routines for ${topic}.`;
      case 3: return `Structure modular code folders and maintain reusable components inside ${topic}.`;
      case 4: return `Diagnose configuration errors, look up trace log reports, and troubleshoot standard issues in ${topic}.`;
      case 5: return `Identify and mitigate deep architectural bottlenecks, high workload scaling limits, and latency spikes in ${topic}.`;
      default: return `Master deep architectural concepts of ${topic}.`;
    }
  }
}

// Extensive programmatically seeded challenge variations to guarantee non-repeating endless questions
interface ProgrammedChallenge {
  title: string;
  description: string;
  context: string;
  keywords: string[];
}

const PY_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "Fill-in-the-Blank: Python Loops",
      description: "[LEARNING GOAL: Master basic variables, loop syntax, lists, and simple print statements.]\n\nFill in the blank (indicated by ____) to iterate over numbers from 0 to 4:\n\n`____ i in range(5):\n    print(i)`\n\nExplain in one simple sentence what keyword goes there and why.",
      context: "# Python beginner challenge - Level 1\n# Fill in the blank:\n____ i in range(5):\n    print(i)",
      keywords: ["for"]
    },
    {
      title: "Python Arithmetic operator: Floor Division",
      description: "[LEARNING GOAL: Differentiate decimal from floor integer division operations.]\n\nGiven standard variables `a = 15` and `b = 4`, write the correct Python operator for floor division (producing 3 without decimals).",
      context: "# Python Level 1\na = 15\nb = 4\n# Calculate division here:",
      keywords: ["//"]
    },
    {
      title: "Python String Concatenation Mechanics",
      description: "[LEARNING GOAL: Join words and construct complete messages.]\n\nCombine the variable words `part1 = 'Learn'` and `part2 = 'Python'` with a single space in between to result in 'Learn Python'.",
      context: "# Python Level 1\npart1 = 'Learn'\npart2 = 'Python'\n# Combine below:",
      keywords: ["+", "part1", "part2"]
    },
    {
      title: "Modifying Lists: Adding Items",
      description: "[LEARNING GOAL: Edit array structures dynamically.]\n\nWrite a line of Python code to add the string 'Blue' to the end of the existing list `colors = ['Red', 'Green']`.",
      context: "# Python Level 1\ncolors = ['Red', 'Green']\n# Add 'Blue' below:",
      keywords: ["append", "colors", "blue"]
    },
    {
      title: "Python Comparative Statements",
      description: "[LEARNING GOAL: Evaluate parameters and redirect execution logs.]\n\nComplete the conditional check line to see if string variable `role` is exactly equal to 'Admin'.",
      context: "# Python Level 1\nrole = 'User'\n# Complete conditional header below:\n____ role == 'Admin':\n    print('Access granted')",
      keywords: ["if"]
    }
  ],
  2: [
    {
      title: "Debugging Python Function Parameters",
      description: "[LEARNING GOAL: Gain comfort with function parameter layout rules.]\n\nFix function syntax because Python raises a SyntaxError if a default parameter is written before a non-default parameter:\n\n`def greet_user(greeting=\"Hello\", username):\n    return f\"{greeting}, {username}!\"`",
      context: "# Python Level 2\ndef greet_user(greeting=\"Hello\", username):\n    return f\"{greeting}, {username}!\"",
      keywords: ["username", "greeting", "def greet_user"]
    },
    {
      title: "Python Dictionary Keys Testing",
      description: "[LEARNING GOAL: Query key elements in associative maps.]\n\nCheck if the string 'email' is a key in the dictionary `user = {'username': 'coder'}` using Python's `in` keyword.",
      context: "# Python Level 2\nuser = {'username': 'coder'}\n# Check key:",
      keywords: ["in", "user", "email"]
    },
    {
      title: "Python Slicing: Retrieving Segments",
      description: "[LEARNING GOAL: Retrieve slices from string characters.]\n\nSlice the first 3 letters from the string `word = 'Learning'`. State the slice index expression.",
      context: "# Python Level 2\nword = 'Learning'\n# Extract slice of first 3 letters below:",
      keywords: ["word", "[0:3]", "[:3]"]
    },
    {
      title: "Global Variable scope modifier",
      description: "[LEARNING GOAL: Update parent module scope records.]\n\nExplain how to successfully increment the global integer variable `clicks` from inside a local function `click()` without raising an error.",
      context: "# Python Level 2\nclicks = 0\ndef click():\n    # Modify global clicks below:\n    clicks += 1",
      keywords: ["global"]
    },
    {
      title: "Tuple Unpacking Mechanics",
      description: "[LEARNING GOAL: Destructure data variables.]\n\nUnpack the tuple `coords = (38.89, -77.03)` into separate variables named `lat` and `lng` inside a single line.",
      context: "# Python Level 2\ncoords = (38.89, -77.03)\n# Unpack below:",
      keywords: ["lat", "lng", "coords"]
    }
  ],
  3: [
    {
      title: "Python Class Initialization",
      description: "[LEARNING GOAL: Grasp OOP paradigms, instance initializations, and class structures.]\n\nImplement a simple Python class called `Learner` that is initialized with a string parameter called `name`. It should contain a method `get_greeting(self)` that returns `f\"Hello, {self.name}\"`. Make sure the `__init__` constructor receives `name` and binds it to `self.name`.",
      context: "# Python beginner challenge - Level 3\nclass Learner:\n    # Write constructor with 'name' property and get_greeting method\n    pass",
      keywords: ["__init__", "self", "get_greeting", "name"]
    },
    {
      title: "File Context Managers: Read Operations",
      description: "[LEARNING GOAL: Safely stream information files and close locks automatically.]\n\nUse Python's `with` structure to open file 'notes.txt' in read mode ('r') and bind file content to variable `data`.",
      context: "# Python Level 3\n# Open notes.txt safely using with statement below:",
      keywords: ["with open", "notes.txt", "as", "read"]
    },
    {
      title: "Advanced List Sorting keys",
      description: "[LEARNING GOAL: Apply custom key metrics during list sorting operations.]\n\nSort the list of strings `names = ['alexander', 'bo', 'chris']` by their string lengths using Python's `sorted()` or `.sort()` with a custom lambda function.",
      context: "# Python Level 3\nnames = ['alexander', 'bo', 'chris']",
      keywords: ["len", "lambda", "sort", "key"]
    },
    {
      title: "Calculated Intersections in Python Sets",
      description: "[LEARNING GOAL: Extract overlaps of distinct element datasets.]\n\nGiven Python sets `science_club = {'Ana', 'Roy'}` and `math_club = {'Roy', 'Dan'}`, find their intersection using set operators.",
      context: "# Python Level 3\nscience_club = {'Ana', 'Roy'}\nmath_club = {'Roy', 'Dan'}\n# Identify common club members:",
      keywords: ["intersection", "&"]
    },
    {
      title: "Double Filters inside List Comprehensions",
      description: "[LEARNING GOAL: Apply nested numeric filters inside comprehension lists.]\n\nWrite a list comprehension that extracts only positive even values from the list `raw = [-4, -3, 2, 5, 8, 11]`.",
      context: "# Python Level 3\nraw = [-4, -3, 2, 5, 8, 11]\n# Filter positive even values below:",
      keywords: ["> 0", "% 2 == 0", "raw", "for"]
    }
  ],
  4: [
    {
      title: "Python List Comprehensions & Filter Transitions",
      description: "[LEARNING GOAL: Write expressive, clean Python list comprehensions to filter values.]\n\nGiven a list of scores `[45, 82, 91, 55, 30, 99]`, write a single-line Python list comprehension that filters scores that are strictly greater than 50. Name the filtered list variable `passing_scores`.",
      context: "# Python beginner challenge - Level 4\nscores = [45, 82, 91, 55, 30, 99]\n# Create passing_scores comprehension below:\n",
      keywords: ["for", "scores", "> 50", "passing_scores"]
    },
    {
      title: "Generator yield functions",
      description: "[LEARNING GOAL: Implement lazy generator execution flows.]\n\nWrite a simple generator function `countdown(n)` that yields integers from `n` down to 1 utilizing the Python `yield` keyword.",
      context: "# Python Level 4\ndef countdown(n):\n    # Yield numbers sequentially below:\n    pass",
      keywords: ["yield", "while", "countdown"]
    },
    {
      title: "Nonlocal Closures Nested State",
      description: "[LEARNING GOAL: Modify state variables in nested enclosing parent scopes.]\n\nWrite an accumulator function `make_accumulator()` where the inner function `add(value)` updates a parent level `total` using the Python `nonlocal` keyword.",
      context: "# Python Level 4\ndef make_accumulator():\n    total = 0\n    def add(value):\n        # Complete using nonlocal keyword\n        pass\n    return add",
      keywords: ["nonlocal", "total", "add"]
    },
    {
      title: "Multiple Inheritance resolution lookup",
      description: "[LEARNING GOAL: Deconstruct python inheritance resolutions.]\n\nDefine how Python resolves method lookups in multiple inheritance hierarchies (mention what MRO stands for and the name of the algorithm).",
      context: "# Python Level 4\n# Record brief explanation:",
      keywords: ["mro", "method resolution order", "c3"]
    },
    {
      title: "Lambda Filtering Lists",
      description: "[LEARNING GOAL: Express inline filtering loops.]\n\nUse standard `filter()` and a `lambda` function to filter words starting with letter 'P' from list `languages = ['Python', 'Java', 'PHP']`.",
      context: "# Python Level 4\nlanguages = ['Python', 'Java', 'PHP']\n# Filter with lambda here:",
      keywords: ["filter", "lambda", "startswith", "p"]
    }
  ],
  5: [
    {
      title: "Python Custom Metaclasses for Architectural Validation",
      description: "[GURU OUTCOME: Enforce annotations checks at runtime class declarations.]\n\nImplement a custom Python Metaclass named `EnforceAnnotationsMeta` that intercepts class creation and raises a `TypeError` if any custom method defined inside the declared class lacks type annotations for its arguments or returns.",
      context: "# Python Master Challenge - Level 5\nclass EnforceAnnotationsMeta(type):\n    # Intercept __new__ and inspect type annotations:\n    def __new__(mcs, name, bases, attrs):\n        # Validate annotations and raise TypeError if missing:\n        return super().__new__(mcs, name, bases, attrs)",
      keywords: ["__new__", "typeerror", "annotations", "super"]
    },
    {
      title: "Asynchronous Workloads Pool Rate Limiting",
      description: "[GURU OUTCOME: Safeguard rate constraints utilizing Semaphore classes.]\n\nWrite an asynchronous task executor `async def run_highly_concurrent(tasks)` that executes a list of async functions concurrently using `asyncio.gather`, but strictly enforces a limit of 3 concurrent active tasks using `asyncio.Semaphore`.",
      context: "# Python Master Challenge - Level 5\nimport asyncio\nasync def run_highly_concurrent(tasks):\n    # Implement rate limit using Semaphore below:\n    pass",
      keywords: ["semaphore", "gather", "asyncio", "with"]
    },
    {
      title: "Double Decorators Preserving Namespace Signatures",
      description: "[GURU OUTCOME: Write safe custom decorator modules preserving execution metadata.]\n\nCreate a Python double decorator `@log_and_retry(retries=3)` that logs function call parameters, catches subclasses of Exception, and automatically retries the function call up to 3 times, using `functools.wraps` to safely preserve original names and docstrings.",
      context: "# Python Master Challenge - Level 5\nimport functools\ndef log_and_retry(retries=3):\n    # Create a double nested decorator wrapper:\n    pass",
      keywords: ["wraps", "decorator", "retries", "try", "except"]
    },
    {
      title: "Custom Descriptors for Type Safety enforcing",
      description: "[GURU OUTCOME: Author type checks intercepting property variables.]\n\nDesign a customized Python descriptor class named `IntegerDescriptor` that intercepts property assignment values on a model class and raises a strict `TypeError` if a user attempts to store a non-integer value.",
      context: "# Python Master Challenge - Level 5\nclass IntegerDescriptor:\n    # Implement get and set descriptors below:\n    pass",
      keywords: ["__get__", "__set__", "typeerror", "instance"]
    },
    {
      title: "High-Throughput Bidirectional Data Pipelines",
      description: "[GURU OUTCOME: Create running smooth average pipelines utilizing sent generator states.]\n\nWrite a Python coroutine generator `def average_coroutine()` that runs an infinite loop. On receiving new integer data values via `generator.send(value)`, it should update the running count and yield the exact cumulative running mean as a float.",
      context: "# Python Master Challenge - Level 5\ndef average_coroutine():\n    # Implement running average utilizing yield and send below:\n    pass",
      keywords: ["yield", "send", "while", "average"]
    }
  ]
};

const JS_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "JavaScript Syntax/Quotes Debugger",
      description: "[LEARNING GOAL: Fix basic string quote mismatch rules and console logs.]\n\nCorrect the quote matching typo in this single line of JavaScript code:\n\n`const message = 'Hello\";`\n\nProvide the fixed line of code and a brief explanation.",
      context: "// JS Level 1\nconst message = 'Hello\";",
      keywords: ["hello"]
    },
    {
      title: "JS Variables reassignment properties",
      description: "[LEARNING GOAL: Differentiate let and const modifier assignments.]\n\nThe code `const score = 10; score = 20;` fails because const values cannot be reassigned. Rewrite using let to allow updating variables.",
      context: "// JS Level 1\nconst score = 10;\nscore = 20;",
      keywords: ["let score"]
    },
    {
      title: "JavaScript String Concatenation",
      description: "[LEARNING GOAL: Join text characters safely.]\n\nUse standard concatenation operators to combine `firstName = 'Coding'` and `lastName = 'Coach'` with a space in between.",
      context: "// JS Level 1\nlet firstName = 'Coding';\nlet lastName = 'Coach';\n# Concatenate:",
      keywords: ["+", "firstName", "lastName"]
    },
    {
      title: "Modulo Checks for Even Numbers",
      description: "[LEARNING GOAL: Learn basic conditional arithmetic operations.]\n\nFill in the blank with the correct modulo operator to verify if variable `n` is even: `if (n ____ 2 === 0)`",
      context: "// JS Level 1\nlet n = 8;\nif (n ____ 2 === 0)",
      keywords: ["%"]
    },
    {
      title: "JS read array size length",
      description: "[LEARNING GOAL: Query lengths of collections in JS.]\n\nWrite down the property or statement used to read the number of elements in array `items = ['Apple', 'Lime']`.",
      context: "// JS Level 1\nlet items = ['Apple', 'Lime'];\n// Read size:",
      keywords: ["items.length"]
    }
  ],
  2: [
    {
      title: "JavaScript Scope & Constant Rules",
      description: "[LEARNING GOAL: Review variables scope, block structures and re-assignment behavior.]\n\nThis JS snippet raises a TypeError because it attempts to reassign a `const` variable. Fix it by using the modern ES6 keyword for block-scoped reassignable variables:\n\n`const counter = 0;\ncounter = counter + 1;`\n\nProvide the full, corrected code!",
      context: "// JS Level 2\nconst counter = 0;\ncounter = counter + 1;",
      keywords: ["let counter"]
    },
    {
      title: "JS Object property deletion",
      description: "[LEARNING GOAL: Remove object properties dynamically.]\n\nWrite a JS line of code to delete the property `score` from object `learner = { name: 'Ava', score: 100 }` using the delete keyword.",
      context: "// JS Level 2\nconst learner = { name: 'Ava', score: 100 };\n// Write delete command:",
      keywords: ["delete", "learner.score"]
    },
    {
      title: "JavaScript Arrays appending push",
      description: "[LEARNING GOAL: Store entries in collections safely.]\n\nUse the correct array method to insert 'Gold' onto the end of the array `prizes = ['Bronze', 'Silver']`.",
      context: "// JS Level 2\nconst prizes = ['Bronze', 'Silver'];\n// Add Gold below:",
      keywords: ["push", "gold", "prizes"]
    },
    {
      title: "Truthy vs Falsy conditionals check",
      description: "[LEARNING GOAL: Evaluate truth metrics of clean configurations.]\n\nDoes the blank empty array `[]` represent truthy or falsy inside standard JavaScript conditional evaluations?",
      context: "// JS Level 2\n// Answer truthy or falsy and explain why below:",
      keywords: ["truthy"]
    },
    {
      title: "Math absolute peak checks",
      description: "[LEARNING GOAL: Find maximum values using standard Math utilities.]\n\nWrite a short JS expression using the standard global Math object to determine the larger value of variables `x = 77` and `y = 104`.",
      context: "// JS Level 2\nlet x = 77; let y = 104;\n// Select larger value:",
      keywords: ["Math.max", "x", "y"]
    }
  ],
  3: [
    {
      title: "JS Array Operations: Map",
      description: "[LEARNING GOAL: Understand arrow functions and array mapping transformations.]\n\nGiven an array of string items `['Alice', 'Bob']`, use the modern `.map()` array transformer to return an array of greetings. E.g., `['Hello, Alice', 'Hello, Bob']`. Write your JS mapper expression.",
      context: "// JS Level 3\nconst names = ['Alice', 'Bob'];\n// Transform names using map below:\n",
      keywords: ["map", "names", "=>", "hello"]
    },
    {
      title: "JS Arrow Functions modern syntax",
      description: "[LEARNING GOAL: Convert functions to modern block arrow syntax.]\n\nConvert the classic function `function addOne(x) { return x + 1; }` into a concise arrow function on a single line.",
      context: "// JS Level 3\nfunction addOne(x) { return x + 1; }",
      keywords: ["=>", "x + 1", "addOne"]
    },
    {
      title: "JavaScript Template Literals conversion",
      description: "[LEARNING GOAL: Format logs readable utilizing backticks.]\n\nRewrite `console.log(title + ' was completed for ' + score + ' points')` using modern ES6 template literal backticks.",
      context: "// JS Level 3\nlet title = 'Quiz 1'; let score = 90;",
      keywords: ["`", "${title}", "${score}"]
    },
    {
      title: "JS Object properties destructuring",
      description: "[LEARNING GOAL: Deconstruct nested parameters on single lines.]\n\nUnpack keys `username` and `status` from variable `record = { username: 'scholar', status: 'online', code: 5 }` inside a single line.",
      context: "// JS Level 3\nconst record = { username: 'scholar', status: 'online', code: 5 };",
      keywords: ["const {", "username", "status", "}", "record"]
    },
    {
      title: "Filtering collections with ES6",
      description: "[LEARNING GOAL: Eliminate outdated items in arrays.]\n\nExtract only scores greater than 70 from list `allScores = [50, 85, 90, 65]` using modern array `.filter()` loops.",
      context: "// JS Level 3\nconst allScores = [50, 85, 90, 65];",
      keywords: ["filter", "allScores", "=>", "70"]
    }
  ],
  4: [
    {
      title: "JavaScript Promise Resolution",
      description: "[LEARNING GOAL: Process asynchronous promise timers using modern resolve callbacks.]\n\nComplete the following asynchronous function `fetchState` to resolve/return the string value 'Success' after a 50ms delay, using a Promise constructor:\n\n`function fetchState() {\n  return new Promise((resolve) => {\n    // Resolve with 'Success' after 50ms\n  });\n}`",
      context: "// JS Level 4\nfunction fetchState() {\n  return new Promise((resolve) => {\n    // Add timeout/resolve logic\n  });\n}",
      keywords: ["promise", "resolve", "setTimeout", "success"]
    },
    {
      title: "JS async await wrappers syntax",
      description: "[LEARNING GOAL: Adapt promise flows into clean linear async procedures.]\n\nWrite an async function `display()` that awaits the unresolved promise `fetchRemoteData()` and returns its resolved result.",
      context: "// JS Level 4\nfunction fetchRemoteData() { return Promise.resolve('Success'); }\n// Complete display function:",
      keywords: ["async function display", "await fetchRemoteData"]
    },
    {
      title: "Array aggregates with reduce",
      description: "[LEARNING GOAL: Sum and combine values of arrays.]\n\nUse the array `.reduce()` function to sum all number elements inside the array `weights = [10, 20, 30]`.",
      context: "// JS Level 4\nconst weights = [10, 20, 30];",
      keywords: ["reduce", "weights", "prev", "curr", "0"]
    },
    {
      title: "JS Set elements for uniqueness",
      description: "[LEARNING GOAL: Eliminate repetitive records.]\n\nCreate a new unique ES6 standard `Set` object named `uniqueScores` from the array `scores = [1, 1, 2, 3, 3]`.",
      context: "// JS Level 4\nconst scores = [1, 1, 2, 3, 3];",
      keywords: ["new Set", "scores"]
    },
    {
      title: "DOM Query Listener bindings",
      description: "[LEARNING GOAL: Bind interactivity to client displays.]\n\nWrite down the JS query selector statement to add a 'click' event listener onto the button element with id `submit-btn`.",
      context: "// JS Level 4\n// Select submit-btn element and attach click listener below:",
      keywords: ["addEventListener", "click", "submit-btn"]
    }
  ],
  5: [
    {
      title: "JavaScript High-Performance Async Rate Limiting executor",
      description: "[GURU OUTCOME: Write concurrent rate limited workers with Promise collections.]\n\nWrite a custom async function `executeWithLimit(promiseFactories, limit)` that executes a collection of zero-argument async functions (promise factories) but limits current active concurrent resolved promises to `limit` at any given time.",
      context: "// JS Master Challenge - Level 5\nasync function executeWithLimiter(factories, limit) {\n  // Implement batch worker rates:\n  return Promise.all( /* code */ );\n}",
      keywords: ["promise", "limit", "execute", "concurrent"]
    },
    {
      title: "Secure Object Isolation against Prototype Pollution",
      description: "[GURU OUTCOME: Freeze deep object schemas against security injection hacks.]\n\nImplement a robust recursive deep freeze algorithm named `secureDeepFreeze(obj)` that completely isolates, freezes, and protects nested objects from prototype pollution vulnerabilities.",
      context: "// JS Master Challenge - Level 5\nfunction secureDeepFreeze(obj) {\n  // Recursively freeze object trees\n  return obj;\n}",
      keywords: ["Object.freeze", "isFrozen", "recursive", "prototype"]
    },
    {
      title: "Proxy Based Reactive State Observers",
      description: "[GURU OUTCOME: Program dynamic reactive binding proxies.]\n\nBuild a lightweight reactive state tracker function `createReactive(initialState, effect)` that uses ES6 `Proxy` to automatically run `effect(property, newValue)` whenever state variables are written or changed.",
      context: "// JS Master Challenge - Level 5\nfunction createReactive(initialState, effect) {\n  // Use new Proxy handler traps:\n  return new Proxy(initialState, {});\n}",
      keywords: ["Proxy", "set", "Reflect.set", "effect", "target"]
    },
    {
      title: "Cross-Origin Thread Communication Shared Array Atomics",
      description: "[GURU OUTCOME: Orchestrate parallel processes using thread arrays.]\n\nWrite an atomic synchronization block used in JavaScript Web Workers to synchronize shared memory buffers utilizing `Atomics.wait` and `Atomics.notify` in `Int32Array` objects.",
      context: "// JS Master Challenge - Level 5\n// Write SharedArrayBuffer atomics synchronization commands:\n",
      keywords: ["SharedArrayBuffer", "Atomics.wait", "Atomics.notify", "Int32Array"]
    },
    {
      title: "Closure leakage mitigation garbage sweeps",
      description: "[GURU OUTCOME: Safely dispose references inside closure callback structures.]\n\nDemonstrate how a retaining reference trap in a closure structure triggers memory leakages. Write down the clean memory release commands to free referenced variable instances after execution.",
      context: "// JS Master Challenge - Level 5\n// Explain and isolate retaining state leaks below:\n",
      keywords: ["null", "nullify", "retention", "garbage collection"]
    }
  ]
};

const JAVA_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "Java Main Print Statement Syntax",
      description: "[LEARNING GOAL: Identify and write main console printing methods.]\n\nComplete the Java print statement to output the text \"Learn Java\":\n\n`System.out.____(\"Learn Java\");`\n\nWrite the correct method code wrapper and briefly explain why it is used.",
      context: "// Java Level 1\nSystem.out.____(\"Learn Java\");",
      keywords: ["println"]
    },
    {
      title: "Java Variable Declaration syntax",
      description: "[LEARNING GOAL: Declare variables with correct static type assignments.]\n\nFill in the blank to declare an integer variable named `score` storing 99, and a double variable named `average` storing 8.5.",
      context: "// Java Level 1\n____ score = 99;\n____ average = 8.5;",
      keywords: ["int score", "double average"]
    },
    {
      title: "Java String value Comparison check",
      description: "[LEARNING GOAL: Compare String contents correctly on JVM.]\n\nGiven two String variables `str1` and `str2`, write down why using `==` is an anti-pattern, and show the correct Java API method to assess value equality.",
      context: "// Java Level 1\nString str1 = new String(\"hello\");\nString str2 = new String(\"hello\");",
      keywords: ["equals", "str1", "str2"]
    },
    {
      title: "Java Array index value reading",
      description: "[LEARNING GOAL: Read individual array elements.]\n\nWrite Java code to read and assign the negative value located at index 2 of the integer array `int[] numbers = {10, -5, -15, 20}`.",
      context: "// Java Level 1\nint[] numbers = {10, -5, -15, 20};\n// Read the negative value below:",
      keywords: ["numbers[2]"]
    },
    {
      title: "Java standard main signature blank",
      description: "[LEARNING GOAL: Write main execution entry points.]\n\nComplete the missing return type block inside standard Java application entries: `public static ____ main(String[] args)`",
      context: "// Java Level 1\npublic static ____ main(String[] args)",
      keywords: ["void"]
    }
  ],
  2: [
    {
      title: "Java Variables: Primitive Type Selection",
      description: "[LEARNING GOAL: Choose double vs int storage representations for decimal/integer digits.]\n\nFill in the blank with the appropriate Java primitive data type keywords (e.g. int, double, etc) to compile successfully without precision loss:\n\n`____ gradeAverage = 88.5;\n____ studentCount = 30;`",
      context: "// Java Level 2\n____ gradeAverage = 88.5;\n____ studentCount = 30;",
      keywords: ["double", "int"]
    },
    {
      title: "Java Switch Cases control routes",
      description: "[LEARNING GOAL: Match selection keys using switch options.]\n\nComplete the Java switch statement evaluating integer variable `categoryCode` and outputting text for case 3: `case 3: System.out.println(\"Category 3\"); ____;`",
      context: "// Java Level 2\nint categoryCode = 3;\nswitch (categoryCode) {\n    case 3: System.out.println(\"Category 3\"); ____;\n}",
      keywords: ["break"]
    },
    {
      title: "Java Loops while execution boundaries",
      description: "[LEARNING GOAL: Run iteration blocks up to numeric targets.]\n\nComplete loop condition statements to print integers up to 5: `int counter = 1; while (counter ____ 5)`",
      context: "// Java Level 2\nint counter = 1;\nwhile(counter ____ 5) {\n    System.out.println(counter);\n    counter++;\n}",
      keywords: ["<=", "< 6"]
    },
    {
      title: "Java Constructor assignments",
      description: "[LEARNING GOAL: Bind parameters during object initializations.]\n\nDeclare a simple constructor for a simple Java class `User` that takes a String parameter called `username` and binds it to instance variable `this.username`.",
      context: "// Java Level 2\npublic class User {\n    private String username;\n    // Define constructor here:\n}",
      keywords: ["public User", "username", "this.username"]
    },
    {
      title: "Java Methods parameter signatures",
      description: "[LEARNING GOAL: Build custom calculations returning integers.]\n\nComplete method declaration headers for a helper `calculate` receiving double inputs returning an integer value.",
      context: "// Java Level 2\n// Complete method signature below:\n____ calculate(double value) {\n    return (int) value;\n}",
      keywords: ["int calculate"]
    }
  ],
  3: [
    {
      title: "Java Arrays & Length Queries",
      description: "[LEARNING GOAL: Extract array boundaries with index length variables.]\n\nWrite a short Java statement or code snippet that prints the number of elements in an array of integers named `scores`. What property or method on arrays do we use?",
      context: "// Java Level 3\nint[] scores = {90, 85, 95};\n// How to query scores length?",
      keywords: ["scores.length"]
    },
    {
      title: "Java Dynamic collections ArrayList inserters",
      description: "[LEARNING GOAL: Add data entries onto dynamic JVM lists.]\n\nComplete the Java import and line of code to insert strings onto list `namesList` dynamically utilizing Java `.add()`.",
      context: "// Java Level 3\nimport java.util.ArrayList;\nArrayList<String> namesList = new ArrayList<>();\n// Insert 'Ava' onto arraylist:",
      keywords: ["namesList.add", "ava"]
    },
    {
      title: "Java OOP Methods Overloading",
      description: "[LEARNING GOAL: Craft overloaded methods matching varied arguments.]\n\nDeclare two overloaded method signatures named `render` - one taking a String, another taking an integer.",
      context: "// Java Level 3\npublic class Display {\n    // Overload render parameter inputs:\n}",
      keywords: ["void render", "String", "int"]
    },
    {
      title: "Java final modifier rules",
      description: "[LEARNING GOAL: Constrain assignments using final controls.]\n\nDescribe what compiler error happens when a programmer attempts to assign a new value to a `final` class variable in Java.",
      context: "// Java Level 3\nfinal int APP_LIMIT = 500;",
      keywords: ["cannot be reassigned", "compile", "final"]
    },
    {
      title: "HashMap collections map key queries",
      description: "[LEARNING GOAL: Map key and values using Map classes.]\n\nWrite down the JVM import and standard declaration string to instantiate a String-to-Integer map using `HashMap`.",
      context: "// Java Level 3\n// Write Map HashMap instantiation below:",
      keywords: ["HashMap", "Map", "import java.util.HashMap"]
    }
  ],
  4: [
    {
      title: "Java Object Inheritance",
      description: "[LEARNING GOAL: Design subclasses extending parental base blueprints.]\n\nYou have a base class `Vehicle`. You want to declare a subclass `Car` that inherits from `Vehicle`. Write down the missing Java inheritance keyword in the declaration:\n\n`public class Car ____ Vehicle {}`",
      context: "// Java Level 4\npublic class Car ____ Vehicle {}",
      keywords: ["extends"]
    },
    {
      title: "Java Custom Interface structures",
      description: "[LEARNING GOAL: Declare static blueprint standards with interfaces.]\n\nCreate a simple Java interface named `Playable` outlining single contract method `void play();` without bodies.",
      context: "// Java Level 4\ninterface Playable {\n    // Outline play contract below:\n}",
      keywords: ["void play()"]
    },
    {
      title: "HashMap entry lookups",
      description: "[LEARNING GOAL: Extract values mapped to keys on Map objects.]\n\nQuery and extract the integer value mapped to key \"coder\" from HashMap `scores` using standard Hash keys methods.",
      context: "// Java Level 4\nimport java.util.HashMap;\nHashMap<String, Integer> scores = new HashMap<>();",
      keywords: ["scores.get", "coder"]
    },
    {
      title: "Java static methods constraints",
      description: "[LEARNING GOAL: Evaluate access boundaries of class levels.]\n\nExplain why static method expressions in Java cannot access class-level instance variables directly without instantiating an instance object.",
      context: "// Java Level 4\npublic class Checker {\n    private int id = 55;\n    public static void run() {\n        // Explain access constraints\n    }\n}",
      keywords: ["instance", "static context"]
    },
    {
      title: "Java Abstract classes implementations",
      description: "[LEARNING GOAL: Inherit abstract patterns.]\n\nExtend abstract Parent class `Animal` declaring abstract double method `getAge()` inside child `Cat`.",
      context: "// Java Level 4\nabstract class Animal {\n    abstract double getAge();\n}\nclass Cat extends Animal {\n    // Implement contract:\n}",
      keywords: ["double getAge", "extends Animal"]
    }
  ],
  5: [
    {
      title: "Lock-Free Highly Concurrent Stack",
      description: "[GURU OUTCOME: Safe comparisons and loop modifications.]\n\nImplement a thread-safe, lock-free stack using `AtomicReference` and compare-and-swap (CAS) loops inside class `ConcurrentStack`.",
      context: "// Java Master Challenge - Level 5\nimport java.util.concurrent.atomic.AtomicReference;\npublic class ConcurrentStack<T> {\n    private AtomicReference<Node<T>> head = new AtomicReference<>();\n    // Implement safe pushing using compareAndSet CAS loop below:\n}",
      keywords: ["compareAndSet", "atomicreference", "while", "head"]
    },
    {
      title: "JVM Garbage Collector Optimization & STW mitigation",
      description: "[GURU OUTCOME: Identify G1GC parameters to avoid Garbage latency split seconds.]\n\nAnalyze Stop-The-World (STW) heap pauses in JVM. Name two G1 GC JVM runtime flags or GC algorithms used to minimize pauses under intense heap cycles.",
      context: "// Java Master Challenge - Level 5\n// List optimization flags or GC algorithms:",
      keywords: ["-XX:+UseG1GC", "ZGC", "Shenandoah", "STW", "PauseTime"]
    },
    {
      title: "Custom JVM Bytecode ClassLoader injector",
      description: "[GURU OUTCOME: Load bytecode arrays bypassing file paths.]\n\nWrite the skeleton for a custom Java `ClassLoader` named `CustomWebLoader` that overrides the `findClass(String name)` method to load dynamically streamed bytecode arrays into Class objects using `defineClass`.",
      context: "// Java Master Challenge - Level 5\npublic class CustomWebLoader extends ClassLoader {\n    @Override\n    protected Class<?> findClass(String name) throws ClassNotFoundException {\n        // Define class from bytecode byte array below:\n        byte[] data = null; // load data\n        return defineClass(name, data, 0, data.length);\n    }\n}",
      keywords: ["defineClass", "findClass", "ClassLoader", "Override"]
    },
    {
      title: "Memory Leak mitigation with Identity dictionaries",
      description: "[GURU OUTCOME: Eliminate GC memory leakages with Weak collections.]\n\nDescribe how memory reference accumulation triggers GC retention memory leakages inside high-cycle cache maps. Implement an optimized, safe cache map using `WeakHashMap` reference rules.",
      context: "// Java Master Challenge - Level 5\nimport java.util.WeakHashMap;\n// Use WeakHashMap cache collections below:\n",
      keywords: ["WeakHashMap", "weak", "garbage collect", "retention"]
    },
    {
      title: "High Performance Phased Synchronizer Loops",
      description: "[GURU OUTCOME: Implement parallel coordinates of dynamic concurrent phases.]\n\nWrite a Java concurrency execution script that synchronizes dynamic multi-phased parallel worker tasks utilizing Java's `Phaser` instead of standard rigid CountDownLatch elements.",
      context: "// Java Master Challenge - Level 5\nimport java.util.concurrent.Phaser;\n// Define Phase boundaries coordinates below:\n",
      keywords: ["Phaser", "arriveAndAwaitAdvance", "register", "dynamic"]
    }
  ]
};

const ML_CHALLENGES: Record<number, ProgrammedChallenge[]> = {
  1: [
    {
      title: "ML Definitions: Model Concept",
      description: "[LEARNING GOAL: Distinguish static logical flows from trained mathematical patterns.]\n\nChoose the correct letter for this multiple choice question:\n\nWhat is a 'Model' in Machine Learning?\n\nA) A mockup presenting fashion garments\nB) A mathematical function that has been trained to recognize patterns using data\nC) A spreadsheet showing financial balances\nD) A type of code compression module\n\nType the correct letter (A, B, C, or D) with your explanation.",
      context: "# ML Level 1\n# Choice A, B, C, or D:",
      keywords: ["b", "matrix", "function", "pattern"]
    },
    {
      title: "Isolating columns: Features vs Targets",
      description: "[LEARNING GOAL: Differentiate input parameters from prediction targets.]\n\nIn predicting a vehicle's fuel efficiency given engine cylinder volume, weight, and speed: are engine cylinder volume and weight the Features or the Target?",
      context: "# ML Level 1\n# Features or Target?",
      keywords: ["features"]
    },
    {
      title: "Pre-calculating error: Absolute Diff",
      description: "[LEARNING GOAL: Understand simple math error absolute rates.]\n\nIf the actual price of a stock is 100, and our system predicted 92, calculate the Absolute Error metric and write the calculation.",
      context: "# ML Level 1\n# Calculate Absolute Error:",
      keywords: ["8"]
    },
    {
      title: "Dataset Definitions: Training Dataset",
      description: "[LEARNING GOAL: Map functions of dataset records.]\n\nIn machine learning, what is the exact term for the dataset used to fit the model's coefficients or weights?",
      context: "# ML Level 1\n# Name the dataset category:",
      keywords: ["training", "train"]
    },
    {
      title: "Prediction Categorization: Classification vs Regression",
      description: "[LEARNING GOAL: Distinguish discrete classes from continuous predictions.]\n\nIf we predict whether a trade is 'Fraud' or 'Authorized', is this task a Regression or a Classification task?",
      context: "# ML Level 1\n# Regression or Classification?",
      keywords: ["classification"]
    }
  ],
  2: [
    {
      title: "Supervised vs Unsupervised ML",
      description: "[LEARNING GOAL: Differentiate predictive tasks based on presence or absence of labels.]\n\nAn algorithm groups house images according to visual similarities WITHOUT any target house price ratings or categories provided. Is this task an example of Supervised Learning or Unsupervised Learning? Define it in one simple word, and provide a single sentence explaining why.",
      context: "# ML Level 2\n# Supervised or Unsupervised?",
      keywords: ["unsupervised"]
    },
    {
      title: "ML Training Loss values analysis",
      description: "[LEARNING GOAL: Assess optimization loops behavior.]\n\nExplain why a classifier's training loss values (such as Cross-Entropy Loss) should consistently decrease across successive training epochs.",
      context: "# ML Level 2\n# Explain training loss trends:",
      keywords: ["decrease", "optimize", "gradients", "weights"]
    },
    {
      title: "Linear Regression math equations",
      description: "[LEARNING GOAL: Model simplest linear coefficients.]\n\nWrite down the classic mathematical equation for Simple Linear Regression with one input feature `x`, slope weight `w`, and intercept bias `b`.",
      context: "# ML Level 2\n# Equation:",
      keywords: ["y =", "wx", "b", "mx"]
    },
    {
      title: "Confusion Matrix: False Positives rules",
      description: "[LEARNING GOAL: Assess Type I error outputs of binary models.]\n\nIn model outcome reviews, state in one simple sentence what a 'False Positive' value represents.",
      context: "# ML Level 2\n# Define False Positive concept:",
      keywords: ["predicted positive", "actually negative", "type i"]
    },
    {
      title: "Continuous estimations algorithms",
      description: "[LEARNING GOAL: Map algorithms matching numeric outputs.]\n\nName the baseline, simplest parametric algorithm used to estimate a continuous numeric variable.",
      context: "# ML Level 2\n# Identify algorithm name below:",
      keywords: ["linear regression"]
    }
  ],
  3: [
    {
      title: "Model Performance: Train-Test Splits",
      description: "[LEARNING GOAL: Implement data splitting principles to prevent predictive memorization/overfitting.]\n\nWhy is it absolutely critical to evaluate a Machine Learning model's performance on a separate 'Test Set' that was never seen during the model's training phase? Reply in 2 simple sentences explaining the concept of overfitting.",
      context: "# ML Level 3\n# Explanation of Test Sets:",
      keywords: ["overfit", "memoriz", "generaliz", "unseen", "test"]
    },
    {
      title: "ML Normalization Scaling functions",
      description: "[LEARNING GOAL: Normalise parameters bounds securely.]\n\nWrite down the mathematical formula or expression used to normalize an input feature variable x using Min-Max Scaling (to map results to the interval [0,1]).",
      context: "# ML Level 3\n# Write MinMax normalise math equation below:",
      keywords: ["min", "max", "x -", "x_min"]
    },
    {
      title: "Underfitting diagnostics indicators",
      description: "[LEARNING GOAL: Diagnose low complexity structural constraints.]\n\nIf a model exhibits extremely low accuracy on both training datasets AND testing datasets, does this signify underfitting or overfitting? Explain in one sentence.",
      context: "# ML Level 3\n# Underfit or Overfit below:",
      keywords: ["underfit", "complexity", "capacity"]
    },
    {
      title: "Trees splits metrics: Gini Impurity",
      description: "[LEARNING GOAL: Select indicators partitioning decision branches.]\n\nWhich quantitative impurity metric is commonly calculated on Decision Tree classifiers to select optimal splits for node categorization?",
      context: "# ML Level 3\n# Name the purity metric:",
      keywords: ["gini", "entropy", "impurity"]
    },
    {
      title: "Validation splits: K-Fold cross validation",
      description: "[LEARNING GOAL: Verify split validity loops.]\n\nWhy is performing k-fold cross-validation superior to performing a single, manual train-test split on standard tables?",
      context: "# ML Level 3\n# Explain K-Fold benefits:",
      keywords: ["variance", "bias", "splits", "folds", "folds validation"]
    }
  ],
  4: [
    {
      title: "ML Regression Metrics: Mean Squared Error",
      description: "[LEARNING GOAL: Calculate simple error metrics for numeric estimations.]\n\nIf a model predicts housing pricing values of `[150, 300]` (in thousands), but the actual target prices are `[140, 320]`, write down the calculation steps and compute the final Mean Squared Error (MSE) of these predictions.",
      context: "# ML Level 4\n# Calculate MSE for Predictions: [150, 300] and Actuals: [140, 320]",
      keywords: ["250", "mean squared", "predicted", "actual", "square"]
    },
    {
      title: "Learning Rates Gradient Descent impact",
      description: "[LEARNING GOAL: Adjust step sizes inside training variables.]\n\nExplain what mathematical error, convergence failure, or gradient symptom happens when an training learning rate optimizer is configured too high.",
      context: "# ML Level 4\n# Identify learning rate consequences:",
      keywords: ["diverge", "oscillate", "overshoot", "too large"]
    },
    {
      title: "Precision vs Recall metrics trade-off",
      description: "[LEARNING GOAL: Evaluate binary scoring compromises.]\n\nExplain why moving a decision threshold representing Spam classifiers higher to maximize Precision typically reduces the Recall rate.",
      context: "# ML Level 4\n# Explain precision recall relationships:",
      keywords: ["threshold", "false negative", "precision", "recall", "trade"]
    },
    {
      title: "L1 vs L2 regularization shrinkage checks",
      description: "[LEARNING GOAL: Identify structural weight shrinkage traits.]\n\nWhich regularization norm penalty (L1 Lasso or L2 Ridge) results in feature selection by driving non-critical weights exactly to zero?",
      context: "# ML Level 4\n# Identify L1 or L2 below:",
      keywords: ["l1", "lasso"]
    },
    {
      title: "K-Means cluster update conditions",
      description: "[LEARNING GOAL: Reposition clusters centroids based on updates.]\n\nBriefly explain what mathematical update step is performed iteratively during K-Means clustering after calculating assignments of data points to the nearest centroids.",
      context: "# ML Level 4\n# Calculate centroid coordinates below:",
      keywords: ["mean", "centroid", "average", "recompute", "coordinates"]
    }
  ],
  5: [
    {
      title: "Transformer Attention Weights Calculus",
      description: "[GURU OUTCOME: Write down mathematical Dot-Product scaling formulations.]\n\nState the exact, non-simplified mathematical equation of Scaled Dot-Product Attention as configured in modern Multi-Head Transformer attention modules (incorporating queries Q, keys K, values V, and dimension scaling dk).",
      context: "# ML Master Challenge - Level 5\n# Write the Scale Dot Product Attention equation below:\n",
      keywords: ["softmax", "q", "k^t", "sqrt", "d_k", "v"]
    },
    {
      title: "Gradients Backpropagation math calculations",
      description: "[GURU OUTCOME: Write nested weight update product derivatives.]\n\nWrite down the chain rule derivative formulation used during Backpropagation to compute the gradient of weight parameters `w` supporting nested activation function nodes `a = g(z)` and `z = wx`.",
      context: "# ML Master Challenge - Level 5\n# Write nested backpropagation derivatives details below:",
      keywords: ["partial", "derivative", "chain rule", "g'", "z"]
    },
    {
      title: "Markov Operations Bellman Equation mappings",
      description: "[GURU OUTCOME: Formulate reinforcement value optimization limits.]\n\nWrite down the complete recursive Bellman Optimality Equation for state-value function `V*(s)` under policy optimization loops.",
      context: "# ML Master Challenge - Level 5\n# Write recursive Bellman state value equation below:\n",
      keywords: ["bellman", "max_a", "gamma", "transition", "reward"]
    },
    {
      title: "Adam Optimizer Bias Correction mechanics",
      description: "[GURU OUTCOME: Derive bias corrected momentum coordinates.]\n\nState the mathematical formulas for bias-corrected moving averages of the first and second moments (`m_hat` and `v_hat`) during Adam optimizer parameter updates.",
      context: "# ML Master Challenge - Level 5\n# Formulate bias corrections moving averages below:\n",
      keywords: ["beta_1", "beta_2", "1 -", "moment", "bias"]
    },
    {
      title: "Gradient Penalty Lipschitz constraints in WGAN-GP",
      description: "[GURU OUTCOME: Formulate Wasserstein regularizations bounds.]\n\nDerive the mathematical loss addition of the 1-Lipschitz Gradient Penalty term configured during Wasserstein GAN discriminator training.",
      context: "# ML Master Challenge - Level 5\n# Formulate WGAN-GP gradient constraint parameters below:\n",
      keywords: ["gradient penalty", "lipschitz", "l2 norm", "norm - 1", "lambda"]
    }
  ]
};

function getSimulatedChallenge(session: Session): Challenge {
  const params = determineAdaptiveChallengeParameters(session);
  const currentDiff = params.difficulty;
  const topic = session.topic;
  const topicLower = topic.toLowerCase();

  // Find previously answered challenge titles to prevent repetitions
  const answeredTitles = new Set(session.interactions.map(x => x.challenge.title));

  let library: ProgrammedChallenge[] = [];

  if (topicLower.includes("python")) {
    library = PY_CHALLENGES[currentDiff] || PY_CHALLENGES[1];
  } else if (topicLower.includes("javascript") || topicLower.includes("js")) {
    library = JS_CHALLENGES[currentDiff] || JS_CHALLENGES[1];
  } else if (topicLower.includes("java")) {
    library = JAVA_CHALLENGES[currentDiff] || JAVA_CHALLENGES[1];
  } else if (topicLower.includes("machine learning") || topicLower.includes("ai") || topicLower.includes("intelligence")) {
    library = ML_CHALLENGES[currentDiff] || ML_CHALLENGES[1];
  }

  // If we have a library list, pick a variation that doesn't repeat!
  let selected: ProgrammedChallenge;
  if (library.length > 0) {
    let chosenIdx = session.interactions.length % library.length;
    let found = false;
    for (let offset = 0; offset < library.length; offset++) {
      const idx = (chosenIdx + offset) % library.length;
      if (!answeredTitles.has(library[idx].title)) {
        chosenIdx = idx;
        found = true;
        break;
      }
    }
    selected = library[chosenIdx];
  } else {
    // General subject dynamic fallback using programmatic variations based on steps counter
    const varIdx = session.interactions.length % 5;
    const variations: Record<number, ProgrammedChallenge[]> = {
      1: [
        {
          title: `Baseline Concepts: ${topic}`,
          description: `[LEARNING GOAL: Build essential terminology and definitions for ${topic}.]\n\nWhat is the primary purpose of '${topic}'? Please describe it in 1 or 2 extremely simple sentences as if explaining to a complete newcomer. Keep language simple and encouraging.`,
          context: `/* ${topic} - Level 1 definition */`,
          keywords: [topic, topic.toLowerCase()]
        },
        {
          title: `Basic Variable Structuring in ${topic}`,
          description: `[LEARNING GOAL: Learn how data values are held inside ${topic}.]\n\nExplain how you configure or assign basic configuration parameters inside '${topic}'. Provide a single-sentence explanation.`,
          context: `/* ${topic} - Level 1 variables */`,
          keywords: [topic.toLowerCase()]
        },
        {
          title: `Elementary Tools of ${topic}`,
          description: `[LEARNING GOAL: Review primary execution files under ${topic}.]\n\nWhat are the most universal command lines, files, or utilities designed to check setup for '${topic}'? Describe them simply.`,
          context: `/* ${topic} - Level 1 utilities */`,
          keywords: ["setup", "install"]
        },
        {
          title: `${topic} Syntactic checks`,
          description: `[LEARNING GOAL: Avoid common notation errors.]\n\nIdentify a basic notation, syntax rules, or spelling guideline that beginners need to trace inside '${topic}' to prevent code parsing exceptions.`,
          context: `/* ${topic} - Level 1 notations */`,
          keywords: ["read", "error"]
        },
        {
          title: `Primary outputs in ${topic}`,
          description: `[LEARNING GOAL: Verify script outputs.]\n\nHow do we log, trace, or print execution outcomes inside the runtime variables of '${topic}'? Detail in 1 sentence.`,
          context: `/* ${topic} - Level 1 prints */`,
          keywords: ["print", "log", "verify"]
        }
      ],
      2: [
        {
          title: `Basic Applications: ${topic}`,
          description: `[LEARNING GOAL: Recognize simple executable setups and direct user actions in ${topic}.]\n\nIdentify a basic setup step, environment rule, or command line instruction normally used to initialize or verify '${topic}' in a project. Explain it in 2 simple sentences.`,
          context: `/* ${topic} - Level 2 command setup */`,
          keywords: ["init", "setup"]
        },
        {
          title: `Block structures and indentation: ${topic}`,
          description: `[LEARNING GOAL: Learn the scope constraints of ${topic}.]\n\nDescribe how separate blocks of code scopes are organized (using indentation, brackets, or files) inside '${topic}'.`,
          context: `/* ${topic} - Level 2 scoping */`,
          keywords: [topic.toLowerCase()]
        },
        {
          title: `Iterative looping in ${topic}`,
          description: `[LEARNING GOAL: Execute recurring command stacks.]\n\nState what standard loop keywords or array iteration features are used inside '${topic}' to execute tasks repeatedly.`,
          context: `/* ${topic} - Level 2 loops */`,
          keywords: ["loop", "for", "while"]
        },
        {
          title: `Function declarations: ${topic}`,
          description: `[LEARNING GOAL: Build modular functions in ${topic}.]\n\nWrite a short function header or command configuration declaring an action or endpoint inside '${topic}'.`,
          context: `/* ${topic} - Level 2 actions */`,
          keywords: ["method", "function", "declaration"]
        },
        {
          title: `Parameter formatting: ${topic}`,
          description: `[LEARNING GOAL: Form inputs parameters safely.]\n\nHow are properties or variables formatted when passing parameters into execution functions of '${topic}'?`,
          context: `/* ${topic} - Level 2 parameters */`,
          keywords: ["input", "parameter"]
        }
      ],
      3: [
        {
          title: `Modular Best-Practices in ${topic}`,
          description: `[LEARNING GOAL: Integrate components and structures safely in ${topic} to support scaling.]\n\nDescribe how to organize structural elements or files inside '${topic}' to ensure modular scalability and avoid messy files. Give 2 guidelines.`,
          context: `/* ${topic} - Level 3 modular layout */`,
          keywords: ["module", "structure"]
        },
        {
          title: `Memory allocations under ${topic}`,
          description: `[LEARNING GOAL: Manage memory weights.]\n\nHow does '${topic}' handle garbage collection, allocations, or property disposal? Present a brief summary.`,
          context: `/* ${topic} - Level 3 allocation rules */`,
          keywords: ["memory", "allocate"]
        },
        {
          title: `Object definitions in ${topic}`,
          description: `[LEARNING GOAL: Model business properties.]\n\nSpecify how custom attributes, schemas, or class models are defined to hold customer configurations inside '${topic}'.`,
          context: `/* ${topic} - Level 3 schemas */`,
          keywords: ["model", "class", "attribute"]
        },
        {
          title: `Iterating over maps: ${topic}`,
          description: `[LEARNING GOAL: Stream and update active maps.]\n\nWrite down guidelines to loop over paired keys and values in '${topic}' assemblies representation maps.`,
          context: `/* ${topic} - Level 3 mappings */`,
          keywords: ["map", "loop", "key"]
        },
        {
          title: `Error handling structures in ${topic}`,
          description: `[LEARNING GOAL: Handle runtime issues elegantly.]\n\nWrite standard try-catch or conditional structures configured to catch unexpected failures in '${topic}' blocks.`,
          context: `/* ${topic} - Level 3 error blocks */`,
          keywords: ["error", "catch", "try"]
        }
      ],
      4: [
        {
          title: `Troubleshooting Pipeline: ${topic}`,
          description: `[LEARNING GOAL: Determine operational failures and trace logs for ${topic}.]\n\nAnalyze a common runtime exception, configuration mismatch, or layout failure that beginners face in '${topic}' and describe the first three debugging steps.`,
          context: `/* ${topic} - Level 4 troubleshooting blueprint */`,
          keywords: ["debug", "error", "trace"]
        },
        {
          title: `Distributed concurrency in ${topic}`,
          description: `[LEARNING GOAL: Identify parallel process collisions.]\n\nHow are race conditions or parallel actions prevented when multi-user scripts access '${topic}' concurrently?`,
          context: `/* ${topic} - Level 4 concurrency rules */`,
          keywords: ["lock", "race condition", "threads"]
        },
        {
          title: `API parameters routing: ${topic}`,
          description: `[LEARNING GOAL: Coordinate rest payloads with servers.]\n\nDetail what protocols, endpoints, or serialization packages organize network communications inside '${topic}'.`,
          context: `/* ${topic} - Level 4 serialization */`,
          keywords: ["api", "json", "request"]
        },
        {
          title: `Unit Testing configurations in ${topic}`,
          description: `[LEARNING GOAL: Verify script validity utilizing tests.]\n\nDefine how unit testing files (mock assertions, testing runners) are configured to validate actions built inside '${topic}'.`,
          context: `/* ${topic} - Level 4 unit testing */`,
          keywords: ["assert", "test", "mock", "unit"]
        },
        {
          title: `Optimizing query lookups in ${topic}`,
          description: `[LEARNING GOAL: Accelerate searches of models datasets.]\n\nExplain how indexes, cache layers, or binary trees accelerate search queries executed on collections mapped in '${topic}'.`,
          context: `/* ${topic} - Level 4 indexing */`,
          keywords: ["cache", "index", "search"]
        }
      ],
      5: [
        {
          title: `Scalability Constraints: ${topic}`,
          description: `[GURU OUTCOME: Optimize transaction layers and safety guarantees in ${topic}.]\n\nIdentify high-load network, concurrency, or CPU bottleneck limits in '${topic}'. Suggest an advanced configuration, framework parameter, or architectural pattern used to resolve these limits.`,
          context: `/* ${topic} - Level 5 high-scale auditing */`,
          keywords: ["bottleneck", "concurrency", "optimize", "architecture"]
        },
        {
          title: `Distributed Consensus splits under ${topic}`,
          description: `[GURU OUTCOME: Mitigate network partition failures.]\n\nDetail the partition failure, split-brain, or transaction consistency tradeoffs that emerge when scaling distributed replicates of '${topic}' under intense volume, citing the CAP theorem.`,
          context: `/* ${topic} - Level 5 partition checks */`,
          keywords: ["consistency", "partition", "cap theorem", "split-brain"]
        },
        {
          title: `Audit log verification patterns: ${topic}`,
          description: `[GURU OUTCOME: Verify security signatures of runtime transactions.]\n\nFormulate a strict, zero-trust audit schema verifying digital sign hashes of individual transactions processed by '${topic}', protecting against man-in-the-middle manipulation.`,
          context: `/* ${topic} - Level 5 security locks */`,
          keywords: ["security", "zero-trust", "hash", "man-in-the-middle"]
        },
        {
          title: `Zero-copy high throughput I/O inside ${topic}`,
          description: `[GURU OUTCOME: Restrict memory duplication routines.]\n\nDescribe how standard memory page allocations contentions can be bypassed inside '${topic}' utilizing zero-copy page alignments or virtual memory mapped files.`,
          context: `/* ${topic} - Level 5 zero-copy optimization */`,
          keywords: ["zero-copy", "buffer", "memory map", "i/o"]
        },
        {
          title: `State saturation locks under intense workloads: ${topic}`,
          description: `[GURU OUTCOME: Manage concurrent state deadlocks.]\n\nDesign a non-blocking deadlock recovery synchronizer schema managing conflicting resource acquisitions inside concurrent operations of '${topic}'.`,
          context: `/* ${topic} - Level 5 concurrent deadlocks */`,
          keywords: ["deadlock", "non-blocking", "mutex", "synchronize"]
        }
      ]
    };

    const choices = variations[currentDiff] || variations[1];
    let chosenIdx = varIdx % choices.length;
    for (let offset = 0; offset < choices.length; offset++) {
      const idx = (chosenIdx + offset) % choices.length;
      if (!answeredTitles.has(choices[idx].title)) {
        chosenIdx = idx;
        break;
      }
    }
    selected = choices[chosenIdx];
  }

  function lowercase(str: string): string {
    return str.toLowerCase();
  }

  const rubric = {
    accuracy: "Check if the specified code keyword, correction, or answer matches correctly.",
    clarity: "The explanation or answers are stated clearly and simply.",
    reasoning: "Has a logical rationale for selecting the keyword or option.",
    approach: "Used direct and straightforward steps to solve the simple problem."
  };

  return {
    id: `chal_${Math.random().toString(36).substring(2, 8)}`,
    type: currentDiff <= 2 ? 'conceptual' : (currentDiff === 3 ? 'coding_debugging' : (currentDiff === 4 ? 'critical_thinking' : 'architecture_design')),
    title: selected.title,
    description: selected.description,
    context: selected.context,
    difficulty: currentDiff,
    rubric,
    estimatedTimeMin: currentDiff * 5
  };
}

function getSimulatedEvaluation(challenge: Challenge, userResponse: string): EvaluationReview {
  const cleanResp = userResponse.trim().toLowerCase();
  const challengeTitle = challenge.title;
  const topic = challenge.title.toLowerCase();

  let isCorrect = false;

  // Track keywords of the programmed challenges to see if there is a match
  let keywordsList: string[] = [];

  // Flatten both programmed lists and falls back keywords
  const allSubpools = [
    ...Object.values(PY_CHALLENGES).flat(),
    ...Object.values(JS_CHALLENGES).flat(),
    ...Object.values(JAVA_CHALLENGES).flat(),
    ...Object.values(ML_CHALLENGES).flat()
  ];

  const matchedSetup = allSubpools.find(p => p.title === challengeTitle);
  if (matchedSetup) {
    keywordsList = matchedSetup.keywords;
  } else {
    // Dynamic generation fallbacks checks
    if (cleanResp.length > 15) {
      isCorrect = true;
    }
  }

  // Assess keyword correctness matching
  if (keywordsList.length > 0) {
    // If ANY of the required key terms are present (lax validation for beginners), count as correct
    const matchCount = keywordsList.filter(k => cleanResp.includes(k.toLowerCase())).length;
    if (matchCount >= Math.ceil(keywordsList.length / 2)) {
      isCorrect = true;
    }
  } else if (cleanResp.length > 12) {
    isCorrect = true;
  }

  // Address scoring: ensure correct answers get awarded with appropriate high scores (5/5)!
  let accuracy = 5;
  let clarity = 5;
  let reasoning = 5;
  let approach = 5;
  let overallSummaryText = "";

  if (isCorrect) {
    accuracy = 5;
    clarity = 5;
    reasoning = 5;
    approach = 5;
    overallSummaryText = `Fantastic work! Your response to "${challengeTitle}" was perfectly correct. It directly addresses the learning goals and satisfies the specifications flawlessly.`;
  } else {
    if (cleanResp.length > 6) {
      accuracy = 3;
      clarity = 3;
      reasoning = 3;
      approach = 3;
      overallSummaryText = `Excellent attempt towards "${challengeTitle}", but there are some missing key concepts, keywords, or syntax structures. Let's practice more to refine!`;
    } else {
      accuracy = 2;
      clarity = 2;
      reasoning = 1;
      approach = 1;
      overallSummaryText = "The response is a bit too brief or missing core components required to satisfy the exercise goals.";
    }
  }

  const average = Number(((accuracy + clarity + reasoning + approach) / 4).toFixed(1));

  const strengthsList = isCorrect
    ? ["Identified correct syntactical constructs successfully.", "Demonstrated sound understanding of the core module learning goals."]
    : ["Attempted custom parameters specified by the exercise.", "Shows active practice intent in the workspace."];

  const improvementsList = isCorrect
    ? ["Excellent! Challenge yourself by entering the next difficulty level.", "Incorporate subtle edge-cases inside your logical structures."]
    : ["Ensure syntax rules match exactly (e.g. check casing, delimiters, or semicolons).", "Read the accompanying learning resources for a complete theory review."];

  return {
    scores: { accuracy, clarity, reasoning, approach, average },
    feedback: {
      overallSummary: overallSummaryText,
      strengths: strengthsList,
      improvements: improvementsList,
      detailedAnalysis: {
        accuracy: `Accuracy is rated ${accuracy}/5: ${isCorrect ? "Perfectly correct!" : "Ensure you double check the keywords or code variables before submitting."}`,
        clarity: `Clarity is rated ${clarity}/5: your formatting helps explain your thoughts clearly.`,
        reasoning: `Reasoning is rated ${reasoning}/5: demonstrates standard procedural logic.`,
        approach: `Approach is rated ${approach}/5: keep up the consistent training loops.`
      }
    }
  };
}

function getSimulatedReflection(
  session: Session, 
  lastChallenge: Challenge, 
  lastResponse: string, 
  evalResult: EvaluationReview
): ReflectionUpdate {
  const avg = evalResult.scores.average;
  const suggestedDiff: 'increase' | 'decrease' | 'maintain' = avg >= 4.0 ? 'increase' : (avg < 2.5 ? 'decrease' : 'maintain');
  
  return {
    agentReflectionLog: `System-simulated Reflection: Learner finished "${lastChallenge.title}" with a rating of ${avg}/5. Moving next parameters to: ${suggestedDiff}.`,
    weaknessesIdentified: avg >= 4.0 ? [] : ["Boundary syntax requirements", `${session.topic} core functions`],
    strengthsConfirmed: avg >= 4.0 ? ["Core syntactical layouts", `${session.topic} structures`] : [],
    suggestedDifficultyAdjustment: suggestedDiff,
    dynamicLearningResources: [
      {
        title: `Official Guides for ${session.topic}`,
        url: `https://www.google.com/search?q=${encodeURIComponent(session.topic + " official documentation developer guide")}`,
        description: `Comprehensive reference materials and developer documentation covering syntax, components, and optimization for ${session.topic}.`,
        type: 'documentation',
        relevance: "Provides the underlying architectural references directly from open-source maintainers."
      },
      {
        title: `Advanced optimization of ${session.topic}`,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(session.topic)}`,
        description: "Educational portal detailing algorithms, historic development, and theoretical bounds.",
        type: 'article',
        relevance: "Fills in technical depth regarding data representation and execution models."
      }
    ],
    nextAgentInstruction: `Focus the next exercise on applying memory constraints under ${session.topic}. Encourage the student to perform calculation-based reasoning. Adjust target difficulty level to ${suggestedDiff === 'increase' ? Math.min(5, session.currentDifficulty + 1) : (suggestedDiff === 'decrease' ? Math.max(1, session.currentDifficulty - 1) : session.currentDifficulty)}.`
  };
}
