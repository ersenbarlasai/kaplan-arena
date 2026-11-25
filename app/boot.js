/* Kaplan Arena — başlatma kipi hostInit'ten önce ayrılır: sahne ağa bağlanmaz ve kilit almaz. */
const MODE = (() => {
  const q = new URLSearchParams(location.search);
  if (q.has('sahne')) return 'stage';
  if (q.has('sunucu')) return 'admin';
  if (q.has('pin') || q.has('katil')) return 'phone';
  // Yerel sunucuya (BASLAT) telefondan ağ adresiyle girilirse katılım ekranı açılır.
  return location.protocol.startsWith('http') && IS_LAN_HOST ? 'phone' : 'admin';
})();
if (MODE === 'stage') stageInit();
else if (MODE === 'phone') playerInit();
else hostInit();
