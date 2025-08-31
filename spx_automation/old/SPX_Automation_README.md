# SPX Shopee Receive Task Audit Automation

This Python script automates the process of extracting receive task data from the SPX Shopee website and exports it to Excel, CSV, and JSON formats.

## Features

- ✅ Automated browser control using Selenium
- ✅ Extracts all receive task IDs and complete times
- ✅ Processes each task detail page to count quantities per sender
- ✅ Exports data in multiple formats (Excel, CSV, JSON)
- ✅ Comprehensive logging and error handling
- ✅ Test mode for limited processing
- ✅ Automatic ChromeDriver management

## Requirements

- Python 3.7 or higher
- Chrome browser installed
- Internet connection
- Access to SPX Shopee website

## Installation

1. **Install Python packages**:
   ```bash
   pip install -r requirements_spx.txt
   ```
   
   Or run the setup script:
   ```bash
   setup_spx_automation.bat
   ```

2. **Alternative manual installation**:
   ```bash
   pip install selenium pandas openpyxl webdriver-manager
   ```

## Usage

### Quick Start
1. Run the simplified version (recommended for login issues):
   ```bash
   python spx_audit_automation_simple.py
   ```

2. Or run the enhanced version:
   ```bash
   python spx_audit_automation_enhanced.py
   ```

2. The script will:
   - Open Chrome browser
   - Navigate to SPX website
   - Prompt you to login if needed
   - Ask if you want to run in test mode
   - Process all receive tasks
   - Export data to files

### Login Process
When the script starts, it will:
1. Open the SPX website
2. If login is required, it will pause and ask you to:
   - Login manually in the browser
   - Navigate to the receive tasks page
   - Press Enter in the terminal to continue

### Output Files

The script generates timestamped files:

- **`spx_audit_data_YYYYMMDD_HHMMSS.xlsx`** - Excel file with multiple sheets:
  - `Detailed_Data`: Flattened data with all sender details
  - `Task_Summary`: Summary by task
  - `Sender_Totals`: Aggregated data by sender

- **`spx_audit_data_YYYYMMDD_HHMMSS.csv`** - CSV file with detailed data

- **`spx_audit_data_YYYYMMDD_HHMMSS.json`** - JSON file with complete data structure

- **`spx_audit.log`** - Detailed log file for debugging

## Configuration Options

### Test Mode
- Set `max_tasks = 5` to process only the first 5 tasks
- Useful for testing and debugging

### Headless Mode
- Set `headless = True` to run without browser GUI
- Not recommended for first run due to login requirements

## Data Structure

### JSON Format
```json
[
  {
    "receive_task_id": "DRT2025080401NDL",
    "complete_time": "2025-08-05 16:06",
    "sender_data": {
      "1043757502": 5,
      "1129462789": 8,
      "1119975068": 1
    },
    "total_quantity": 14,
    "sender_count": 3,
    "processed_at": "2025-08-05T16:30:00"
  }
]
```

### Excel Sheets

1. **Detailed_Data**: One row per sender per task
   - receive_task_id
   - complete_time
   - sender_id
   - quantity
   - total_task_quantity
   - sender_count
   - processed_at

2. **Task_Summary**: One row per task
   - receive_task_id
   - complete_time
   - total_senders
   - total_quantity
   - processed_at

3. **Sender_Totals**: Aggregated by sender
   - sender_id
   - total_quantity (across all tasks)

## Troubleshooting

### Common Issues

1. **ChromeDriver not found**:
   - The enhanced version automatically downloads ChromeDriver
   - If issues persist, manually download from: https://chromedriver.chromium.org/

2. **Login required**:
   - The script will pause for manual login
   - Complete login in the browser window
   - Return to terminal and press Enter

3. **No data extracted**:
   - Check the log file for detailed error messages
   - Ensure you have access to the SPX website
   - Try running in test mode first

4. **Website structure changed**:
   - The script uses multiple strategies to find data
   - Check logs for parsing errors
   - May need updates if SPX changes their layout

### Debug Mode
Enable detailed logging by checking the `spx_audit.log` file.

## Script Versions

- **`spx_audit_automation_simple.py`**: Simplified version - opens main SPX site first, waits for manual login, then navigates to receive tasks (recommended for login issues)
- **`spx_audit_automation_debug.py`**: Interactive debug version with manual element selection for troubleshooting
- **`spx_audit_automation_production.py`**: Production version with smart browser detection and comprehensive error handling
- **`spx_audit_automation_enhanced.py`**: Enhanced version with automatic driver management
- **`spx_audit_automation.py`**: Basic version, requires manual ChromeDriver setup

## Security Notes

- The script only reads data from the website
- Login credentials are handled manually by the user
- No sensitive data is stored by the script
- All data is saved locally

## Support

Check the log files for detailed error information. The script includes comprehensive error handling and logging to help diagnose issues.

## Example Usage

```bash
# Install requirements
pip install -r requirements_spx.txt

# Run the automation
python spx_audit_automation_enhanced.py

# Follow prompts:
# 1. Choose test mode (y/n)
# 2. Login when prompted
# 3. Wait for processing
# 4. Check generated files
```

The script will create timestamped files with all the extracted data in your current directory.
