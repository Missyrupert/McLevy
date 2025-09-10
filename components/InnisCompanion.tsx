
import React from 'react';

interface InnisCompanionProps {
    onAskInnis: () => void;
    disabled: boolean;
}

const InnisCompanion: React.FC<InnisCompanionProps> = ({ onAskInnis, disabled }) => {
    return (
        <div className="bg-gradient-to-tr from-amber-900 via-stone-700 to-amber-800 p-4 rounded-lg shadow-lg text-center mt-6">
            <div className="flex items-center justify-center space-x-4">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-50 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.435 7.075 12 12l4 4M21.75 12a9.75 9.75 0 1 1-19.5 0 9.75 9.75 0 0 1 19.5 0Z" />
                    <path d="M12 17.25c-2.195 0-4.22-1.002-5.615-2.625" />
                    <path d="m14 7-1-1" />
                    <path d="m10 7 1-1" />
                    <path d="M12 7.25c-3.15 0-6 1.8-6 4.25" />
                    <path d="M12 7.25c3.15 0 6 1.8 6 4.25" />
                 </svg>
                <div>
                    <h3 className="font-serif-display text-2xl text-yellow-50">Innis is waiting...</h3>
                    <p className="text-sm text-yellow-100 italic">The wee beast has a nose for trouble.</p>
                </div>
            </div>
            <button
                onClick={onAskInnis}
                disabled={disabled}
                className="mt-4 w-full bg-yellow-200 hover:bg-yellow-300 text-stone-800 font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100"
            >
                Ask Innis for a Clue
            </button>
        </div>
    );
};

export default InnisCompanion;
