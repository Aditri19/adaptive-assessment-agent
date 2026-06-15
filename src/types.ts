export type ChallengeType = 'scenario' | 'conceptual' | 'coding_debugging' | 'architecture_design' | 'critical_thinking';

export interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;   // The prompt / scenario / problem
  context: string;       // Context, instructions, or starter code
  difficulty: number;    // 1 to 5
  rubric: {
    accuracy: string;    // What the evaluation agent looks for in technical correctness
    clarity: string;     // What the evaluation agent looks for in explanation structure
    reasoning: string;   // What the evaluation agent looks for in depth of arguments
    approach: string;    // What the evaluation agent looks for in problem solving method
  };
  estimatedTimeMin: number;
}

export interface EvaluationReview {
  scores: {
    accuracy: number;     // 1 to 5
    clarity: number;      // 1 to 5
    reasoning: number;    // 1 to 5
    approach: number;     // 1 to 5
    average: number;
  };
  feedback: {
    overallSummary: string;
    strengths: string[];
    improvements: string[];
    detailedAnalysis: {
      accuracy: string;
      clarity: string;
      reasoning: string;
      approach: string;
    };
  };
}

export interface ReflectionUpdate {
  agentReflectionLog: string; // The evaluation agent & reflection agent's internal assessment of what went well or poorly in the response
  weaknessesIdentified: string[];
  strengthsConfirmed: string[];
  suggestedDifficultyAdjustment: 'increase' | 'decrease' | 'maintain';
  dynamicLearningResources: {
    title: string;
    url: string;
    description: string;
    type: 'article' | 'video' | 'documentation' | 'tutorial' | 'interactive_module';
    relevance: string;
  }[];
  nextAgentInstruction: string; // Specialized instruction for the next challenge generation agent based on current performance
}

export interface SessionInteraction {
  id: string;
  challenge: Challenge;
  userResponse: string;
  evaluation: EvaluationReview;
  reflection: ReflectionUpdate;
  timestamp: string;
}

export interface Session {
  sessionId: string;
  userId?: string;
  userName: string;
  topic: string;
  targetGoal: string;
  currentDifficulty: number; // 1 to 5
  overallWeaknesses: string[];
  overallStrengths: string[];
  progressHistory: {
    interactionIndex: number;
    scores: {
      accuracy: number;
      clarity: number;
      reasoning: number;
      approach: number;
      average: number;
    };
    difficulty: number;
  }[];
  interactions: SessionInteraction[];
  activeChallenge?: Challenge | null;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

