// src/entities/Tower.js
// Torre con sprites. Contiene lógica de combate, dibujo y mejora.
class Tower {
  constructor({ x = 0, y = 0, type = 'basic', cost = 50, range = 80, damage = 10, level = 1, id = null, assetLoader = null } = {}) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.cost = cost;
    this.level = level;
    this.id = id || (Date.now() + Math.random());
    this.selected = false;
    this.assetLoader = assetLoader;
    this.showRangeUntil = Date.now() + 3000; // Mostrar rango por 3 segundos después de colocar
    
    // Estadísticas base según tipo
    const stats = this._getBaseStats(type);
    this.range = stats.range;
    this.damage = stats.damage;
    this.fireRate = stats.fireRate; // disparos por segundo
    this.lastShot = 0;
    
    // Aplicar mejoras de nivel
    this._applyLevelStats();
  }
  
  _getBaseStats(type) {
    const baseStats = {
      basic: { range: 100, damage: 15, fireRate: 1.8 },     // Disparo cada 0.56s
      rapid: { range: 85, damage: 8, fireRate: 4.0 },       // Disparo cada 0.25s
      powerful: { range: 120, damage: 35, fireRate: 1.2 }   // Disparo cada 0.83s
    };
    return baseStats[type] || baseStats.basic;
  }
  
  _applyLevelStats() {
    // Cada nivel mejora las estadísticas
    const levelMultiplier = 1 + (this.level - 1) * 0.2; // 20% por nivel
    this.damage = Math.round(this.damage * levelMultiplier);
    this.range = Math.round(this.range * (1 + (this.level - 1) * 0.1)); // 10% rango por nivel
  }

  draw(ctx) {
    if (!ctx) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Dibujar sprite de la torre o fallback
    let spriteDrawn = false;
    if (this.assetLoader) {
      const sprite = this.assetLoader.getTowerSprite(this.type);
      if (sprite) {
        const size = this._getTowerSize();
        ctx.drawImage(sprite, -size/2, -size/2, size, size);
        spriteDrawn = true;
      }
    }
    
    // Si no hay sprite, usar fallback mejorado
    if (!spriteDrawn) {
      this._drawFallback(ctx);
    }

    // Level badge
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.beginPath();
    ctx.arc(15, -15, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.level, 15, -15);

    // Range indicator (when selected or recently placed)
    if (this.selected || Date.now() < this.showRangeUntil) {
      ctx.beginPath();
      ctx.strokeStyle = this.selected ? 'rgba(100,150,255,0.6)' : 'rgba(255,215,0,0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.arc(0, 0, this.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }
  
  _getTowerSize() {
    const baseSizes = {
      basic: 40,
      rapid: 35,
      powerful: 45
    };
    const baseSize = baseSizes[this.type] || 40;
    return baseSize + (this.level - 1) * 3; // Crece con el nivel
  }
  
  _drawFallback(ctx) {
    // Torre visual mejorada sin sprite
    const size = this._getTowerSize();
    const colors = this._getColors();
    
    // Base de la torre
    ctx.fillStyle = colors.base;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Estructura de la torre según tipo
    if (this.type === 'basic') {
      // Torre cuadrada básica
      ctx.fillStyle = colors.structure;
      ctx.fillRect(-size/3, -size/3, size*2/3, size*2/3);
      ctx.strokeRect(-size/3, -size/3, size*2/3, size*2/3);
    } else if (this.type === 'rapid') {
      // Torre con múltiples cañones
      ctx.fillStyle = colors.structure;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const x = Math.cos(angle) * size/4;
        const y = Math.sin(angle) * size/4;
        ctx.beginPath();
        ctx.arc(x, y, size/8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else if (this.type === 'powerful') {
      // Torre alta con cañón grande
      ctx.fillStyle = colors.structure;
      ctx.fillRect(-size/4, -size/2, size/2, size);
      ctx.strokeRect(-size/4, -size/2, size/2, size);
      
      // Cañón
      ctx.fillStyle = colors.cannon;
      ctx.fillRect(-size/6, -size/3, size/3, size/6);
      ctx.strokeRect(-size/6, -size/3, size/3, size/6);
    }
    
    // Icono central
    ctx.fillStyle = colors.text;
    ctx.font = `bold ${Math.floor(size/3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._getLabel(), 0, 0);
  }

  drawPreview(ctx) {
    if (!ctx) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    // preview body
    ctx.beginPath();
    ctx.fillStyle = 'rgba(100,100,100,0.35)';
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // preview range
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(100,150,255,0.25)';
    ctx.lineWidth = 1;
    ctx.arc(0, 0, this.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  containsPoint(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= 16 * 16;
  }

  upgrade() {
    this.level += 1;
    this._applyLevelStats();
  }
  
  // Buscar enemigo más cercano dentro del rango
  findTarget(enemies) {
    let closestEnemy = null;
    let closestDistance = this.range + 1;
    
    for (const enemy of enemies) {
      if (!enemy.isActive || enemy.state === 'death') continue;
      
      const dx = enemy.position.x - this.x;
      const dy = enemy.position.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= this.range && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }
    
    return closestEnemy;
  }
  
  // Verificar si puede disparar
  canShoot(currentTime) {
    const timeSinceLastShot = (currentTime - this.lastShot) / 1000;
    return timeSinceLastShot >= (1 / this.fireRate);
  }
  
  // Disparar a un enemigo
  shoot(target, currentTime) {
    if (!this.canShoot(currentTime)) return false;
    
    // Aplicar daño inmediatamente (proyectil instantáneo por simplicidad)
    const killed = target.takeDamage(this.damage);
    this.lastShot = currentTime;
    
    return { target, damage: this.damage, killed };
  }
  
  // Actualizar lógica de combate
  update(enemies, currentTime) {
    const target = this.findTarget(enemies);
    if (target && this.canShoot(currentTime)) {
      return this.shoot(target, currentTime);
    }
    return null;
  }

  _getLabel() {
    const map = { basic: 'B', rapid: 'R', powerful: 'P' };
    return map[this.type] || this.type.charAt(0).toUpperCase();
  }

  _getColors() {
    switch (this.type) {
      case 'rapid':
        return { 
          base: '#ffeaa7', 
          structure: '#fdcb6e', 
          stroke: '#e67e22', 
          text: '#2d3436',
          cannon: '#e17055'
        };
      case 'powerful':
        return { 
          base: '#fab1a0', 
          structure: '#e84393', 
          stroke: '#d63031', 
          text: '#ffffff',
          cannon: '#a29bfe'
        };
      default:
        return { 
          base: '#74b9ff', 
          structure: '#0984e3', 
          stroke: '#2d3436', 
          text: '#ffffff',
          cannon: '#00b894'
        };
    }
  }
}

export default Tower;
