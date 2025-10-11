import Animation from "../core/Animations.js";

class Cozy {
  constructor(type, path, assetLoader) {
    this.type = type;
    this.path = Array.isArray(path) ? path : [];
    this.currentWaypointIndex = 0;

    // posición y flags iniciales
    const p0 = this.path[0] || { x: 0, y: 0 };
    this.position = { x: p0.x, y: p0.y };
    this.x = p0.x; // (si algún código externo lee x/y)
    this.y = p0.y;

    this.animations = new Map();
    this.state = "walk";
    this.direction = 1;
    this.isActive = this.path.length > 0;
    if (!this.isActive) console.warn("Cozy creado sin path válido");

    this.speed = this.getSpeedByType(type);
    this.hp = this.getHPByType(type);
    this.maxHp = this.hp;
    this.progress = 0;
    this.reward = this.getRewardByType(type);
    this.baseDamage = this.getBaseDamageByType(type);

    // Verifica que el path tenga al menos un punto
    if (this.path.length > 0) {
      this.position = { ...this.path[0] };
      this.x = this.path[0].x;
      this.y = this.path[0].y;
    } else {
      this.position = { x: 0, y: 0 };
      this.x = 0;
      this.y = 0;
      this.isActive = false; // No puede moverse si no hay path
      console.warn("Cozy creado sin path válido");
    }

    this.setupAnimations(assetLoader);
  }

  setupAnimations(assetLoader) {
    const walkSprite = assetLoader.getEnemySprite(this.type, "walk");
    const attackSprite = assetLoader.getEnemySprite(this.type, "attack");
    const deathSprite = assetLoader.getEnemySprite(this.type, "death");

    // Ajusta los frames según el tipo de enemigo
    let walkFrames = 6; // Valor por defecto
    if (this.type === "enemigoConMenosFrames") {
        walkFrames = 4; // Cambia los frames a 4 si este enemigo tiene menos frames
    }

    this.animations.set('walk', new Animation(walkSprite, walkFrames, 5)); 
    this.animations.set('attack', new Animation(attackSprite, 6, 5)); 
    this.animations.set('death', new Animation(deathSprite, 6, 5)); 

    // Inicializa la animación sin duplicación
    this.animations.get('walk').currentFrame = 0;
    this.animations.get('walk').frameTime = 0;
    this.animations.get('walk').isFinished = false;
}

  update(deltaTime) {
    if (this.state === "walk") {
      // Only update the animation if it is not finished
      if (!this.animations.get('walk').isFinished) {
        this.animations.get('walk').update(deltaTime);
      }
    }
  }

  getSpeedByType(type) {
    const speeds = {
      monstruo: 20.0,
      demonio: 8.5,
      genio: 7.8,
      dragon: 7.6,
      "mini-dragon": 10.0,
    };
    return speeds[type] ?? 1.0;
  }

  getHPByType(type) {
    const health = {
      monstruo: 100,
      demonio: 80,
      genio: 120,
      dragon: 200,
      "mini-dragon": 60,
    };
    return health[type] ?? 100;
  }

  getRewardByType(type) {
    const rewards = {
      monstruo: 10,
      demonio: 15,
      genio: 20,
      dragon: 30,
      "mini-dragon": 8,
    };
    return rewards[type] ?? 10;
  }

  getBaseDamageByType(type) {
  const dmg = {
    monstruo: 1,
    demonio: 1,
    genio: 2,
    dragon: 3,
    "mini-dragon": 1,
  };
  return dmg[type] ?? 1;
}

  setState(newState) {
    if (this.state === newState || this.state === "death") return;

    const currentAnimation = this.animations.get(this.state);
    if (currentAnimation?.reset) currentAnimation.reset();

    this.state = newState;

    const newAnimation = this.animations.get(newState);
    if (newAnimation?.reset) newAnimation.reset();

    if (newState === "death") {
      setTimeout(() => {
        this.isActive = false;
      }, 1000);
    }
  }

  update(deltaTime) {
    if (!this.isActive) return;

    const animation = this.animations.get(this.state);
    animation?.update?.(deltaTime);

    if (this.state === "death") return;

    if (this.currentWaypointIndex < this.path.length - 1) {
      const currentWP = this.path[this.currentWaypointIndex];
      const nextWP = this.path[this.currentWaypointIndex + 1];

      const dx = nextWP.x - currentWP.x;
      const dy = nextWP.y - currentWP.y;
      const distance = Math.hypot(dx, dy) || 1; // evita división por cero

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
        // espejo horizontal según dirección X
        if (dx !== 0) this.direction = dx > 0 ? 1 : -1;
      }
    }
  }

  reachedEnd() {
    this.isActive = false;
  }

  takeDamage(damage) {
    this.hp -= damage;
    if (this.hp <= 0) {
      // ✅ corregido
      this.setState("death");
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

    const frame = animation.getCurrentFrame?.();
    if (!frame) {
      this.drawFallback(ctx);
      return;
    }

    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.scale(this.direction, 1);

    ctx.drawImage(
      animation.spritesheet,
      frame.x,
      frame.y,
      frame.width,
      frame.height,
      -frame.width / 2,
      -frame.height / 2,
      frame.width,
      frame.height
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
    ctx.fillStyle = "white";
    ctx.font = "10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(this.type, 0, 25);
    ctx.restore();
  }

  drawHealthBar(ctx) {
    const healthPercent = Math.max(0, this.hp / this.maxHp);
    const barWidth = 30,
      barHeight = 4;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(-barWidth / 2, -25, barWidth, barHeight);
    ctx.fillStyle =
      healthPercent > 0.6
        ? "#4CAF50"
        : healthPercent > 0.3
        ? "#FFC107"
        : "#F44336";
    ctx.fillRect(-barWidth / 2, -25, barWidth * healthPercent, barHeight);
  }

  getColorByType() {
    const colors = {
      monstruo: "#FF6B6B",
      demonio: "#DC143C",
      genio: "#4ECDC4",
      dragon: "#45B7D1",
      "mini-dragon": "#96CEB4",
    };
    return colors[this.type] || "#666666";
  }
}

export default Cozy;
