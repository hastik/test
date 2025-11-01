import { Economy } from "./economy.js";
import { startTicker } from "./tick.js";
import { formatInt, formatNumber } from "./format.js";
import { loadSave, setupAutoSave } from "./save.js";

async function fetchJSON(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}`);
  }
  return response.json();
}

function setupUI(economy, offlineInfo) {
  const refs = {
    total: document.getElementById("resource-total"),
    rate: document.getElementById("resource-rate"),
    click: document.getElementById("click-value"),
    button: document.getElementById("main-click"),
    offline: document.getElementById("offline-gain"),
    buildings: document.getElementById("buildings-list"),
    upgrades: document.getElementById("upgrades-list")
  };

  const buildingCards = new Map();
  for (const building of economy.buildingData) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-title">${building.name}</div>
          <div class="card-subtitle">${building.description}</div>
        </div>
        <div class="stat-line">
          <span class="label">Owned</span>
          <span class="value" data-owned>0</span>
        </div>
      </div>
      <div class="card-footer">
        <div class="stat-line">
          <span class="label">Production</span>
          <span class="value" data-production>0</span>
        </div>
        <button class="action-button" data-buy>Buy <span data-cost>0</span></button>
      </div>`;
    refs.buildings.append(card);

    const owned = card.querySelector("[data-owned]");
    const production = card.querySelector("[data-production]");
    const cost = card.querySelector("[data-cost]");
    const button = card.querySelector("[data-buy]");
    button.addEventListener("click", () => economy.buyBuilding(building.id) && renderAll());
    buildingCards.set(building.id, { owned, production, cost, button, card });
  }

  const upgradeCards = new Map();
  for (const upgrade of economy.upgradeData) {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <div class="card-header">
        <div class="card-title">${upgrade.name}</div>
      </div>
      <div class="card-subtitle">${upgrade.description}</div>
      <div class="card-footer">
        <div class="stat-line">
          <span class="label">Cost</span>
          <span class="value" data-cost>0</span>
        </div>
        <button class="action-button" data-buy>Purchase</button>
      </div>`;
    refs.upgrades.append(card);

    const cost = card.querySelector("[data-cost]");
    const button = card.querySelector("[data-buy]");
    button.addEventListener("click", () => economy.buyUpgrade(upgrade.id) && renderAll());
    upgradeCards.set(upgrade.id, { cost, button, card });
  }

  refs.button.addEventListener("click", () => {
    economy.click();
    renderAll();
  });

  const renderResources = () => {
    const rate = economy.productionRate();
    const click = economy.clickPower();
    const clickDisplay = formatNumber(click, click < 10 ? 2 : 1);
    refs.total.textContent = formatNumber(economy.resourcesAmount, economy.resourcesAmount < 100 ? 2 : 1);
    refs.rate.textContent = `${formatNumber(rate, rate < 100 ? 2 : 1)}/s`;
    refs.click.textContent = clickDisplay;
    refs.button.textContent = `Mint +${clickDisplay} Credits`;
  };

  const renderBuildings = () => {
    for (const [id, elements] of buildingCards) {
      const state = economy.buildingState(id);
      if (!state) continue;
      elements.owned.textContent = formatInt(state.owned);
      elements.production.textContent = `${formatNumber(state.production, state.production < 10 ? 2 : 1)}/s`;
      elements.cost.textContent = formatInt(state.nextCost);
      elements.button.disabled = !state.canAfford;
    }
  };

  const renderUpgrades = () => {
    for (const [id, elements] of upgradeCards) {
      const state = economy.upgradeState(id);
      if (!state) continue;
      elements.cost.textContent = formatInt(state.cost);
      elements.button.disabled = !state.canAfford;
      elements.card.classList.toggle("purchased", state.purchased);
    }
  };

  const renderAll = () => {
    renderResources();
    renderBuildings();
    renderUpgrades();
  };

  if (offlineInfo?.offlineGain > 0) {
    refs.offline.textContent = `Welcome back! +${formatNumber(offlineInfo.offlineGain, 2)} credits earned while away (${Math.floor(offlineInfo.elapsed)}s).`;
  } else {
    refs.offline.textContent = "";
  }

  return { renderAll, renderResources };
}

async function bootstrap() {
  try {
    const [buildings, upgrades] = await Promise.all([
      fetchJSON("./buildings.json"),
      fetchJSON("./upgrades.json")
    ]);

    const economy = new Economy({ buildings, upgrades });
    const savedSnapshot = loadSave();
    const offlineInfo = economy.hydrate(savedSnapshot);

    const ui = setupUI(economy, offlineInfo);
    ui.renderAll();

    startTicker(economy, () => ui.renderAll());
    setupAutoSave(() => economy.snapshot());
  } catch (error) {
    console.error(error);
    const offlineEl = document.getElementById("offline-gain");
    offlineEl.textContent = "Something went wrong while booting the simulation.";
  }
}

window.addEventListener("DOMContentLoaded", bootstrap);
