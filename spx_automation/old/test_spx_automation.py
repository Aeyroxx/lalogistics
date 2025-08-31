"""
Quick Test Script for SPX Automation
Tests basic functionality without connecting to the website
"""

import sys
import traceback

def test_imports():
    """Test that all required packages can be imported"""
    try:
        print("Testing package imports...")
        
        import selenium
        print(f"✅ Selenium {selenium.__version__} imported successfully")
        
        import pandas as pd
        print(f"✅ Pandas {pd.__version__} imported successfully")
        
        import openpyxl
        print(f"✅ OpenPyXL {openpyxl.__version__} imported successfully")
        
        from webdriver_manager.chrome import ChromeDriverManager
        print("✅ WebDriver Manager imported successfully")
        
        import json
        import csv
        import time
        from datetime import datetime
        print("✅ Standard libraries imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def test_webdriver_setup():
    """Test WebDriver setup without opening browser"""
    try:
        print("\nTesting WebDriver setup...")
        
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from webdriver_manager.chrome import ChromeDriverManager
        from selenium.webdriver.chrome.service import Service
        
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in background for test
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        # Test driver manager
        print("📥 Downloading/locating ChromeDriver...")
        driver_path = ChromeDriverManager().install()
        print(f"✅ ChromeDriver located at: {driver_path}")
        
        # Test driver creation
        print("🚀 Testing WebDriver creation...")
        service = Service(driver_path)
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        # Quick test
        driver.get("data:text/html,<html><body><h1>Test Page</h1></body></html>")
        title = driver.title
        driver.quit()
        
        print("✅ WebDriver test successful")
        return True
        
    except Exception as e:
        print(f"❌ WebDriver test failed: {e}")
        print("📝 Full error traceback:")
        traceback.print_exc()
        return False

def test_data_processing():
    """Test data processing and export functionality"""
    try:
        print("\nTesting data processing...")
        
        import pandas as pd
        from datetime import datetime
        
        # Sample data
        sample_data = [
            {
                "receive_task_id": "DRT2025080401TEST",
                "complete_time": "2025-08-05 16:06",
                "sender_data": {"1043757502": 5, "1129462789": 3},
                "total_quantity": 8,
                "processed_at": datetime.now().isoformat()
            }
        ]
        
        # Test CSV export
        flattened_data = []
        for task in sample_data:
            for sender_id, quantity in task["sender_data"].items():
                flattened_data.append({
                    "receive_task_id": task["receive_task_id"],
                    "complete_time": task["complete_time"],
                    "sender_id": sender_id,
                    "quantity": quantity,
                    "total_task_quantity": task["total_quantity"],
                    "processed_at": task["processed_at"]
                })
        
        df = pd.DataFrame(flattened_data)
        test_csv = "test_output.csv"
        df.to_csv(test_csv, index=False)
        print(f"✅ CSV export test successful: {test_csv}")
        
        # Test Excel export
        test_excel = "test_output.xlsx"
        with pd.ExcelWriter(test_excel, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Test_Data', index=False)
        print(f"✅ Excel export test successful: {test_excel}")
        
        # Test JSON export
        import json
        test_json = "test_output.json"
        with open(test_json, 'w') as f:
            json.dump(sample_data, f, indent=2)
        print(f"✅ JSON export test successful: {test_json}")
        
        # Cleanup test files
        import os
        for file in [test_csv, test_excel, test_json]:
            if os.path.exists(file):
                os.remove(file)
        print("🧹 Test files cleaned up")
        
        return True
        
    except Exception as e:
        print(f"❌ Data processing test failed: {e}")
        traceback.print_exc()
        return False

def main():
    """Run all tests"""
    print("SPX Automation Test Suite")
    print("=" * 50)
    
    tests = [
        ("Package Imports", test_imports),
        ("WebDriver Setup", test_webdriver_setup),
        ("Data Processing", test_data_processing)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 Running {test_name} test...")
        result = test_func()
        results.append((test_name, result))
    
    # Summary
    print("\n" + "=" * 50)
    print("TEST SUMMARY")
    print("=" * 50)
    
    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{test_name:20} {status}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All tests passed! The automation is ready to use.")
        print("\nTo run the full automation:")
        print("python spx_audit_automation_enhanced.py")
    else:
        print("\n⚠️  Some tests failed. Please check the error messages above.")
        print("Make sure Chrome browser is installed and try again.")
    
    return all_passed

if __name__ == "__main__":
    main()
