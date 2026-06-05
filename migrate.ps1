$src = 'C:\Projects\playpadel\data.json'
$json = [System.IO.File]::ReadAllText($src, [System.Text.Encoding]::UTF8) | ConvertFrom-Json

# Step 1: extract unique player names
$playerMap = @{}
$pCount = 0
foreach ($jogo in $json.jogos) {
  foreach ($pair in @($jogo.eq1, $jogo.eq2)) {
    if ([string]::IsNullOrWhiteSpace($pair)) { continue }
    if ($pair -match '^\s*A Definir\s*$') { continue }
    foreach ($part in $pair.Split('&')) {
      $n = $part.Trim()
      if ($n -and $n -ne 'A Definir' -and -not $playerMap.ContainsKey($n)) {
        $pCount++
        $playerMap[$n] = "j$pCount"
      }
    }
  }
}
Write-Host "Unique players found: $pCount"

# Step 2: build jogadores with phone data preserved
$tels = $json.telefones
$jogadores = [System.Collections.Generic.List[hashtable]]::new()
foreach ($entry in $playerMap.GetEnumerator() | Sort-Object { [int]$_.Value.Substring(1) }) {
  $tel = ''
  if ($tels -and $tels.PSObject.Properties[$entry.Key]) { $tel = $tels.PSObject.Properties[$entry.Key].Value }
  $jogadores.Add(@{ id = $entry.Value; nome = $entry.Key; tel = $tel })
}

# Step 3: extract unique pair+group combos as duplas
$duplaMap = @{}
$dCount = 0
foreach ($jogo in $json.jogos) {
  $g = $jogo.grupo
  foreach ($pair in @($jogo.eq1, $jogo.eq2)) {
    if ([string]::IsNullOrWhiteSpace($pair)) { continue }
    if ($pair -match '^\s*A Definir\s*$') { continue }
    $key = "$pair|$g"
    if (-not $duplaMap.ContainsKey($key)) {
      $dCount++
      $parts = $pair.Split('&') | ForEach-Object { $_.Trim() }
      $j1id = if ($playerMap.ContainsKey($parts[0])) { $playerMap[$parts[0]] } else { $null }
      $j2id = if ($parts.Length -gt 1 -and $playerMap.ContainsKey($parts[1])) { $playerMap[$parts[1]] } else { $null }
      $duplaMap[$key] = @{ id = "d$dCount"; j1 = $j1id; j2 = $j2id; grupo = $g }
    }
  }
}
Write-Host "Unique duplas found: $dCount"

$duplas = [System.Collections.Generic.List[hashtable]]::new()
foreach ($d in $duplaMap.Values | Sort-Object { [int]$_.id.Substring(1) }) {
  $duplas.Add($d)
}

# Step 4: add to json and write
$json | Add-Member -MemberType NoteProperty -Name 'jogadores' -Value $jogadores.ToArray() -Force
$json | Add-Member -MemberType NoteProperty -Name 'duplas'    -Value $duplas.ToArray()    -Force
$json._updated = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')

$out = $json | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($src, $out, [System.Text.Encoding]::UTF8)
Write-Host "Migration complete. jogadores=$($jogadores.Count), duplas=$($duplas.Count)"
