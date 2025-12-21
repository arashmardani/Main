let map, provincesLayer, countiesLayer, projectsLayer;
let selectedLayer = null, selectedCountyLayer = null, selectedProjectMarker = null;
let currentProjectId = null;

const projectIcon = L.divIcon({
    className: 'project-marker',
    html: '<div style="background:#8b5cf6;width:12px;height:12px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px #8b5cf6;"></div>',
    iconSize: [18,18],
    iconAnchor: [9,9]
});

document.addEventListener("DOMContentLoaded", async () => {
    // ایجاد نقشه
    map = L.map('map').setView([32.4279, 53.6880], 5);

    const basemapLayers = {
        carto: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© CartoDB' }),
        persiangis: L.tileLayer('https://map.persiangis.ir/tile/{z}/{x}/{y}.png', { attribution: '© PersianGIS' }),
        satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' }),
        light: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { attribution: '© CartoDB' }),
        osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' })
    };

    let currentBasemap = basemapLayers.carto;
    currentBasemap.addTo(map);

    document.getElementById('basemapSelect').addEventListener('change', (e) => {
        map.removeLayer(currentBasemap);
        currentBasemap = basemapLayers[e.target.value];
        currentBasemap.addTo(map);
    });

    // لود داده‌ها
    const [provinces, counties, projects] = await Promise.all([
        fetch('ir-new.json').then(r => r.json()),
        fetch('counties.json').then(r => r.json()),
        fetch('Projects.json').then(r => r.json())
    ]);

    // لایه استان‌ها
    provincesLayer = L.geoJSON(provinces, {
        style: () => ({
            fillColor: '#3498db',
            weight: 2,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.3
        }),
        onEachFeature: (feature, layer) => {
            layer.on({
                click: () => onProvinceClick(feature, layer)
            });
        }
    }).addTo(map);

    // لایه شهرستان‌ها (ابتدا مخفی)
    countiesLayer = L.geoJSON(counties, {
        style: () => ({
            fillColor: '#e67e22',
            weight: 1.5,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.4
        }),
        onEachFeature: (feature, layer) => {
            layer.on({
                click: () => onCountyClick(feature, layer)
            });
        }
    });

    // لایه پروژه‌ها
    projectsLayer = L.geoJSON(projects, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: projectIcon }),
        onEachFeature: (feature, layer) => {
            layer.on({
                click: () => onProjectClick(feature, layer)
            });
        }
    }).addTo(map);

    // کنترل پنل موبایل
    const panel = document.getElementById('infoPanel');
    const fab = document.getElementById('fabToggle');
    fab.addEventListener('click', () => {
        panel.classList.toggle('open');
        fab.textContent = panel.classList.contains('open') ? '✕' : 'ℹ️';
    });

    // زوم به ایران
    document.getElementById('zoomIranBtn').addEventListener('click', zoomToIran);
});

function showInPanel(html) {
    document.getElementById('panelContent').innerHTML = html;
}

function onProvinceClick(feature, layer) {
    if (selectedLayer) provincesLayer.resetStyle(selectedLayer);
    if (selectedCountyLayer) countiesLayer.resetStyle(selectedCountyLayer);
    if (countiesLayer) map.removeLayer(countiesLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);

    layer.setStyle({ fillOpacity: 0.7, weight: 4 });
    selectedLayer = layer;

    const p = feature.properties;
    showInPanel(`
        <div class="accordion-section">
            <div class="accordion-title">${getText('accordion_province')}</div>
            <div class="accordion-content">
                <div class="province-info">
                    <h3>${p.pname || p.Name}</h3>
                    <div class="info-item"><span class="info-label">${getText('province_population')}</span><span class="info-value">${p.population?.toLocaleString('fa-IR') || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label">${getText('province_capita')}</span><span class="info-value">${p.P_capita?.toFixed(2) || 'نامشخص'}</span></div>
                </div>
            </div>
        </div>
    `);
    document.getElementById('fixedContributeBtn').style.display = 'none';
    setupAccordion();
}

function onCountyClick(feature, layer) {
    if (selectedCountyLayer) countiesLayer.resetStyle(selectedCountyLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);

    layer.setStyle({ fillOpacity: 0.7, weight: 3 });
    selectedCountyLayer = layer;

    const c = feature.properties;
    showInPanel(`
        <div class="accordion-section">
            <div class="accordion-title">${getText('accordion_county')}</div>
            <div class="accordion-content">
                <div class="province-info">
                    <h3>${c.cname || c.Name}</h3>
                    <div class="info-item"><span class="info-label">${getText('county_capita')}</span><span class="info-value">${c.C_capita?.toFixed(2) || 'نامشخص'}</span></div>
                </div>
            </div>
        </div>
    `);
    document.getElementById('fixedContributeBtn').style.display = 'none';
    setupAccordion();
}

function onProjectClick(feature, layer) {
    if (selectedLayer) provincesLayer.resetStyle(selectedLayer);
    if (selectedCountyLayer) countiesLayer.resetStyle(selectedCountyLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);

    layer.setIcon(L.divIcon({
        className: 'project-marker-selected',
        html: '<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:4px solid white;box-shadow:0 0 15px #10b981;animation:pulse 2s infinite;"></div>',
        iconSize: [24,24],
        iconAnchor: [12,12]
    }));
    selectedProjectMarker = layer;

    const a = feature.attributes;
    currentProjectId = a.ProjectID;

    showInPanel(`
        <div class="accordion-section">
            <div class="accordion-title">${getText('accordion_project')}</div>
            <div class="accordion-content">
                <div class="project-info">
                    <h3>${a["نام پروژه"]}</h3>
                    <div class="info-item"><span class="info-label">${getText('project_name')}</span><span class="info-value">${a["نام پروژه"]}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_type')}</span><span class="info-value">${a["نوع پروژه (نیاز)"]}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_location')}</span><span class="info-value">${a["محل اجرا"]}, ${a.استان}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_classes')}</span><span class="info-value">${a["تعداد کلاس"]}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_area')}</span><span class="info-value">${a.زیربنا}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_target')}</span><span class="info-value">${a["targetAmount(USDT)"].toLocaleString('fa-IR')}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_manager')}</span><span class="info-value">${a["مسئول پروژه"]}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_phone')}</span><span class="info-value">${a["شماره تلفن مسئول پروژه"]}</span></div>
                    <div class="info-item"><span class="info-label">${getText('project_status')}</span><span class="info-value">${a["وضعیت راهبری پروژه"] || 'در حال اجرا'}</span></div>
                </div>
            </div>
        </div>

        <div class="accordion-section">
            <div class="accordion-title collapsed">${getText('accordion_donors')}</div>
            <div class="accordion-content collapsed">
                <div id="donorsList">
                    <p style="opacity:0.7;">${getText('no_donors')}</p>
                </div>
            </div>
        </div>
    `);

    document.getElementById('fixedContributeBtn').style.display = 'block';
    setupAccordion();
    // loadDonors(a.contractAddress); // اگر بعداً بخواهید لیست اهداکنندگان را از بلاکچین بگیرید
}

function zoomToIran() {
    map.flyTo([32.4279, 53.6880], 5, { animate: true, duration: 1.5 });
    if (selectedLayer) { provincesLayer.resetStyle(selectedLayer); selectedLayer = null; }
    if (selectedCountyLayer) { countiesLayer?.resetStyle(selectedCountyLayer); selectedCountyLayer = null; }
    if (selectedProjectMarker) { selectedProjectMarker.setIcon(projectIcon); selectedProjectMarker = null; }
    if (countiesLayer) map.removeLayer(countiesLayer);

    showInPanel(`
        <div class="no-selection">
            <div class="icon">🗺️</div>
            <h3 data-key="no_selection_title">یک مورد را انتخاب کنید</h3>
            <p data-key="no_selection_desc">روی استان، شهرستان یا پروژه کلیک کنید</p>
        </div>
    `);
    document.getElementById('fixedContributeBtn').style.display = 'none';
    currentProjectId = null;
}

function redirectToDonate(projectId) {
    if (projectId) {
        window.location.href = `donate.html?project=${projectId}`;
    } else {
        alert('پروژه انتخاب نشده است');
    }
}

function setupAccordion() {
    document.querySelectorAll('.accordion-title').forEach(title => {
        title.onclick = () => {
            title.classList.toggle('collapsed');
            title.nextElementSibling.classList.toggle('collapsed');
        };
    });
}

// تابع کمکی برای گرفتن متن از زبان جاری (از main.js استفاده می‌کند)
function getText(key) {
    // چون setLanguage تمام data-key را پر می‌کند، می‌توانیم از یک المنت مخفی استفاده کنیم
    const temp = document.createElement('span');
    temp.dataset.key = key;
    document.body.appendChild(temp);
    const text = temp.textContent || key;
    document.body.removeChild(temp);
    return text;
}
