$Action = New-ScheduledTaskAction -Execute "node" -Argument "`"X:\2 Projetos\1 PROJETOS\Reportar-Problema-Tecnico\scripts\send-daily-warnings.js`""
$Trigger1 = New-ScheduledTaskTrigger -Daily -At 08:00
$Trigger2 = New-ScheduledTaskTrigger -Daily -At 14:00
Register-ScheduledTask -TaskName "TheBestIPTV_Avisos8h" -Action $Action -Trigger @($Trigger1, $Trigger2) -Description "Disparo automatico de avisos de vencimento e pendencias The Best IPTV as 08h e 14h" -Force
Get-ScheduledTask -TaskName "TheBestIPTV_Avisos8h"
