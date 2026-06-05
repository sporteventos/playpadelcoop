const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'data.json');
const data = JSON.parse(fs.readFileSync(src, 'utf8'));

// Step 1: extract unique player names from all games
const playerMap = {};  // name -> id
let pCount = 0;

for (const jogo of data.jogos) {
  for (const pair of [jogo.eq1, jogo.eq2]) {
    if (!pair || /^\s*A Definir\s*$/.test(pair)) continue;
    for (const part of pair.split('&')) {
      const n = part.trim();
      if (n && n !== 'A Definir' && !playerMap[n]) {
        pCount++;
        playerMap[n] = `j${pCount}`;
      }
    }
  }
}
console.log(`Unique players found: ${pCount}`);

// Step 2: build jogadores with phone data preserved
const tels = data.telefones || {};
const jogadores = Object.entries(playerMap)
  .sort((a, b) => parseInt(a[1].slice(1)) - parseInt(b[1].slice(1)))
  .map(([nome, id]) => ({ id, nome, tel: tels[nome] || '' }));

// Step 3: extract unique pair+group combos as duplas
const duplaMap = {};  // "pair|grupo" -> dupla object
let dCount = 0;

for (const jogo of data.jogos) {
  const g = jogo.grupo;
  for (const pair of [jogo.eq1, jogo.eq2]) {
    if (!pair || /^\s*A Definir\s*$/.test(pair)) continue;
    const key = `${pair}|${g}`;
    if (!duplaMap[key]) {
      dCount++;
      const parts = pair.split('&').map(s => s.trim());
      duplaMap[key] = {
        id: `d${dCount}`,
        j1: playerMap[parts[0]] || null,
        j2: playerMap[parts[1]] || null,
        grupo: g
      };
    }
  }
}
console.log(`Unique duplas found: ${dCount}`);

const duplas = Object.values(duplaMap)
  .sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));

// Step 4: write updated data.json
data.jogadores = jogadores;
data.duplas = duplas;
data._updated = new Date().toISOString();

fs.writeFileSync(src, JSON.stringify(data, null, 2), 'utf8');
console.log(`Migration complete. jogadores=${jogadores.length}, duplas=${duplas.length}`);
