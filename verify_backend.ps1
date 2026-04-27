# Backend verifier for the local Cloudflare Worker.
#
# Prerequisites:
#   1. .dev.vars contains SUPABASE_SERVICE_KEY and SUPABASE_JWT_SECRET.
#   2. Start the worker in another terminal:
#        npm.cmd run dev
#   3. Run this script:
#        powershell.exe -ExecutionPolicy Bypass -File .\verify_backend.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$base = 'http://localhost:8787'
$passCount = 0
$failCount = 0

function Copy-Headers {
    param($Source)

    $headers = @{}
    if ($null -eq $Source) { return $headers }

    foreach ($key in $Source.Keys) {
        $headers[$key] = [string]$Source[$key]
    }
    return $headers
}

function Copy-WebResponse-Headers {
    param([System.Net.WebResponse] $Response)

    $headers = @{}
    if ($null -eq $Response -or $null -eq $Response.Headers) { return $headers }

    foreach ($key in $Response.Headers.AllKeys) {
        $headers[$key] = [string]$Response.Headers[$key]
    }
    return $headers
}

function Get-HeaderValue {
    param(
        [hashtable] $Headers,
        [string] $Name
    )

    foreach ($key in $Headers.Keys) {
        if ($key -ieq $Name) {
            return [string]$Headers[$key]
        }
    }
    return $null
}

function Read-ErrorBody {
    param([System.Net.WebResponse] $Response)

    if ($null -eq $Response) { return '' }
    $stream = $Response.GetResponseStream()
    if ($null -eq $stream) { return '' }

    $reader = New-Object System.IO.StreamReader($stream)
    try {
        return $reader.ReadToEnd()
    } finally {
        $reader.Dispose()
    }
}

function Invoke-ProbeRequest {
    param(
        [string] $Method,
        [string] $Path,
        [hashtable] $Headers = @{},
        [AllowNull()][object] $Body = $null,
        [string] $ContentType = 'application/json'
    )

    $uri = if ($Path -match '^https?://') { $Path } else { "$base$Path" }
    $requestHeaders = @{}
    foreach ($key in $Headers.Keys) {
        $requestHeaders[$key] = $Headers[$key]
    }

    $params = @{
        Uri = $uri
        Method = $Method
        Headers = $requestHeaders
        UseBasicParsing = $true
        TimeoutSec = 30
    }

    if ($PSBoundParameters.ContainsKey('Body') -and $null -ne $Body) {
        $params.Body = $Body
        $params.ContentType = $ContentType
    }

    try {
        $response = Invoke-WebRequest @params
        return @{
            Status = [int]$response.StatusCode
            Headers = Copy-Headers $response.Headers
            Body = [string]$response.Content
        }
    } catch [System.Net.WebException] {
        $response = $_.Exception.Response
        if ($null -eq $response) { throw }
        return @{
            Status = [int]$response.StatusCode
            Headers = Copy-WebResponse-Headers $response
            Body = Read-ErrorBody $response
        }
    }
}

function Probe {
    param(
        [Parameter(Mandatory = $true)][string] $Label,
        [Parameter(Mandatory = $true)][string] $Method,
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][int] $ExpectedStatus,
        [hashtable] $Headers = @{},
        [AllowNull()][object] $Body = $null,
        [string] $ExpectedHeader = $null,
        [string] $HeaderShouldEqual = $null,
        [switch] $HeaderMustBeAbsent
    )

    $requestParams = @{
        Method = $Method
        Path = $Path
        Headers = $Headers
    }
    if ($PSBoundParameters.ContainsKey('Body')) {
        $requestParams.Body = $Body
    }
    $result = Invoke-ProbeRequest @requestParams
    $statusOk = $result.Status -eq $ExpectedStatus

    $headerOk = $true
    $headerNote = ''
    if ($ExpectedHeader) {
        $actualValue = Get-HeaderValue -Headers $result.Headers -Name $ExpectedHeader

        if ($HeaderMustBeAbsent) {
            $headerOk = $null -eq $actualValue
            if ($null -ne $actualValue) { $headerNote = "(header present: $actualValue)" }
        } else {
            $headerOk = $actualValue -eq $HeaderShouldEqual
            $shownValue = if ($null -eq $actualValue) { 'absent' } else { $actualValue }
            $headerNote = "[$ExpectedHeader=$shownValue]"
        }
    }

    if ($statusOk -and $headerOk) {
        Write-Host ("PASS  {0,-66} -> {1} {2}" -f $Label, $result.Status, $headerNote) -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host ("FAIL  {0,-66} -> expected {1}, got {2} {3}" -f $Label, $ExpectedStatus, $result.Status, $headerNote) -ForegroundColor Red
        if ($result.Body) {
            Write-Host ("      body: {0}" -f $result.Body.Substring(0, [Math]::Min(220, $result.Body.Length))) -ForegroundColor DarkGray
        }
        $script:failCount++
    }
}

$localOrigin = @{ Origin = 'http://localhost:8787' }
$adminHeaders = @{
    Origin = 'http://localhost:8787'
    'x-dev-user-id' = 'local-admin'
}
$jsonAdminHeaders = @{
    Origin = 'http://localhost:8787'
    'x-dev-user-id' = 'local-admin'
}

Write-Host ''
Write-Host "=== Backend verifier: $base ===" -ForegroundColor Cyan
Write-Host ''

Probe -Label 'B1 PATCH invalid feedback UUID returns 400' `
      -Method 'PATCH' `
      -Path '/api/admin/feedbacks/not-a-uuid' `
      -Headers $jsonAdminHeaders `
      -Body '{"status":"done"}' `
      -ExpectedStatus 400

Probe -Label 'B2 PATCH status=done on unknown UUID returns 404' `
      -Method 'PATCH' `
      -Path '/api/admin/feedbacks/00000000-0000-0000-0000-000000000000' `
      -Headers $jsonAdminHeaders `
      -Body '{"status":"done"}' `
      -ExpectedStatus 404

Probe -Label 'B3 PATCH status=archived is accepted by validation' `
      -Method 'PATCH' `
      -Path '/api/admin/feedbacks/00000000-0000-0000-0000-000000000000' `
      -Headers $jsonAdminHeaders `
      -Body '{"status":"archived"}' `
      -ExpectedStatus 404

Probe -Label 'B4 admin without auth returns 401' `
      -Method 'GET' `
      -Path '/api/admin/feedbacks' `
      -Headers $localOrigin `
      -ExpectedStatus 401

Probe -Label 'B5 admin non-allowlisted user returns 403' `
      -Method 'GET' `
      -Path '/api/admin/feedbacks' `
      -Headers @{ Origin = 'http://localhost:8787'; 'x-dev-user-id' = 'some-random-user' } `
      -ExpectedStatus 403

Probe -Label 'B6 admin allowlisted local-admin returns 200' `
      -Method 'GET' `
      -Path '/api/admin/feedbacks' `
      -Headers $adminHeaders `
      -ExpectedStatus 200

Probe -Label 'B7 disallowed origin gets no ACAO header' `
      -Method 'GET' `
      -Path '/api/leaderboard' `
      -Headers @{ Origin = 'https://evil.example.com' } `
      -ExpectedStatus 200 `
      -ExpectedHeader 'Access-Control-Allow-Origin' `
      -HeaderMustBeAbsent

Probe -Label 'B8 localhost origin is echoed' `
      -Method 'GET' `
      -Path '/api/leaderboard' `
      -Headers $localOrigin `
      -ExpectedStatus 200 `
      -ExpectedHeader 'Access-Control-Allow-Origin' `
      -HeaderShouldEqual 'http://localhost:8787'

Probe -Label 'B9 invalid feedback status returns 400' `
      -Method 'PATCH' `
      -Path '/api/admin/feedbacks/00000000-0000-0000-0000-000000000000' `
      -Headers $jsonAdminHeaders `
      -Body '{"status":"hacked"}' `
      -ExpectedStatus 400

Probe -Label 'B10 malformed JSON returns 400' `
      -Method 'PATCH' `
      -Path '/api/admin/feedbacks/00000000-0000-0000-0000-000000000000' `
      -Headers $jsonAdminHeaders `
      -Body 'not-json' `
      -ExpectedStatus 400

Probe -Label 'B11 OPTIONS preflight allows PATCH' `
      -Method 'OPTIONS' `
      -Path '/api/admin/feedbacks/00000000-0000-0000-0000-000000000000' `
      -Headers @{ Origin = 'http://localhost:8787'; 'Access-Control-Request-Method' = 'PATCH' } `
      -ExpectedStatus 204 `
      -ExpectedHeader 'Access-Control-Allow-Methods' `
      -HeaderShouldEqual 'GET,POST,PATCH,OPTIONS'

Probe -Label 'B12 public live activity returns 200' `
      -Method 'GET' `
      -Path '/api/activity/live' `
      -Headers $localOrigin `
      -ExpectedStatus 200

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
$total = $passCount + $failCount
if ($failCount -eq 0) {
    Write-Host ("  PASS  $passCount / $total backend probes passed.") -ForegroundColor Green
    exit 0
}

Write-Host ("  FAIL  $failCount / $total backend probes failed.") -ForegroundColor Red
Write-Host '============================================================' -ForegroundColor Cyan
exit 1
