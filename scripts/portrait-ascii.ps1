# Turns assets/portrait.jpg into assets/portrait-ascii.txt and a matching
# assets/portrait-tone.txt of shades, which build.mjs draws into the header. Rerun this only when the photo changes; Node has no
# JPEG decoder, so the sampling happens here with the built-in System.Drawing.
# Run from the repo root:  powershell -File scripts/portrait-ascii.ps1

Add-Type -AssemblyName System.Drawing

$COLS = 100
$ROWS = 50                        # cells are twice as tall as wide, like a terminal font
$SHARPEN = 0.8                   # how hard features are pulled out of their surroundings
# Sparse to dense; dense reads as bright on a dark page.
$RAMP = " .'``^,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

$img = [System.Drawing.Bitmap]::new((Resolve-Path 'assets/portrait.jpg').Path)
# Square crop around the head, in photo pixels: left, top, size. The full
# frame spends a third of the grid on backdrop and jacket.
$CROP = @(70, 0, 530)
$cw = $CROP[2] / $COLS
$ch = $CROP[2] / $ROWS

# First pass: average brightness per cell, and whether the backdrop shows.
$lum = New-Object 'double[,]' $ROWS, $COLS
$fg = New-Object 'bool[,]' $ROWS, $COLS
for ($r = 0; $r -lt $ROWS; $r++) {
  for ($c = 0; $c -lt $COLS; $c++) {
    $sum = 0.0; $bg = 0; $n = 0
    for ($y = $CROP[1] + [int]($r * $ch); $y -lt $CROP[1] + [int](($r + 1) * $ch); $y++) {
      for ($x = $CROP[0] + [int]($c * $cw); $x -lt $CROP[0] + [int](($c + 1) * $cw); $x += 2) {
        $p = $img.GetPixel($x, $y)
        # The backdrop is saturated orange: lots of red, little green, almost
        # no blue. Skin and hair keep green and blue in proportion.
        $n++
        if ($p.R -gt 45 -and $p.G -lt 0.42 * $p.R -and $p.B -lt 0.15 * $p.R + 8) { $bg++; continue }
        # Brightness from the subject's pixels only: cells on the outline
        # otherwise average in the glowing backdrop and turn into a bright
        # rim. Red is weighted down too, since the whole photo is lit orange
        # and the orange-lit edge of the face would still glow.
        $sum += 0.2 * $p.R + 0.7 * $p.G + 0.1 * $p.B
      }
    }
    $fg[$r, $c] = $bg / $n -le 0.5
    $lum[$r, $c] = if ($n -gt $bg) { $sum / ($n - $bg) / 255 } else { 0 }
  }
}
$img.Dispose()

function Inside($r, $c) { $r -ge 0 -and $r -lt $ROWS -and $c -ge 0 -and $c -lt $COLS }

# Second pass: sharpen against the subject's own neighbourhood (backdrop
# cells are left out of the blur, so the outline does not glow), and drop
# lone specks of backdrop that slipped past the colour test.
$val = New-Object 'double[,]' $ROWS, $COLS
$keep = New-Object 'bool[,]' $ROWS, $COLS
$seen = New-Object System.Collections.Generic.List[double]
for ($r = 0; $r -lt $ROWS; $r++) {
  for ($c = 0; $c -lt $COLS; $c++) {
    if (-not $fg[$r, $c]) { continue }
    $sum = 0.0; $n = 0
    for ($dr = -2; $dr -le 2; $dr++) {
      for ($dc = -2; $dc -le 2; $dc++) {
        $rr = $r + $dr; $cc = $c + $dc
        if ((Inside $rr $cc) -and $fg[$rr, $cc]) { $sum += $lum[$rr, $cc]; $n++ }
      }
    }
    if ($n -lt 10) { continue }               # fewer than 10 of 25 neighbours lit: a speck
    $v = $lum[$r, $c] + $SHARPEN * ($lum[$r, $c] - $sum / $n)
    $val[$r, $c] = $v; $keep[$r, $c] = $true
  }
}

# Keep only the largest connected shape, head through chest. The crop cuts
# through the shoulders, which otherwise leaves a sliver of jacket floating
# off on its own beside the neck.
$part = New-Object 'int[,]' $ROWS, $COLS
$sizes = @{}; $id = 0
for ($r = 0; $r -lt $ROWS; $r++) {
  for ($c = 0; $c -lt $COLS; $c++) {
    if (-not $keep[$r, $c] -or $part[$r, $c]) { continue }
    $id++; $sizes[$id] = 0
    $stack = New-Object System.Collections.Generic.Stack[int[]]
    $stack.Push(@($r, $c)); $part[$r, $c] = $id
    while ($stack.Count) {
      $at = $stack.Pop(); $sizes[$id]++
      for ($dr = -1; $dr -le 1; $dr++) {
        for ($dc = -1; $dc -le 1; $dc++) {
          $rr = $at[0] + $dr; $cc = $at[1] + $dc
          if ((Inside $rr $cc) -and $keep[$rr, $cc] -and -not $part[$rr, $cc]) {
            $part[$rr, $cc] = $id; $stack.Push(@($rr, $cc))
          }
        }
      }
    }
  }
}
$main = ($sizes.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 1).Key
for ($r = 0; $r -lt $ROWS; $r++) {
  for ($c = 0; $c -lt $COLS; $c++) {
    if (-not $keep[$r, $c]) { continue }
    if ($part[$r, $c] -ne $main) { $keep[$r, $c] = $false } else { $v = $val[$r, $c]; $seen.Add($v) }
  }
}
Write-Output "kept the main shape, dropped $($sizes.Count - 1) loose pieces"

# Third pass: spread the subject's tones evenly over the ramp (histogram
# equalisation). The shadowed half of the face and the near-black hair would
# otherwise all land on the first few rungs and read as dots.
$sorted = $seen.ToArray(); [array]::Sort($sorted)
$top = $RAMP.Length - 1
#
# Alongside each character goes a shade, 0 to $SHADES - 1, from the cell's
# plain brightness; build.mjs draws each shade as its own layer, dimmer to
# brighter, so the light falls across the face the way it does in the photo.
$SHADES = 6
$tones = New-Object System.Collections.Generic.List[string]
$lines = for ($r = 0; $r -lt $ROWS; $r++) {
  $tone = ''
  $line = for ($c = 0; $c -lt $COLS; $c++) {
    if (-not $keep[$r, $c]) { $tone += ' '; ' '; continue }
    $v = $val[$r, $c]
    $rank = [array]::BinarySearch($sorted, $v)
    if ($rank -lt 0) { $rank = -bnot $rank }
    # Half equalised, half plain brightness: fully equalised, the near-black
    # hair turns into busy letters.
    $lin = [math]::Max(0.0, [math]::Min(1.0, ($v - $sorted[0]) / ($sorted[-1] - $sorted[0])))
    $t = 0.55 * $rank / ($sorted.Length - 1) + 0.45 * $lin
    $tone += [string][math]::Min($SHADES - 1, [int][math]::Floor([math]::Pow($lin, 1.1) * $SHADES))
    # Rung 0 is the space, kept for the backdrop. The last few rungs are near
    # solid glyphs that run together into a block, so highlights stop short.
    $RAMP[1 + [int][math]::Floor($t * 0.9 * ($top - 1))]
  }
  $tones.Add($tone.TrimEnd())
  (-join $line).TrimEnd()
}
Set-Content -Path 'assets/portrait-ascii.txt' -Value ($lines -join "`n") -Encoding ascii -NoNewline
Set-Content -Path 'assets/portrait-tone.txt' -Value ($tones -join "`n") -Encoding ascii -NoNewline
Write-Output 'wrote assets/portrait-ascii.txt and assets/portrait-tone.txt'
