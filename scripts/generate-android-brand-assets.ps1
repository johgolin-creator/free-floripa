Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resRoot = Join-Path $root "android\app\src\main\res"

if (!(Test-Path $resRoot)) {
  throw "Android resources not found. Run Capacitor Android setup first."
}

# Brand tokens (must match src/components/BrandLogo.tsx / public/favicon.svg):
# dark navy card background + a lime-green ring mark (a near-full circle with a
# small gap at the bottom, capped by two dots), drawn on a 48x48 reference grid.
$darkColor = [System.Drawing.Color]::FromArgb(0x11, 0x13, 0x18)
$markColor = [System.Drawing.Color]::FromArgb(0xC8, 0xFF, 0x38)

$gridSize = 48.0
$centerX = 24.0
$centerY = 24.0
$radius = 15.0
$strokeWidth = 5.0
$dotRadius = 4.0
$dot1 = @{ X = 31.5; Y = 37.0 }
$dot2 = @{ X = 16.5; Y = 37.0 }
$startAngle = [Math]::Atan2($dot2.Y - $centerY, $dot2.X - $centerX) * 180.0 / [Math]::PI
$endAngle = [Math]::Atan2($dot1.Y - $centerY, $dot1.X - $centerX) * 180.0 / [Math]::PI
$sweepAngle = $endAngle - $startAngle
if ($sweepAngle -le 0) { $sweepAngle += 360 }
# Keep the major arc (the near-full ring), matching the SVG's large-arc-flag.
if ($sweepAngle -lt 180) { $sweepAngle -= 360 }

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

# Draws the PONT ring mark centered at ($cx, $cy) with the 48-unit reference
# grid scaled so it spans $spanPx pixels.
function Draw-Mark($g, [float]$cx, [float]$cy, [float]$spanPx) {
  $scale = $spanPx / $gridSize
  $originX = $cx - $spanPx / 2
  $originY = $cy - $spanPx / 2

  function Grid([float]$v) { return $v * $scale }

  $penWidth = [Math]::Max(1.0, $strokeWidth * $scale)
  $pen = New-Object System.Drawing.Pen($markColor, $penWidth)
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  $boxX = $originX + (Grid ($centerX - $radius))
  $boxY = $originY + (Grid ($centerY - $radius))
  $boxSize = Grid ($radius * 2)
  $g.DrawArc($pen, $boxX, $boxY, $boxSize, $boxSize, $startAngle, $sweepAngle)

  $brush = New-Object System.Drawing.SolidBrush($markColor)
  foreach ($dot in @($dot1, $dot2)) {
    $dx = $originX + (Grid ($dot.X - $dotRadius))
    $dy = $originY + (Grid ($dot.Y - $dotRadius))
    $g.FillEllipse($brush, $dx, $dy, (Grid ($dotRadius * 2)), (Grid ($dotRadius * 2)))
  }

  $pen.Dispose()
  $brush.Dispose()
}

function Save-Icon($path, [int]$size) {
  $canvas = New-Canvas $size $size
  $g = $canvas.Graphics
  $g.Clear([System.Drawing.Color]::Transparent)

  $cardRadius = $size * (10.0 / $gridSize)
  $cardPath = New-RoundedRectPath 0 0 $size $size $cardRadius
  $g.FillPath((New-Object System.Drawing.SolidBrush($darkColor)), $cardPath)

  Draw-Mark $g ($size / 2.0) ($size / 2.0) ($size * (30.0 / $gridSize))

  $g.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Save-Foreground($path, [int]$size) {
  # Adaptive icon foreground layer: transparent background (the flat-color
  # background layer is @color/ic_launcher_background), mark kept inside the
  # ~66%-of-canvas safe zone so it survives launcher masking/parallax.
  $canvas = New-Canvas $size $size
  $g = $canvas.Graphics
  $g.Clear([System.Drawing.Color]::Transparent)

  Draw-Mark $g ($size / 2.0) ($size / 2.0) ($size * 0.4)

  $g.Dispose()
  $canvas.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $canvas.Bitmap.Dispose()
}

function Save-Splash($path, [int]$width, [int]$height) {
  $canvas = New-Canvas $width $height
  $g = $canvas.Graphics
  $g.Clear($darkColor)

  $span = [Math]::Min($width, $height) * 0.32
  Draw-Mark $g ($width / 2.0) ($height / 2.0) $span

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

Write-Output "Android brand assets generated."
