
const sounds = {
    ambience: 'https://actions.google.com/sounds/v1/ambiences/city_street_with_carriages.ogg',
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
    private ambienceShouldBePlaying = false;

    private initialize() {
        if (this.isInitialized || typeof window === 'undefined') return;
        try {
            Object.entries(sounds).forEach(([key, src]) => {
                const audio = new Audio(src);
                audio.preload = 'auto';
                if (key === 'ambience') {
                    audio.loop = true;
                    audio.volume = 0.3; 
                } else {
                    audio.volume = 0.7;
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
            if (!loop) {
              audio.currentTime = 0;
            }
            audio.play().catch(e => console.error(`Error playing sound: ${key}`, e));
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

    playAmbience() { 
        this.ambienceShouldBePlaying = true;
        if (this.audioElements.ambience?.paused) this.play('ambience', true); 
    }
    stopAmbience() { 
        this.ambienceShouldBePlaying = false;
        this.stop('ambience'); 
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

        if (!this.isMuted && this.ambienceShouldBePlaying && this.audioElements.ambience?.paused) {
            this.play('ambience', true);
        }
        
        return this.isMuted;
    }
    
    getIsMuted() {
        return this.isMuted;
    }
}

export const soundService = new SoundService();
