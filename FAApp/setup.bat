@echo off
echo =====================================
echo LegiLah Setup Script
echo =====================================
echo.

echo Step 1: Compiling Smart Contracts...
call truffle compile
if errorlevel 1 (
    echo Error: Contract compilation failed
    pause
    exit /b 1
)
echo Contracts compiled successfully!
echo.

echo Step 2: Deploying Contracts to Ganache...
call truffle migrate --reset
if errorlevel 1 (
    echo Error: Contract deployment failed
    echo Make sure Ganache is running on port 7545
    pause
    exit /b 1
)
echo Contracts deployed successfully!
echo.

echo Step 3: Copying contract ABIs to public folder...
if not exist "ca2App\public\build" mkdir ca2App\public\build
copy /Y build\contracts\OrderContract.json ca2App\public\build\
copy /Y build\contracts\Migrations.json ca2App\public\build\
echo Contract files copied successfully!
echo.

echo =====================================
echo Setup Complete!
echo =====================================
echo.
echo Next steps:
echo 1. Make sure Ganache is running on port 7545
echo 2. Configure MetaMask to connect to Ganache
echo 3. Import a Ganache account into MetaMask
echo 4. Run: cd ca2App
echo 5. Run: node app.js
echo 6. Open http://localhost:3001 in your browser
echo.
pause
