@echo off
chcp 65001 >nul
echo ========================================================
echo Script de exportare Documentatie (LaTeX)
echo ========================================================

set "DEST=%USERPROFILE%\Desktop\Documentatie_Latex"
set "SRC=%~dp0"

echo.
echo Creare folder destinatie pe Desktop: "%DEST%"
if exist "%DEST%" (
    echo Se sterge folderul de export anterior...
    rmdir /S /Q "%DEST%"
)
mkdir "%DEST%"

echo.
echo 1. Se copiaza sursele LaTeX si fisierele importante...
robocopy "%SRC%Documentatie Licenta" "%DEST%" /E /XD .git .vscode /XF *.aux *.fdb_latexmk *.fls *.log *.out *.synctex.gz *.bbl *.blg *.lof *.lot *.toc >nul

echo    - Fisierele LaTeX au fost copiate cu succes!
echo      (S-au ignorat fisierele temporare generate de LaTeX: .aux, .log, etc.)

echo.
echo ========================================================
echo GATA! 
echo Folder-ul "Documentatie_Latex" curat (fara log-uri) este pe Desktop!
echo Apasa orice tasta pentru a iesi.
pause >nul
