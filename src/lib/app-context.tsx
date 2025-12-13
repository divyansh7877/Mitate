import React, { createContext, useContext, useState, ReactNode } from 'react';

export type KnowledgeLevel = 'beginner' | 'intermediate' | 'advanced';
export type AppStep = 'landing' | 'loading' | 'result';

export interface InfographicResult {
  paperTitle: string;
  paperUrl: string;
  imageUrl: string;
  summary: string;
}

interface AppContextType {
  step: AppStep;
  setStep: (step: AppStep) => void;
  query: string;
  setQuery: (query: string) => void;
  knowledgeLevel: KnowledgeLevel;
  setKnowledgeLevel: (level: KnowledgeLevel) => void;
  result: InfographicResult | null;
  setResult: (result: InfographicResult | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [step, setStep] = useState<AppStep>('landing');
  const [query, setQuery] = useState('');
  const [knowledgeLevel, setKnowledgeLevel] = useState<KnowledgeLevel>('beginner');
  const [result, setResult] = useState<InfographicResult | null>(null);

  return (
    <AppContext.Provider
      value={{
        step,
        setStep,
        query,
        setQuery,
        knowledgeLevel,
        setKnowledgeLevel,
        result,
        setResult,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
