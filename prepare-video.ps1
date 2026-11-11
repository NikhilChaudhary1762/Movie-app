param(
    [Parameter(Mandatory = $true)]
    [string]$InputFile
)

$ErrorActionPreference = "Stop"

try {
    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
        throw "FFmpeg PATH में उपलब्ध नहीं है।"
    }

    if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) {
        throw "FFprobe PATH में उपलब्ध नहीं है।"
    }

    if (-not (Test-Path -LiteralPath $InputFile -PathType Leaf)) {
        throw "Input video नहीं मिली: $InputFile"
    }

    $InputFile = (Resolve-Path -LiteralPath $InputFile).Path
    $directory = Split-Path -Parent $InputFile
    $baseName = [IO.Path]::GetFileNameWithoutExtension($InputFile)

    # Original file को कभी overwrite नहीं करेंगे।
    $OutputFile = Join-Path $directory "$baseName-movieflex.mp4"
    $counter = 1

    while (Test-Path -LiteralPath $OutputFile) {
        $OutputFile = Join-Path $directory "$baseName-movieflex-$counter.mp4"
        $counter++
    }

    Write-Host "`nChecking input video..." -ForegroundColor Cyan

    $inputProbe = & ffprobe -v error `
        -show_entries "stream=codec_type,codec_name" `
        -of json "$InputFile" | ConvertFrom-Json

    if ($LASTEXITCODE -ne 0) {
        throw "Input video valid नहीं है या FFprobe उसे पढ़ नहीं पाया।"
    }

    $videoStream = $inputProbe.streams |
        Where-Object { $_.codec_type -eq "video" } |
        Select-Object -First 1

    if (-not $videoStream) {
        throw "इस file में video stream नहीं मिली।"
    }

    Write-Host "Input video codec: $($videoStream.codec_name)" -ForegroundColor Gray

    Write-Host "`nStarting MP4 conversion..." -ForegroundColor Cyan
    Write-Host "Original: $InputFile"
    Write-Host "Output:   $OutputFile"

    & ffmpeg -hide_banner -y -i "$InputFile" `
        -map 0:v:0 `
        -map "0:a:0?" `
        -c:v libx264 `
        -preset veryfast `
        -crf 23 `
        -pix_fmt yuv420p `
        -c:a aac `
        -b:a 160k `
        -ac 2 `
        -movflags +faststart `
        -sn -dn `
        "$OutputFile"

    if ($LASTEXITCODE -ne 0) {
        throw "FFmpeg conversion failed. Original file सुरक्षित है।"
    }

    if (-not (Test-Path -LiteralPath $OutputFile)) {
        throw "Converted output file नहीं बनी।"
    }

    Write-Host "`nVerifying converted video..." -ForegroundColor Cyan

    $outputJson = & ffprobe -v error `
        -show_entries "format=format_name:stream=codec_type,codec_name,pix_fmt" `
        -of json "$OutputFile"

    if ($LASTEXITCODE -ne 0) {
        throw "Converted file की जाँच असफल रही।"
    }

    $outputProbe = $outputJson | ConvertFrom-Json

    $outVideo = $outputProbe.streams |
        Where-Object { $_.codec_type -eq "video" } |
        Select-Object -First 1

    $outAudio = $outputProbe.streams |
        Where-Object { $_.codec_type -eq "audio" } |
        Select-Object -First 1

    if (-not $outVideo -or $outVideo.codec_name -ne "h264") {
        throw "Output H.264 video नहीं है।"
    }

    if ($outVideo.pix_fmt -ne "yuv420p") {
        throw "Output pixel format yuv420p नहीं है।"
    }

    if ($outAudio -and $outAudio.codec_name -ne "aac") {
        throw "Output audio AAC नहीं है।"
    }

    if ($outputProbe.format.format_name -notmatch "mp4") {
        throw "Output MP4 container में नहीं है।"
    }

    $sizeMB = [math]::Round(
        (Get-Item -LiteralPath $OutputFile).Length / 1MB, 2
    )

    Write-Host "`nSUCCESS: Browser-compatible video prepared!" -ForegroundColor Green
    Write-Host "Video codec: $($outVideo.codec_name)"
    Write-Host "Pixel format: $($outVideo.pix_fmt)"
    Write-Host "Audio codec: $(if ($outAudio) { $outAudio.codec_name } else { 'No audio stream' })"
    Write-Host "Output size: $sizeMB MB"
    Write-Host "Ready to upload: $OutputFile" -ForegroundColor Green
}
catch {
    Write-Host "`nERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
