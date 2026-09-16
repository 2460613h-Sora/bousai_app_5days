document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('shelterMap')) {
    return;
  }

  initializeShelterMap();
  updateWeatherWarnings();
  window.setInterval(updateWeatherWarnings, 600000);
});

function initializeShelterMap() {
  const mapElement = document.getElementById('shelterMap');
  const fallback = document.getElementById('mapFallback');

  if (!window.L) {
    fallback.hidden = false;
    return;
  }

  const map = L.map(mapElement).setView([40.8222, 140.7474], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    referrerPolicy: 'strict-origin-when-cross-origin'
  }).addTo(map);

  fetch('/shelters')
    .then(response => response.ok ? response.json() : [])
    .then(shelters => {
      const locatedShelters = shelters.filter(shelter =>
        Number.isFinite(Number(shelter.latitude)) && Number.isFinite(Number(shelter.longitude))
      );

      locatedShelters.forEach(shelter => {
        L.marker([Number(shelter.latitude), Number(shelter.longitude)])
          .addTo(map)
          .bindPopup(shelter.name || '避難所');
      });
    })
    .catch(() => {
      // The base map remains available when shelter data cannot be loaded.
    });
}

function updateWeatherWarnings() {
  fetch('/api/weather_warnings')
    .then(response => {
      if (!response.ok) {
        throw new Error('Weather API request failed');
      }
      return response.json();
    })
    .then(updateWeatherContent)
    .catch(() => {
      const weatherContent = document.getElementById('weatherContent');
      weatherContent.innerHTML = '<p class="error-message">気象情報の取得に失敗しました</p>';
    });
}

function updateWeatherContent(data) {
  const weatherContent = document.getElementById('weatherContent');
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  const areaName = data.area_name || '青森市';
  const temperature = data.temperature;
  const statusClass = warnings.length ? 'weather-status is-warning' : 'weather-status';
  const statusIcon = warnings.length ? 'fa-triangle-exclamation' : 'fa-circle-check';
  const statusText = warnings.length
    ? '警報・注意報が発表されています'
    : '現在、警報・注意報は発表されていません';
  const warningList = warnings.length
    ? `<ul class="weather-warning-list">${warnings.map(warning =>
      `<li>${escapeHtml(warning.name)}（${escapeHtml(warning.status)}）</li>`
    ).join('')}</ul>`
    : '';

  weatherContent.innerHTML = `
    <p class="weather-location"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${escapeHtml(areaName)}</p>
    <p class="current-temperature"><i class="fa-solid fa-temperature-half" aria-hidden="true"></i>現在の気温: ${temperature ? `${escapeHtml(temperature.value)}${escapeHtml(temperature.unit || '°C')}` : '取得できません'}</p>
    <p class="${statusClass}"><i class="fa-solid ${statusIcon}" aria-hidden="true"></i>${statusText}</p>
    ${warningList}
    <p class="weather-time"><i class="fa-regular fa-clock" aria-hidden="true"></i>データ取得: ${escapeHtml(data.last_fetch_time || '不明')}</p>
    <p class="weather-time"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i>気象庁発表: ${escapeHtml(data.report_time || '不明')}</p>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
