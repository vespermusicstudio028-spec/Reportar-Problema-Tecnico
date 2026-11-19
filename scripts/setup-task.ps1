$Action = New-ScheduledTaskAction -Execute "node" -Argument "`"X:\2 Projetos\1 PROJETOS\Reportar-Problema-Tecnico\scripts\send-daily-warnings.js`""
$Trigger = New-ScheduledTaskTrigger -Daily -At 08:00
Register-ScheduledTask -TaskName "TheBestIPTV_Avisos8h" -Action $Action -Trigger $Trigger -Description "Disparo diario de avisos de vencimento The Best IPTV as 08h" -Force
Get-ScheduledTask -TaskName "TheBestIPTV_Avisos8h"
