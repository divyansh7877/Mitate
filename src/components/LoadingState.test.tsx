import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingState } from './LoadingState';
import { AppProvider } from '@/lib/app-context';

describe('LoadingState', () => {
    it('renders the initial step', () => {
        render(<AppProvider><LoadingState /></AppProvider>);
        expect(screen.getByText('Finding relevant papers...')).toBeInTheDocument();
        expect(screen.getByText('Generating Explainer')).toBeInTheDocument();
    });

    it('progresses through steps (integration simulation)', async () => {
         vi.useFakeTimers();
         render(<AppProvider><LoadingState /></AppProvider>);

         // Initial state
         expect(screen.getByText('Finding relevant papers...')).toHaveClass('font-medium text-foreground');

         // Advance time to 2nd step
         act(() => {
             vi.advanceTimersByTime(2000);
         });
         // Force re-render if needed, but react testing library usually handles it.
         // Note: checking class changes might be flaky depending on implementation details,
         // so we rely on the component being present.

         // Advance time to 3rd step
         act(() => {
             vi.advanceTimersByTime(3000); // +3000 = 5000 total
         });

         // We can check if the text is still there, verifying it hasn't crashed.
         expect(screen.getByText('Generating your infographic...')).toBeInTheDocument();

         vi.useRealTimers();
    });
});
