#!/bin/bash

echo "=== Fixing MySQL Connection Issues ==="
echo ""

# Try to find MySQL and kill connections
echo "Step 1: Attempting to kill existing MySQL connections..."

# Try different MySQL paths
if command -v mysql &> /dev/null; then
    echo "MySQL found. Attempting to connect and kill processes..."
    
    # Try to connect and kill processes (this might fail if too many connections)
    mysql -u root -e "SET GLOBAL max_connections = 200;" 2>/dev/null || echo "Could not set max_connections (too many connections)"
    
    # Try to show and kill processes
    mysql -u root -e "SHOW PROCESSLIST;" 2>/dev/null || echo "Could not show processlist"
    
    echo ""
    echo "If the above commands failed, you need to restart MySQL."
    echo ""
    echo "Step 2: Restart MySQL using one of these methods:"
    echo ""
    echo "Option A - Using Homebrew (if installed via Homebrew):"
    echo "  brew services restart mysql"
    echo ""
    echo "Option B - Using MySQL server script:"
    echo "  sudo /usr/local/mysql/support-files/mysql.server restart"
    echo ""
    echo "Option C - Using launchctl (macOS):"
    echo "  sudo launchctl unload /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist"
    echo "  sudo launchctl load /Library/LaunchDaemons/com.oracle.oss.mysql.mysqld.plist"
    echo ""
    echo "Option D - System Preferences:"
    echo "  1. Open System Preferences"
    echo "  2. Go to MySQL"
    echo "  3. Click 'Stop MySQL Server'"
    echo "  4. Wait a few seconds"
    echo "  5. Click 'Start MySQL Server'"
    echo ""
    echo "After restarting MySQL, run this script again or test the connection with:"
    echo "  mysql -u root -e 'SELECT 1;'"
    
else
    echo "MySQL command not found in PATH."
    echo "Please restart MySQL manually using System Preferences or Activity Monitor."
fi

echo ""
echo "=== Done ==="



