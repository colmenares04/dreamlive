
; DREAMLIVE INSTALLER - EDICIÓN PROFESIONAL INTELIGENTE
; =====================================================================

#define MyAppName "DreamLive Extension"
#define MyAppVersion "1.0.3"
#define MyAppPublisher "DreamLive Inc"
#define MyAppURL "https://dreamlive.app"
#define MyAppExeName "DreamLive.exe"
#define MyDestFolder "{userappdata}\DreamLive_Extension"

[Setup]
; --- Identidad y Metadatos del Archivo (Para que se vea Pro en Windows) ---
DisableWelcomePage=no
AppId={{0C086463-4486-403F-8EA7-04F4C835DA09}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
AppCopyright="Copyright (C) 2026 DreamLive Inc."
VersionInfoDescription="Instalador Oficial DreamLive"
VersionInfoProductName={#MyAppName}
VersionInfoVersion={#MyAppVersion}

; --- Configuración de Directorios ---
DefaultDirName={#MyDestFolder}
DisableDirPage=yes
OutputBaseFilename=DreamLive_v{#MyAppVersion}
OutputDir=userdocs:Output

; --- Iconos e Imágenes (Asegúrate de tener estos archivos o comenta las líneas con ;) ---
SetupIconFile=C:\Users\ora_2\OneDrive\Documentos\Workshop\DreamLive Workshop\DreamLive_extension\src\assets\icon.ico
; WizardSmallImageFile=C:\Users\inger\Desktop\Workshop\DreamLive_extension\src\assets\logo_small.bmp
; WizardImageFile=C:\Users\inger\Desktop\Workshop\DreamLive_extension\src\assets\banner_large.bmp

; --- Estilo y Comportamiento ---
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
CloseApplications=yes
RestartApplications=no
Uninstallable=yes
ShowLanguageDialog=no

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[InstallDelete]
; Limpieza profunda antes de actualizar para evitar conflictos
Type: filesandordirs; Name: "{app}\*"

[Files]
; Copia de archivos compilados
Source: "C:\Users\ora_2\OneDrive\Documentos\Workshop\DreamLive Workshop\DreamLive_extension\.output\chrome-mv3\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Run]
; 1. Abrir la carpeta (Solo necesario si es instalación limpia, pero útil dejarlo)
Filename: "explorer.exe"; Parameters: "{app}"; Flags: nowait postinstall skipifsilent; Description: "Abrir ubicación de archivos"

; 2. Abrir Chrome en Extensiones (Truco del CMD para forzar apertura)
Filename: "cmd.exe"; Parameters: "/C start chrome chrome://extensions"; Flags: nowait postinstall skipifsilent runhidden; Description: "Abrir Navegador"

[Code]
var
  IsUpgrade: Boolean;

// 1. DETECCIÓN AL INICIAR
// Comprobamos si la carpeta ya existe antes de empezar la instalación
function InitializeSetup(): Boolean;
begin
  // Verificamos si existe la carpeta en AppData
  if DirExists(ExpandConstant('{#MyDestFolder}')) then
  begin
    IsUpgrade := True;
  end
  else
  begin
    IsUpgrade := False;
  end;
  Result := True;
end;

// 2. PERSONALIZAR TEXTOS DEL ASISTENTE
procedure InitializeWizard;
begin
  if IsUpgrade then
  begin
    WizardForm.WelcomeLabel1.Caption := 'Bienvenido a la actualización de DreamLive';
    WizardForm.WelcomeLabel2.Caption := 'Se ha detectado una versión anterior instalada.' + #13#10 + #13#10 +
                                        'El asistente actualizará los archivos automáticamente a la versión {#MyAppVersion}.';
  end
  else
  begin
    WizardForm.WelcomeLabel1.Caption := 'Instalación de DreamLive Extension';
    WizardForm.WelcomeLabel2.Caption := 'Este asistente instalará la extensión en tu sistema para Google Chrome.' + #13#10 + #13#10 +
                                        'Por favor, cierra Google Chrome antes de continuar para asegurar una instalación correcta.';
  end;
end;

// 3. MENSAJE FINAL INTELIGENTE
procedure CurStepChanged(CurStep: TSetupStep);
var
  MsgHeader, MsgBody: String;
begin
  if CurStep = ssPostInstall then
  begin
    if IsUpgrade then
    begin
      // --- MENSAJE PARA ACTUALIZACIÓN ---
      MsgHeader := '¡Actualización Exitosa!';
      MsgBody := 'DreamLive se ha actualizado correctamente a la v{#MyAppVersion}.' + #13#10 + #13#10 +
                 'PASO ÚNICO:' + #13#10 +
                 '1. Ve a Chrome (se abrirá automáticamente).' + #13#10 +
                 '2. Busca la tarjeta de "DreamLive Extension".' + #13#10 +
                 '3. Haz clic en el icono de recargar (flecha circular 🔄) o reinicia el navegador.';
    end
    else
    begin
      // --- MENSAJE PARA INSTALACIÓN NUEVA ---
      MsgHeader := '¡Instalación Completada!';
      MsgBody := 'Archivos copiados exitosamente.' + #13#10 + #13#10 +
                 '---- PASOS PARA ACTIVAR ----' + #13#10 +
                 '1. Se abrirá una carpeta y Google Chrome.' + #13#10 +
                 '2. Activa el "Modo de desarrollador" en Chrome (esquina superior derecha).' + #13#10 +
                 '3. ARRASTRA la carpeta abierta dentro de la ventana de Chrome.' + #13#10 + #13#10 +
                 '¡Eso es todo! La extensión quedará activa.';
    end;

    // Mostrar el mensaje
    MsgBox(MsgHeader + #13#10 + #13#10 + MsgBody, mbInformation, MB_OK);
  end;
end;