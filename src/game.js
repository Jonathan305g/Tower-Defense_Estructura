<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Juego - Tower Defense Cozy Enemies</title>
    <link rel="stylesheet" href="./styles/index.css" />
  </head>

  <body>
    <div id="game-container">
      <!-- Header del Juego -->
      <header class="game-header">
        <div class="game-title">
          <h1>🏰 Tower Defense</h1>
          <span class="subtitle">Cozy Enemies</span>
        </div>

        <div class="game-controls">
          <!-- 🔹 Botón de Pausa funcional -->
          <button id="pause-btn" class="control-btn">⏸️ Pausa</button>

          <!-- 🔹 Botón de menú (puede implementar más adelante) -->
          <button id="menu-btn" class="control-btn">🏠 Menú</button>

          <!-- ❌ Eliminado botón de sonido -->
          <!-- <button id="sound-btn" class="control-btn">🔊 Sonido</button> -->
        </div>
      </header>

      <!-- Área Principal del Juego -->
      <main class="game-main">
        <!-- Panel de Información -->
        <aside class="game-sidebar">
          <div class="stats-panel">
            <div class="stat-item">
              <span class="stat-label">Salud:</span>
              <span id="health" class="stat-value">100</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Oro:</span>
              <span id="gold" class="stat-value">100</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Oleada:</span>
              <span id="wave" class="stat-value">1/5</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Puntuación:</span>
              <span id="score-value" class="stat-value">0</span>
            </div>
          </div>

          <!-- Panel de Torres -->
          <div class="towers-panel">
            <h3>🏗️ Torres Disponibles</h3>
            <div class="towers-list">
              <div class="tower-item" data-tower="basic">
                <span class="tower-icon">⚔️</span>
                <span class="tower-name">Básica</span>
                <span class="tower-cost">50</span>
              </div>
              <div class="tower-item" data-tower="rapid">
                <span class="tower-icon">🎯</span>
                <span class="tower-name">Rápida</span>
                <span class="tower-cost">75</span>
              </div>
              <div class="tower-item" data-tower="powerful">
                <span class="tower-icon">💥</span>
                <span class="tower-name">Poderosa</span>
                <span class="tower-cost">100</span>
              </div>
            </div>
          </div>

          <!-- Controles de Deshacer/Rehacer -->
          <div class="undo-redo-panel">
            <button id="undo-btn" class="undo-redo-btn" disabled>↶ Deshacer</button>
            <button id="redo-btn" class="undo-redo-btn" disabled>↷ Rehacer</button>
          </div>
        </aside>

        <!-- Área de Juego -->
        <section id="game-area" class="game-area">
          <!-- 🔹 Overlay de Pausa -->
          <div id="pause-overlay" class="overlay hidden">
            <div class="overlay-content">
              <h2>⏸️ Juego Pausado</h2>
              <button id="resume-btn" class="btn btn-primary">Continuar</button>
              <button id="restart-btn" class="btn btn-secondary">Reiniciar</button>
              <button id="quit-btn" class="btn btn-secondary">Salir al Menú</button>
            </div>
          </div>

          <!-- Overlay de Game Over -->
          <div id="gameover-overlay" class="overlay hidden">
            <div class="overlay-content">
              <h2>💀 Game Over</h2>
              <p>Tu puntuación final: <span id="final-score">0</span></p>
              <button id="restart-game-btn" class="btn btn-primary">Jugar de Nuevo</button>
              <button id="menu-game-btn" class="btn btn-secondary">Menú Principal</button>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- Phaser -->
    <script src="./vendor/phaser/phaser.min.js"></script>

    <!-- Juego principal -->
    <script type="module">
      import GameEngine from './src/core/GameEngine.js';
      const game = new GameEngine();
      window.game = game;
      game.start();

      // 🔹 Control del botón de pausa
      const pauseBtn = document.getElementById('pause-btn');
      const pauseOverlay = document.getElementById('pause-overlay');
      const resumeBtn = document.getElementById('resume-btn');

      pauseBtn.addEventListener('click', () => {
        game.togglePause();
        pauseOverlay.classList.toggle('hidden', !game.isPaused);
      });

      resumeBtn.addEventListener('click', () => {
        game.togglePause();
        pauseOverlay.classList.add('hidden');
      });
    </script>
  </body>
</html>
