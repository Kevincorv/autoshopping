param(
  [Parameter(Mandatory=$true)][string]$RemotePath,
  [Parameter(Mandatory=$true)][string]$LocalPath
)
$ErrorActionPreference = 'Stop'
$uri = 'ftp://162.35.189.134/' + ($RemotePath -replace '^/','')
$req = [System.Net.FtpWebRequest]::Create($uri)
$req.Credentials = New-Object System.Net.NetworkCredential('autosho','Bzmcu268475djk')
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
