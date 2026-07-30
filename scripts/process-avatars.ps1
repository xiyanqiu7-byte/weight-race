Add-Type -AssemblyName System.Drawing

function ProcessAvatar([string]$inPath, [string]$outPath) {
  $bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $inPath))
  $w = $bmp.Width; $h = $bmp.Height

  function IsBlack([System.Drawing.Color]$c) { return ($c.R -le 45 -and $c.G -le 45 -and $c.B -le 45) }
  function IsColored([System.Drawing.Color]$c) {
    $max = [Math]::Max($c.R, [Math]::Max($c.G, $c.B))
    $min = [Math]::Min($c.R, [Math]::Min($c.G, $c.B))
    return (($max - $min) -gt 30) -and ($max -gt 140) -and ($min -gt 80)
  }

  $cMinX = $w; $cMinY = $h; $cMaxX = 0; $cMaxY = 0
  for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
      if (IsColored $bmp.GetPixel($x, $y)) {
        if ($x -lt $cMinX) { $cMinX = $x }
        if ($y -lt $cMinY) { $cMinY = $y }
        if ($x -gt $cMaxX) { $cMaxX = $x }
        if ($y -gt $cMaxY) { $cMaxY = $y }
      }
    }
  }

  function RowBlackRatio([int]$y, [int]$x0, [int]$x1) {
    $n = 0; $b = 0
    for ($x = $x0; $x -le $x1; $x++) { $n++; if (IsBlack $bmp.GetPixel($x, $y)) { $b++ } }
    if ($n -eq 0) { return 0 }; return $b / $n
  }
  function ColBlackRatio([int]$x, [int]$y0, [int]$y1) {
    $n = 0; $b = 0
    for ($y = $y0; $y -le $y1; $y++) { $n++; if (IsBlack $bmp.GetPixel($x, $y)) { $b++ } }
    if ($n -eq 0) { return 0 }; return $b / $n
  }

  $top = $cMinY
  for ($y = $cMinY; $y -ge 0; $y--) {
    if ((RowBlackRatio $y $cMinX $cMaxX) -gt 0.75) { $top = $y } else { if ($y -lt $cMinY - 2) { break } }
  }
  while ($top -gt 0 -and (RowBlackRatio ($top - 1) $cMinX $cMaxX) -gt 0.75) { $top-- }

  $bot = $cMaxY
  for ($y = $cMaxY; $y -lt $h; $y++) {
    if ((RowBlackRatio $y $cMinX $cMaxX) -gt 0.75) { $bot = $y } else { if ($y -gt $cMaxY + 2) { break } }
  }
  while ($bot -lt $h - 1 -and (RowBlackRatio ($bot + 1) $cMinX $cMaxX) -gt 0.75) { $bot++ }

  $left = $cMinX
  for ($x = $cMinX; $x -ge 0; $x--) {
    if ((ColBlackRatio $x $cMinY $cMaxY) -gt 0.75) { $left = $x } else { if ($x -lt $cMinX - 2) { break } }
  }
  while ($left -gt 0 -and (ColBlackRatio ($left - 1) $cMinY $cMaxY) -gt 0.75) { $left-- }

  $right = $cMaxX
  for ($x = $cMaxX; $x -lt $w; $x++) {
    if ((ColBlackRatio $x $cMinY $cMaxY) -gt 0.75) { $right = $x } else { if ($x -gt $cMaxX + 2) { break } }
  }
  while ($right -lt $w - 1 -and (ColBlackRatio ($right + 1) $cMinY $cMaxY) -gt 0.75) { $right++ }

  $cw = $right - $left + 1
  $ch = $bot - $top + 1
  $rect = New-Object System.Drawing.Rectangle $left, $top, $cw, $ch
  $crop = $bmp.Clone($rect, $bmp.PixelFormat)
  $bmp.Dispose()

  $bg = $null
  for ($y = 8; $y -lt [Math]::Min(40, $ch) -and $null -eq $bg; $y++) {
    for ($x = 8; $x -lt [Math]::Min(40, $cw); $x++) {
      $c = $crop.GetPixel($x, $y)
      if (IsColored $c) { $bg = $c; break }
    }
  }
  if ($null -eq $bg) { $bg = [System.Drawing.Color]::FromArgb(131, 148, 252) }

  $ring = 4
  for ($y = 0; $y -lt $ch; $y++) {
    for ($x = 0; $x -lt $cw; $x++) {
      if ($x -lt $ring -or $y -lt $ring -or $x -ge $cw - $ring -or $y -ge $ch - $ring) {
        $crop.SetPixel($x, $y, $bg)
      }
    }
  }

  $tmp = "$outPath.tmp.png"
  $crop.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
  Move-Item -Force $tmp $outPath
  $hex = "#{0:X2}{1:X2}{2:X2}" -f $bg.R, $bg.G, $bg.B
  Write-Output "OK $outPath bg=$hex"
}

$dir = "C:\Users\28578\weight-race\public\avatars"
Copy-Item "$dir\male.png" "$dir\avatar-a.png" -Force
Copy-Item "$dir\female.png" "$dir\avatar-b.png" -Force
ProcessAvatar "$dir\male-1.png" "$dir\avatar-c.png"
ProcessAvatar "$dir\female-3.png" "$dir\avatar-d.png"
