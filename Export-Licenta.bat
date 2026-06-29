@echo off
chcp 65001 >nul
echo ========================================================
echo Script de exportare a proiectului pentru licenta ETTIway
echo ========================================================

set "DEST=%USERPROFILE%\Desktop\Licenta_Export"
set "SRC=%~dp0"

echo.
echo Creare folder destinatie pe Desktop: "%DEST%"
if exist "%DEST%" (
    echo Se sterge folderul de export anterior...
    rmdir /S /Q "%DEST%"
)
mkdir "%DEST%"
mkdir "%DEST%\1_Cod_Sursa_Platforma"
mkdir "%DEST%\1_Cod_Sursa_Platforma\Backend\demo"
mkdir "%DEST%\2_Documentatie"
mkdir "%DEST%\3_Executabil"

echo.
echo 1. Se copiaza Codul Sursa...
robocopy "%SRC%Backend\demo\src" "%DEST%\1_Cod_Sursa_Platforma\Backend\demo\src" /E /XD .git .vscode >nul
copy "%SRC%Backend\demo\pom.xml" "%DEST%\1_Cod_Sursa_Platforma\Backend\demo\" /Y >nul
copy "%SRC%README.md" "%DEST%\1_Cod_Sursa_Platforma\" /Y >nul
if exist "%SRC%Tasks.md" copy "%SRC%Tasks.md" "%DEST%\1_Cod_Sursa_Platforma\" /Y >nul
echo    - Cod sursa copiat cu succes!

echo.
echo 2. Se copiaza Documentatia...
if exist "%SRC%Documentatie Licenta" (
    xcopy "%SRC%Documentatie Licenta" "%DEST%\2_Documentatie" /E /I /Y /Q >nul
    echo    - Documentatie copiata cu succes!
) else (
    echo    - Folderul "Documentatie Licenta" lipseste sau este gol.
)

echo.
echo 3. Se copiaza Executabilul (.jar)...
if exist "%SRC%Backend\demo\target\demo-0.0.1-SNAPSHOT.jar" (
    copy "%SRC%Backend\demo\target\demo-0.0.1-SNAPSHOT.jar" "%DEST%\3_Executabil\" /Y >nul
    echo > "%DEST%\3_Executabil\Ruleaza_Platforma.txt" PASUL 1: Deschide un terminal din acest folder. 
    echo >> "%DEST%\3_Executabil\Ruleaza_Platforma.txt" PASUL 2: Ruleaza comanda: java -jar demo-0.0.1-SNAPSHOT.jar
    echo >> "%DEST%\3_Executabil\Ruleaza_Platforma.txt" PASUL 3: Deschide un browser si acceseaza http://localhost:8080
    echo    - Executabilul a fost copiat!
) else (
    echo    ! ATENTIE: Fisierul compilabil JAR nu a fost gasit in target/. 
    echo      Asigura-te ca ai compilat proiectul.
)

echo.
echo ========================================================
echo GATA! 
echo Fisierele sunt pregatite pe Desktop in folderul:
echo %DEST%
echo.
echo Tot ce ai de facut este sa pui folderul "Licenta_Export" pe stick!
echo Apasa orice tasta pentru a iesi.
pause >nul
