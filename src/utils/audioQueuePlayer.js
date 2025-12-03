class AudioQueuePlayer {
    constructor() {
        this.queue = [];
        this.currentAudio = null;
        this.isPlaying = false;
    }

    playNext() {
        if (this.isPlaying) return;
        const nextUrl = this.queue.shift();
        if (!nextUrl) return;

        this.isPlaying = true;
        const audio = new Audio(nextUrl);
        this.currentAudio = audio;

        audio.onended = () => {
            this.isPlaying = false;
            this.currentAudio = null;
            this.playNext(); // ✅ 播放下一个
        };

        audio.onerror = () => {
            console.warn('音频播放失败：', nextUrl);
            this.isPlaying = false;
            this.currentAudio = null;
            this.playNext(); // 失败也继续播后面的
        };

        audio.play().catch(err => {
            console.warn('播放被拦截：', err);
            this.isPlaying = false;
            this.currentAudio = null;
            this.playNext();
        });
    }

    push(url) {
        this.queue.push(url);
        this.playNext();
    }

    stopAll() {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
            } catch (e) {}
            this.currentAudio = null;
        }
        this.queue.length = 0;
        this.isPlaying = false;
    }
}

export const aiAudioPlayer = new AudioQueuePlayer();
