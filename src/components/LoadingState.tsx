import React, { useEffect, useState } from 'react';
import { useApp, InfographicResult } from '@/lib/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';

const steps = [
  { id: 1, label: 'Finding relevant papers...' },
  { id: 2, label: 'Reading and summarizing...' },
  { id: 3, label: 'Generating your infographic...' },
];

export const LoadingState = () => {
  const { setStep, setResult, query } = useApp();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    // Mocking the progress for now. In a real app, this would be driven by backend events or polling.
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => setCurrentStep(2), 2000));
    timers.push(setTimeout(() => setCurrentStep(3), 5000));
    timers.push(setTimeout(() => {
        // Mock result
        const mockResult: InfographicResult = {
            paperTitle: "Attention Is All You Need",
            paperUrl: "https://arxiv.org/abs/1706.03762",
            imageUrl: "https://placehold.co/1024x1024/png?text=Transformer+Infographic",
            summary: "Transformers outperform previous models while being faster to train. This architecture powers ChatGPT, Google Search, and most modern AI."
        };
        setResult(mockResult);
        setStep('result');
    }, 8000));

    return () => timers.forEach(clearTimeout);
  }, [setStep, setResult]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Generating Explainer</CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            "{query}"
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {currentStep > step.id ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : currentStep === step.id ? (
                  <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div className={`text-lg ${currentStep === step.id ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {step.label}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
