Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$logoPath = Join-Path $root "src\assets\free-floripa-logo.jpg"
$resRoot = Join-Path $root "android\app\src\main\res"

if (!(Test-Path $logoPath)) {
  throw "Logo not found: $logoPath"
}

if (!(Test-Path $resRoot)) {
  throw "Android resources not found. Run Capacitor Android setup first."
}

$logo = [System.Drawing.Image]::FromFile($logoPath)

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

function New-Canvas([int]$width, [int]$height) {
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Icon($path, [int]$size) {
  $canvas = New-Canvas $size $size
  $g = $canvas.Graphics
  $g.Clear([System.Drawing.Color]::FromArgb(5, 31, 51))

  $card = [Math]::Round($size * 0.78)
  $x = ($size - $card) / 2
  $y = ($size - $card) / 2
  $cardPath = New-RoundedRectPath $x $y $card $card ($card * 0.22)
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), $cardPath)

  $logoSize = [Math]::Round($card * 0.84)
  $g.DrawImage($logo, ($size - $logoSize) / 2, ($size - $logoSize) / 2, $logoSize, $logoSize)
  $g.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Save-Foreground($path, [int]$size) {
  $canvas = New-Canvas $size $size
  $g = $canvas.Graphics
  $g.Clear([System.Drawing.Color]::Transparent)

  $card = [Math]::Round($size * 0.62)
  $x = ($size - $card) / 2
  $y = ($size - $card) / 2
  $cardPath = New-RoundedRectPath $x $y $card $card ($card * 0.2)
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), $cardPath)

  $logoSize = [Math]::Round($card * 0.86)
  $g.DrawImage($logo, ($size - $logoSize) / 2, ($size - $logoSize) / 2, $logoSize, $logoSize)
  $g.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Save-Splash($path, [int]$width, [int]$height) {
  $canvas = New-Canvas $width $height
  $g = $canvas.Graphics
  $g.Clear([System.Drawing.Color]::FromArgb(5, 31, 51))

  $accent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(16, 185, 166))
  $g.FillRectangle($accent, 0, [Math]::Round($height * 0.86), $width, [Math]::Max(6, [Math]::Round($height * 0.015)))

  $panel = [Math]::Round([Math]::Min($width * 0.48, $height * 0.42))
  $panel = [Math]::Max($panel, 120)
  $x = ($width - $panel) / 2
  $y = ($height - $panel) / 2
  $panelPath = New-RoundedRectPath $x $y $panel $panel ($panel * 0.16)
  $g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)), $panelPath)

  $logoSize = [Math]::Round($panel * 0.86)
  $g.DrawImage($logo, ($width - $logoSize) / 2, ($height - $logoSize) / 2, $logoSize, $logoSize)
  $g.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

$iconSizes = @{
  "mipmap-mdpi" = 48
  "mipmap-hdpi" = 72
  "mipmap-xhdpi" = 96
  "mipmap-xxhdpi" = 144
  "mipmap-xxxhdpi" = 192
}

foreach ($entry in $iconSizes.GetEnumerator()) {
  $dir = Join-Path $resRoot $entry.Key
  Save-Icon (Join-Path $dir "ic_launcher.png") $entry.Value
  Save-Icon (Join-Path $dir "ic_launcher_round.png") $entry.Value
  Save-Foreground (Join-Path $dir "ic_launcher_foreground.png") ([int]($entry.Value * 2.25))
}

$splashes = @{
  "drawable\splash.png" = @(480, 320)
  "drawable-land-mdpi\splash.png" = @(480, 320)
  "drawable-land-hdpi\splash.png" = @(800, 480)
  "drawable-land-xhdpi\splash.png" = @(1280, 720)
  "drawable-land-xxhdpi\splash.png" = @(1600, 960)
  "drawable-land-xxxhdpi\splash.png" = @(1920, 1280)
  "drawable-port-mdpi\splash.png" = @(320, 480)
  "drawable-port-hdpi\splash.png" = @(480, 800)
  "drawable-port-xhdpi\splash.png" = @(720, 1280)
  "drawable-port-xxhdpi\splash.png" = @(960, 1600)
  "drawable-port-xxxhdpi\splash.png" = @(1280, 1920)
}

foreach ($entry in $splashes.GetEnumerator()) {
  $path = Join-Path $resRoot $entry.Key
  Save-Splash $path $entry.Value[0] $entry.Value[1]
}

$logo.Dispose()
Write-Output "Android brand assets generated."
