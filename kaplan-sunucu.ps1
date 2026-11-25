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
$staticRe = '^/(app/[A-Za-z0-9_\-]+\.(js|css)|assets/([A-Za-z0-9_\-]+/)*[A-Za-z0-9_\-]+(\.[A-Za-z0-9_\-]+)*\.(webp|png|svg|woff2|css|txt|mp4))$'
$rootFull = [System.IO.Path]::GetFullPath($root).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$mime = @{ '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.webp'='image/webp'; '.png'='image/png'; '.svg'='image/svg+xml'; '.woff2'='font/woff2'; '.txt'='text/plain; charset=utf-8'; '.mp4'='video/mp4' }
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
Write-Host '   KAPLAN ARENA SUNUCUSU CALISIYOR  (Surum 8)' -ForegroundColor Yellow
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
      $reader = New-Object System.IO.StreamReader($req.InputStream, $utf8)
      $body = $reader.ReadToEnd().Trim()
      $reader.Close()
      $valid = $true
      if ($body -eq '') { $valid = $false } else { try { $null = ConvertFrom-Json -InputObject $body } catch { $valid = $false } }
      if (-not $valid) {
        Send-Text $res '{"ok":false}' 'application/json' 400
        continue
      }
      $remove = @()
      foreach ($k in $db.Keys) { if ($k -eq $key -or $k.StartsWith($key + '/')) { $remove += $k } }
      foreach ($k in $remove) { [void]$db.Remove($k) }
      if ($body -ne 'null') { $db[$key] = $body }
      $rev++
      Send-Text $res '{"ok":true}' 'application/json'
    }
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
