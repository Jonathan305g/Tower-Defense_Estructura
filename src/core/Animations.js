class Animation {
    constructor(spritesheet, frameCount, frameRate, loop = true) {
        this.spritesheet = spritesheet;
        this.frameCount = frameCount;
        this.frameRate = frameRate;
        this.loop = loop;
        this.currentFrame = 0;
        this.frameTime = 0;
        this.isFinished = false;
        
        this.frameWidth = spritesheet.width / frameCount;
        this.frameHeight = spritesheet.height;
    }

    update(deltaTime) {
        if (this.isFinished && !this.loop) return;

        this.frameTime += deltaTime;
        const frameDuration = 1 / this.frameRate;

        if (this.frameTime >= frameDuration) {
            this.currentFrame++;
            this.frameTime = 0;

            if (this.currentFrame >= this.frameCount) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frameCount - 1;
                    this.isFinished = true;
                }
            }
        }
    }

    getCurrentFrame() {
        return {
            x: this.currentFrame * this.frameWidth,
            y: 0,
            width: this.frameWidth,
            height: this.frameHeight
        };
    }

    reset() {
        this.currentFrame = 0;
        this.frameTime = 0;
        this.isFinished = false;
    }
}

export default Animation;