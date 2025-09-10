import { GoogleGenAI, Type } from "@google/genai";
import type { Case, Difficulty, Suspect } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const backgroundImageCache = new Map<string, string>();

const caseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "A catchy, noir-style title for the case." },
        victim: { type: Type.STRING, description: "The name and occupation of the victim." },
        location: { type: Type.STRING, description: "The specific location in 19th-century Edinburgh where the crime occurred." },
        summary: { type: Type.STRING, description: "A one-paragraph summary of the crime scene and initial situation, written in the vernacular of the McLevy series." },
        suspects: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The full name of the suspect." },
                    description: { type: Type.STRING, description: "A one-sentence physical or personality description of the suspect." },
                    motive: { type: Type.STRING, description: "A plausible motive for this suspect." },
                    statement: { type: Type.STRING, description: "A brief alibi or statement from the suspect, in quotes." }
                },
                required: ['name', 'description', 'motive', 'statement']
            },
            description: "An array of exactly three suspects."
        },
        culprit: { type: Type.STRING, description: "The name of the true culprit from the list of suspects." }
    },
    required: ['title', 'victim', 'location', 'summary', 'suspects', 'culprit']
};


export const generateNewCase = async (): Promise<Case> => {
    const prompt = `You are a writer for the BBC radio drama 'McLevy'. Generate a new, brief murder mystery case for Detective McLevy in 19th-century Edinburgh. Use the vernacular and style of the show. The case should have a victim, a location, and a mysterious circumstance. Create exactly three plausible suspects. For each suspect, provide their name, a brief physical/personality description, a plausible motive, and a short statement or alibi. Finally, secretly decide which one is the true culprit.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: caseSchema,
            temperature: 1.0,
        },
    });

    try {
        const jsonText = response.text.trim();
        const newCase: Case = JSON.parse(jsonText);
        if (newCase.suspects.length !== 3) {
            throw new Error("Generated case does not have exactly 3 suspects.");
        }
        return newCase;
    } catch (e) {
        console.error("Failed to parse case from Gemini:", response.text, e);
        throw new Error("The Crown's witnesses are speakin' in tongues. Couldna generate a proper case.");
    }
};

export const generateSuspectPortrait = async (description: string): Promise<string> => {
    const prompt = `A character portrait of a person in Victorian Edinburgh, Scotland. The person is described as: "${description}". The style should be a gritty, realistic, slightly faded 19th-century photograph or oil painting. Close-up on the face, shoulders up. No text, watermarks, or frames.`;

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '4:3',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            return `data:image/jpeg;base64,${base64ImageBytes}`;
        } else {
            throw new Error("No image was generated.");
        }
    } catch (e) {
        console.error("Failed to generate suspect portrait:", e);
        throw new Error("The artist's hand is unsteady. Couldna sketch the suspect.");
    }
};

export const generateBackgroundImage = async (gameState: string): Promise<string> => {
    if (backgroundImageCache.has(gameState)) {
        return backgroundImageCache.get(gameState)!;
    }

    let prompt = '';
    switch (gameState) {
        case 'INVESTIGATING':
            prompt = 'A moody, atmospheric scene of a foggy, gaslit cobblestone street in Victorian Edinburgh at night. The style is a photorealistic, cinematic digital painting. Empty street, focus on atmosphere. Aspect ratio 16:9.';
            break;
        case 'ACCUSING':
            prompt = 'A dimly lit, tense Victorian study. A fireplace casts long shadows. Books line the walls. The mood is confrontational and serious. Photorealistic, cinematic digital painting. Aspect ratio 16:9.';
            break;
        case 'RESOLVED':
            prompt = 'The sun rising over the rooftops of old Edinburgh, breaking through the morning mist. A sense of peace and clarity. Photorealistic, cinematic digital painting. Aspect ratio 16:9.';
            break;
        case 'START':
        default:
            prompt = 'A grand, panoramic vista of the Edinburgh skyline at dusk in the 19th century. The castle is silhouetted against a dramatic sky. Gaslights are beginning to flicker on in the streets below. Photorealistic, cinematic digital painting. Aspect ratio 16:9.';
            break;
    }

    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            backgroundImageCache.set(gameState, imageUrl);
            return imageUrl;
        } else {
            throw new Error("No background image was generated.");
        }
    } catch (e) {
        console.error("Failed to generate background image:", e);
        throw new Error("The city's visage remains hidden in the haar.");
    }
};


export const investigateAction = async (caseDetails: Case, action: string, difficulty: Difficulty): Promise<{description: string, clue: string, speaker?: string}> => {
    let actionPreamble = `Detective McLevy decides to: "${action}".`;

    if (action === "Confront Dewi MacOlacost") {
        actionPreamble = `Detective McLevy decides to confront his unsavoury but sometimes useful informant, Dewi MacOlacost. Dewi is a nasty piece of work and enjoys watching McLevy squirm. His information might be a genuine clue, a misleading statement, or a cryptic insult.`;
    }

    let clueComplexityInstruction = "The clue should point towards one of the suspects without being definitive.";
    switch (difficulty) {
        case 'Easy':
            clueComplexityInstruction = "The clue should be a direct and obvious hint that strongly points towards one of the suspects.";
            break;
        case 'Hard':
            clueComplexityInstruction = "The clue should be very cryptic and indirect. It might subtly implicate one suspect, cast doubt on an alibi, or connect two seemingly unrelated facts, but should not be an obvious pointer.";
            break;
    }

    const prompt = `You are a writer for the BBC radio drama 'McLevy'.
    Case Details: ${JSON.stringify(caseDetails)}
    ${actionPreamble}
    Write a short, atmospheric paragraph (under 80 words) describing the encounter or what he finds. This description may include a direct quote from one of the suspects or from Dewi MacOlacost himself. Reveal one single, concise clue. ${clueComplexityInstruction} Use the show's vernacular.
    If the description includes a quote from a suspect, identify them by their full name in the 'speaker' field. Do not identify Dewi as a speaker in the JSON response.
    Do not solve the case.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "The atmospheric description of McLevy's action. This may include a direct quote." },
                    clue: { type: Type.STRING, description: "A single, concise clue that has been discovered." },
                    speaker: { type: Type.STRING, description: "If the description contains a quote from one of the suspects, this is their full name. Otherwise, this field should be omitted." }
                },
                required: ['description', 'clue']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse investigation result:", response.text, e);
        throw new Error("The fog is too thick, even for me. Couldna get a clear answer.");
    }
};

export const getInnisHint = async (caseDetails: Case, difficulty: Difficulty): Promise<{hint: string}> => {
    let hintComplexityInstruction = "It should be a subtle, animal-level observation that provides a clue."; // Medium default
    switch (difficulty) {
        case 'Easy':
            hintComplexityInstruction = "It should be an obvious, animal-level observation that clearly points to one suspect (e.g., the smell of their perfume on an object).";
            break;
        case 'Hard':
            hintComplexityInstruction = "It should be a highly cryptic, animal-level observation that is difficult to interpret but provides a vital link if understood correctly (e.g., a reaction to a specific word or location).";
            break;
    }
    
    const prompt = `You are a writer for the BBC radio drama 'McLevy'.
    Case Details: ${JSON.stringify(caseDetails)}
    McLevy's trusty brindle whippet, Innis, has noticed something others have missed.
    Describe in one cryptic sentence what Innis has found. ${hintComplexityInstruction} Use the show's vernacular.
    `;

     const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    hint: { type: Type.STRING, description: "The cryptic, one-sentence hint from Innis." }
                },
                required: ['hint']
            }
        }
    });

    try {
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("Failed to parse Innis' hint:", response.text, e);
        throw new Error("The wee dog's keepin' his secrets today.");
    }
};

export const resolveCase = async (caseDetails: Case, accusedSuspectName: string): Promise<{isCorrect: boolean, resolutionText: string}> => {
    const isCorrect = accusedSuspectName === caseDetails.culprit;

    const prompt = `You are a writer for the BBC radio drama 'McLevy'.
    Case Details: ${JSON.stringify(caseDetails)}
    The actual culprit is: ${caseDetails.culprit}.
    McLevy has accused: ${accusedSuspectName}.
    
    Write a concluding narrative paragraph.
    If McLevy's accusation is correct (${isCorrect}), describe his triumphant deduction, explaining the final piece of the puzzle that confirmed his suspicion.
    If the accusation is wrong, describe his quiet frustration as the real culprit is revealed through some other means, a confession or another's testimony.
    The tone should be final and in the style of the show.`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });

    return {
        isCorrect,
        resolutionText: response.text
    };
};