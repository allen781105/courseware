export type InteractionType = 'single' | 'multi' | 'truefalse' | 'open';

export interface GenerationRequest {
  topic: string;
  audience: string;
  objectives?: string[];
  interactionTypes?: InteractionType[];
  tone?: string;
  imageStyle?: string;
  constraints?: string[];
}

export interface CourseOutline {
  id: string;
  title: string;
  sections: OutlineSection[];
}

export interface OutlineSection {
  id: string;
  title: string;
  summary: string;
  interactionHint?: string;
  assetsHint?: string;
}

export interface Courseware {
  id: string;
  title: string;
  metadata: {
    topic: string;
    audience: string;
    objectives: string[];
    generatedAt: string;
  };
  sections: CoursewareSection[];
}

export interface CoursewareSection {
  id: string;
  title: string;
  body: string;
  image: {
    prompt: string;
    url: string;
    alt: string;
  };
  interaction?: InteractionBlock;
}

export interface InteractionBlock {
  id: string;
  type: Exclude<InteractionType, 'open'>;
  question: string;
  options: InteractionOption[];
  answers: string[];
  explanation: string;
  scoring: {
    points: number;
    analyticsKey: string;
  };
}

export interface InteractionOption {
  id: string;
  label: string;
}

export interface CoursewareBuildRequest {
  outline: CourseOutline;
  request: GenerationRequest;
}

export interface CoursewareArtifact {
  courseware: Courseware;
  html: string;
}

