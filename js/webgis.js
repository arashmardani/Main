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

function esriToGeoJSON(esriData, geomType = "Polygon") {
    const geojson = { type: "FeatureCollection", features: [] };
    esriData.features.forEach(feat => {
        const attrs = feat.attributes || feat.properties || {};
        const geom = feat.geometry;
        let geometry = null;

        if (geomType === "Point" && geom && geom.x !== undefined && geom.y !== undefined) {
            geometry = {
                type: "Point",
                coordinates: [geom.x, geom.y]
            };
        } else if (geom && geom.rings) {
            geometry = {
                type: "Polygon",
                coordinates: geom.rings
            };
        }

        if (geometry) {
            geojson.features.push({
                type: "Feature",
                properties: attrs,
                geometry: geometry
            });
        }
    });
    return geojson;
}

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

    try {
        const [provincesResp, countiesResp, projectsResp] = await Promise.all([
            fetch('data/ir-new.json'),
            fetch('data/counties.json'),
            fetch('data/Projects.json')
        ]);

        if (!provincesResp.ok || !countiesResp.ok || !projectsResp.ok) {
            throw new Error("خطا در بارگذاری فایل‌ها");
        }

        const provincesEsri = await provincesResp.json();
        const countiesEsri = await countiesResp.json();
        const projectsEsri = await projectsResp.json();

        // تبدیل به GeoJSON استاندارد
        const provincesGeo = esriToGeoJSON(provincesEsri, "Polygon");
        const countiesGeo = esriToGeoJSON(countiesEsri, "Polygon");
        const projectsGeo = esriToGeoJSON(projectsEsri, "Point");

        // لایه استان‌ها
        provincesLayer = L.geoJSON(provincesGeo, {
            style: { fillColor: '#3498db', weight: 2, opacity: 1, color: 'white', fillOpacity: 0.3 },
            onEachFeature: (feature, layer) => {
                layer.on('click', () => onProvinceClick(feature, layer));
            }
        }).addTo(map);

        // لایه شهرستان‌ها
        countiesLayer = L.geoJSON(countiesGeo, {
            style: { fillColor: '#e67e22', weight: 1.5, opacity: 1, color: 'white', fillOpacity: 0.4 },
            onEachFeature: (feature, layer) => {
                layer.on('click', () => onCountyClick(feature, layer));
            }
        });

        // لایه پروژه‌ها
        projectsLayer = L.geoJSON(projectsGeo, {
            pointToLayer: (feature, latlng) => L.marker(latlng, { icon: projectIcon }),
            onEachFeature: (feature, layer) => {
                layer.on('click', () => onProjectClick(feature, layer));
            }
        }).addTo(map);

        // کنترل موبایل
        const panel = document.getElementById('infoPanel');
        const fab = document.getElementById('fabToggle');
        fab.addEventListener('click', () => {
            panel.classList.toggle('open');
            fab.textContent = panel.classList.contains('open') ? '✕' : 'ℹ️';
        });

        document.getElementById('zoomIranBtn').addEventListener('click', zoomToIran);

        zoomToIran(); // اولیه

    } catch (err) {
        console.error(err);
        showInPanel('<p style="color:red;text-align:center;">خطا در بارگذاری نقشه: ' + err.message + '<br>مسیر data/ را چک کنید.</p>');
    }
});

function onProvinceClick(feature, layer) {
    if (selectedLayer) provincesLayer.resetStyle(selectedLayer);
    if (selectedCountyLayer && map.hasLayer(countiesLayer)) countiesLayer.resetStyle(selectedCountyLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);
    if (map.hasLayer(countiesLayer)) map.removeLayer(countiesLayer);

    layer.setStyle({ fillOpacity: 0.7, weight: 4 });
    selectedLayer = layer;

    const p = feature.properties;
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

    const c = feature.properties;
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
    if (selectedCountyLayer && map.hasLayer(countiesLayer)) countiesLayer.resetStyle(selectedCountyLayer);
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon);
    if (map.hasLayer(countiesLayer)) map.removeLayer(countiesLayer);

    layer.setIcon(selectedProjectIcon);
    selectedProjectMarker = layer;

    const p = feature.properties;
    currentProjectId = p.ProjectID;

    showInPanel(`
        <div class="accordion-section">
            <div class="accordion-title" data-key="accordion_project">اطلاعات پروژه</div>
            <div class="accordion-content">
                <div class="project-info">
                    <h3>${p["نام پروژه"] || 'نامشخص'}</h3>
                    <div class="info-item"><span class="info-label" data-key="project_name">نام پروژه:</span><span class="info-value">${p["نام پروژه"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_type">نوع پروژه:</span><span class="info-value">${p["نوع پروژه (نیاز)"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_location">محل اجرا:</span><span class="info-value">${p["محل اجرا"] || 'نامشخص'}, ${p.استان || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_classes">تعداد کلاس:</span><span class="info-value">${p["تعداد کلاس"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_area">زیربنا (مترمربع):</span><span class="info-value">${p.زیربنا || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_target">هدف جمع‌آوری (USDT):</span><span class="info-value">${p["targetAmount(USDT)"] ? Number(p["targetAmount(USDT)"]).toLocaleString('fa-IR') : 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_manager">مسئول پروژه:</span><span class="info-value">${p["مسئول پروژه"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_phone">شماره تماس:</span><span class="info-value">${p["شماره تلفن مسئول پروژه"] || 'نامشخص'}</span></div>
                    <div class="info-item"><span class="info-label" data-key="project_status">وضعیت پروژه:</span><span class="info-value">${p["وضعیت راهبری پروژه"] || 'در حال اجرا'}</span></div>
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

// بقیه توابع بدون تغییر (zoomToIran, redirectToDonate, setupAccordion, showInPanel)
function zoomToIran() {
    map.flyTo([32.4279, 53.6880], 5, { animate: true, duration: 1.5 });
    if (selectedLayer) provincesLayer.resetStyle(selectedLayer); selectedLayer = null;
    if (selectedCountyLayer) countiesLayer.resetStyle(selectedCountyLayer); selectedCountyLayer = null;
    if (selectedProjectMarker) selectedProjectMarker.setIcon(projectIcon); selectedProjectMarker = null;
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
    if (projectId) window.location.href = `donate.html?project=${projectId}`;
    else alert('پروژه انتخاب نشده است');
}

function setupAccordion() {
    document.querySelectorAll('.accordion-title').forEach(title => {
        title.onclick = () => {
            title.classList.toggle('collapsed');
            title.nextElementSibling.classList.toggle('collapsed');
        };
    });
}

function showInPanel(html) {
    document.getElementById('panelContent').innerHTML = html;
}
