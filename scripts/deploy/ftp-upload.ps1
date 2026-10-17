param(
  [Parameter(Mandatory=$true)][string]$RemotePath,
  [Parameter(Mandatory=$true)][string]$LocalPath
)
$ErrorActionPreference = 'Stop'

$ftpHost = $env:FTP_HOST
$ftpUser = $env:FTP_USER
$ftpPass = $env:FTP_PASSWORD
if (-not $ftpHost -or -not $ftpUser -or -not $ftpPass) {
  throw 'Definí FTP_HOST, FTP_USER y FTP_PASSWORD en el entorno (o en .env) antes de subir por FTP.'
}

$uri = 'ftp://' + $ftpHost + '/' + ($RemotePath -replace '^/','')
$req = [System.Net.FtpWebRequest]::Create($uri)
$req.Credentials = New-Object System.Net.NetworkCredential($ftpUser, $ftpPass)
$req.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
$req.Timeout = 60000
$req.UseBinary = $true
$bytes = [IO.File]::ReadAllBytes($LocalPath)
$req.ContentLength = $bytes.Length
$st = $req.GetRequestStream()
$st.Write($bytes, 0, $bytes.Length)
$st.Close()
$resp = $req.GetResponse()
"UPLOADED $RemotePath ($($bytes.Length) bytes)"
$resp.Close()
