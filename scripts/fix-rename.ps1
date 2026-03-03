$source = "c:\Users\88903\Desktop\yinhezhengquan-zhengyu\supabase\functions-flat"
$dest = "c:\Users\88903\Desktop\yinhezhengquan-zhengyu\supabase\functions"

if (Test-Path $dest) {
    Remove-Item $dest -Recurse -Force
}

Move-Item $source $dest -Force
Write-Host "Renamed successfully"
