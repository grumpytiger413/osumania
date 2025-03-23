import JSZip from 'jszip';

class OsuManiaPlayer {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.canvas.id = "gameCanvas";
        this.canvas.width = 800;
        this.canvas.height = 600;
        document.body.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext("2d");
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.tracks = [];
        this.notes = [];
        this.song = null;
        this.backgroundImage = null;
        this.settings = {
            backgroundDim: 1.0, // Fully dimmed (pure black background)
            backgroundBlur: false,
            judgementLineY: this.canvas.height - 50,
            audioOffset: 183, // Fixed offset to +183ms
            scrollSpeed: 24.0 // Fixed scroll speed
        };

        console.log("Canvas created and initialized.");
    }

    async loadOsz() {
        console.log("Loading .osz file...");
        try {
            // Using the allorigins CORS proxy to fetch the .osz file from Google Drive
            const oszUrl = 'https://api.allorigins.win/raw?url=https://drive.google.com/uc?export=download&id=15jKgWr8_SHAxyw8Q6rYJ-tp0m44Qz3sD';
            const response = await fetch(oszUrl);
            if (!response.ok) throw new Error("Failed to load .osz file");

            const oszBlob = await response.blob();
            const zip = await JSZip.loadAsync(oszBlob);
            const files = Object.keys(zip.files);
            console.log("OSZ Files:", files);

            let beatmapFile = files.find(f => f.endsWith('.osu'));
            if (!beatmapFile) throw new Error("No .osu file found in the .osz");

            console.log("Loading beatmap:", beatmapFile);
            const beatmapData = await zip.files[beatmapFile].async("text");
            this.parseBeatmap(beatmapData);

            let audioFile = files.find(f => f.endsWith('.mp3') || f.endsWith('.ogg'));
            if (audioFile) {
                console.log("Loading audio file:", audioFile);
                const audioBlob = await zip.files[audioFile].async("blob");
                this.song = new Audio(URL.createObjectURL(audioBlob));
            }
        } catch (error) {
            console.error("Error loading .osz:", error);
        }
    }

    async loadOsk() {
        console.log("Loading .osk file...");
        try {
            // Using the allorigins CORS proxy to fetch the .osk file from Google Drive
            const oskUrl = 'https://api.allorigins.win/raw?url=https://drive.google.com/uc?export=download&id=14Ph8BnBLV7N3dnXt3Sa_BMLfwQ1gxw9n';
            const response = await fetch(oskUrl);
            if (!response.ok) throw new Error("Failed to load .osk file");

            const oskBlob = await response.blob();
            const zip = await JSZip.loadAsync(oskBlob);
            console.log("Skin loaded with files:", Object.keys(zip.files));
        } catch (error) {
            console.error("Error loading .osk:", error);
        }
    }

    parseBeatmap(data) {
        console.log("Parsing beatmap...");
        const lines = data.split('\n');
        let noteSection = false;
        
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith("[HitObjects]")) {
                noteSection = true;
                continue;
            }
            if (noteSection && line) {
                const [x, y, time] = line.split(',');
                this.notes.push({ time: parseInt(time), column: this.getColumn(x) });
            }
        }
        console.log("Parsed notes:", this.notes.length);
    }

    getColumn(x) {
        const columns = 4; // Adjust based on beatmap mode
        return Math.floor((x / 512) * columns);
    }

    play() {
        if (this.song) {
            console.log("Playing song...");
            this.song.play();
            requestAnimationFrame(this.render.bind(this));
        } else {
            console.error("No song loaded!");
        }
    }

    render() {
        if (!this.ctx) {
            console.error("Canvas context not found!");
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Black background (100% dimmed)
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.song) return;

        let currentTime = (this.song.currentTime * 1000) + this.settings.audioOffset;
        for (let note of this.notes) {
            let elapsedTime = note.time - currentTime;
            let y = this.settings.judgementLineY - (elapsedTime * this.settings.scrollSpeed * 0.5); 
            this.ctx.fillStyle = "white";
            this.ctx.fillRect(note.column * 50, y, 40, 10);
        }
        requestAnimationFrame(this.render.bind(this));
    }
}

// Ensure compatibility with JavaScript sandbox environments
const osuManiaPlayer = new OsuManiaPlayer();
(async () => {
    await osuManiaPlayer.loadOsz();
    await osuManiaPlayer.loadOsk();
    osuManiaPlayer.play();
})();
