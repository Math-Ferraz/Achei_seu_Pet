// Estado da Aplicação
let currentPet = null;
let selectedCoords = { lat: -23.55052, lng: -46.633308 }; // Padrão SP
let map = null;
let marker = null;

// Inicialização após o carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initFormCadastro();
  checkUrlParams();
  initMap();
  loadAvistamentos();
});

// Sistema de Abas
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const tabTarget = btn.getAttribute('data-tab');
      switchTab(tabTarget);
    });
  });

  // Se houver parâmetros na URL (QR Code), o checkUrlParams vai cuidar da aba.
  // Caso contrário, ativa a primeira aba corretamente.
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.get('pet')) {
    switchTab('cadastrar');
  }
}

function switchTab(tabId) {
  // 1. Remove classe ativa dos botões
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  
  // 2. Esconde TODAS as seções de abas explicitamente via Style e remove a classe active
  document.querySelectorAll('.tab-content').forEach(c => {
    c.classList.remove('active');
    c.style.display = 'none';
  });

  // 3. Ativa o botão selecionado
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  // 4. Exibe APENAS a seção alvo
  const activeContent = document.getElementById(`tab-${tabId}`);
  if (activeContent) {
    activeContent.classList.add('active');
    activeContent.style.display = 'block';
  }

  // Recarrega o mapa se for a aba do pet encontrado
  if (tabId === 'encontrei' && map) {
    setTimeout(() => { map.invalidateSize(); }, 200);
  }
}

// Formulário de Cadastro de Pet
function initFormCadastro() {
  const form = document.getElementById('form-cadastrar');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const petData = {
      id: 'pet_' + Date.now(),
      dono: document.getElementById('cad-nome-dono').value.trim(),
      nomePet: document.getElementById('cad-nome-pet').value.trim(),
      email: document.getElementById('cad-email').value.trim(),
      telefone: document.getElementById('cad-telefone').value.trim()
    };

    currentPet = petData;
    localStorage.setItem('etiqueta_pet_data', JSON.stringify(petData));

    exibirResultadoQR(petData);
    showToast('Pet cadastrado com sucesso!');
  });

  document.getElementById('btn-download-qr').addEventListener('click', baixarQRCode);
  document.getElementById('btn-simular-leitura').addEventListener('click', () => {
    carregarDadosNoEncontrei(currentPet);
    switchTab('encontrei');
  });
}

// Exibir QR Code Gerado e criar o link completo com os dados
function exibirResultadoQR(pet) {
  const resultCard = document.getElementById('resultado-qr');
  const petNomeSpan = document.getElementById('res-pet-nome');
  const qrImg = document.getElementById('qr-image');

  petNomeSpan.textContent = pet.nomePet;

  // Pega o link base do site na Vercel
  const baseUrl = window.location.origin + window.location.pathname;

  // Codifica os dados do pet direto nos parâmetros da URL
  const params = new URLSearchParams({
    pet: pet.nomePet,
    dono: pet.dono,
    tel: pet.telefone,
    email: pet.email
  });

  // Link final que o QR Code vai abrir
  const qrTargetUrl = `${baseUrl}?${params.toString()}`;

  // Gera o QR Code com a URL completa contendo as informações
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrTargetUrl)}`;
  qrImg.src = qrImageUrl;

  // Botão para abrir a folha de impressão
  let btnImprimir = document.getElementById('btn-imprimir-tag');
  if (!btnImprimir) {
    btnImprimir = document.createElement('button');
    btnImprimir.id = 'btn-imprimir-tag';
    btnImprimir.className = 'btn btn-primary btn-block';
    btnImprimir.style.marginTop = '10px';
    btnImprimir.innerHTML = '🖨️ Imprimir Tags para Coleira';
    document.querySelector('.action-buttons').appendChild(btnImprimir);
  }

  btnImprimir.onclick = () => {
    const printUrl = `imprimir_tag.html?pet=${encodeURIComponent(pet.nomePet)}&qr=${encodeURIComponent(qrTargetUrl)}`;
    window.open(printUrl, '_blank');
  };

  resultCard.classList.remove('hidden');
  resultCard.scrollIntoView({ behavior: 'smooth' });
}

// Baixar QR Code
function baixarQRCode() {
  const qrImg = document.getElementById('qr-image');
  if (!qrImg.src) return;

  const link = document.createElement('a');
  link.href = qrImg.src;
  link.download = `qrcode-${currentPet ? currentPet.nomePet : 'pet'}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Ler a URL assim que a página carrega e abrir direto os dados do Pet
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const petNome = urlParams.get('pet');
  const donoNome = urlParams.get('dono');
  const telefone = urlParams.get('tel');
  const email = urlParams.get('email');

  // Se a URL contiver os dados do pet (veio do escaneamento do QR Code)
  if (petNome && donoNome && telefone) {
    const petData = {
      nomePet: petNome,
      dono: donoNome,
      telefone: telefone,
      email: email || ''
    };

    // Preenche a tela de visualização
    carregarDadosNoEncontrei(petData);

    // Muda automaticamente para a aba "Encontrei um pet"
    switchTab('encontrei');
  }
}

// Carregar Dados na Aba "Encontrei um Pet"
function carregarDadosNoEncontrei(pet) {
  if (!pet) return;
  currentPet = pet;

  document.getElementById('view-pet-nome').textContent = pet.nomePet;
  document.getElementById('view-dono-nome').textContent = pet.dono;

  const telFormatado = pet.telefone.replace(/\D/g, '');
  document.getElementById('link-whats').href = `https://wa.me/55${telFormatado}?text=Olá,%20encontrei%20o%20seu%20pet%20${encodeURIComponent(pet.nomePet)}!`;
  document.getElementById('link-tel').href = `tel:${telFormatado}`;
  document.getElementById('link-email').href = `mailto:${pet.email}?subject=Encontrei%20seu%20pet%20${encodeURIComponent(pet.nomePet)}`;
}

// Inicializar Mapa (Leaflet.js)
function initMap() {
  map = L.map('map-container').setView([selectedCoords.lat, selectedCoords.lng], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(map);

  marker = L.marker([selectedCoords.lat, selectedCoords.lng], { draggable: true }).addTo(map);

  marker.on('dragend', function (e) {
    const position = marker.getLatLng();
    selectedCoords = { lat: position.lat, lng: position.lng };
  });

  map.on('click', function (e) {
    selectedCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
    marker.setLatLng(e.latlng);
  });

  // Botões do Mapa
  document.getElementById('btn-obter-gps').addEventListener('click', obterGPS);
  document.getElementById('btn-enviar-localizacao').addEventListener('click', enviarLocalizacao);
}

// Obter Geolocalização Atual
function obterGPS() {
  if (navigator.geolocation) {
    showToast('Obtendo sua localização...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        selectedCoords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        map.setView([selectedCoords.lat, selectedCoords.lng], 16);
        marker.setLatLng([selectedCoords.lat, selectedCoords.lng]);
        showToast('Localização atualizada no mapa!');
      },
      (error) => {
        showToast('Erro ao obter GPS. Selecione no mapa manualmente.');
      }
    );
  } else {
    showToast('Navegador não suporta geolocalização.');
  }
}

// Enviar Localização para o Dono
function enviarLocalizacao() {
  const obs = document.getElementById('obs-encontro').value.trim();
  const avistamento = {
    id: Date.now(),
    petName: currentPet ? currentPet.nomePet : 'Pet',
    data: new Date().toLocaleString('pt-BR'),
    coords: selectedCoords,
    obs: obs
  };

  saveAvistamento(avistamento);
  showToast('Localização enviada ao tutor com sucesso!');
  document.getElementById('obs-encontro').value = '';
}

// Salvar no Histórico
function saveAvistamento(item) {
  let list = JSON.parse(localStorage.getItem('etiqueta_pet_avistamentos') || '[]');
  list.unshift(item);
  localStorage.setItem('etiqueta_pet_avistamentos', JSON.stringify(list));
  loadAvistamentos();
}

// Carregar Histórico
function loadAvistamentos() {
  const container = document.getElementById('lista-avistamentos');
  const list = JSON.parse(localStorage.getItem('etiqueta_pet_avistamentos') || '[]');

  if (list.length === 0) {
    container.innerHTML = '<p class="subtitle">Nenhum avistamento registrado até o momento.</p>';
    return;
  }

  container.innerHTML = list.map(item => `
    <div class="avistamento-item">
      <div class="avistamento-date">⏰ ${item.data}</div>
      <div><strong>${item.petName}</strong> foi visto perto das coordenadas:</div>
      <div style="font-size:0.8rem; color:var(--text-muted); margin: 2px 0;">
        Lat: ${item.coords.lat.toFixed(5)}, Lng: ${item.coords.lng.toFixed(5)}
      </div>
      ${item.obs ? `<div class="avistamento-obs">💬 "${item.obs}"</div>` : ''}
    </div>
  `).join('');
}

// Exibir Notificação Toast
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3500);
}