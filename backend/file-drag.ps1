Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class VorDrag {
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out VorDrag.POINT p);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
}
"@
$down = $false
$sx = 0; $sy = 0
$sent = $false
while ($true) {
  $left = [VorDrag]::GetAsyncKeyState(0x01) -band 0x8000
  $shift = [VorDrag]::GetAsyncKeyState(0x10) -band 0x8000
  $ctrl = [VorDrag]::GetAsyncKeyState(0x11) -band 0x8000
  $alt = [VorDrag]::GetAsyncKeyState(0x12) -band 0x8000
  $p = New-Object VorDrag+POINT
  [VorDrag]::GetCursorPos([ref]$p) | Out-Null
  if ($left -and -not $down) { $down = $true; $sent = $false; $sx = $p.X; $sy = $p.Y }
  if (-not $left -and $down) { $down = $false; if ($sent) { Write-Output '{"type":"up"}' } }
  if ($left -and -not $sent -and ($shift -or $ctrl -or $alt)) {
    $dx = $p.X - $sx; $dy = $p.Y - $sy
    if (($dx*$dx + $dy*$dy) -gt 144) {
      $mode = if ($shift) { "convert" } elseif ($ctrl) { "tools" } else { "actions" }
      $clip = Get-Clipboard -Format FileDropList -ErrorAction SilentlyContinue
      if ($clip -and $clip.Count -gt 0) {
        $path = $clip[0].FullName
        $obj = @{ type = "down"; mode = $mode; x = $p.X; y = $p.Y; path = $path } | ConvertTo-Json -Compress
        Write-Output $obj
        $sent = $true
      }
    }
  }
  Start-Sleep -Milliseconds 40
}
