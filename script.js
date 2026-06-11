let DATA = null;
let currentView = { type: 'home' };

async function loadData() {
    const stored = localStorage.getItem('azbuka_data');
    if (stored) {
        DATA = JSON.parse(stored);
    } else {
        const resp = await fetch('data.json');
        DATA = await resp.json();
    }
    render();
}

function saveData() {
    localStorage.setItem('azbuka_data', JSON.stringify(DATA));
}

function navigate(view) {
    currentView = view;
    render();
    window.scrollTo(0, 0);
}

function render() {
    const content = document.getElementById('content');
    const breadcrumb = document.getElementById('breadcrumb');

    switch (currentView.type) {
        case 'home':
            breadcrumb.innerHTML = '';
            renderHome(content);
            break;
        case 'section':
            renderBreadcrumb(breadcrumb, [{ label: 'Главная', view: { type: 'home' } }], currentView.section.title);
            renderSection(content, currentView.section);
            break;
        case 'block':
            renderBreadcrumb(breadcrumb, [
                { label: 'Главная', view: { type: 'home' } },
                { label: currentView.section.title, view: { type: 'section', section: currentView.section } }
            ], currentView.block.title);
            renderBlock(content, currentView.section, currentView.block);
            break;
    }
}

function renderBreadcrumb(el, links, current) {
    el.innerHTML = links.map(l =>
        `<a onclick="navigate(${escAttr(JSON.stringify(l.view))})">${l.label}</a><span class="sep">›</span>`
    ).join('') + `<span>${current}</span>`;
}

function escAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderHome(el) {
    el.innerHTML = `<div class="sections-grid">${DATA.sections.map(s => `
        <div class="section-card" onclick="navigate({type:'section', section: DATA.sections[${DATA.sections.indexOf(s)}]})">
            <div class="section-num">Раздел ${s.id}</div>
            <div class="section-title">${s.title}</div>
            <div class="section-info">${s.blocks.length} блок(ов) · ${s.blocks.reduce((a, b) => a + b.modules.length, 0)} модулей</div>
        </div>
    `).join('')}</div>`;
}

function renderSection(el, section) {
    let html = `<div class="blocks-list">`;
    section.blocks.forEach((block, i) => {
        html += `
        <div class="block-card" onclick="navigate({type:'block', section: DATA.sections[${DATA.sections.indexOf(section)}], block: DATA.sections[${DATA.sections.indexOf(section)}].blocks[${i}]})">
            <div>
                <div class="block-num">Блок ${block.id}</div>
                <div class="block-title">${block.title}</div>
                <div class="block-modules-count">${block.modules.length} модулей</div>
            </div>
            <span class="block-arrow">→</span>
        </div>`;
    });

    if (section.formulas) {
        html += `<div class="formulas-item" onclick="openViewer('Формулы: ${section.title}', ${section.formulas.pdfStart}, ${section.formulas.pdfEnd})">
            <span class="module-num">Σ</span>
            <span class="module-name">Основные формулы раздела</span>
        </div>`;
    }

    html += `</div>`;
    el.innerHTML = html;
}

function renderBlock(el, section, block) {
    let html = `<div class="modules-header">
        <h2>Блок ${block.id}: ${block.title}</h2>
        <p>Раздел «${section.title}»</p>
    </div>
    <div class="modules-list">`;

    block.modules.forEach(m => {
        html += `<div class="module-item" onclick="openViewer('Модуль ${m.id}: ${esc(m.title)}', ${m.pdf}, ${getModuleEnd(block, m)})">
            <span class="module-num">М${m.id}</span>
            <span class="module-name">${m.title}</span>
        </div>`;
    });

    if (block.selfCheck) {
        const scEnd = block.pdfEnd || block.selfCheck + 3;
        html += `<div class="self-check-item" onclick="openViewer('Вопросы для самоконтроля', ${block.selfCheck}, ${scEnd})">
            <span class="module-num">?</span>
            <span class="module-name">Вопросы для самоконтроля</span>
        </div>`;
    }

    html += `</div>`;
    el.innerHTML = html;
}

function getModuleEnd(block, module) {
    const idx = block.modules.indexOf(module);
    if (idx < block.modules.length - 1) {
        return block.modules[idx + 1].pdf;
    }
    if (block.selfCheck) return block.selfCheck;
    return block.pdfEnd || module.pdf + 2;
}

function esc(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Viewer
let viewerPages = [];
let viewerIdx = 0;

function openViewer(title, pdfStart, pdfEnd) {
    viewerPages = [];
    for (let p = pdfStart; p < pdfEnd; p++) {
        viewerPages.push(p);
    }
    if (viewerPages.length === 0) viewerPages.push(pdfStart);
    viewerIdx = 0;

    document.getElementById('viewerTitle').textContent = title;
    document.getElementById('viewer').classList.remove('hidden');
    updateViewer();
}

function updateViewer() {
    const page = viewerPages[viewerIdx];
    document.getElementById('viewerImg').src = `pages/page_${page}.png`;
    document.getElementById('viewerPageInfo').textContent = `${viewerIdx + 1} / ${viewerPages.length}`;
    document.getElementById('viewerPrev').disabled = viewerIdx === 0;
    document.getElementById('viewerNext').disabled = viewerIdx === viewerPages.length - 1;
}

document.getElementById('viewerBack').addEventListener('click', () => {
    document.getElementById('viewer').classList.add('hidden');
});

document.getElementById('viewerPrev').addEventListener('click', () => {
    if (viewerIdx > 0) { viewerIdx--; updateViewer(); }
});

document.getElementById('viewerNext').addEventListener('click', () => {
    if (viewerIdx < viewerPages.length - 1) { viewerIdx++; updateViewer(); }
});

document.addEventListener('keydown', e => {
    const viewer = document.getElementById('viewer');
    if (viewer.classList.contains('hidden')) return;
    if (e.key === 'Escape') viewer.classList.add('hidden');
    if (e.key === 'ArrowLeft' && viewerIdx > 0) { viewerIdx--; updateViewer(); }
    if (e.key === 'ArrowRight' && viewerIdx < viewerPages.length - 1) { viewerIdx++; updateViewer(); }
});

// Logo -> home
document.getElementById('logoHome').addEventListener('click', () => navigate({ type: 'home' }));

// Search
const searchInput = document.getElementById('globalSearch');
const searchResults = document.getElementById('searchResults');

searchInput.addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    if (q.length < 2) {
        searchResults.classList.add('hidden');
        return;
    }

    const results = [];
    DATA.sections.forEach(section => {
        section.blocks.forEach(block => {
            block.modules.forEach(m => {
                if (m.title.toLowerCase().includes(q) || String(m.id).includes(q)) {
                    results.push({ module: m, block, section });
                }
            });
        });
    });

    if (results.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item"><span class="module-title">Ничего не найдено</span></div>';
    } else {
        searchResults.innerHTML = results.slice(0, 15).map(r => `
            <div class="search-result-item" onclick="searchOpen(${DATA.sections.indexOf(r.section)}, ${r.section.blocks.indexOf(r.block)}, ${r.module.pdf})">
                <div class="module-title">М${r.module.id}: ${r.module.title}</div>
                <div class="module-path">${r.section.title} → ${r.block.title}</div>
            </div>
        `).join('');
    }
    searchResults.classList.remove('hidden');
});

searchInput.addEventListener('blur', () => {
    setTimeout(() => searchResults.classList.add('hidden'), 200);
});

function searchOpen(sectionIdx, blockIdx, pdfPage) {
    searchInput.value = '';
    searchResults.classList.add('hidden');
    const section = DATA.sections[sectionIdx];
    const block = section.blocks[blockIdx];
    const module = block.modules.find(m => m.pdf === pdfPage);
    if (module) {
        openViewer(`Модуль ${module.id}: ${module.title}`, module.pdf, getModuleEnd(block, module));
    } else {
        openViewer('Страница', pdfPage, pdfPage + 1);
    }
}

// Theme
const themeBtn = document.getElementById('themeToggle');
function setTheme(dark) {
    document.body.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    themeBtn.textContent = dark ? '☀️' : '🌙';
}
themeBtn.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
setTheme(localStorage.getItem('theme') === 'dark');

// Init
loadData();
