# Generates Google Play listing graphics from the app icon and logo (brand colours from docs/design.md).
# Output: store-assets/icon-512.png (512x512) and store-assets/feature-graphic.png (1024x500).
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts/store-assets.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'store-assets'
New-Item -ItemType Directory -Force $out | Out-Null

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.PixelOffsetMode = 'HighQuality'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  return @($bmp, $g)
}

# 1) Play icon: 512x512, 32-bit PNG.
$icon = [System.Drawing.Image]::FromFile((Join-Path $root 'assets/images/icon.png'))
$bmp, $g = New-Canvas 512 512
$g.DrawImage($icon, 0, 0, 512, 512)
$bmp.Save((Join-Path $out 'icon-512.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $icon.Dispose()

# 2) Feature graphic: 1024x500, primary -> primaryDark gradient, logo + name + tagline.
$fonts = New-Object System.Drawing.Text.PrivateFontCollection
$fonts.AddFontFile((Join-Path $root 'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'))
$fonts.AddFontFile((Join-Path $root 'node_modules/@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'))
$bold = $fonts.Families | Where-Object { $_.Name -eq 'Inter' } | Select-Object -First 1

$bmp, $g = New-Canvas 1024 500
$rect = New-Object System.Drawing.Rectangle 0, 0, 1024, 500
$grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.ColorTranslator]::FromHtml('#5B2ED6')), ([System.Drawing.ColorTranslator]::FromHtml('#3D1AA8')), 20
$g.FillRectangle($grad, $rect)

$logo = [System.Drawing.Image]::FromFile((Join-Path $root 'assets/images/logo.png'))
$g.DrawImage($logo, 96, 130, 240, 240)

$white = [System.Drawing.Brushes]::White
$soft = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#EDE7FF'))
$title = New-Object System.Drawing.Font $bold, 60, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$sub = New-Object System.Drawing.Font $bold, 30, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('Expense Tracker', $title, $white, 380, 170)
$g.DrawString('Income, expenses & budgets', $sub, $soft, 384, 258)
$g.DrawString('By hand, by voice, by receipt', $sub, $soft, 384, 300)

$bmp.Save((Join-Path $out 'feature-graphic.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $logo.Dispose(); $grad.Dispose()
Write-Output "Wrote $out\icon-512.png and $out\feature-graphic.png"
