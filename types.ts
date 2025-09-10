
export enum GameState {
  START = 'START',
  BRIEFING = 'BRIEFING',
  INVESTIGATING = 'INVESTIGATING',
  ACCUSING = 'ACCUSING',
  RESOLVED = 'RESOLVED',
}

export interface Suspect {
  name: string;
  motive: string;
  description: string;
  statement: string;
}

export interface Case {
  title: string;
  victim: string;
  location: string;
  summary: string;
  suspects: Suspect[];
  culprit: string;
}

export interface Resolution {
  isCorrect: boolean;
  resolutionText: string;
}
