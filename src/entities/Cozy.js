import Animation from '../core/Animation.js';

class Cozy {
    constructor(type, path, assetLoader) {
        this.type = type;
        this.path = path;
        this.currentWaypointIndex = 0;
        this.position = { ...path[0] };
        this.animations = new Map();
        this.state = 'walk'; // Cambiado de 'move' a 'walk'
        this.direction = 1;
        this.isActive = true;
        this.speed = this.getSpeedByType(type);
        this.hp = this.getHPByType(type);
        this.maxHp = this.hp;
        this.progress = 0;
        this.reward = this.getRewardByType(type);

        this.setupAnimations(assetLoader);
    }

    setupAnimations(assetLoader) {
        const walkSprite = assetLoader.getEnemySprite(this.type, 'walk'); // Cambiado de 'move' a 'walk'
        const attackSprite = assetLoader.getEnemySprite(this.type, 'attack');
        const deathSprite = assetLoader.getEnemySprite(this.type, 'death');

        if (walkSprite) {
            this.animations.set('walk', new Animation(walkSprite, 4, 8, true)); // Cambiado de 'move' a 'walk'
        }
        
        if (attackSprite) {
            this.animations.set('attack', new Animation(attackSprite, 4, 6, false));
        }
        
        if (deathSprite) {
            this.animations.set('death', new Animation(deathSprite, 4, 4, false));
        }
    }

    getSpeedByType(type) {
        const speeds = {
            'monstruo': 1.0,
            'demonio': 1.5,
            'genio': 0.8,
            'dragon': 0.6,
            'mini-dragon': 2.0
        };
        return speeds[type] || 1.0;
    }

    getHPByType(type) {
        const health = {
            'monstruo': 100,
            'demonio': 80,
            'genio': 120,
            'dragon': 200,
            'mini-dragon': 60
        };
        return health[type] || 100;
    }

    getRewardByType(type) {
        const rewards = {
            'monstruo': 10,
            'demonio': 15,
            'genio': 20,
            'dragon': 30,
            'mini-dragon': 8
        };
        return rewards[type] || 10;
    }

    setState(newState) {
        if (this.state === newState || this.state === 'death') return;
        
        const currentAnimation = this.animations.get(this.state);
        if (currentAnimation) {
            currentAnimation.reset();
        }

        this.state = newState;
        
        const newAnimation = this.animations.get(newState);
        if (newAnimation) {
            newAnimation.reset();
        }

        if (newState === 'death') {
            setTimeout(() => {
                this.isActive = false;
            }, 1000);
        }
    }

    update(deltaTime) {
        if (!this.isActive) return;

        const animation = this.animations.get(this.state);
        if (animation) {
            animation.update(deltaTime);
        }

        if (this.state === 'death') return;

        if (this.currentWaypointIndex < this.path.length - 1) {
            const currentWP = this.path[this.currentWaypointIndex];
            const nextWP = this.path[this.currentWaypointIndex + 1];
            
            const dx = nextWP.x - currentWP.x;
            const dy = nextWP.y - currentWP.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.progress += (this.speed * deltaTime) / distance;
            
            if (this.progress >= 1) {
                this.currentWaypointIndex++;
                this.progress = 0;
                
                if (this.currentWaypointIndex >= this.path.length - 1) {
                    this.reachedEnd();
                    return;
                }
            } else {
                this.position.x = currentWP.x + dx * this.progress;
                this.position.y = currentWP.y + dy * this.progress;
            }

            if (dx !== 0) {
                this.direction = dx > 0 ? 1 : -1;
            }
        }
    }

    reachedEnd() {
        this.isActive = false;
    }

    takeDamage(damage) {
        this.hp -= damage;
        if (this.hp <= 0) {
            this.setState('death');
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (!this.isActive) return;

        const animation = this.animations.get(this.state);
        if (!animation || !animation.spritesheet) {
            this.drawFallback(ctx);
            return;
        }

        const frame = animation.getCurrentFrame();

        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.scale(this.direction, 1);
        
        ctx.drawImage(
            animation.spritesheet,
            frame.x, frame.y, frame.width, frame.height,
            -frame.width/2, -frame.height/2, frame.width, frame.height
        );

        this.drawHealthBar(ctx);
        ctx.restore();
    }

    drawFallback(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        ctx.fillStyle = this.getColorByType();
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type, 0, 25);
        
        ctx.restore();
    }

    drawHealthBar(ctx) {
        const healthPercent = this.hp / this.maxHp;
        const barWidth = 30;
        const barHeight = 4;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(-barWidth/2, -25, barWidth, barHeight);
        
        if (healthPercent > 0.6) {
            ctx.fillStyle = '#4CAF50';
        } else if (healthPercent > 0.3) {
            ctx.fillStyle = '#FFC107';
        } else {
            ctx.fillStyle = '#F44336';
        }
        
        ctx.fillRect(-barWidth/2, -25, barWidth * healthPercent, barHeight);
    }

    getColorByType() {
        const colors = {
            'monstruo': '#FF6B6B',
            'demonio': '#DC143C',
            'genio': '#4ECDC4',
            'dragon': '#45B7D1',
            'mini-dragon': '#96CEB4'
        };
        return colors[this.type] || '#666666';
    }
}

export default Cozy;