class Cozy {
  constructor(path, speed, hp) {
    this.path = path; // Array de waypoints
    this.currentWaypointIndex = 0; // Índice del waypoint actual
    this.x = path[0].x; // Posición inicial
    this.y = path[0].y;
    this.speed = speed; // Píxeles por segundo
    this.hp = hp;
    this.reachedEnd = false;
  }

  update(deltaTime) {
    if (this.reachedEnd) return;

    const currentWaypoint = this.path[this.currentWaypointIndex];
    const nextWaypointIndex = this.currentWaypointIndex + 1;
    if (nextWaypointIndex >= this.path.length) {
      // Llegó al final del camino
      this.reachedEnd = true;
      // Aquí se debería quitar al enemigo y hacer daño al jugador
      return;
    }

    const nextWaypoint = this.path[nextWaypointIndex];

    // Calcular la dirección hacia el siguiente waypoint
    const dx = nextWaypoint.x - this.x;
    const dy = nextWaypoint.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Velocidad por frame (deltaTime en segundos)
    const moveDistance = this.speed * deltaTime;

    if (moveDistance >= distance) {
      // Mover al siguiente waypoint
      this.x = nextWaypoint.x;
      this.y = nextWaypoint.y;
      this.currentWaypointIndex = nextWaypointIndex;
    } else {
      // Mover en la dirección del waypoint
      this.x += (dx / distance) * moveDistance;
      this.y += (dy / distance) * moveDistance;
    }
  }

  draw(ctx) {
    // Dibujar al Cozy (por ejemplo, un círculo)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

// src/entities/Cozy.js
class Cozy {
    constructor(type, path) {
        this.type = type;
        this.path = path; // Array de waypoints [{x, y}, {x, y}, ...]
        this.currentWaypointIndex = 0;
        this.position = { ...path[0] }; // Posición inicial
        this.speed = this.getSpeedByType(type);
        this.hp = this.getHPByType(type);
        this.isActive = true;
        this.progress = 0; // 0 a 1 entre waypoints
    }

    getSpeedByType(type) {
        const speeds = {
            'basic': 2,
            'fast': 4,
            'tank': 1
        };
        return speeds[type] || 2;
    }

    update(deltaTime) {
        if (!this.isActive || this.currentWaypointIndex >= this.path.length - 1) {
            this.isActive = false;
            return;
        }

        const currentWP = this.path[this.currentWaypointIndex];
        const nextWP = this.path[this.currentWaypointIndex + 1];
        
        // Calcular distancia entre waypoints
        const dx = nextWP.x - currentWP.x;
        const dy = nextWP.y - currentWP.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Avanzar progreso
        this.progress += (this.speed * deltaTime) / distance;
        
        if (this.progress >= 1) {
            // Pasar al siguiente waypoint
            this.currentWaypointIndex++;
            this.progress = 0;
            
            if (this.currentWaypointIndex >= this.path.length - 1) {
                this.isActive = false;
                return; // Llegó al final
            }
        } else {
            // Interpolar posición
            this.position.x = currentWP.x + dx * this.progress;
            this.position.y = currentWP.y + dy * this.progress;
        }
    }

    draw(ctx) {
        // Dibujar el Cozy según su tipo
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Cuerpo del Cozy
        ctx.fillStyle = this.getColorByType();
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Ojos
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(-5, -5, 4, 0, Math.PI * 2);
        ctx.arc(5, -5, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Barra de salud
        const healthPercent = this.hp / this.getMaxHP();
        ctx.fillStyle = healthPercent > 0.5 ? 'green' : healthPercent > 0.25 ? 'yellow' : 'red';
        ctx.fillRect(-15, -25, 30 * healthPercent, 4);
        
        ctx.restore();
    }

    getColorByType() {
        const colors = {
            'basic': '#FF6B6B',
            'fast': '#4ECDC4',
            'tank': '#45B7D1'
        };
        return colors[this.type] || '#FF6B6B';
    }

    takeDamage(damage) {
        this.hp -= damage;
        return this.hp <= 0;
    }
}
// En Cozy.js
this.spriteSheet = new Image();
this.spriteSheet.src = 'assets/sprites/cozys.png';
this.spriteSheet.onload = () => {
    // Sprite cargado
};