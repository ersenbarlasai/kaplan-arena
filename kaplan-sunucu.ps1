# Kaplan Arena - yerel sunucu
# Bu pencere acik kaldigi surece telefonlar yarismaya baglanabilir.
$ErrorActionPreference = 'Continue'
# Once 8080 denenir; doluysa (or. baska bir program kullaniyorsa) siradaki bos port secilir.
# BASLAT.bat guvenlik duvarinda bu portlarin hepsine izin acar.
$ports = @(8080) + (8090..8099)
$port = $ports[0]
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$htmlPath = Join-Path $root 'kaplan-arena.html'
$sid = [guid]::NewGuid().ToString('N').Substring(0, 8)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$pathRe = '^[A-Za-z0-9_\-]+(/[A-Za-z0-9_\-]+)*$'
$db = New-Object 'System.Collections.Generic.Dictionary[string,string]'
# Statik dosyalar: yalnız app/*.js|css ve assets/ altındaki görsel/font/lisans/video dosyaları; gizli dosya ve '..' kabul edilmez.
$staticRe = '^/(app/[A-Za-z0-9_\-]+\.(js|css)|assets/([A-Za-z0-9_\-]+/)*[A-Za-z0-9_\-]+(\.[A-Za-z0-9_\-]+)*\.(webp|png|svg|woff2|css|txt|mp4|m4a))$'
$rootFull = [System.IO.Path]::GetFullPath($root).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$mime = @{ '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.webp'='image/webp'; '.png'='image/png'; '.svg'='image/svg+xml'; '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'; '.mp4'='video/mp4'; '.m4a'='audio/mp4' }
$rev = 0

function Get-LanIPs {
  $list = @()
  foreach ($ni in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
    if ($ni.OperationalStatus -ne 'Up') { continue }
    if ($ni.NetworkInterfaceType -eq 'Loopback') { continue }
    $desc = [string]$ni.Description + ' ' + [string]$ni.Name
    if ($desc -match 'VirtualBox|VMware|Hyper-V|vEthernet|WSL|Bluetooth|TAP-|Tailscale|ZeroTier|Npcap') { continue }
    foreach ($ua in $ni.GetIPProperties().UnicastAddresses) {
      $a = $ua.Address
      if ($a.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
      $ip = $a.ToString()
      if ($ip.StartsWith('169.254.') -or $ip.StartsWith('127.')) { continue }
      $list += $ip
    }
  }
  $first = @($list | Where-Object { $_ -eq '192.168.137.1' })
  $rest = @($list | Where-Object { $_ -ne '192.168.137.1' })
  return @($first + $rest)
}

function Send-Text($res, [string]$text, [string]$type, [int]$code = 200) {
  $bytes = $utf8.GetBytes($text)
  $res.StatusCode = $code
  $res.ContentType = $type
  $res.Headers['Cache-Control'] = 'no-store'
  $res.ContentLength64 = $bytes.Length
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
  $res.OutputStream.Close()
}

if (-not (Test-Path $htmlPath)) {
  Write-Host "HATA: kaplan-arena.html bu klasorde bulunamadi: $root" -ForegroundColor Red
  Read-Host 'Kapatmak icin Enter'
  exit 1
}

function Test-PortFree([int]$p) {
  # Baska bir program (or. Apache/httpd) portu tutuyorsa false doner.
  try {
    $busy = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() |
      Where-Object { $_.Port -eq $p }
    return -not $busy
  } catch { return $true }
}

function Start-Listener([string]$hostPart) {
  # Bos bir port bulup dinleyiciyi baslatir. Basarisizsa $null doner.
  # Eski bir Kaplan Arena penceresi kapanirken portu birkac saniye tutabilir, o yuzden iki tur denenir.
  for ($round = 0; $round -lt 2; $round++) {
    foreach ($p in $ports) {
      if (-not (Test-PortFree $p)) { continue }
      $l = New-Object System.Net.HttpListener
      $l.Prefixes.Add("http://$($hostPart):$p/")
      try { $l.Start(); $script:port = $p; return $l } catch { try { $l.Close() } catch {} }
    }
    Start-Sleep -Seconds 2
  }
  return $null
}

$lanOk = $true
$listener = Start-Listener '+'
if (-not $listener) {
  $lanOk = $false
  $listener = Start-Listener 'localhost'
  if (-not $listener) {
    Write-Host "HATA: Sunucu baslatilamadi; $($ports -join ', ') portlarinin hepsi dolu." -ForegroundColor Red
    Write-Host "Acik kalan eski Kaplan Arena pencerelerini kapatip BASLAT'a tekrar tiklayin." -ForegroundColor Red
    Read-Host 'Kapatmak icin Enter'
    exit 1
  }
}

Clear-Host
Write-Host ''
Write-Host '   KAPLAN ARENA SUNUCUSU CALISIYOR  (Surum 10)' -ForegroundColor Yellow
Write-Host "   Klasor: $root"
Write-Host '   ------------------------------------------------'
Write-Host "   Yarisma ekrani: http://localhost:$port/"
if ($port -ne $ports[0]) {
  Write-Host "   Not: 8080 portu bu bilgisayarda baska bir program tarafindan kullaniliyor; $port kullaniliyor." -ForegroundColor DarkYellow
}
if ($lanOk) {
  foreach ($ip in (Get-LanIPs)) { Write-Host "   Telefonlar icin: http://$($ip):$port/" -ForegroundColor Green }
} else {
  Write-Host '   UYARI: Yonetici izni verilmedigi icin telefonlar baglanamaz.' -ForegroundColor Red
  Write-Host '   BASLAT dosyasini kapatip tekrar acin ve izin sorusuna EVET deyin.' -ForegroundColor Red
}
Write-Host ''
Write-Host '   Yarisma bitene kadar bu pencereyi KAPATMAYIN.'
Write-Host ''

if ($env:KAPLAN_NO_BROWSER -ne '1') { Start-Process "http://localhost:$port/" }

# ---- yarisma yetkisi (yeni yarismalar; api/ka.js ile ayni kurallar) ----
# Ozel kayitlar /api/db yanitina girmez: $ctl[pin] denetim kaydi, $bind[pin] kaptan baglari ("dev|sha256(oturum)").
# Denetim kaydi olan yarismada /api/set yalniz admin anahtariyla (X-Ka-Key); telefonlar yalniz /api/join ve /api/cmd.
$ctl = @{}
$bind = @{}
$sha = [System.Security.Cryptography.SHA256]::Create()
function Get-Sha([string]$s) { return (($sha.ComputeHash($utf8.GetBytes($s)) | ForEach-Object { $_.ToString('x2') }) -join '') }
function Get-NowMs { return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }
function Read-Body($req) {
  if ($req.ContentLength64 -gt 131072) { return $null }
  $reader = New-Object System.IO.StreamReader($req.InputStream, $utf8)
  $body = $reader.ReadToEnd(); $reader.Close()
  try { return (ConvertFrom-Json -InputObject $body) } catch { return $null }
}
function Write-Db([string]$key, [string]$json) {
  $remove = @()
  foreach ($k in $db.Keys) { if ($k -eq $key -or $k.StartsWith($key + '/')) { $remove += $k } }
  foreach ($k in $remove) { [void]$db.Remove($k) }
  if ($json -ne 'null') { $db[$key] = $json }
  $script:rev++
}
function Send-Json($res, $obj, [int]$code = 200) { Send-Text $res (ConvertTo-Json -InputObject $obj -Compress -Depth 6) 'application/json' $code }
function Send-Deny($res, [int]$code, [string]$why, $extra) {
  $o = [ordered]@{ ok = $false; why = $why }
  if ($extra) { foreach ($k in $extra.Keys) { $o[$k] = $extra[$k] } }
  Send-Json $res $o $code
}
function Get-Dev([string]$v) { return ($v -split '\|')[0] }
function Get-Tok([string]$v) { $p = $v -split '\|'; if ($p.Length -gt 1) { return $p[1] } else { return '' } }

function Invoke-Ctl($req, $res) {
  $b = Read-Body $req
  if (-not $b -or [string]$b.pin -notmatch '^\d{6}$' -or [string]$b.key -notmatch '^[A-Za-z0-9]{16,64}$') { Send-Deny $res 400 'gecersiz istek'; return }
  $pin = [string]$b.pin; $cur = $ctl[$pin]
  if ($cur -and $cur.adm -ne (Get-Sha ([string]$b.key))) { Send-Deny $res 403 'yetkisiz'; return }
  $teams = @{}
  if ($b.ctl -and $b.ctl.teams) {
    foreach ($p in $b.ctl.teams.PSObject.Properties) {
      if ($p.Name -notmatch '^t\d{1,3}$' -or [string]$p.Value.code -notmatch '^\d{4,8}$') { Send-Deny $res 400 'gecersiz takim'; return }
      $teams[$p.Name] = @{ code = [string]$p.Value.code; act = [bool]$p.Value.act }
    }
  }
  if ($teams.Count -eq 0 -and $cur) { $teams = $cur.teams }
  $qk = $null; if ($b.ctl -and [string]$b.ctl.qk -match '^[A-Za-z0-9_\-]{1,120}$') { $qk = [string]$b.ctl.qk }
  $elig = $null; if ($b.ctl -and $null -ne $b.ctl.elig) { $elig = @($b.ctl.elig | ForEach-Object { [string]$_ } | Where-Object { $_ -match '^t\d{1,3}$' }) }
  $ctl[$pin] = @{ adm = (Get-Sha ([string]$b.key)); teams = $teams; qk = $qk; acc = [bool]($b.ctl -and $b.ctl.acc); jk = [bool]($b.ctl -and $b.ctl.jk); risk = [bool]($b.ctl -and $b.ctl.risk); elig = $elig }
  if (-not $bind.ContainsKey($pin)) { $bind[$pin] = @{} }
  $n = 0
  if ($b.reset) {
    foreach ($t in @($b.reset)) {
      $t = [string]$t; if ($t -notmatch '^t\d{1,3}$') { continue }
      [void]$bind[$pin].Remove($t); [void]$bind[$pin].Remove('f:' + $t)
      Write-Db "games/$pin/players/all/$t" 'null'; $n++
    }
  }
  Send-Json $res ([ordered]@{ ok = $true; r = $n })
}

function Invoke-Join($req, $res) {
  $b = Read-Body $req
  if (-not $b -or [string]$b.pin -notmatch '^\d{6}$' -or [string]$b.tid -notmatch '^t\d{1,3}$' -or [string]$b.dev -notmatch '^[A-Za-z0-9]{4,40}$') { Send-Deny $res 400 'gecersiz istek'; return }
  $pin = [string]$b.pin; $tid = [string]$b.tid; $dev = [string]$b.dev; $c = $ctl[$pin]
  if (-not $c) { Send-Deny $res 404 'Bu kodla açık bir yarışma bulunamadı.'; return }
  $t = $c.teams[$tid]
  if (-not $t) { Send-Deny $res 404 'Takım bu yarışmada yok.'; return }
  if (-not $t.act) { Send-Deny $res 403 'Bu takım elendi; yarışmaya devam edemez.' @{ out = $true }; return }
  $bd = $bind[$pin]; $cur = [string]$bd[$tid]
  $now = Get-NowMs
  if ($b.tok -and $cur -and (Get-Tok $cur) -eq (Get-Sha ([string]$b.tok)) -and (Get-Dev $cur) -eq $dev) {
    Write-Db "games/$pin/players/all/$tid" ('{"dev":"' + $dev + '","t":' + $now + '}')
    Send-Json $res ([ordered]@{ ok = $true; tok = [string]$b.tok }); return
  }
  if ([int]$bd['f:' + $tid] -ge 10) { Send-Deny $res 429 'Çok fazla hatalı kod denendi. Yönetimden bu takım için cihaz sıfırlaması isteyin.'; return }
  if ([string]$b.code -ne $t.code) { $bd['f:' + $tid] = [int]$bd['f:' + $tid] + 1; Send-Deny $res 403 'Kaptan kodu yanlış.'; return }
  foreach ($f in @($bd.Keys)) {
    if ($f -ne $tid -and -not $f.StartsWith('f:') -and (Get-Dev ([string]$bd[$f])) -eq $dev) { Send-Deny $res 409 'Bu telefon başka bir takımın kaptanı olarak kayıtlı. Takım değiştirmek için yönetime başvurun.'; return }
  }
  if ($cur -and (Get-Dev $cur) -ne $dev) { Send-Deny $res 409 'Bu takıma başka bir kaptan telefonu bağlı. Telefon değişikliği için yönetimden cihaz sıfırlaması isteyin.'; return }
  $tok = [guid]::NewGuid().ToString('N')
  $bd[$tid] = $dev + '|' + (Get-Sha $tok)
  Write-Db "games/$pin/players/all/$tid" ('{"dev":"' + $dev + '","t":' + $now + '}')
  Send-Json $res ([ordered]@{ ok = $true; tok = $tok })
}

function Invoke-Cmd($req, $res) {
  $b = Read-Body $req
  if (-not $b -or [string]$b.pin -notmatch '^\d{6}$' -or -not $b.tok -or [string]$b.qk -notmatch '^[A-Za-z0-9_\-]{1,120}$' -or @('ans', 'jk', 'leave') -notcontains [string]$b.op) { Send-Deny $res 400 'gecersiz istek'; return }
  $pin = [string]$b.pin; $c = $ctl[$pin]
  if (-not $c) { Send-Deny $res 404 'Yarışma bulunamadı.'; return }
  $bd = $bind[$pin]; $th = Get-Sha ([string]$b.tok); $tid = $null
  foreach ($f in @($bd.Keys)) { if (-not $f.StartsWith('f:') -and (Get-Tok ([string]$bd[$f])) -eq $th) { $tid = $f; break } }
  if (-not $tid) { Send-Deny $res 401 'Kaptan oturumu geçersiz. Takımınızı yeniden seçip kodu girin.' @{ relogin = $true }; return }
  $t = $c.teams[$tid]
  if (-not $t -or -not $t.act) { Send-Deny $res 403 'Bu takım elendi; cevap ve joker gönderemez.' @{ out = $true }; return }
  if ([string]$b.op -eq 'leave') {
    $nowL = Get-NowMs; $tl = 0.0
    if (-not [double]::TryParse([string]$b.t, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$tl) -or $tl -lt ($nowL - 600000) -or $tl -gt ($nowL + 3000)) { Send-Deny $res 400 'Gönderim zamanı geçersiz.'; return }
    $tl0 = [int64][math]::Round($tl); $devL = Get-Dev ([string]$bd[$tid])
    Write-Db "games/$pin/viol/$tid/v$tl0" (ConvertTo-Json -InputObject ([ordered]@{ t = $tl0; dev = $devL; qk = [string]$b.qk; open = [bool]$b.open }) -Compress)
    Send-Json $res ([ordered]@{ ok = $true }); return
  }
  if (-not $c.acc -or $c.qk -ne [string]$b.qk) { Send-Deny $res 409 'Bu soru için cevap kabulü kapalı.'; return }
  if ($null -ne $c.elig -and $c.elig -notcontains $tid) { Send-Deny $res 403 'Bu soruyu yalnız eşitlikteki takımlar cevaplar.'; return }
  $now = Get-NowMs; $tt = 0.0
  if (-not [double]::TryParse([string]$b.t, [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$tt) -or $tt -lt ($now - 8000) -or $tt -gt ($now + 3000)) { Send-Deny $res 400 'Gönderim zamanı geçersiz; sayfayı yenileyin.'; return }
  $t0 = [int64][math]::Round($tt); $dev = Get-Dev ([string]$bd[$tid]); $qk = [string]$b.qk
  if ([string]$b.op -eq 'ans') {
    $v = $b.v
    $ok = ($v -is [string] -and $v -cmatch '^[ABCD]{1,2}$') -or (($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) -and [math]::Abs([double]$v) -lt 1e15)
    if (-not $ok) { Send-Deny $res 400 'Geçersiz cevap.'; return }
    $sid = 's' + $t0 + [guid]::NewGuid().ToString('N').Substring(0, 6)
    Write-Db "games/$pin/answers/$qk/$tid/$sid" (ConvertTo-Json -InputObject ([ordered]@{ v = $v; t = $t0; dev = $dev }) -Compress)
    Send-Json $res ([ordered]@{ ok = $true; t = $t0 }); return
  }
  if (-not $c.jk) { Send-Deny $res 409 'Bu soruda joker kullanılamaz.'; return }
  $j = [string]$b.j
  if (@('double', 'x2', 'risk') -notcontains $j) { Send-Deny $res 400 'Geçersiz joker.'; return }
  $stk = 0
  if ($j -eq 'risk') {
    $stk = [int]$b.s
    if (-not $c.risk) { Send-Deny $res 409 'Risk Jokeri yalnız Büyük Final''de kullanılır.'; return }
    if (@(5, 10, 15) -notcontains $stk) { Send-Deny $res 409 'Risk için 5, 10 ya da 15 puan seçin.'; return }
    Write-Db "games/$pin/jreq/$qk/$tid" ('{"j":"risk","t":' + $t0 + ',"dev":"' + $dev + '","s":' + $stk + '}')
  } else {
    Write-Db "games/$pin/jreq/$qk/$tid" ('{"j":"' + $j + '","t":' + $t0 + ',"dev":"' + $dev + '"}')
  }
  Send-Json $res ([ordered]@{ ok = $true; t = $t0 })
}

while ($listener.IsListening) {
  try { $ctx = $listener.GetContext() } catch { break }
  $req = $ctx.Request
  $res = $ctx.Response
  try {
    $p = $req.Url.AbsolutePath
    if ($p -eq '/api/db') {
      $now = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
      $head = '{"rev":' + $rev + ',"sid":"' + $sid + '","t":' + $now
      if ($req.QueryString['rev'] -eq [string]$rev -and $req.QueryString['sid'] -eq $sid) {
        Send-Text $res ($head + '}') 'application/json'
      } else {
        $sb = New-Object System.Text.StringBuilder
        [void]$sb.Append($head + ',"d":{')
        $first = $true
        foreach ($k in $db.Keys) {
          if (-not $first) { [void]$sb.Append(',') }
          $first = $false
          [void]$sb.Append('"' + $k + '":' + $db[$k])
        }
        [void]$sb.Append('}}')
        Send-Text $res $sb.ToString() 'application/json'
      }
    }
    elseif ($p -eq '/api/set' -and $req.HttpMethod -eq 'POST') {
      $key = $req.QueryString['path']
      if (-not $key -or $key -notmatch $pathRe -or $req.ContentLength64 -gt 65536) {
        Send-Text $res '{"ok":false}' 'application/json' 400
        continue
      }
      # Denetim kaydi olan yarismada genel yazim yalniz admin anahtariyla (telefonlar /api/join ve /api/cmd kullanir).
      if ($key -match '^games/(\d{6})(/|$)' -and $ctl.ContainsKey($Matches[1]) -and $ctl[$Matches[1]].adm -ne (Get-Sha ([string]$req.Headers['X-Ka-Key']))) {
        Send-Text $res '{"ok":false,"why":"yetkisiz"}' 'application/json' 403
        continue
      }
      $reader = New-Object System.IO.StreamReader($req.InputStream, $utf8)
      $body = $reader.ReadToEnd().Trim()
      $reader.Close()
      $valid = $true
      if ($body -eq '') { $valid = $false } else { try { $null = ConvertFrom-Json -InputObject $body } catch { $valid = $false } }
      if (-not $valid) {
        Send-Text $res '{"ok":false}' 'application/json' 400
        continue
      }
      Write-Db $key $body
      Send-Text $res '{"ok":true}' 'application/json'
    }
    elseif ($p -eq '/api/ctl' -and $req.HttpMethod -eq 'POST') { Invoke-Ctl $req $res }
    elseif ($p -eq '/api/join' -and $req.HttpMethod -eq 'POST') { Invoke-Join $req $res }
    elseif ($p -eq '/api/cmd' -and $req.HttpMethod -eq 'POST') { Invoke-Cmd $req $res }
    elseif ($p -eq '/api/info') {
      $ips = @(Get-LanIPs)
      $ipsJson = (@($ips | ForEach-Object { '"' + $_ + '"' })) -join ','
      Send-Text $res ('{"app":"kaplan-arena","port":' + $port + ',"ips":[' + $ipsJson + ']}') 'application/json'
    }
    elseif ($p -eq '/' -or $p -eq '/index.html' -or $p -eq '/kaplan-arena.html' -or $p -eq '/katil' -or $p -eq '/katil/') {
      $bytes = [System.IO.File]::ReadAllBytes($htmlPath)
      $res.StatusCode = 200
      $res.ContentType = 'text/html; charset=utf-8'
      $res.Headers['Cache-Control'] = 'no-store'
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.OutputStream.Close()
    }
    elseif ($p -match $staticRe) {
      # Uygulama modülleri, görseller ve fontlar: yalnız beyaz listedeki yollar, proje klasörü içinde.
      $rel = $p.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
      $full = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $rel))
      $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
      if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase) -or -not $mime.ContainsKey($ext) -or -not [System.IO.File]::Exists($full)) {
        Send-Text $res 'Bulunamadi' 'text/plain; charset=utf-8' 404
        continue
      }
      if ($ext -eq '.mp4') {
        # Video: byte-range (206). Sunucu tek iş parçacıklı olduğundan her yanıt en çok 1 MB'tır;
        # tarayıcı kalan aralıkları ayrı isteklerle alır, telefon istekleri video yüzünden bekletilmez.
        $fs = [System.IO.File]::Open($full, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
        try {
          $total = $fs.Length
          $res.ContentType = 'video/mp4'
          $res.Headers['Accept-Ranges'] = 'bytes'
          $res.Headers['Cache-Control'] = 'no-cache'
          $res.Headers['X-Content-Type-Options'] = 'nosniff'
          $rangeHdr = $req.Headers['Range']
          $start = [int64]0; $end = $total - 1
          if ($rangeHdr) {
            $rm = [regex]::Match($rangeHdr, '^bytes=(\d*)-(\d*)$')
            if (-not $rm.Success -or ($rm.Groups[1].Value -eq '' -and $rm.Groups[2].Value -eq '')) {
              $res.StatusCode = 416; $res.Headers['Content-Range'] = "bytes */$total"; $res.ContentLength64 = 0; $res.OutputStream.Close(); continue
            }
            if ($rm.Groups[1].Value -eq '') { $start = [math]::Max([int64]0, $total - [int64]$rm.Groups[2].Value) }
            else {
              $start = [int64]$rm.Groups[1].Value
              if ($rm.Groups[2].Value -ne '') { $end = [math]::Min($total - 1, [int64]$rm.Groups[2].Value) }
            }
            if ($start -ge $total -or $start -gt $end) {
              $res.StatusCode = 416; $res.Headers['Content-Range'] = "bytes */$total"; $res.ContentLength64 = 0; $res.OutputStream.Close(); continue
            }
            $end = [math]::Min($end, $start + 1048575)
            $res.StatusCode = 206
            $res.Headers['Content-Range'] = "bytes $start-$end/$total"
          } else { $res.StatusCode = 200 }
          $len = $end - $start + 1
          $res.ContentLength64 = $len
          [void]$fs.Seek($start, [System.IO.SeekOrigin]::Begin)
          $buf = New-Object byte[] 65536
          $left = $len
          while ($left -gt 0) {
            $n = $fs.Read($buf, 0, [int][math]::Min($buf.Length, $left))
            if ($n -le 0) { break }
            $res.OutputStream.Write($buf, 0, $n); $left -= $n
          }
          $res.OutputStream.Close()
        } finally { $fs.Dispose() }
        continue
      }
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $res.StatusCode = 200
      $res.ContentType = $mime[$ext]
      $res.Headers['Cache-Control'] = 'no-cache'
      $res.Headers['X-Content-Type-Options'] = 'nosniff'
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.OutputStream.Close()
    }
    else {
      Send-Text $res 'Bulunamadi' 'text/plain; charset=utf-8' 404
    }
  } catch {
    try { $res.StatusCode = 500; $res.Close() } catch {}
  }
}
