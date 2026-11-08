; Sabil NFC Agent — Inno Setup 6 script (per-user install, no administrator rights needed).
; Build with:  ISCC.exe /DAppVersion=1.0.0 installer.iss     (see build-windows.ps1)
; Silent install for deployment:
;   SabilNfcAgentSetup.exe /VERYSILENT /URL=https://sabil.example.com /DEVICE=SABIL-CLIENT-01 /TOKEN=sdt_xxx
;
; The staging folder (..\build\stage) must contain: node\node.exe, app\ (src + node_modules), scripts\.

#ifndef AppVersion
  #define AppVersion "1.0.0"
#endif

[Setup]
AppId={{B7A3C2E4-5D1F-4F6A-9C8B-3E2A1D0F7B55}
AppName=Sabil NFC Agent
AppVersion={#AppVersion}
AppPublisher=Sabil School
DefaultDirName={localappdata}\Programs\SabilNfcAgent
DefaultGroupName=Sabil NFC Agent
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=SabilNfcAgentSetup
Compression=lzma2
SolidCompression=yes
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
UninstallDisplayName=Sabil NFC Agent
CloseApplications=no

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Files]
Source: "..\build\stage\node\*"; DestDir: "{app}\node"; Flags: recursesubdirs ignoreversion
Source: "..\build\stage\app\*"; DestDir: "{app}\app"; Flags: recursesubdirs ignoreversion
Source: "scripts\*"; DestDir: "{app}\scripts"; Flags: ignoreversion

[Icons]
; Automatic start with Windows (current user)
Name: "{userstartup}\Sabil NFC Agent"; Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\start-agent.vbs"""; WorkingDir: "{app}\app"
Name: "{group}\Etat de Sabil NFC Agent"; Filename: "{app}\scripts\status-agent.cmd"
Name: "{group}\Arreter Sabil NFC Agent"; Filename: "{app}\scripts\stop-agent.cmd"
Name: "{group}\Redemarrer Sabil NFC Agent"; Filename: "{app}\scripts\restart-agent.cmd"
Name: "{group}\Journal de l'agent"; Filename: "{localappdata}\SabilNfcAgent\logs"

[Run]
; 1) store URL / device id / token (token encrypted with Windows DPAPI)
Filename: "{app}\node\node.exe"; Parameters: """{app}\app\src\index.js"" --setup-from-file ""{tmp}\sabil-setup.json"""; WorkingDir: "{app}\app"; Flags: runhidden waituntilterminated; StatusMsg: "Configuration du poste..."
; 2) start the agent now
Filename: "{sys}\wscript.exe"; Parameters: """{app}\scripts\start-agent.vbs"""; Flags: nowait runhidden; StatusMsg: "Demarrage de l'agent..."
; 3) offer to open the status page
Filename: "{app}\scripts\status-agent.cmd"; Description: "Ouvrir la page d'etat"; Flags: postinstall nowait skipifsilent unchecked shellexec

[UninstallRun]
Filename: "{app}\scripts\stop-agent.cmd"; Parameters: "/quiet"; Flags: runhidden waituntilterminated; RunOnceId: "StopSabilNfcAgent"

[UninstallDelete]
Type: filesandordirs; Name: "{localappdata}\SabilNfcAgent"

[Code]
var
  CfgPage: TInputQueryWizardPage;

function JsonEscape(const S: String): String;
begin
  Result := S;
  StringChangeEx(Result, '\', '\\', True);
  StringChangeEx(Result, '"', '\"', True);
end;

procedure InitializeWizard;
begin
  CfgPage := CreateInputQueryPage(wpWelcome,
    'Connexion au site Sabil',
    'Ces informations sont fournies par l''administrateur (ecran Pointage NFC > Postes clients NFC).',
    '');
  CfgPage.Add('Adresse du site (https://...) :', False);
  CfgPage.Add('Identifiant du poste (ex. SABIL-CLIENT-01) :', False);
  CfgPage.Add('Jeton du poste (sdt_...) :', True);
  CfgPage.Values[0] := ExpandConstant('{param:URL|}');
  CfgPage.Values[1] := ExpandConstant('{param:DEVICE|}');
  CfgPage.Values[2] := ExpandConstant('{param:TOKEN|}');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = CfgPage.ID then
  begin
    if Pos('https://', Lowercase(Trim(CfgPage.Values[0]))) <> 1 then
    begin
      MsgBox('L''adresse du site doit commencer par https://', mbError, MB_OK);
      Result := False;
    end
    else if Length(Trim(CfgPage.Values[1])) < 3 then
    begin
      MsgBox('Identifiant du poste invalide.', mbError, MB_OK);
      Result := False;
    end
    else if Pos('sdt_', Trim(CfgPage.Values[2])) <> 1 then
    begin
      MsgBox('Le jeton doit commencer par sdt_', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function ShouldSkipPage(PageID: Integer): Boolean;
begin
  // Silent installs pass everything on the command line.
  Result := (PageID = CfgPage.ID) and WizardSilent;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Json: String;
begin
  if CurStep = ssPostInstall then
  begin
    Json := '{"apiBaseUrl":"' + JsonEscape(Trim(CfgPage.Values[0])) + '",' +
            '"deviceId":"' + JsonEscape(Trim(CfgPage.Values[1])) + '",' +
            '"token":"' + JsonEscape(Trim(CfgPage.Values[2])) + '"}';
    SaveStringToFile(ExpandConstant('{tmp}\sabil-setup.json'), Json, False);
  end;
end;
