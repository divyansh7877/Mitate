export interface PaperMetadata {
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  pdf_url: string;
  arxiv_url: string;
}

export interface Summary {
  title: string;
  one_liner: string;
  key_concepts: {
    name: string;
    explanation: string;
    visual_metaphor: string;
  }[];
  key_finding: string;
  real_world_impact: string;
  fibo_prompt?: string;
}

export interface InfographicResult {
  paper_title: string;
  paper_url: string;
  image_url: string;
  summary: Summary;
}

export type RequestStatus =
  | "pending"
  | "finding_paper"
  | "summarizing"
  | "generating_image"
  | "complete"
  | "failed";

export interface GenerationStatus {
  request_id: string;
  status: RequestStatus;
  message?: string;
  result?: InfographicResult;
}

export interface GenerateRequest {
  query: string;
  knowledge_level: "beginner" | "intermediate" | "advanced";
}
