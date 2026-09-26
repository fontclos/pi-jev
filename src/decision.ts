export type DecisionOutcome = "allow" | "block" | "review";

export interface DecisionRequest {
  toolName: string;
  policyReason: string;
  action: string;
}

export interface DecisionResult {
  outcome: DecisionOutcome;
  reason: string;
  probabilities: {
    safeToRun: number;
    policyViolation: number;
  };
}

export interface DecisionAdapter {
  decide(request: DecisionRequest): Promise<DecisionResult>;
}
