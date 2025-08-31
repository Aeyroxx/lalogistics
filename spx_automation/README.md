# SPX Audit Automation

This automation tool extracts and processes SPX Shopee receive task data with accurate tracking number counting and status filtering.

## Features

- ✅ **Status Filtering**: Only processes tasks with 'Done' status
- ✅ **Pagination Handling**: Processes all pages of task lists and individual tasks
- ✅ **Accurate Counting**: Correctly counts tracking numbers per sender ID
- ✅ **Multiple Export Formats**: Generates Excel, CSV, and JSON files
- ✅ **Output Organization**: All files saved to 'output' folder
- ✅ **Unicode Support**: No more console encoding errors

## Quick Start

### Method 1: Double-click the batch file
1. Double-click `Start_SPX_Automation.bat`
2. The script will automatically check and install required packages
3. Follow the on-screen instructions

### Method 2: Manual execution
1. Open Command Prompt or PowerShell
2. Navigate to this folder
3. Run: `python spx_audit_automation.py`

## Requirements

- Python 3.7 or higher
- Internet connection
- Chrome browser installed

## Required Packages

The batch file automatically installs these packages:
- selenium (Web automation)
- pandas (Data processing)
- openpyxl (Excel file handling)
- webdriver-manager (Chrome driver management)

## How It Works

1. **Login**: Opens SPX website for manual login
2. **Scan**: Processes all pages of receive task list
3. **Filter**: Only processes tasks with 'Done' status
4. **Extract**: Gets tracking numbers and sender IDs from each task
5. **Export**: Saves data in multiple formats

## Output Files

All files are saved in the `output` folder:

- `spx_audit_data_YYYYMMDD_HHMMSS.xlsx` - Excel file with detailed and summary sheets
- `spx_audit_data_YYYYMMDD_HHMMSS.csv` - CSV file for data analysis
- `spx_audit_data_YYYYMMDD_HHMMSS.json` - JSON file for programmatic use
- `spx_audit.log` - Detailed log file for troubleshooting

## Configuration Options

When you run the automation, you'll be asked:

1. **Test Mode**: Process only first 2 tasks (for testing)
2. **Specific Task**: Process a single task ID (e.g., DRT2025080401VEC)
3. **Full Mode**: Process all tasks with 'Done' status (default)

## Troubleshooting

### Common Issues

1. **Chrome not found**: Make sure Chrome browser is installed
2. **Permission errors**: Run as administrator if needed
3. **Network errors**: Check internet connection
4. **Login issues**: Make sure you login properly when prompted

### Log Files

Check `output/spx_audit.log` for detailed error information.

### Getting Help

- Check the log file for error details
- Ensure all requirements are met
- Try running in test mode first

## Example Output

```
📊 Summary:
   • Total tasks processed: 245
   • Total tracking numbers counted: 15,847
   • Total sender entries: 1,293

📄 Generated files in 'output' folder:
   • spx_audit_data_20250805_143022.xlsx
   • spx_audit_data_20250805_143022.csv
   • spx_audit_data_20250805_143022.json
   • spx_audit.log (log file)
```

## Technical Details

- **Sequential Navigation**: Prevents page skipping for accurate data collection
- **Status Checking**: Comprehensive status detection with fallback strategies
- **Dual Pagination**: Handles both task list and individual task pagination
- **Error Recovery**: Continues processing even if individual tasks fail
- **Data Validation**: Ensures accurate tracking number extraction

---

**Note**: This automation requires manual login to the SPX website. Make sure you have valid credentials before starting.
