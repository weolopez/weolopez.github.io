class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = {};
        this.isMuted = false;
        this.soundVolume = 1.0;
        this.musicVolume = 0.5; // Music is often quieter
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Preload common sounds
        //https://www.sounds-resource.com/pc_computer/starwarstiefighter/sound/3358/
        this.loadSound('playerShootLaser', 'sound/laser.wav'); // Placeholder path
        this.loadSound('playerShootPlasma', 'sound/plasma.wav'); // Placeholder path
        this.loadSound('enemyShoot', 'sound/enemy_shoot.wav'); // Placeholder path
        this.loadSound('hitDamage', 'sound/hit.wav'); // Placeholder path
        this.loadSound('explosionSmall', 'sound/explosion_small.wav'); // Placeholder path
        this.loadSound('explosionLarge', 'sound/explosion_large.wav'); // Placeholder path
        this.loadSound('powerupCollect', 'sound/powerup.wav'); // Placeholder path
        this.loadSound('shieldActivate', 'sound/shield_on.wav'); // Placeholder path
        this.loadSound('shieldDeactivate', 'sound/shield_off.wav'); // Placeholder path
        this.loadSound('playerRespawn', 'sound/respawn.wav'); // Placeholder path
        this.loadSound('gameOver', 'sound/game_over.wav'); // Placeholder path

        // Preload background music
        // https://www.fesliyanstudios.com/royalty-free-music Action Fight - by David Fesliyan
        this.loadMusic('background', 'sound/background_music.mp3'); // Placeholder path
    }

    async loadSound(name, path) {
        if (this.sounds[name]) {
            return this.sounds[name];
        }
        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.sounds[name] = audioBuffer;
            console.log(`Sound ${name} loaded from ${path}`);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading sound ${name} from ${path}:`, error);
            this.sounds[name] = null; // Mark as failed to load
            return null;
        }
    }

    async loadMusic(name, path) {
        if (this.music[name]) {
            return this.music[name];
        }
        try {
            // For music, we'll use HTMLAudioElement for easier looping and control
            const audioElement = new Audio(path);
            audioElement.loop = true;
            this.music[name] = {
                element: audioElement,
                sourceNode: null, // For potential future effects via Web Audio API
                gainNode: this.audioContext.createGain()
            };
            this.music[name].gainNode.gain.value = this.musicVolume;
            this.music[name].gainNode.connect(this.audioContext.destination);
            console.log(`Music ${name} loaded from ${path}`);
            return this.music[name];
        } catch (error) {
            console.error(`Error loading music ${name} from ${path}:`, error);
            this.music[name] = null;
            return null;
        }
    }

    playSound(name, volume = this.soundVolume) {
        if (this.isMuted || !this.sounds[name] || !this.audioContext) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.sounds[name];

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        source.start(0);
    }

    playMusic(name, loop = true, volume = this.musicVolume) {
        if (this.isMuted || !this.music[name] || !this.music[name].element) return;

        const musicTrack = this.music[name];
        musicTrack.element.loop = loop;
        musicTrack.element.volume = volume * (this.isMuted ? 0 : 1); // Apply general mute and specific volume

        // Ensure AudioContext is resumed if it was suspended by browser policy
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // If we want to use Web Audio API for music for effects later
        if (!musicTrack.sourceNode) {
            musicTrack.sourceNode = this.audioContext.createMediaElementSource(musicTrack.element);
            musicTrack.sourceNode.connect(musicTrack.gainNode);
        }
        musicTrack.gainNode.gain.value = volume * (this.isMuted ? 0 : 1);


        musicTrack.element.play().catch(error => console.error(`Error playing music ${name}:`, error));
    }

    stopMusic(name) {
        if (this.music[name] && this.music[name].element) {
            this.music[name].element.pause();
            this.music[name].element.currentTime = 0; // Reset to start
        }
    }

    pauseMusic(name) {
        if (this.music[name] && this.music[name].element) {
            this.music[name].element.pause();
        }
    }

    resumeMusic(name) {
         if (this.isMuted || !this.music[name] || !this.music[name].element) return;
        this.music[name].element.play().catch(error => console.error(`Error resuming music ${name}:`, error));
    }
    
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        for (const trackName in this.music) {
            if (this.music[trackName] && this.music[trackName].gainNode) {
                this.music[trackName].gainNode.gain.value = this.musicVolume * (this.isMuted ? 0 : 1);
            } else if (this.music[trackName] && this.music[trackName].element) {
                // Fallback for elements not yet connected to gain nodes
                 this.music[trackName].element.volume = this.musicVolume * (this.isMuted ? 0 : 1);
            }
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        // Update volume for all playing music
        this.setMusicVolume(this.musicVolume); // This will re-apply mute status
        if (this.isMuted) {
            console.log("Audio Muted");
        } else {
            console.log("Audio Unmuted");
        }
        return this.isMuted;
    }
}

// Export if using modules, or attach to window for global access
export default AudioManager;
// window.AudioManager = AudioManager; // If not using ES6 modules in main.js