import { GameState } from "../types";

const sounds = {
    ambience: 'https://actions.google.com/sounds/v1/ambiences/city_street_with_carriages.ogg',
    fireplace: 'https://actions.google.com/sounds/v1/ambiences/fire_crackling.ogg',
    clock: 'https://actions.google.com/sounds/v1/alarms/big_ben_chime.ogg',
    innis: 'https://actions.google.com/sounds/v1/animals/dog_whining.ogg',
    clue: 'https://actions.google.com/sounds/v1/ui/page_turn.ogg',
    click: 'https://actions.google.com/sounds/v1/ui/button_press.ogg',
    success: 'https://actions.google.com/sounds/v1/emergency/police_whistle.ogg',
    failure: 'https://actions.google.com/sounds/v1/human_sounds/sigh.ogg',
};

class SoundService {
    private audioElements: { [key: string]: HTMLAudioElement } = {};
    private isMuted = true;
    private isInitialized = false;
    private currentAmbientKey: string | null = null;

    private initialize() {
        if (this.isInitialized || typeof window === 'undefined') return;
        try {
            Object.entries(sounds).forEach(([key, src]) => {
                const audio = new Audio(src);
                audio.preload = 'auto';
                if (key === 'ambience' || key === 'fireplace') {
                    audio.loop = true;
                    audio.volume = key === 'ambience' ? 0.3 : 0.5; 
                } else {
                    audio.volume = 1.0;
                }
                this.audioElements[key] = audio;
            });
            this.updateMuteState();
            this.isInitialized = true;
        } catch (e) {
            console.error("Failed to initialize audio elements.", e);
        }
    }

    private play(key: string, loop = false) {
        if (!this.isInitialized || this.isMuted) return;
        const audio = this.audioElements[key];
        if (audio) {
            audio.loop = loop;
            if (audio.paused) {
                 audio.play().catch(e => console.error(`Error playing sound: ${key}`, e));
            }
        }
    }

    private stop(key: string) {
        if (!this.isInitialized) return;
        const audio = this.audioElements[key];
        if (audio && !audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    }

    playGameStateAmbience(gameState: GameState) {
        if (this.currentAmbientKey) {
            this.stop(this.currentAmbientKey);
            this.currentAmbientKey = null;
        }

        let soundToPlay: string | null = null;
        switch(gameState) {
            case GameState.INVESTIGATING:
                soundToPlay = 'ambience';
                break;
            case GameState.ACCUSING:
                soundToPlay = 'fireplace';
                break;
        }
        
        if (soundToPlay) {
            this.currentAmbientKey = soundToPlay;
            this.play(soundToPlay, true);
        }
    }

    playClick() { this.play('click'); }
    playClue() { this.play('clue'); }
    playInnis() { this.play('innis'); }
    playSuccess() { this.play('success'); }
    playFailure() { this.play('failure'); }
    playClock() { this.play('clock'); }

    private updateMuteState() {
        if (!this.isInitialized) return;
        Object.values(this.audioElements).forEach(audio => {
            audio.muted = this.isMuted;
        });
    }

    toggleMute() {
        if (!this.isInitialized) this.initialize();
        this.isMuted = !this.isMuted;
        this.updateMuteState();

        if (!this.isMuted && this.currentAmbientKey) {
             const audio = this.audioElements[this.currentAmbientKey];
             if (audio?.paused) {
                this.play(this.currentAmbientKey, true);
             }
        }
        
        return this.isMuted;
    }
    
    getIsMuted() {
        return this.isMuted;
    }
}

export const soundService = new SoundService();