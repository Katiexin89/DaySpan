$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$electronDist = Join-Path $root "node_modules\electron\dist"
$outDir = Join-Path $root "dist\DaySpan"
$appDir = Join-Path $outDir "resources\app"

if (-not (Test-Path (Join-Path $electronDist "electron.exe"))) {
  throw "Electron runtime was not found. Run npm.cmd install first."
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Copy-Item -Path (Join-Path $electronDist "*") -Destination $outDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $outDir "electron.exe") -Destination (Join-Path $outDir "DaySpan.exe") -Force

if (Test-Path $appDir) {
  Remove-Item -LiteralPath $appDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $appDir | Out-Null
$appFiles = @(
  "package.json",
  "electron-main.js",
  "preload.js",
  "index.html",
  "styles.css",
  "app.js",
  "README.md"
)

foreach ($file in $appFiles) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $appDir $file) -Force
}

Write-Host "Built portable app:"
Write-Host (Join-Path $outDir "DaySpan.exe")
