let medications = [];

const queryInput = document.getElementById('query');
const searchButton = document.getElementById('search');
const resultOutput = document.getElementById('result');
const statusEl = document.getElementById('status');

async function init() {
  statusEl.textContent = 'Carregando dados…';
  searchButton.disabled = true;

  try {
    const response = await fetch('./data/REME_DF_subsecao_a.csv');
    if (!response.ok) throw new Error('Falha ao carregar CSV');
    const text = await response.text();
    medications = parseCSV(text);
    statusEl.textContent = `${medications.length} medicamentos disponíveis`;
    searchButton.disabled = false;
    queryInput.focus();
  } catch {
    statusEl.textContent = 'Erro ao carregar dados. Verifique a conexão.';
  }
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  }).filter(m => m['DESCRIÇÃO']);
}

function normalize(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function search(query) {
  const q = normalize(query);
  return medications.filter(m => normalize(m['DESCRIÇÃO']).includes(q));
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlight(text, query) {
  const nfc = text.normalize('NFC');
  const normText = normalize(nfc);
  const normQuery = normalize(query);
  const idx = normText.indexOf(normQuery);

  if (idx === -1) return escapeHtml(nfc);

  const before = escapeHtml(nfc.slice(0, idx));
  const match = escapeHtml(nfc.slice(idx, idx + query.length));
  const after = escapeHtml(nfc.slice(idx + query.length));
  return `${before}<mark>${match}</mark>${after}`;
}

function renderResults(results, query) {
  if (!results.length) {
    resultOutput.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Nenhum medicamento encontrado para <strong>"${escapeHtml(query)}"</strong>.</p>
        <p class="hint">Tente um nome parcial, ex: "acido" ou "amox".</p>
      </div>`;
    return;
  }

  const plural = results.length !== 1;
  const count = `<p class="result-count">${results.length} medicamento${plural ? 's' : ''} encontrado${plural ? 's' : ''}</p>`;

  const cards = results.map(m => `
    <div class="card">
      <div class="card-title">${highlight(m['DESCRIÇÃO'], query)}</div>
      ${m['GRUPO FARMACOLÓGICO'] ? `<div class="card-group">${escapeHtml(m['GRUPO FARMACOLÓGICO'])}</div>` : ''}
      <div class="card-pharmacy">
        <span class="pharmacy-label">Farmácia</span>
        <span class="pharmacy-value">${escapeHtml(m['FARMÁCIA'] || 'Não informado')}</span>
      </div>
    </div>`).join('');

  resultOutput.innerHTML = count + cards;
}

function doSearch() {
  const value = queryInput.value.trim();

  if (!value) {
    resultOutput.innerHTML = '';
    return;
  }

  if (value.length < 2) {
    resultOutput.innerHTML = '<p class="hint-msg">Digite pelo menos 2 caracteres para pesquisar.</p>';
    return;
  }

  renderResults(search(value), value);
}

searchButton.addEventListener('click', doSearch);
queryInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

let debounceTimer;
queryInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(doSearch, 300);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

init();
