# Executar no PowerShell 5.1+ (Windows 11). Cria usuário de teste no banco.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:8080'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$email = 'teste.' + [Guid]::NewGuid().ToString('N') + '@example.com'
$senha = 'TesteSeguro123!'
Write-Host "Testando com e-mail temporário: $email"
try {
  $csrf = Invoke-RestMethod -Uri "$base/api/auth/csrf" -WebSession $session -Method Get
  if (-not $csrf.token) { throw 'Endpoint CSRF não retornou token' }
  $headers = @{ 'X-XSRF-TOKEN' = $csrf.token }
  $body = @{nome='Teste Automatizado';email=$email;senha=$senha} | ConvertTo-Json -Compress
  $cadastro = Invoke-RestMethod -Uri "$base/api/auth/cadastro" -WebSession $session -Method Post -Headers $headers -ContentType 'application/json' -Body $body
  if ($cadastro.email -ne $email) { throw 'Cadastro retornou e-mail inesperado' }
  Write-Host '[OK] Cadastro POST /api/auth/cadastro'
  $loginBody = @{email=$email;senha=$senha} | ConvertTo-Json -Compress
  $login = Invoke-RestMethod -Uri "$base/api/auth/login" -WebSession $session -Method Post -Headers $headers -ContentType 'application/json' -Body $loginBody
  Write-Host '[OK] Login POST /api/auth/login'
  $me = Invoke-RestMethod -Uri "$base/api/auth/me" -WebSession $session -Method Get
  if ($me.email -ne $email) { throw 'Sessão não autenticada' }
  Write-Host '[OK] Sessão GET /api/auth/me'
  Write-Host 'SUCESSO: cadastro, login e sessão HTTP funcionando.'
} catch {
  Write-Host '[FALHA] Verifique o backend e a migração SQL.' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}
