# ────────────────────────────────────────────────────────────────
#  Schuss-Challenge · Backend-Verifier für B1/B2/B3/B4/B11/B12
# ────────────────────────────────────────────────────────────────
#  Voraussetzungen:
#    1. Node.js installiert  (z.B. winget install OpenJS.NodeJS.LTS)
#    2. npm install           (einmalig, Projekt-Dependencies)
#    3. Migration 0001 + 0002 anwenden:
#         npm run d1:migrate:local
#         npx wrangler d1 execute schuss_challenge `
#             --file=./migrations/0002_feedback_updates.sql --local
#    4. Separates Terminal:   npm run dev   (Worker läuft auf :8787)
#    5. Dann dieses Skript starten:
#         powershell -ExecutionPolicy Bypass -File .\verify_backend.ps1
# ────────────────────────────────────────────────────────────────

$base       = 'http://localhost:8787'
$passCount  = 0
$failCount  = 0

function Probe {
    param(
        [string]   $Label,
        [string[]] $CurlArgs,
        [string]   $ExpectedStatus,
        [string]   $ExpectedHeader = $null,     # z.B. 'Access-Control-Allow-Origin'
        [string]   $HeaderShouldEqual = $null,  # erwarteter Wert — oder $null = darf nicht gesetzt sein
        [switch]   $HeaderMustBeAbsent
    )

    # Statuscode + Header auf einmal holen
    $tempHeaders = [System.IO.Path]::GetTempFileName()
    $allArgs = @('--silent','--show-error','--output','nul','--write-out','%{http_code}','-D',$tempHeaders) + $CurlArgs
    $statusCode = & curl.exe @allArgs 2>&1
    $headerDump = Get-Content $tempHeaders -Raw -ErrorAction SilentlyContinue
    Remove-Item $tempHeaders -Force -ErrorAction SilentlyContinue

    $statusOk = ($statusCode -eq $ExpectedStatus)

    $headerOk = $true
    $headerNote = ''
    if ($ExpectedHeader) {
        $match = $headerDump -split "`r?`n" | Where-Object { $_ -match "^${ExpectedHeader}\s*:\s*(.*)$" }
        if ($HeaderMustBeAbsent) {
            $headerOk  = (-not $match)
            $headerNote = if ($match) { "(Header vorhanden: $match)" } else { '' }
        } else {
            if ($match -and $matches[1].Trim() -eq $HeaderShouldEqual) {
                $headerOk = $true
                $headerNote = "[${ExpectedHeader}: $HeaderShouldEqual]"
            } else {
                $headerOk = $false
                $headerNote = "(erwartet ${ExpectedHeader}=$HeaderShouldEqual, bekam: $match)"
            }
        }
    }

    if ($statusOk -and $headerOk) {
        Write-Host ("PASS  {0,-60} → {1} {2}" -f $Label, $statusCode, $headerNote) -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host ("FAIL  {0,-60} → erwartet {1}, bekam {2} {3}" -f $Label, $ExpectedStatus, $statusCode, $headerNote) -ForegroundColor Red
        $script:failCount++
    }
}

Write-Host ""
Write-Host "═══ Backend-Verifier · $base ═══" -ForegroundColor Cyan
Write-Host ""

# ─── B1: UUID-Validation ───────────────────────────────────────
Probe -Label 'B1  PATCH /api/admin/feedbacks/not-a-uuid → 400 INVALID_ID' `
      -CurlArgs @('-X','PATCH',"$base/api/admin/feedbacks/not-a-uuid",
                  '-H','x-dev-user-id: local-admin',
                  '-H','Content-Type: application/json',
                  '-H','Origin: http://localhost:8787',
                  '--data','{"status":"done"}') `
      -ExpectedStatus '400'

# ─── B2/B3: neues Enum „done" + updated_at-Spalte ─────────────
Probe -Label 'B2/B3  PATCH status=done auf nicht-existente UUID → 404 (nicht 500)' `
      -CurlArgs @('-X','PATCH',"$base/api/admin/feedbacks/00000000-0000-0000-0000-000000000000",
                  '-H','x-dev-user-id: local-admin',
                  '-H','Content-Type: application/json',
                  '-H','Origin: http://localhost:8787',
                  '--data','{"status":"done"}') `
      -ExpectedStatus '404'

Probe -Label 'B2  PATCH status=archived → 404 (Enum akzeptiert)' `
      -CurlArgs @('-X','PATCH',"$base/api/admin/feedbacks/00000000-0000-0000-0000-000000000000",
                  '-H','x-dev-user-id: local-admin',
                  '-H','Content-Type: application/json',
                  '-H','Origin: http://localhost:8787',
                  '--data','{"status":"archived"}') `
      -ExpectedStatus '404'

# ─── B4: Admin-Auth ───────────────────────────────────────────
Probe -Label 'B4  Admin ohne x-dev-user-id → 401' `
      -CurlArgs @('-X','GET',"$base/api/admin/feedbacks",
                  '-H','Origin: http://localhost:8787') `
      -ExpectedStatus '401'

Probe -Label 'B4  Admin mit nicht-whitelisted user → 403' `
      -CurlArgs @('-X','GET',"$base/api/admin/feedbacks",
                  '-H','x-dev-user-id: some-random-user',
                  '-H','Origin: http://localhost:8787') `
      -ExpectedStatus '403'

Probe -Label 'B4  Admin mit whitelisted local-admin → 200' `
      -CurlArgs @('-X','GET',"$base/api/admin/feedbacks",
                  '-H','x-dev-user-id: local-admin',
                  '-H','Origin: http://localhost:8787') `
      -ExpectedStatus '200'

# ─── B11: CORS-Allow-List ─────────────────────────────────────
Probe -Label 'B11  Origin evil.com → kein ACAO-Header' `
      -CurlArgs @('-X','GET',"$base/api/leaderboard",
                  '-H','Origin: https://evil.example.com') `
      -ExpectedStatus '200' `
      -ExpectedHeader 'Access-Control-Allow-Origin' `
      -HeaderMustBeAbsent

Probe -Label 'B11  Origin localhost:8787 → ACAO echoed' `
      -CurlArgs @('-X','GET',"$base/api/leaderboard",
                  '-H','Origin: http://localhost:8787') `
      -ExpectedStatus '200' `
      -ExpectedHeader 'Access-Control-Allow-Origin' `
      -HeaderShouldEqual 'http://localhost:8787'

# ─── B12: Zod-Validation ──────────────────────────────────────
Probe -Label 'B12  PATCH status=hacked → 400 VALIDATION_ERROR' `
      -CurlArgs @('-X','PATCH',"$base/api/admin/feedbacks/00000000-0000-0000-0000-000000000000",
                  '-H','x-dev-user-id: local-admin',
                  '-H','Content-Type: application/json',
                  '-H','Origin: http://localhost:8787',
                  '--data','{"status":"hacked"}') `
      -ExpectedStatus '400'

Probe -Label 'B12  PATCH ohne body → 400' `
      -CurlArgs @('-X','PATCH',"$base/api/admin/feedbacks/00000000-0000-0000-0000-000000000000",
                  '-H','x-dev-user-id: local-admin',
                  '-H','Content-Type: application/json',
                  '-H','Origin: http://localhost:8787') `
      -ExpectedStatus '400'

# ─── Zusammenfassung ──────────────────────────────────────────
Write-Host ""
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Cyan
$total = $passCount + $failCount
if ($failCount -eq 0) {
    Write-Host ("  ✅  $passCount / $total  Tests bestanden — alle Backend-Fixes greifen.") -ForegroundColor Green
} else {
    Write-Host ("  ❌  $failCount / $total  Tests fehlgeschlagen — siehe rote Zeilen.") -ForegroundColor Red
}
Write-Host "─────────────────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ""
