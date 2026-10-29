# Turns assets/portrait.jpg into assets/portrait-ascii.txt, which build.mjs
# draws into the header. Rerun this only when the photo changes; Node has no
# JPEG decoder, so the sampling happens here with the built-in System.Drawing.
# Run from the repo root:  powershell -File scripts/portrait-ascii.ps1

Add-Type -AssemblyName System.Drawing

$COLS = 100
$ROWS = 50                        # cells are twice as tall as wide, like a terminal font
$SHARPEN = 0.8                   # how hard features are pulled out of their surroundings
# Sparse to dense; dense reads as bright on a dark page.
$RAMP = " .'``^,:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"

$img = [System.Drawing.Bitmap]::new((Resolve-Path 'assets/portrait.jpg').Path)
$cw = $img.Width / $COLS
$ch = $img.Height / $ROWS

# First pass: average brightness per cell, and whether the backdrop shows.
$lum = New-Object 'double[,]' $ROWS, $COLS
$fg = New-Object 'bool[,]' $ROWS, $COLS
for ($r = 0; $r -lt $ROWS; $r++) {
  for ($c = 0; $c -lt $COLS; $c++) {
    $sum = 0.0; $bg = 0; $n = 0
    for ($y = [int]($r * $ch); $y -lt [int](($r + 1) * $ch); $y++) {
      for ($x = [int]($c * $cw); $x -lt [int](($c + 1) * $cw); $x += 2) {
        $p = $img.GetPixel($x, $y)
        # The backdrop is saturated orange: lots of red, little green, almost
        # no blue. Skin and hair keep green and blue in proportion.
        if ($p.R -gt 45 -and $p.G -lt 0.42 * $p.R -and $p.B -lt 0.15 * $p.R + 8) { $bg++ }
        $sum += 0.299 * $p.R + 0.587 * $p.G + 0.114 * $p.B
        $n++
      }
    }
    $lum[$r, $c] = $sum / $n / 255
    $fg[$r, $c] = $bg / $n -le 0.5
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
    $seen.Add($v)
  }
}

# Third pass: spread the subject's tones evenly over the ramp (histogram
# equalisation). The shadowed half of the face and the near-black hair would
# otherwise all land on the first few rungs and read as dots.
$sorted = $seen.ToArray(); [array]::Sort($sorted)
$top = $RAMP.Length - 1
$lines = for ($r = 0; $r -lt $ROWS; $r++) {
  $line = for ($c = 0; $c -lt $COLS; $c++) {
    if (-not $keep[$r, $c]) { ' '; continue }
    $v = $val[$r, $c]
    $rank = [array]::BinarySearch($sorted, $v)
    if ($rank -lt 0) { $rank = -bnot $rank }
    # Half equalised, half plain brightness: fully equalised, the near-black
    # hair turns into busy letters.
    $lin = [math]::Max(0.0, [math]::Min(1.0, ($v - $sorted[0]) / ($sorted[-1] - $sorted[0])))
    $t = 0.55 * $rank / ($sorted.Length - 1) + 0.45 * $lin
    $RAMP[1 + [int][math]::Floor($t * ($top - 1))]     # rung 0 is the space, kept for the backdrop
  }
  (-join $line).TrimEnd()
}
Set-Content -Path 'assets/portrait-ascii.txt' -Value ($lines -join "`n") -Encoding ascii -NoNewline
Write-Output 'wrote assets/portrait-ascii.txt'
