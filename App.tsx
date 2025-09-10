import React, { useState, useCallback, useEffect } from 'react';
import { GameState } from './types';
import type { Case, Resolution, Suspect, TimelineEvent, Difficulty } from './types';
import { generateNewCase, investigateAction, getInnisHint, resolveCase, generateSuspectPortrait, generateBackgroundImage } from './services/geminiService';
import Loader from './components/Loader';
import InnisCompanion from './components/InnisCompanion';
import Modal from './components/Modal';
import { soundService } from './services/soundService';
import SoundControl from './components/SoundControl';

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(GameState.START);
    const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
    const [backgroundUrl, setBackgroundUrl] = useState<string>('');
    const [currentCase, setCurrentCase] = useState<Case | null>(null);
    const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
    const [activeEventId, setActiveEventId] = useState<number | null>(null);
    const [currentLog, setCurrentLog] = useState<string>("The gas lamps of Edinburgh hiss in the haar. Another soul has met a grim end.");
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [resolution, setResolution] = useState<Resolution | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [investigationInput, setInvestigationInput] = useState<string>('');


    const handleApiError = (err: unknown) => {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setIsLoading(false);
    };

    useEffect(() => {
        const updateVisualsAndSound = async () => {
            try {
                // Set a default background immediately to avoid a flash
                if (!backgroundUrl) {
                     setBackgroundUrl('data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='); // A dark purple pixel
                }
                const imageUrl = await generateBackgroundImage(gameState);
                setBackgroundUrl(imageUrl);
            } catch (err) {
                console.error("Failed to update background:", err);
                handleApiError(err);
            }
            soundService.playGameStateAmbience(gameState);
        };
        updateVisualsAndSound();
    }, [gameState]);

    const startNewCase = useCallback(async (selectedDifficulty: Difficulty) => {
        setDifficulty(selectedDifficulty);
        soundService.playClick();
        setLoadingMessage("Consultin' wi' the powers that be...");
        setIsLoading(true);
        setError(null);
        setResolution(null);
        try {
            const newCase = await generateNewCase();
            setCurrentCase(newCase);
            const initialTimeline = [{
                id: 1,
                type: 'EVENT' as 'EVENT',
                source: 'Case Briefing',
                text: newCase.summary,
            }];
            setTimeline(initialTimeline);
            setActiveEventId(1); // Auto-expand the first event

            setLoadingMessage("Sketchin' the persons of interest...");
            const suspectsWithPortraits = await Promise.all(
                newCase.suspects.map(async (suspect) => {
                    const portraitUrl = await generateSuspectPortrait(suspect.description);
                    return { ...suspect, portraitUrl };
                })
            );
            
            const caseWithPortraits = { ...newCase, suspects: suspectsWithPortraits };
            setCurrentCase(caseWithPortraits);

            setCurrentLog(newCase.summary);
            setCurrentSpeaker(null);
            setGameState(GameState.INVESTIGATING);
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleInvestigation = useCallback(async (action: string) => {
        if (!currentCase || !difficulty) return;
        soundService.playClick();
        setLoadingMessage("Poundin' the cobblestones...");
        setIsLoading(true);
        setError(null);
        try {
            const result = await investigateAction(currentCase, action, difficulty);
            setCurrentLog(result.description);
             if (result.speaker) {
                setCurrentSpeaker(result.speaker);
            } else {
                setCurrentSpeaker(null);
            }
            const newEvent: TimelineEvent = {
                id: timeline.length + 1,
                type: 'CLUE',
                source: 'Investigation',
                text: result.clue,
            };
            setTimeline(prev => [...prev, newEvent]);
            setActiveEventId(newEvent.id);
            soundService.playClue();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentCase, timeline, difficulty]);

    const handleInvestigationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (investigationInput.trim() && !isLoading) {
            handleInvestigation(investigationInput.trim());
            setInvestigationInput('');
        }
    };

    const handleAskInnis = useCallback(async () => {
        if (!currentCase || !difficulty) return;
        soundService.playInnis();
        setLoadingMessage("The wee dog is sniffin' the air...");
        setIsLoading(true);
        setError(null);
        try {
            const result = await getInnisHint(currentCase, difficulty);
            const hintText = `Innis gives a low growl and nudges your hand, seeming to say: "${result.hint}"`;
            setCurrentLog(hintText);
            setCurrentSpeaker(null);
            const newEvent: TimelineEvent = {
                id: timeline.length + 1,
                type: 'CLUE',
                source: "Innis's Nose",
                text: result.hint,
            };
            setTimeline(prev => [...prev, newEvent]);
            setActiveEventId(newEvent.id);
            soundService.playClue();
        } catch (err) {
            handleApiError(err);
        } finally {
            setIsLoading(false);
        }
    }, [currentCase, timeline, difficulty]);

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

    const toggleEventDetails = (id: number) => {
        setActiveEventId(currentId => (currentId === id ? null : id));
    };

    const resetGame = () => {
        soundService.playClick();
        setGameState(GameState.START);
        setCurrentCase(null);
        setTimeline([]);
        setResolution(null);
        setError(null);
        setDifficulty(null);
        setCurrentLog("The gas lamps of Edinburgh hiss in the haar. Another soul has met a grim end.");
        setCurrentSpeaker(null);
    }

    useEffect(() => {
        if (gameState === GameState.RESOLVED && resolution) {
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


    const getTimelineIcon = (source: string) => {
        switch(source) {
            case 'Case Briefing':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-50" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                );
            case 'Investigation':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-50" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                );
            case "Innis's Nose":
                 return (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-50" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 3.5a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" />
                        <path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM3.863 5.433a.75.75 0 01.956-.44l3.28 1.406a.75.75 0 01-.512 1.385l-3.28-1.406a.75.75 0 01-.444-.945zM15.181 6.397a.75.75 0 01.513 1.385l-3.28 1.406a.75.75 0 01-.956-.44l-1.999-4.664a.75.75 0 011.385-.512l2.337 2.825z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return null;
        }
    };

    const renderGameState = () => {
        if (gameState === GameState.START) {
            return (
                <div className="text-center">
                    <h2 className="text-3xl font-serif-display text-purple-300 mb-2">Choose Your Challenge</h2>
                    <p className="text-gray-400 mb-8 max-w-xl mx-auto">The difficulty affects the number of clues needed to make an accusation, and how cryptic those clues are.</p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button onClick={() => startNewCase('Easy')} className="difficulty-button bg-green-700 hover:bg-green-600">
                            <span className="font-bold text-xl">A Stroll in the Meadows</span>
                            <span className="text-sm">(Easy: 1 Clue Needed)</span>
                        </button>
                        <button onClick={() => startNewCase('Medium')} className="difficulty-button bg-yellow-700 hover:bg-yellow-600">
                             <span className="font-bold text-xl">A Proper Conundrum</span>
                            <span className="text-sm">(Medium: 2 Clues Needed)</span>
                        </button>
                        <button onClick={() => startNewCase('Hard')} className="difficulty-button bg-red-800 hover:bg-red-700">
                             <span className="font-bold text-xl">A Devil's Knot</span>
                            <span className="text-sm">(Hard: 3 Clues Needed)</span>
                        </button>
                    </div>
                </div>
            );
        }
        
        const cluesFound = timeline.filter(e => e.type === 'CLUE').length;
        const cluesNeeded = difficulty ? { Easy: 1, Medium: 2, Hard: 3 }[difficulty] : 2;
        const canAccuse = cluesFound >= cluesNeeded;

        if (currentCase) {
             const speakerPortraitUrl = currentSpeaker
                ? currentCase?.suspects.find(s => s.name === currentSpeaker)?.portraitUrl
                : null;
            return (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Case Details & Actions */}
                    <div className="md:col-span-2 space-y-6">
                        <div>
                            <h2 className="text-4xl font-serif-display text-purple-300 border-b-2 border-purple-800 pb-2 mb-4">{currentCase.title}</h2>
                            <div className="flex items-start space-x-6 bg-slate-900/30 p-4 rounded-lg">
                                {speakerPortraitUrl && (
                                    <img
                                        src={speakerPortraitUrl}
                                        alt={`Portrait of ${currentSpeaker}`}
                                        className="w-24 h-24 rounded-full border-4 border-purple-400 object-cover object-top shadow-lg flex-shrink-0"
                                    />
                                )}
                                <p className="text-lg italic text-gray-300 leading-relaxed pt-2 flex-1">{currentLog}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                             <h3 className="text-2xl font-serif-display text-gray-100">Your Next Move</h3>
                             <p className="text-gray-400 italic text-sm">What path will your investigation take? Be specific. The powers that be will interpret your intent.</p>
                             <form onSubmit={handleInvestigationSubmit} className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="text"
                                    value={investigationInput}
                                    onChange={(e) => setInvestigationInput(e.target.value)}
                                    placeholder="e.g., 'Examine the victim's correspondence...'"
                                    disabled={isLoading}
                                    className="flex-grow bg-slate-900/50 border border-slate-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-gray-400 italic disabled:opacity-50"
                                    aria-label="Enter your investigation action"
                                />
                                <button type="submit" disabled={isLoading || !investigationInput.trim()} className="action-button px-6">
                                    Investigate
                                </button>
                             </form>

                             <div className="pt-2">
                                <button onClick={handleOpenAccusationModal} disabled={isLoading || !canAccuse} className="w-full action-button bg-red-700 hover:bg-red-600 disabled:bg-red-900/50 disabled:text-gray-500">
                                    Make an Accusation {!canAccuse && `(${cluesNeeded - cluesFound} more ${cluesNeeded - cluesFound === 1 ? 'clue' : 'clues'} needed)`}
                                </button>
                            </div>
                        </div>
                         <InnisCompanion onAskInnis={handleAskInnis} disabled={isLoading} />
                    </div>
                    {/* Right Column: Deduction Board */}
                    <div className="bg-yellow-900/30 p-4 rounded-lg shadow-inner">
                        <h3 className="text-3xl font-serif-display text-yellow-200 border-b border-yellow-700 pb-2 mb-4">Deduction Board</h3>
                        {timeline.length > 0 ? (
                            <div className="relative border-l-2 border-dashed border-yellow-700/50 ml-3 pl-6 space-y-8">
                                {timeline.map((event) => {
                                    const isActive = activeEventId === event.id;
                                    return (
                                        <div key={event.id} className="relative">
                                            <div
                                                onClick={() => toggleEventDetails(event.id)}
                                                className="absolute -left-[35px] top-0 h-8 w-8 rounded-full bg-purple-600 ring-4 ring-slate-800 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                                                role="button"
                                                aria-expanded={isActive}
                                                aria-controls={`event-details-${event.id}`}
                                                aria-label={`Toggle details for ${event.source}`}
                                            >
                                                {getTimelineIcon(event.source)}
                                            </div>
                                            <div className="bg-yellow-100 text-stone-800 p-3 rounded-md shadow-sm transform -rotate-1">
                                                <div
                                                    onClick={() => toggleEventDetails(event.id)}
                                                    className="flex justify-between items-center cursor-pointer"
                                                    role="button"
                                                    aria-expanded={isActive}
                                                    aria-controls={`event-details-${event.id}`}
                                                >
                                                    <p className="font-bold text-stone-600 text-sm uppercase tracking-wider select-none">{event.source}</p>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-stone-500 transition-transform duration-300 ${isActive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                                <div
                                                    id={`event-details-${event.id}`}
                                                    className="grid transition-all duration-500 ease-in-out"
                                                    style={{ gridTemplateRows: isActive ? '1fr' : '0fr' }}
                                                >
                                                    <div className="overflow-hidden">
                                                        <p className="font-serif-display text-lg mt-2 pt-2 border-t border-stone-300/70">{event.text}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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
        <div 
            className="bg-slate-900 min-h-screen text-gray-200 font-sans p-4 sm:p-8 flex flex-col items-center transition-all duration-1000"
            style={{
                backgroundImage: `url(${backgroundUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"></div>
            
            <div className="relative z-10 w-full flex flex-col items-center flex-grow">
                <style>{`
                    .action-button { background-color: #581c87; } .action-button:hover { background-color: #6b21a8; } .action-button:disabled { background-color: #3b0764; cursor: not-allowed; transform: scale(1); color: #9ca3af; } .action-button { color: white; font-weight: bold; padding: 0.75rem 1rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); transition: all 0.3s; transform: perspective(1px) scale(1); } .action-button:not(:disabled):hover { transform: scale(1.05); }
                    .difficulty-button { color: white; font-family: 'IM Fell English', serif; padding: 1rem 1.5rem; border-radius: 0.5rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); transition: all 0.3s; transform: perspective(1px) scale(1); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
                    .difficulty-button:hover { transform: scale(1.05); }
                `}</style>

                <header className="text-center mb-8">
                    <h1 className="text-6xl font-serif-display text-gray-100 tracking-wider">McLevy's Conundrum</h1>
                    <p className="text-purple-300 text-lg">Justice in the dark heart of Edinburgh</p>
                </header>

                <main className="w-full max-w-7xl bg-slate-800/80 rounded-lg shadow-2xl p-6 md:p-8 relative">
                    {isLoading && <Loader message={loadingMessage} />}
                    {error && <div className="bg-red-800 border border-red-500 text-white p-4 rounded-lg mb-4 text-center">{error}</div>}
                    {renderGameState()}
                </main>
                
                {gameState === GameState.ACCUSING && currentCase && (
                    <Modal title="Who's the Guilty Party?" onClose={() => setGameState(GameState.INVESTIGATING)} maxWidth="max-w-6xl">
                        <p className="text-gray-300 mb-6">Ye've gathered the evidence. Now point the finger. Be sure, for a soul's fate is at stake.</p>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {currentCase.suspects.map(s => (
                                <div key={s.name} className="bg-slate-700/50 border border-slate-600 rounded-lg flex flex-row items-start shadow-lg p-4 transition-all duration-300 hover:border-purple-400 hover:shadow-purple-500/20 space-x-4 h-full">
                                    {/* Portrait */}
                                    <div>
                                        {s.portraitUrl ? (
                                            <img 
                                                src={s.portraitUrl} 
                                                alt={`Portrait of ${s.name}`} 
                                                className="w-28 h-28 md:w-32 md:h-32 rounded-lg border-2 border-purple-600 object-cover object-top flex-shrink-0" 
                                            />
                                        ) : (
                                            <div className="w-28 h-28 md:w-32 md:h-32 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex flex-col flex-1 h-full">
                                        <div className="flex-grow">
                                            <h4 className="font-serif-display text-2xl text-purple-300">{s.name}</h4>
                                            <p className="text-sm italic text-gray-400 mb-3">{s.description}</p>
                                            
                                            <div className="space-y-3">
                                                <p className="text-sm text-gray-300"><span className="font-bold text-gray-100">Motive:</span> {s.motive}</p>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-100 mb-1">Their Statement:</p>
                                                    <blockquote className="border-l-4 border-purple-600/50 pl-3">
                                                        <p className="text-sm text-gray-400 font-serif-display italic">{s.statement}</p>
                                                    </blockquote>
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={() => handleAccuse(s)} className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg mt-4 transition-colors duration-200">
                                            Accuse this Person
                                        </button>
                                    </div>
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
                            <button onClick={resetGame} className="w-full bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300">
                                Another Case Awaits
                            </button>
                        </div>
                    </Modal>
                )}
                
                <SoundControl />

                <footer className="text-center mt-auto pt-8 text-sm text-gray-400">
                    <p>McLevy's Conundrum - A text-based adventure powered by Gemini. Inspired by the BBC Radio 4 series.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;