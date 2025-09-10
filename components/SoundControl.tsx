
import React, { useState, useCallback } from 'react';
import { soundService } from '../services/soundService.ts';

const SoundControl: React.FC = () => {
    const [isMuted, setIsMuted] = useState(soundService.getIsMuted());

    const handleToggleMute = useCallback(() => {
        const newMuteState = soundService.toggleMute();
        setIsMuted(newMuteState);
    }, []);

    return (
        <button
            onClick={handleToggleMute}
            className="fixed bottom-4 right-4 bg-purple-900/50 hover:bg-purple-800/80 text-white p-3 rounded-full shadow-lg transition-colors backdrop-blur-sm z-50 focus:outline-none focus:ring-2 focus:ring-purple-400"
            aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
        >
            {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l4-4m-4 0l4 4" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M17 4v16M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
            )}
        </button>
    );
};

export default SoundControl;