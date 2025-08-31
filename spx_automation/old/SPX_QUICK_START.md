# SPX Shopee Audit Automation - Quick Start Guide

## 🚀 Quick Start

### 1. Prerequisites
- **Chrome Browser** (required) - Install from: https://www.google.com/chrome/
- **Python 3.7+** (already installed)
- **Internet connection**
- **SPX account access**

### 2. Installation (Already Done)
```bash
# Dependencies are already installed
pip install selenium pandas openpyxl webdriver-manager
```

### 3. Run the Automation

**Simplified Version (Recommended for Login Issues):**
```bash
python spx_audit_automation_simple.py
```
*Opens main SPX site first, waits for manual login, then navigates to receive tasks*

**Interactive Debug Version (For Troubleshooting):**
```bash
python spx_audit_automation_debug.py
```
*Use this if the automation can't find receive task IDs*

**Production Version:**
```bash
python spx_audit_automation_production.py
```

**Enhanced Version:**
```bash
python spx_audit_automation_enhanced.py
```

### 4. Follow the Process

1. **Chrome Opens**: The script will open Chrome automatically
2. **Login**: If prompted, login to your SPX account in the browser
3. **Navigate**: Make sure you're on the receive tasks page
4. **Confirm**: Return to terminal and press Enter
5. **Wait**: The script will process all tasks (this may take time)
6. **Files Generated**: Check for the timestamped output files

## 📊 Output Files

The automation creates three types of files:

### Excel File (`.xlsx`)
- **Detailed_Data** sheet: Every sender entry with quantities
- **Task_Summary** sheet: Summary per receive task
- **Sender_Totals** sheet: Total quantities per sender across all tasks

### CSV File (`.csv`)
- Flattened data with one row per sender per task
- Easy to import into other systems

### JSON File (`.json`)
- Complete structured data
- For developers or advanced analysis

## 🛠️ Troubleshooting

### Chrome Not Found
**Error**: "cannot find Chrome binary"
**Solutions**:
1. Install Google Chrome: https://www.google.com/chrome/
2. Try Microsoft Edge instead
3. Restart the script after installation

### Login Issues
**Problem**: Can't login to SPX
**Solutions**:
1. Make sure you have valid SPX credentials
2. Try logging in manually first in a regular browser
3. Check if SPX website is accessible

### No Data Found
**Problem**: Script runs but finds no tasks
**Solutions**:
1. Make sure you're logged into SPX
2. Check that you have access to receive tasks
3. Verify you're on the correct SPX page
4. Try running in test mode first

### Network/Timeout Issues
**Problem**: Pages not loading
**Solutions**:
1. Check internet connection
2. Increase wait times in the script
3. Run during off-peak hours

## ⚙️ Configuration Options

### Test Mode
Run with limited tasks for testing:
- When prompted, choose "y" for test mode
- Processes only 5 tasks instead of all

### Headless Mode
To run without GUI (edit the script):
```python
headless = True  # Change from False to True
```

### Custom Wait Times
For slower connections (edit the script):
```python
wait_time = 20  # Increase from 10 to 20 seconds
```

## 📋 Data Structure

### Task Data Format
```json
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
```

### CSV Columns
- `receive_task_id`: The task ID (e.g., DRT2025080401NDL)
- `complete_time`: When the task was completed
- `sender_id`: Individual sender identifier
- `quantity`: Number of parcels for this sender
- `total_task_quantity`: Total parcels in the entire task
- `sender_count`: Number of different senders in the task
- `processed_at`: When this data was extracted

## 🔍 Log Files

Check `spx_audit.log` for detailed information:
- What the script is doing
- Any errors encountered
- Processing statistics
- Debug information

## 💡 Tips for Best Results

1. **Run during stable hours**: Avoid peak times when SPX might be slow
2. **Start with test mode**: Always test with 5 tasks first
3. **Keep browser visible**: Don't minimize the Chrome window
4. **Don't interfere**: Let the automation run without clicking in the browser
5. **Check logs**: If something goes wrong, check the log file
6. **Backup data**: Save the generated files immediately

## 🆘 Support

If you encounter issues:

1. **Check the log file** (`spx_audit.log`) for error details
2. **Try test mode** first to verify everything works
3. **Restart the script** if it gets stuck
4. **Check Chrome version** - update if needed
5. **Verify SPX access** - login manually first

## 📁 File Locations

All files are created in the same directory as the script:
- `spx_audit_data_YYYYMMDD_HHMMSS.xlsx`
- `spx_audit_data_YYYYMMDD_HHMMSS.csv`
- `spx_audit_data_YYYYMMDD_HHMMSS.json`
- `spx_audit.log`

## ✅ Success Checklist

Before running, make sure:
- [ ] Chrome browser is installed
- [ ] You have SPX account credentials
- [ ] Internet connection is stable
- [ ] You can access SPX website manually
- [ ] Script dependencies are installed (`pip install` completed)

## 🎯 Expected Results

For a successful run, you should see:
- Chrome browser opens automatically
- Script navigates to SPX website
- Login process (if needed)
- Progress messages showing task processing
- Final summary with counts
- Generated files with timestamps

The automation can process dozens or hundreds of tasks depending on your SPX data volume.
