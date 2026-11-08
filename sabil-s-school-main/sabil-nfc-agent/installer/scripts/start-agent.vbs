' Starts the Sabil NFC Agent supervisor in the background (no window).
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
sh.CurrentDirectory = root & "\app"
sh.Run """" & root & "\node\node.exe"" """ & root & "\app\src\supervisor.js""", 0, False
