param(
  [string]$Repo = "MauricioPerera/groq-code-cli",
  [string]$Branch = "main"
)

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-ErrorLine($msg) { Write-Host "[ERROR] $msg" -ForegroundColor Red }

Write-Info "Verificando Node.js y npm..."
try { node -v > $null } catch { Write-ErrorLine "Node.js no encontrado"; exit 1 }
try { npm -v > $null } catch { Write-ErrorLine "npm no encontrado"; exit 1 }

Write-Info "Intentando instalar globalmente desde GitHub (npm)..."
try {
  npm install -g "github:$Repo" --silent
  if ($LASTEXITCODE -eq 0) {
    Write-Info "Instalación vía npm (GitHub) exitosa"
    nexus -V
    exit 0
  }
} catch {}

Write-Info "Fallo la instalación directa; intentando fallback (clone + build + link)"
$tmp = Join-Path $env:TEMP ("nexus-cli-install-" + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tmp -Force | Out-Null

try {
  git --version > $null
} catch {
  Write-ErrorLine "Git no está disponible y es necesario para el fallback."
  exit 1
}

Write-Info "Clonando https://github.com/$Repo (branch $Branch) en $tmp"
git clone --depth 1 --branch $Branch "https://github.com/$Repo.git" $tmp | Out-Null
if ($LASTEXITCODE -ne 0) { Write-ErrorLine "No se pudo clonar el repositorio"; exit 1 }

Push-Location $tmp
try {
  Write-Info "Instalando dependencias (npm ci)"
  npm ci | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "npm ci falló" }

  Write-Info "Compilando (npm run build)"
  npm run build | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "build falló" }

  Write-Info "Registrando binario global (npm link)"
  npm link | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "npm link falló" }
}
catch {
  Write-ErrorLine $_
  Pop-Location
  exit 1
}
Pop-Location

Write-Info "Validando instalación"
try {
  nexus -V
} catch {
  Write-ErrorLine "No se pudo ejecutar 'nexus' tras la instalación"
  exit 1
}
Write-Info "Instalación completada. Usa 'nexus' para iniciar."


