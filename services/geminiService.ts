
import { GoogleGenAI, Type } from "@google/genai";
import type { Case, Suspect } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const investigateAction = async (caseDetails: Case, action: string): Promise<{description: string, clue: string}> => {
    const prompt = `You are a writer for the BBC radio drama 'McLevy'.
    Case Details: ${JSON.stringify(caseDetails)}
    Detective McLevy decides to: "${action}".
    Write a short, atmospheric paragraph (under 80 words) describing what he finds or who he talks to. Reveal one single, concise clue. Use the show's vernacular.
    Do not solve the case. The clue should point towards one of the suspects without being definitive.
    `;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    description: { type: Type.STRING, description: "The atmospheric description of McLevy's action." },
                    clue: { type: Type.STRING, description: "A single, concise clue that has been discovered." }
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

export const getInnisHint = async (caseDetails: Case): Promise<{hint: string}> => {
    const prompt = `You are a writer for the BBC radio drama 'McLevy'.
    Case Details: ${JSON.stringify(caseDetails)}
    McLevy's trusty brindle whippet, Innis, has noticed something others have missed.
    Describe in one cryptic sentence what Innis has found. It should be a subtle, animal-level observation that provides a clue. Use the show's vernacular.
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
    If the accusation is wrong, describe his quiet frustration as the real culprit is revealed through some other means, perhaps a confession or another's testimony.
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
