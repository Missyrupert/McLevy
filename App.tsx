
import React, { useState, useCallback, useEffect } from 'react';
import { GameState } from './types';
import type { Case, Resolution, Suspect } from './types';
import { generateNewCase, investigateAction, getInnisHint, resolveCase } from './services/geminiService';
import Loader from './components/Loader';
import InnisCompanion from './components/InnisCompanion';
import Modal from './components/Modal';
import { soundService } from './services/soundService';
import SoundControl from './components/SoundControl';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.START);
    const [currentCase, setCurrentCase] = useState<Case | null>(null);
    const [clues, setClues] = useState<string[]>([]);
    const [currentLog, setCurrentLog] = useState<string>("The gas lamps of Edinburgh hiss in the haar. Another soul has met a grim end.");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [resolution, setResolution] = useState<Resolution | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleApiError = (err: unknown) => {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setIsLoading(false);
    };

    const startNewCase = useCallback(async () => {
        soundService.playClick();
        setLoadingMessage("Consultin' wi' the powers that be...");
        setIsLoading(true);
        setError(null);
        setResolution(null);
        try {
            const newCase = await generateNewCase();
            setCurrentCase(newCase);
            setClues([]);
            setCurrentLog(newCase.summary);
            setGameState(GameState.INVESTIGATING);
            soundService.playAmbience();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInvestigation = useCallback(async (action: string) => {
        if (!currentCase) return;
        soundService.playClick();
        setLoadingMessage("Poundin' the cobblestones...");
        setIsLoading(true);
        setError(null);
        try {
            const result = await investigateAction(currentCase, action);
            setCurrentLog(result.description);
            setClues(prev => [...prev, result.clue]);
            soundService.playClue();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentCase]);

    const handleAskInnis = useCallback(async () => {
        if (!currentCase) return;
        soundService.playInnis();
        setLoadingMessage("The wee dog is sniffin' the air...");
        setIsLoading(true);
        setError(null);
        try {
            const result = await getInnisHint(currentCase);
            const hint = `Innis gives a low growl and nudges your hand, seeming to say: "${result.hint}"`;
            setCurrentLog(result.hint);
            setClues(prev => [...prev, `Innis's Clue: ${result.hint}`]);
            soundService.playClue();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentCase]);

    const handleAccuse = useCallback(async (suspect: Suspect) => {
        if (!currentCase) return;
        soundService.playClick();
        setLoadingMessage("The net draws tight...");
        setIsLoading(true);
        setError(null);
        try {
            const result = await resolveCase(currentCase, suspect.name);
            setResolution(result);
            setGameState(GameState.RESOLVED);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentCase]);
    
    const handleOpenAccusationModal = () => {
        soundService.playClick();
        setGameState(GameState.ACCUSING);
    };

    useEffect(() => {
        if (gameState === GameState.RESOLVED && resolution) {
            soundService.stopAmbience();
            if (resolution.isCorrect) {
                soundService.playSuccess();
            } else {
                soundService.playFailure();
            }
        }
    }, [gameState, resolution]);

    useEffect(() => {
        let clockInterval: number;
        if (gameState === GameState.INVESTIGATING) {
            clockInterval = window.setInterval(() => {
                soundService.playClock();
            }, 120000); // Every 2 minutes
        }
        return () => {
            if (clockInterval) {
                clearInterval(clockInterval);
            }
        };
    }, [gameState]);


    const renderGameState = () => {
        if (gameState === GameState.START) {
            return (
                <div className="text-center">
                    <button onClick={startNewCase} className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 text-xl font-serif-display">
                        Tak' on a New Case
                    </button>
                </div>
            );
        }

        if (currentCase) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Case Details & Actions */}
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h2 className="text-4xl font-serif-display text-purple-300 border-b-2 border-purple-800 pb-2 mb-4">{currentCase.title}</h2>
                            <p className="text-lg italic text-gray-300 leading-relaxed">{currentLog}</p>
                        </div>
                        <div className="space-y-4">
                             <h3 className="text-2xl font-serif-display text-gray-100">Your Actions</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={() => handleInvestigation("Scour the crime scene for evidence")} disabled={isLoading} className="action-button">Scour the Scene</button>
                                <button onClick={() => handleInvestigation("Question the witnesses and locals")} disabled={isLoading} className="action-button">Question Witnesses</button>
                                <button onClick={() => handleInvestigation("Consult with Jean Brash at the local establishment")} disabled={isLoading} className="action-button">Consult wi' Jean Brash</button>
                                <button onClick={handleOpenAccusationModal} disabled={isLoading || clues.length < 2} className="action-button bg-red-700 hover:bg-red-600 disabled:bg-red-900/50 disabled:text-gray-500">
                                    Make an Accusation {clues.length < 2 && `(${2 - clues.length} more clues needed)`}
                                </button>
                             </div>
                        </div>
                         <InnisCompanion onAskInnis={handleAskInnis} disabled={isLoading} />
                    </div>
                    {/* Right Column: Deduction Board */}
                    <div className="bg-yellow-900/30 p-4 rounded-lg shadow-inner">
                        <h3 className="text-3xl font-serif-display text-yellow-200 border-b border-yellow-700 pb-2 mb-4">Deduction Board</h3>
                        {clues.length > 0 ? (
                            <ul className="space-y-3">
                                {clues.map((clue, index) => (
                                    <li key={index} className="bg-yellow-100 text-stone-800 p-3 rounded-md shadow-sm transform -rotate-1 hover:rotate-0 transition-transform duration-200">
                                        <p className="font-serif-display text-lg">{clue}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                             <p className="text-yellow-200 italic">The board is clear... for now.</p>
                        )}
                    </div>
                 </div>
            );
        }
        return null;
    };


    return (
        <div className="bg-slate-900 min-h-screen text-gray-200 font-sans p-4 sm:p-8 flex flex-col items-center">
            <style>{`.action-button { background-color: #581c87; } .action-button:hover { background-color: #6b21a8; } .action-button:disabled { background-color: #3b0764; cursor: not-allowed; transform: scale(1); color: #9ca3af; } .action-button { color: white; font-weight: bold; padding: 0.75rem 1rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); transition: all 0.3s; transform: perspective(1px) scale(1); } .action-button:not(:disabled):hover { transform: scale(1.05); } `}</style>

            <header className="text-center mb-8">
                <h1 className="text-6xl font-serif-display text-gray-100 tracking-wider">McLevy's Conundrum</h1>
                <p className="text-purple-300 text-lg">Justice in the dark heart of Edinburgh</p>
            </header>

            <main className="w-full max-w-7xl bg-slate-800 rounded-lg shadow-2xl p-6 md:p-8 relative">
                {isLoading && <Loader message={loadingMessage} />}
                {error && <div className="bg-red-800 border border-red-500 text-white p-4 rounded-lg mb-4 text-center">{error}</div>}
                {renderGameState()}
            </main>
            
            {gameState === GameState.ACCUSING && currentCase && (
                <Modal title="Who's the Guilty Party?" onClose={() => setGameState(GameState.INVESTIGATING)}>
                    <p className="text-gray-300 mb-6">Ye've gathered the evidence. Now point the finger. Be sure, for a soul's fate is at stake.</p>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {currentCase.suspects.map(s => (
                             <div key={s.name} className="bg-slate-700/50 border border-slate-600 p-4 rounded-lg flex flex-col justify-between space-y-4">
                                <div>
                                    <h4 className="font-serif-display text-2xl text-purple-300">{s.name}</h4>
                                    <p className="text-sm italic text-gray-400 mb-2">{s.description}</p>
                                    <p className="text-sm text-gray-300 mb-1"><span className="font-bold text-gray-100">Motive:</span> {s.motive}</p>
                                    <p className="text-sm text-gray-400 font-serif-display italic">"{s.statement}"</p>
                                </div>
                                <button onClick={() => handleAccuse(s)} className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg mt-auto transition-colors duration-200">
                                    Accuse this Person
                                </button>
                            </div>
                        ))}
                    </div>
                </Modal>
            )}

            {gameState === GameState.RESOLVED && resolution && (
                 <Modal title={resolution.isCorrect ? "Case Closed!" : "Justice Miscarried"}>
                    <div className="space-y-4">
                        <p className={`text-2xl font-serif-display ${resolution.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {resolution.isCorrect ? "A righteous collar! Ye've found yer killer." : "The villain slipped through yer fingers this time."}
                        </p>
                        <p className="text-gray-300 leading-relaxed">{resolution.resolutionText}</p>
                        <button onClick={startNewCase} className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300">
                            Another Case Awaits
                        </button>
                    </div>
                </Modal>
            )}
            
            <SoundControl />

            <footer className="text-center mt-8 text-sm text-gray-500">
                <p>McLevy's Conundrum - A text-based adventure powered by Gemini. Inspired by the BBC Radio 4 series.</p>
            </footer>
        </div>
    );
};

export default App;
