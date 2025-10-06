// src/core/AnimationManager.js
class AnimationManager {
    constructor() {
        this.animations = new Map();
        this.loadAnimations();
    }

    loadAnimations() {
        // Animaciones para cada tipo de Cozy
        this.animations.set('basic_walk', {
            frames: this.generateFrames(0, 3), // 4 frames
            frameRate: 8,
            currentFrame: 0,
            frameTime: 0
        });

        this.animations.set('fast_walk', {
            frames: this.generateFrames(4, 7),
            frameRate: 12,
            currentFrame: 0,
            frameTime: 0
        });

        this.animations.set('tank_walk', {
            frames: this.generateFrames(8, 11),
            frameRate: 6,
            currentFrame: 0,
            frameTime: 0
        });
    }

    generateFrames(start, end) {
        const frames = [];
        for (let i = start; i <= end; i++) {
            frames.push({
                x: (i % 4) * 64, // Asumiendo sprite sheet 4x4
                y: Math.floor(i / 4) * 64,
                width: 64,
                height: 64
            });
        }
        return frames;
    }

    updateAnimation(animation, deltaTime) {
        animation.frameTime += deltaTime;
        const frameDuration = 1 / animation.frameRate;
        
        if (animation.frameTime >= frameDuration) {
            animation.currentFrame = (animation.currentFrame + 1) % animation.frames.length;
            animation.frameTime = 0;
        }
        
        return animation.frames[animation.currentFrame];
    }
}

// Actualización de la clase Cozy para usar sprites
class Cozy {
    constructor(type, path, animationManager) {
        // ... propiedades anteriores
        this.animationManager = animationManager;
        this.currentAnimation = `${type}_walk`;
        this.direction = 1; // 1 para derecha, -1 para izquierda
    }

    update(deltaTime) {
        // ... lógica de movimiento anterior
        
        // Actualizar dirección basada en el movimiento
        if (this.currentWaypointIndex < this.path.length - 1) {
            const currentWP = this.path[this.currentWaypointIndex];
            const nextWP = this.path[this.currentWaypointIndex + 1];
            this.direction = nextWP.x > currentWP.x ? 1 : -1;
        }
        
        // Actualizar animación
        this.animationManager.updateAnimation(
            this.animationManager.animations.get(this.currentAnimation),
            deltaTime
        );
    }

    draw(ctx) {
        const animation = this.animationManager.animations.get(this.currentAnimation);
        const currentFrame = animation.frames[animation.currentFrame];
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Voltear sprite según dirección
        ctx.scale(this.direction, 1);
        
        // Dibujar sprite (usando imagen o canvas 2D)
        if (this.spriteSheet) {
            ctx.drawImage(
                this.spriteSheet,
                currentFrame.x, currentFrame.y, currentFrame.width, currentFrame.height,
                -20, -20, 40, 40 // Posición y tamaño
            );
        } else {
            // Fallback: dibujar círculo animado
            this.drawFallback(ctx);
        }
        
        // Barra de salud
        this.drawHealthBar(ctx);
        
        ctx.restore();
    }

    drawFallback(ctx) {
        // Animación simple con círculos
        const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 1;
        
        ctx.fillStyle = this.getColorByType();
        ctx.beginPath();
        ctx.arc(0, 0, 15 * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Ojos que parpadean
        const blink = Math.random() > 0.98 ? 0 : 4;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5 * this.direction, -5, blink, 0, Math.PI * 2);
        ctx.arc(5 * this.direction, -5, blink, 0, Math.PI * 2);
        ctx.fill();
    }

    drawHealthBar(ctx) {
        const healthPercent = this.hp / this.getMaxHP();
        ctx.fillStyle = 'black';
        ctx.fillRect(-16, -25, 32, 6);
        ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        ctx.fillRect(-15, -24, 30 * healthPercent, 4);
    }
}