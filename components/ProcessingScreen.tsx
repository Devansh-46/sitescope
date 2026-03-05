'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProcessingScreenProps {
    url: string;
    status: string;
}

export default function ProcessingScreen({ url, status }: ProcessingScreenProps) {
    const router = useRouter();

    useEffect(() => {
        // Refresh the current route every 3 seconds to check for state updates from the database
        const intervalId = setInterval(() => {
            router.refresh();
        }, 3000);

        return () => clearInterval(intervalId);
    }, [router]);

    let statusMessage = 'Processing Audit';
    let progress = 10;

    if (status === 'PENDING') {
        statusMessage = 'Added to Queue...';
        progress = 25;
    } else if (status === 'SCRAPING') {
        statusMessage = 'Scraping Website...';
        progress = 50;
    } else if (status === 'ANALYZING') {
        statusMessage = 'Analyzing Data...';
        progress = 75;
    }

    return (
        <div className="min-h-screen bg-void flex items-center justify-center p-6 bg-texture">
            <div className="max-w-md w-full text-center panel p-8">
                <div className="w-16 h-16 rounded-full bg-signal/10 border border-signal/30 flex items-center justify-center mx-auto mb-6">
                    {/* Animated spinner */}
                    <svg className="w-8 h-8 text-signal animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>

                <h1 className="font-display font-bold text-xl text-text-primary mb-2">
                    {statusMessage}
                </h1>

                <p className="text-text-secondary text-sm mb-6">
                    Analyzing <span className="font-mono text-text-primary block truncate mt-1">{url}</span>
                </p>

                <div className="w-full bg-void/50 rounded-full h-2 mb-2 overflow-hidden border border-border">
                    <div
                        className="h-full bg-signal rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <p className="text-xs font-mono text-text-muted mt-4">
                    Auto-refreshing. Please don&apos;t close this page.
                </p>
            </div>
        </div>
    );
}
