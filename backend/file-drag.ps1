Add-Type -ReferencedAssemblies System.Windows.Forms -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public class VorHook {
  public delegate IntPtr HookProc(int nCode, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr hMod, uint tid);
  [DllImport("user32.dll")] public static extern IntPtr CallNextHookEx(IntPtr h, int nCode, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
  [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr GetModuleHandle(string n);
  [StructLayout(LayoutKind.Sequential)]
  public struct MSLL { public int x; public int y; public uint data; public uint flags; public uint time; public IntPtr extra; }
  public static HookProc Proc;
  public static IntPtr Hook;
  public static bool Down;
  public static int LastTick;
  public static IntPtr Mouse(int code, IntPtr wp, IntPtr lp) {
    if (code >= 0) {
      int msg = wp.ToInt32();
      var m = (MSLL)Marshal.PtrToStructure(lp, typeof(MSLL));
      if (msg == 0x0201) {
        Down = true;
        Console.Out.WriteLine("{\"type\":\"down\",\"x\":" + m.x + ",\"y\":" + m.y + "}");
        Console.Out.Flush();
      } else if (msg == 0x0202) {
        Down = false;
        Console.Out.WriteLine("{\"type\":\"up\"}");
        Console.Out.Flush();
      } else if (msg == 0x0200 && Down) {
        int now = Environment.TickCount;
        if (now - LastTick > 30) {
          LastTick = now;
          int sh = (GetAsyncKeyState(0x10) & 0x8000) != 0 ? 1 : 0;
          int ct = (GetAsyncKeyState(0x11) & 0x8000) != 0 ? 1 : 0;
          int al = (GetAsyncKeyState(0x12) & 0x8000) != 0 ? 1 : 0;
          Console.Out.WriteLine("{\"type\":\"move\",\"x\":" + m.x + ",\"y\":" + m.y + ",\"shift\":" + sh + ",\"ctrl\":" + ct + ",\"alt\":" + al + "}");
          Console.Out.Flush();
        }
      }
    }
    return CallNextHookEx(Hook, code, wp, lp);
  }
  public static void Run() {
    Proc = new HookProc(Mouse);
    Hook = SetWindowsHookEx(14, Proc, GetModuleHandle(null), 0);
    Application.Run();
  }
}
"@
[VorHook]::Run()
