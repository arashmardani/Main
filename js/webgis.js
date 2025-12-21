let map, provincesLayer, countiesLayer, projectsLayer;
let selectedLayer = null, selectedCountyLayer = null, selectedProjectMarker = null;
let currentProjectId = null;

const projectIcon = L.divIcon({
    className: 'project-marker',
    html: '<div style="background:#8b5cf6;width:12px;height:12px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px #8b5cf6;"></div>',
    iconSize: [18,18],
    iconAnchor: [9,9]
});

const selectedProjectIcon = L.divIcon({
    className: 'project-marker-selected',
    html: '<div style="background:#10b981;width:16px;height:16px;border-radius:50%;border:4px solid white;box-shadow:0 0 15px #10b981;animation:pulse 2s infinite;"></div>',
    iconSize: [24,24],
    iconAnchor: [12,12]
});

document.addEventListener("DOMContentLoaded", async () => {
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
    const [provincesResp, countiesResp, projectsResp] = await Promise.all([
        fetch('ir-new.json'),
        fetch('counties.json'),
        fetch('Projects.json')
    ]);

    if (!provincesResp.ok || !countiesResp.ok || !projectsResp.ok) {
        showInPanel('<p style="color:red;">خطا در بارگذاری داده‌ها. مسیر فایل‌ها را چک کنید.</p>');
        return;
    }

    const provinces = await provincesResp.json();
    const counties = await countiesResp.json();
    const projects = await projectsResp.json();

    // لایه استان‌ها
    provincesLayer = L.geoJSON(provinces, {
        style: { fillColor: '#3498db', weight: 2, opacity: 1, color: 'white', fillOpacity: 0.3 },
        onEachFeature: (feature, layer) => {
            layer.on('click', () => onProvinceClick(feature, layer));
        }
    }).addTo(map);

    // لایه شهرستان‌ها (ابتدا اضافه نمی‌شه)
    countiesLayer = L.geoJSON(counties, {
        style: { fillColor: '#e67e22', weight: 1.5, opacity: 1, color: 'white', fillOpacity: 0.4 },
        onEachFeature: (feature, layer) => {
            layer.on('click', () => onCountyClick(feature, layer));
        }
    });

    // لایه پروژه‌ها
    projectsLayer = L.geoJSON(projects, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: projectIcon }),
        onEachFeature: (feature, layer) => {
            layer.on('click', () => onProjectClick(feature, layer));
        }
    }).addTo(map);

    // کنترل پنل موبایل
    const panel = document.getElementById('infoPanel');
    const fab = document.getElementById('fabToggle');
    fab.addEventListener('click', () => {
        panel.classList.toggle('open');
        fab.textContent = panel.classList.contains('open') ? '✕' : 'ℹ️';
    });

    document.getElementById('zoomIranBtn').addEventListener('click', zoomToIran);

    // نمایش اولیه
    zoomToIran();
});

function onProvinceClick(feature, layer) {
    if (selectedLayer) provincesLayer.resetStyle(selectedLayer);
    if (selectedCountyLayer && countiesLayer.hasLayer(selectedCountyLayer)) countiesLayer.resetStyle(selectedCountyLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);
    if (map.hasLayer(countiesLayer)) map.removeLayer(countiesLayer);

    layer.setStyle({ fillOpacity: 0.7, weight: 4 });
    selectedLayer = layer;

    const p = feature.properties || feature.attributes || {};
    showInPanel(`
        <div class="accordion-section">
            <div class="accordion-title" data-key="accordion_province">اطلاعات استان</div>
            <div class="accordion-content">
                <div class="province-info">
                    <h3>${p.pname || p.Name || 'نامشخص'}</h3>
                    <div class="info-item"><span class="info-label" data-key="province_population">جمعیت استان:</span><span class="info-value">${p.population ? Number(p.population).toLocaleString('fa-IR') : 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="province_capita">سرانه فضای آموزشی:</span><span class="info-value">${p.P_capita ? Number(p.P_capita).toFixed(2) : 'نامشخص'}</span></div>
                </div>
            </div>
        </div>
    `);
    document.getElementById('fixedContributeBtn').style.display = 'none';
    setupAccordion();
}

function onCountyClick(feature, layer) {
    if (!map.hasLayer(countiesLayer)) map.addLayer(countiesLayer);

    if (selectedCountyLayer) countiesLayer.resetStyle(selectedCountyLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);

    layer.setStyle({ fillOpacity: 0.7, weight: 3 });
    selectedCountyLayer = layer;

    const c = feature.properties || feature.attributes || {};
    showInPanel(`
        <div class="accordion-section">
            <div class="accordion-title" data-key="accordion_county">اطلاعات شهرستان</div>
            <div class="accordion-content">
                <div class="province-info">
                    <h3>${c.cname || c.Name || 'نامشخص'}</h3>
                    <div class="info-item"><span class="info-label" data-key="county_capita">سرانه فضای آموزشی شهرستان:</span><span class="info-value">${c.C_capita ? Number(c.C_capita).toFixed(2) : 'نامشخص'}</span></div>
                </div>
            </div>
        </div>
    `);
    document.getElementById('fixedContributeBtn').style.display = 'none';
    setupAccordion();
}

function onProjectClick(feature, layer) {
    if (selectedLayer) provincesLayer.resetStyle(selectedLayer);
    if (selectedCountyLayer && countiesLayer.hasLayer(selectedCountyLayer)) countiesLayer.resetStyle(selectedCountyLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);
    if (map.hasLayer(countiesLayer)) map.removeLayer(countiesLayer);

    layer.setIcon(selectedProjectIcon);
    selectedProjectMarker = layer;

    const a = feature.attributes || feature.properties || {};
    currentProjectId = a.ProjectID;

    showInPanel(`
        <div class="accordion-section">
            <div class="accordion-title" data-key="accordion_project">اطلاعات پروژه</div>
            <div class="accordion-content">
                <div class="project-info">
                    <h3>${a["نام پروژه"] || 'نامشخص'}</h3>
                    <div class="info-item"><span class="info-label" data-key="project_name">نام پروژه:</span><span class="info-value">${a["نام پروژه"]}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_type">نوع پروژه:</span><span class="info-value">${a["نوع پروژه (نیاز)"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_location">محل اجرا:</span><span class="info-value">${a["محل اجرا"] || 'نامشخص'}, ${a.استان || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_classes">تعداد کلاس:</span><span class="info-value">${a["تعداد کلاس"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_area">زیربنا (مترمربع):</span><span class="info-value">${a.زیربنا || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_target">هدف جمع‌آوری (USDT):</span><span class="info-value">${a["targetAmount(USDT)"] ? Number(a["targetAmount(USDT)"]).toLocaleString('fa-IR') : 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_manager">مسئول پروژه:</span><span class="info-value">${a["مسئول پروژه"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_phone">شماره تماس:</span><span class="info-value">${a["شماره تلفن مسئول پروژه"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_status">وضعیت پروژه:</span><span class="info-value">${a["وضعیت راهبری پروژه"] || 'در حال اجرا'}</span></div>
                </div>
            </div>
        </div>

        <div class="accordion-section">
            <div class="accordion-title collapsed" data-key="accordion_donors">کمک‌کنندگان اخیر</div>
            <div class="accordion-content collapsed">
                <div id="donorsList">
                    <p style="opacity:0.7;" data-key="no_donors">شما اولین مشارکت‌کننده این مدرسه باشید</p>
                </div>
            </div>
        </div>
    `);

    document.getElementById('fixedContributeBtn').style.display = 'block';
    setupAccordion();
}

function zoomToIran() {
    map.flyTo([32.4279, 53.6880], 5, { animate: true, duration: 1.5 });
    if (selectedLayer) provincesLayer.resetStyle(selectedLayer);
    selectedLayer = null;
    if (selectedCountyLayer) countiesLayer.resetStyle(selectedCountyLayer);
    selectedCountyLayer = null;
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);
    selectedProjectMarker = null;
    if (map.hasLayer(countiesLayer)) map.removeLayer(countiesLayer);

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
            const content = title.nextElementSibling;
            if (content) content.classList.toggle('collapsed');
        };
    });
}

function showInPanel(html) {
    const panelContent = document.getElementById('panelContent');
    if (panelContent) panelContent.innerHTML = html;
}
