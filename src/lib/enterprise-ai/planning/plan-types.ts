import { AIIntent } from "../intents/intent-types";

export interface ExecutionStep {
  id: string;
  description: string;
  toolId?: string;
  input: any;
  dependsOn?: string[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface ExecutionPlan {
  planId: string;
  intent: AIIntent;
  steps: ExecutionStep[];
  requiredTools: string[];
  executionMode: 'sequential' | 'parallel';
  estimatedComplexity: 'low' | 'medium' | 'high';
  warnings: string[];
}
