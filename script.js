// Inisialisasi Data dari LocalStorage
let dataMaster = JSON.parse(localStorage.getItem('sipena_master')) || { guru: [], kelas: [] };
let jadwalData = JSON.parse(localStorage.getItem('sipena_jadwal')) || [];
let pengaturan = JSON.parse(localStorage.getItem('sipena_setting')) || { gasUrl: '', logo: '', kop: '' };
let dataRekap = JSON.parse(localStorage.getItem('sipena_rekap')) || []; // [FITUR BARU] Data Rekap (Data 2)

// Load awal
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('setting-gas-url').value = pengaturan.gasUrl;
    document.getElementById('setting-logo').value = pengaturan.logo;
    document.getElementById('setting-kop').value = pengaturan.kop;
    updateDashboard();
    populateSelects();
    renderJadwal();
    renderRekap(); // [FITUR BARU] Render tabel rekap saat halaman dimuat
});

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
    event.target.classList.add('active');
    if(pageId === 'matriks-jadwal') renderMatriks();
    if(pageId === 'rekap-guru') renderRekap(); // [FITUR BARU] Refresh rekap saat buka halaman
}

// --- DATA MASTER ---
function tambahDataMaster() {
    const guru = document.getElementById('master-guru').value;
    const kelas = document.getElementById('master-kelas').value;
    if(guru) { dataMaster.guru.push(guru); document.getElementById('master-guru').value = ''; }
    if(kelas) { dataMaster.kelas.push(kelas); document.getElementById('master-kelas').value = ''; }
    localStorage.setItem('sipena_master', JSON.stringify(dataMaster));
    populateSelects();
    updateDashboard();
    alert('Data berhasil disimpan!');
}

function populateSelects() {
    const guruSelects = ['jadwal-guru', 'absen-guru'];
    const kelasSelects = ['jadwal-kelas', 'absen-kelas', 'matriks-kelas'];
    
    guruSelects.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.innerHTML = '<option value="">Pilih Guru</option>' + dataMaster.guru.map(g => `<option value="${g}">${g}</option>`).join(''); }
    });
    kelasSelects.forEach(id => {
        const el = document.getElementById(id);
        if(el) { el.innerHTML = '<option value="">Pilih Kelas</option>' + dataMaster.kelas.map(k => `<option value="${k}">${k}</option>`).join(''); }
    });
}

// --- JADWAL ---
function simpanJadwal() {
    const jadwal = {
        id: Date.now(),
        guru: document.getElementById('jadwal-guru').value,
        kelas: document.getElementById('jadwal-kelas').value,
        hari: document.getElementById('jadwal-hari').value,
        jam_masuk: document.getElementById('jadwal-masuk').value,
        jam_keluar: document.getElementById('jadwal-keluar').value
    };
    if(!jadwal.guru || !jadwal.kelas || !jadwal.jam_masuk || !jadwal.jam_keluar) return alert('Lengkapi data!');
    jadwalData.push(jadwal);
    localStorage.setItem('sipena_jadwal', JSON.stringify(jadwalData));
    renderJadwal();
    updateDashboard();
    alert('Jadwal tersimpan!');
}

function renderJadwal() {
    const tbody = document.querySelector('#tabel-jadwal tbody');
    tbody.innerHTML = jadwalData.map(j => `
        <tr>
            <td>${j.hari}</td>
            <td>${j.jam_masuk} - ${j.jam_keluar}</td>
            <td>${j.kelas}</td>
            <td>${j.guru}</td>
            <td><button onclick="hapusJadwal(${j.id})" style="background:var(--danger); padding:5px 10px;">Hapus</button></td>
        </tr>
    `).join('');
}

function hapusJadwal(id) {
    jadwalData = jadwalData.filter(j => j.id !== id);
    localStorage.setItem('sipena_jadwal', JSON.stringify(jadwalData));
    renderJadwal();
    updateDashboard();
}

// --- MATRIKS ---
function renderMatriks() {
    const kelas = document.getElementById('matriks-kelas').value;
    const tbody = document.querySelector('#tabel-matriks tbody');
    tbody.innerHTML = '';
    const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const jamList = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00']; // Sederhana

    jamList.forEach(jam => {
        let row = `<tr><td>${jam}</td>`;
        hariList.forEach(hari => {
            const j = jadwalData.find(x => x.kelas === kelas && x.hari === hari && x.jam_masuk <= jam && x.jam_keluar > jam);
            row += `<td>${j ? j.guru : '-'}</td>`;
        });
        row += '</tr>';
        tbody.innerHTML += row;
    });
}

// --- ABSENSI GURU (CORE FEATURE) ---
let activeSchedule = null;

function cekJadwalAbsen() {
    const guru = document.getElementById('absen-guru').value;
    const kelas = document.getElementById('absen-kelas').value;
    const statusBox = document.getElementById('status-jadwal');
    const formAbsen = document.getElementById('form-absen');

    if (!guru || !kelas) {
        statusBox.className = 'status-box';
        statusBox.innerText = 'Pilih Guru dan Kelas.';
        formAbsen.style.display = 'none';
        return;
    }

    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    activeSchedule = jadwalData.find(j => j.guru === guru && j.kelas === kelas && j.hari === today);

    if (!activeSchedule) {
        statusBox.className = 'status-box status-error';
        statusBox.innerText = `❌ Tidak ada jadwal mengajar untuk ${guru} di kelas ${kelas} pada hari ${today}.`;
        formAbsen.style.display = 'none';
        return;
    }

    const [startH, startM] = activeSchedule.jam_masuk.split(':').map(Number);
    const [endH, endM] = activeSchedule.jam_keluar.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    if (currentTime < startTime) {
        statusBox.className = 'status-box status-error';
        statusBox.innerText = `⏳ Belum waktu absensi. Jadwal mulai pukul ${activeSchedule.jam_masuk}.`;
        formAbsen.style.display = 'none';
    } else if (currentTime > endTime) {
        statusBox.className = 'status-box status-error';
        statusBox.innerText = `🚫 Jadwal pembelajaran telah habis (selesai pukul ${activeSchedule.jam_keluar}). Absensi otomatis ditutup.`;
        formAbsen.style.display = 'none';
    } else {
        statusBox.className = 'status-box status-success';
        statusBox.innerText = `✅ Jadwal Aktif! Silakan ambil selfie dan lokasi. (Selesai: ${activeSchedule.jam_keluar})`;
        formAbsen.style.display = 'block';
        startCamera();
    }
}

// Kamera
let videoStream;
function startCamera() {
    const video = document.getElementById('camera-preview');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => { videoStream = stream; video.srcObject = stream; })
        .catch(err => { alert("Gagal mengakses kamera. Pastikan izin diberikan."); });
}

function ambilFoto() {
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('camera-canvas');
    const photo = document.getElementById('photo-output');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');
    photo.src = imageData;
    photo.style.display = 'block';
    document.getElementById('absen-foto-base64').value = imageData;
    videoStream.getTracks().forEach(track => track.stop()); // Hemat baterai
    video.style.display = 'none';
}

// Lokasi
function dapatkanLokasi() {
    const lokasiInput = document.getElementById('absen-lokasi');
    lokasiInput.value = "Mencari lokasi...";
    navigator.geolocation.getCurrentPosition(
        (position) => {
            lokasiInput.value = `${position.coords.latitude}, ${position.coords.longitude}`;
        },
        (error) => {
            lokasiInput.value = "Gagal mendapatkan lokasi. Pastikan GPS aktif.";
        }
    );
}

// Kirim ke Google Sheets
function kirimAbsensi() {
    const foto = document.getElementById('absen-foto-base64').value;
    const lokasi = document.getElementById('absen-lokasi').value;
    const gasUrl = pengaturan.gasUrl;

    if (!foto || !lokasi || !gasUrl) return alert('Pastikan foto, lokasi, dan URL Pengaturan sudah diisi!');

    const now = new Date();
    const payload = {
        nama_guru: activeSchedule.guru,
        tanggal: now.toLocaleDateString('id-ID'),
        kelas: activeSchedule.kelas,
        jadwal_masuk: activeSchedule.jam_masuk,
        jadwal_keluar: activeSchedule.jam_keluar,
        total_jam: ((now.getHours() * 60 + now.getMinutes()) - (parseInt(activeSchedule.jam_masuk.split(':')[0])*60 + parseInt(activeSchedule.jam_masuk.split(':')[1]))).toFixed(2) + " Jam",
        waktu_absensi: now.toLocaleTimeString('id-ID'),
        keterangan: "Hadir",
        lokasi: lokasi,
        foto: foto,
        folderId: "ROOT"
    };

    const btn = document.querySelector('.btn-success');
    btn.innerText = 'Mengirim...';
    btn.disabled = true;

    fetch(gasUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if(data.result === 'success') {
            // [FITUR BARU] Sinkronisasi Rekap Lokal sebelum reload
            updateRekapLokal(payload.nama_guru, payload.total_jam, payload.keterangan);
            alert('Absensi berhasil disimpan ke Spreadsheet!');
            location.reload();
        } else {
            alert('Gagal: ' + data.error);
            btn.innerText = 'Kirim Absensi';
            btn.disabled = false;
        }
    })
    .catch(err => {
        alert('Error jaringan. Cek konsol.');
        btn.innerText = 'Kirim Absensi';
        btn.disabled = false;
    });
}

// --- PENGATURAN & PDF ---
function simpanPengaturan() {
    pengaturan = {
        gasUrl: document.getElementById('setting-gas-url').value,
        logo: document.getElementById('setting-logo').value,
        kop: document.getElementById('setting-kop').value
    };
    localStorage.setItem('sipena_setting', JSON.stringify(pengaturan));
    alert('Pengaturan disimpan!');
}

function updateDashboard() {
    document.getElementById('dash-guru').innerText = dataMaster.guru.length;
    document.getElementById('dash-kelas').innerText = dataMaster.kelas.length;
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
    document.getElementById('dash-jadwal').innerText = jadwalData.filter(j => j.hari === today).length;
}

function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Kop Surat
    if (pengaturan.logo) {
        doc.addImage(pengaturan.logo, 'JPEG', 15, 10, 20, 20);
    }
    doc.setFontSize(16);
    doc.text(pengaturan.kop || "PEMERINTAH KABUPATEN CONTOH", 105, 20, null, null, "center");
    doc.setFontSize(12);
    doc.text("SIPENA - Roster Jadwal Pembelajaran", 105, 30, null, null, "center");
    doc.line(10, 35, 200, 35);

    // Tabel
    const tableData = jadwalData.map(j => [j.hari, j.jam_masuk + ' - ' + j.jam_keluar, j.kelas, j.guru]);
    doc.autoTable({
        startY: 40,
        head: [['Hari', 'Jam', 'Kelas', 'Guru']],
        body: tableData,
        theme: 'grid'
    });

    doc.save('Roster_Jadwal_SIPENA.pdf');
}

// ==========================================
// [FITUR BARU] REKAP GURU (DATA 2)
// ==========================================

function updateRekapLokal(nama, jam, ket) {
    let found = dataRekap.find(r => r.nama === nama);
    let jamNum = parseFloat(jam) || 0;
    let hadir = (ket === "Hadir") ? 1 : 0;
    let tidakHadir = (ket !== "Hadir") ? 1 : 0;

    if (found) {
        found.total_jam += jamNum;
        found.hadir += hadir;
        found.tidak_hadir += tidakHadir;
    } else {
        dataRekap.push({ nama: nama, total_jam: jamNum, tidak_hadir: tidakHadir, hadir: hadir });
    }
    localStorage.setItem('sipena_rekap', JSON.stringify(dataRekap));
}

function renderRekap() {
    const tbody = document.querySelector('#tabel-rekap tbody');
    if (!tbody) return; // Guard clause jika elemen belum ada
    
    if (dataRekap.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Belum ada data rekap. Silakan lakukan absensi terlebih dahulu.</td></tr>';
        return;
    }
    tbody.innerHTML = dataRekap.map(r => `
        <tr>
            <td><strong>${r.nama}</strong></td>
            <td>${r.total_jam.toFixed(2)} Jam</td>
            <td style="color: var(--danger); font-weight:bold;">${r.tidak_hadir}</td>
            <td style="color: var(--success); font-weight:bold;">${r.hadir}</td>
        </tr>
    `).join('');
}

function downloadRekapCSV() {
    if (dataRekap.length === 0) return alert('Belum ada data rekap untuk didownload.');
    
    let csvContent = "data:text/csv;charset=utf-8,Nama,Total Jam,Jumlah Tidak Hadir,Jumlah Hadir\n";
    dataRekap.forEach(r => {
        csvContent += `${r.nama},${r.total_jam.toFixed(2)},${r.tidak_hadir},${r.hadir}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Rekap_Guru_SIPENA.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
