export interface ReviewPoint {
  date: string;
  sentiment: number; // -100 to 100
  snippet: string;
}

export interface WordFrequency {
  text: string;
  value: number; // Frequency count
  type: 'complaint' | 'praise';
}

export interface ActionableArea {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface AnalysisResult {
  sentimentTrend: ReviewPoint[];
  wordCloud: WordFrequency[];
  summary: {
    overview: string;
    actionableAreas: ActionableArea[];
  };
}

export interface Source {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  sources?: Source[];
}
