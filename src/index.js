// src/index.js
import GameEngine from "./core/GameEngine.js";

const engine = new GameEngine("game-area"); // monta en <section id="game-area"> del HTML

// init asíncrono (carga mapa y sprites)
await engine.init();

// --- UI de selección de enemigo ---
let selectedBtn = null;
const enemyButtons = document.querySelectorAll(".btn.enemy");

enemyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    if (selectedBtn) selectedBtn.classList.remove("active");
    selectedBtn = btn;
    selectedBtn.classList.add("active");
    engine.selectedType = btn.dataset.type; // 'demonio' | 'dragon' | 'genio' | 'mini-dragon' | 'monstruo'
  });
});

// selecciona por defecto el primero
if (enemyButtons.length) enemyButtons[0].click();

// --- Botón Spawn ---
const spawnBtn = document.getElementById("spawn");
if (spawnBtn) {
  spawnBtn.addEventListener("click", () => {
    engine.spawn(engine.selectedType);
  });
}

// --- Panel de Torres: activar modo colocación ---
const towerItems = document.querySelectorAll('.tower-item');
towerItems.forEach(item => {
  item.addEventListener('click', () => {
    const type = item.dataset.tower || 'basic';
    engine.placementMode = true;
    engine.placementType = type;
    engine.previewTower = null;
    // visual feedback en UI
    towerItems.forEach(i => i.classList.remove('placing'));
    item.classList.add('placing');
    console.log('Modo colocación:', type);
  });
});