#!/usr/bin/env python3
"""
Production-Ready SPX Audit Automation
Handles Chrome installation detection and provides fallback options
"""

import time
import json
import csv
import pandas as pd
import os
import sys
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException
from webdriver_manager.chrome import ChromeDriverManager
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('spx_audit.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class SPXAuditAutomationProduction:
    def __init__(self, headless=False, wait_time=10):
        """
        Initialize the SPX audit automation with production-grade Chrome detection
        
        Args:
            headless (bool): Run browser in headless mode
            wait_time (int): Default wait time for elements
        """
        self.wait_time = wait_time
        self.driver = None
        self.wait = None
        self.audit_data = []
        self.chrome_binary_path = None
        
        # Setup Chrome options
        self.chrome_options = Options()
        if headless:
            self.chrome_options.add_argument("--headless")
        
        # Essential Chrome arguments
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--disable-gpu")
        self.chrome_options.add_argument("--window-size=1920,1080")
        self.chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        self.chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        self.chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # User agent
        self.chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36")
    
    def find_chrome_binary(self):
        """Find Chrome binary in common installation locations"""
        common_paths = [
            # Google Chrome
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Users\{}\AppData\Local\Google\Chrome\Application\chrome.exe".format(os.getenv('USERNAME')),
            
            # Microsoft Edge (Chromium-based)
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            
            # Chromium
            r"C:\Program Files\Chromium\Application\chrome.exe",
            r"C:\Program Files (x86)\Chromium\Application\chrome.exe",
            
            # Brave Browser
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
            r"C:\Program Files (x86)\BraveSoftware\Brave-Browser\Application\brave.exe",
            r"C:\Users\{}\AppData\Local\BraveSoftware\Brave-Browser\Application\brave.exe".format(os.getenv('USERNAME'))
        ]
        
        for path in common_paths:
            if os.path.exists(path):
                logger.info(f"Found Chrome/Chromium binary at: {path}")
                return path
        
        return None
    
    def setup_driver(self):
        """Setup Chrome WebDriver with fallback options"""
        try:
            # Find Chrome binary
            self.chrome_binary_path = self.find_chrome_binary()
            
            if self.chrome_binary_path:
                self.chrome_options.binary_location = self.chrome_binary_path
                logger.info(f"Using Chrome binary: {self.chrome_binary_path}")
            else:
                logger.warning("Chrome binary not found in common locations")
                print("\n" + "="*60)
                print("CHROME BROWSER NOT FOUND")
                print("="*60)
                print("This automation requires Chrome or a Chromium-based browser.")
                print("Please install one of the following:")
                print("1. Google Chrome: https://www.google.com/chrome/")
                print("2. Microsoft Edge: https://www.microsoft.com/edge/")
                print("3. Brave Browser: https://brave.com/")
                print("="*60)
                
                response = input("\nWould you like to continue anyway? (y/n): ").strip().lower()
                if response != 'y':
                    return False
            
            # Get ChromeDriver
            service = Service(ChromeDriverManager().install())
            
            # Create driver
            self.driver = webdriver.Chrome(service=service, options=self.chrome_options)
            
            # Execute script to remove webdriver property
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            self.wait = WebDriverWait(self.driver, self.wait_time)
            logger.info("Chrome WebDriver initialized successfully")
            return True
            
        except WebDriverException as e:
            logger.error(f"WebDriver error: {str(e)}")
            if "chrome binary" in str(e).lower():
                print("\n" + "="*60)
                print("CHROME SETUP ISSUE")
                print("="*60)
                print("The automation couldn't start Chrome. This might be because:")
                print("1. Chrome is not installed")
                print("2. Chrome is installed in a non-standard location")
                print("3. Chrome is corrupted")
                print("\nSolutions:")
                print("1. Install/reinstall Google Chrome")
                print("2. Install Microsoft Edge (works as Chrome replacement)")
                print("3. Run the automation on a different computer with Chrome")
                print("="*60)
            return False
        except Exception as e:
            logger.error(f"Failed to initialize WebDriver: {str(e)}")
            return False
    
    def navigate_to_receive_tasks(self):
        """Navigate to the SPX receive tasks page"""
        try:
            url = "https://sp.spx.shopee.ph/inbound-management/receive-task"
            logger.info(f"Navigating to: {url}")
            self.driver.get(url)
            
            # Wait for the page to load
            time.sleep(5)
            
            # Check if we're on login page
            current_url = self.driver.current_url
            page_title = self.driver.title.lower()
            
            if "login" in current_url.lower() or "auth" in current_url.lower() or "login" in page_title:
                logger.warning("Login required!")
                self._show_login_instructions()
                input("\nPress Enter after you have logged in and can see the receive tasks...")
            
            # Wait for content to load
            try:
                selectors = [".ant-table-tbody", "table tbody", "[data-testid='receive-task-table']"]
                element_found = False
                for selector in selectors:
                    try:
                        self.wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
                        element_found = True
                        break
                    except TimeoutException:
                        continue
                
                if not element_found:
                    logger.warning("Could not find receive tasks table. Proceeding anyway...")
                
            except Exception as e:
                logger.warning(f"Error waiting for table: {str(e)}. Proceeding anyway...")
            
            logger.info("Page loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error navigating to receive tasks: {str(e)}")
            return False
    
    def _show_login_instructions(self):
        """Show login instructions to user"""
        print("\n" + "="*60)
        print("LOGIN REQUIRED")
        print("="*60)
        print("The automation has opened the SPX website but login is required.")
        print("\nPlease follow these steps:")
        print("1. Look for the Chrome browser window that opened")
        print("2. Login to your SPX account in that window")
        print("3. Navigate to the receive tasks page if needed")
        print("4. Make sure you can see the receive tasks table")
        print("5. Return to this terminal and press Enter to continue")
        print("\nNOTE: Do NOT close the browser window!")
        print("="*60)
    
    def get_receive_task_ids_and_complete_times(self):
        """Extract all receive task IDs and their complete times"""
        try:
            receive_tasks = []
            
            # Multiple strategies to find task data
            strategies = [
                {
                    "name": "Standard table",
                    "rows": "//table//tbody//tr",
                    "task_id_cell": ".//td[1]",
                    "complete_time_cell": ".//td[last()-1] | .//td[last()]"
                },
                {
                    "name": "Ant Design table",
                    "rows": "//div[contains(@class, 'ant-table-tbody')]//tr",
                    "task_id_cell": ".//td[1]",
                    "complete_time_cell": ".//td[contains(text(), '2025-08')]"
                },
                {
                    "name": "Generic approach",
                    "rows": "//tr[td]",
                    "task_id_cell": ".//td[contains(text(), 'DRT')]",
                    "complete_time_cell": ".//td[contains(text(), '2025-08')]"
                }
            ]
            
            for i, strategy in enumerate(strategies, 1):
                try:
                    logger.info(f"Trying strategy {i}: {strategy['name']}")
                    rows = self.driver.find_elements(By.XPATH, strategy["rows"])
                    
                    if not rows:
                        continue
                    
                    for row in rows:
                        try:
                            # Get task ID
                            task_id_element = row.find_element(By.XPATH, strategy["task_id_cell"])
                            task_id = task_id_element.text.strip()
                            
                            if not task_id or not task_id.startswith('DRT'):
                                continue
                            
                            # Get complete time
                            complete_time = "N/A"
                            try:
                                complete_time_element = row.find_element(By.XPATH, strategy["complete_time_cell"])
                                complete_time = complete_time_element.text.strip()
                            except NoSuchElementException:
                                # Try to get all cells and find date
                                cells = row.find_elements(By.TAG_NAME, "td")
                                for cell in cells:
                                    cell_text = cell.text.strip()
                                    if "2025-08" in cell_text or ":" in cell_text:
                                        complete_time = cell_text
                                        break
                            
                            receive_tasks.append({
                                "task_id": task_id,
                                "complete_time": complete_time
                            })
                            
                        except Exception as e:
                            continue
                    
                    if receive_tasks:
                        logger.info(f"Strategy {i} successful: Found {len(receive_tasks)} tasks")
                        break
                        
                except Exception as e:
                    logger.warning(f"Strategy {i} failed: {str(e)}")
                    continue
            
            # Remove duplicates
            unique_tasks = []
            seen_ids = set()
            for task in receive_tasks:
                if task["task_id"] not in seen_ids:
                    unique_tasks.append(task)
                    seen_ids.add(task["task_id"])
            
            logger.info(f"Found {len(unique_tasks)} unique receive tasks")
            return unique_tasks
            
        except Exception as e:
            logger.error(f"Error extracting receive task data: {str(e)}")
            return []
    
    def process_receive_task_detail(self, task_id):
        """Process a single receive task detail page"""
        try:
            detail_url = f"https://sp.spx.shopee.ph/inbound-management/receive-task/detail/{task_id}"
            logger.info(f"Processing task: {task_id}")
            self.driver.get(detail_url)
            
            # Wait for page load
            time.sleep(3)
            
            # Extract sender data using multiple strategies
            sender_data = {}
            
            # Strategy 1: Look for table data
            try:
                rows = self.driver.find_elements(By.XPATH, "//table//tbody//tr")
                
                for row in rows:
                    try:
                        cells = row.find_elements(By.TAG_NAME, "td")
                        if len(cells) >= 2:
                            sender_id = None
                            quantity = 0
                            
                            for cell in cells:
                                cell_text = cell.text.strip()
                                
                                # Look for sender ID (long numbers)
                                if cell_text.isdigit() and len(cell_text) >= 8:
                                    sender_id = cell_text
                                
                                # Look for quantity (smaller numbers)
                                elif cell_text.isdigit() and int(cell_text) < 1000:
                                    quantity = int(cell_text)
                            
                            if sender_id and quantity > 0:
                                if sender_id in sender_data:
                                    sender_data[sender_id] += quantity
                                else:
                                    sender_data[sender_id] = quantity
                                    
                    except Exception:
                        continue
                        
            except Exception as e:
                logger.warning(f"Table parsing failed for {task_id}: {str(e)}")
            
            # Strategy 2: Look for total quantities
            if not sender_data:
                try:
                    total_selectors = [
                        "//span[contains(text(), 'Total')]//following-sibling::span",
                        "//div[contains(text(), 'Total')]",
                        "//td[contains(text(), 'Total')]//following-sibling::td"
                    ]
                    
                    for selector in total_selectors:
                        try:
                            elements = self.driver.find_elements(By.XPATH, selector)
                            for element in elements:
                                text = element.text.strip()
                                import re
                                numbers = re.findall(r'\d+', text)
                                if numbers:
                                    total_quantity = int(numbers[0])
                                    sender_data["TOTAL"] = total_quantity
                                    break
                            if sender_data:
                                break
                        except:
                            continue
                            
                except Exception as e:
                    logger.warning(f"Total quantity extraction failed for {task_id}: {str(e)}")
            
            # Strategy 3: Count rows as fallback
            if not sender_data:
                try:
                    rows = self.driver.find_elements(By.XPATH, "//table//tbody//tr")
                    if rows:
                        sender_data["ESTIMATED_COUNT"] = len(rows)
                        logger.info(f"Using row count estimation for {task_id}: {len(rows)} items")
                except:
                    pass
            
            # Last resort
            if not sender_data:
                logger.warning(f"No data extracted for {task_id}, using default")
                sender_data["NO_DATA"] = 1
            
            return sender_data
            
        except Exception as e:
            logger.error(f"Error processing task detail {task_id}: {str(e)}")
            return {"ERROR": 1}
    
    def audit_all_tasks(self, max_tasks=None):
        """Main method to audit all receive tasks"""
        try:
            if not self.setup_driver():
                return False
            
            if not self.navigate_to_receive_tasks():
                return False
            
            # Get all receive task data
            tasks_data = self.get_receive_task_ids_and_complete_times()
            
            if not tasks_data:
                logger.error("No receive task data found")
                print("\n❌ No receive tasks found. This could be because:")
                print("1. You're not logged in to SPX")
                print("2. The page structure has changed")
                print("3. You don't have access to receive tasks")
                print("4. There are no receive tasks in the current view")
                return False
            
            # Limit tasks if specified
            if max_tasks:
                tasks_data = tasks_data[:max_tasks]
                logger.info(f"Limited to first {max_tasks} tasks for testing")
            
            logger.info(f"Starting audit of {len(tasks_data)} tasks")
            
            # Process each task
            for i, task_info in enumerate(tasks_data, 1):
                try:
                    task_id = task_info["task_id"]
                    complete_time = task_info["complete_time"]
                    
                    logger.info(f"Processing task {i}/{len(tasks_data)}: {task_id}")
                    
                    # Process task detail
                    sender_data = self.process_receive_task_detail(task_id)
                    
                    if sender_data:
                        task_audit = {
                            "receive_task_id": task_id,
                            "complete_time": complete_time,
                            "sender_data": sender_data,
                            "total_quantity": sum(sender_data.values()),
                            "sender_count": len(sender_data),
                            "processed_at": datetime.now().isoformat()
                        }
                        self.audit_data.append(task_audit)
                        
                        logger.info(f"Task {task_id}: {len(sender_data)} senders, {sum(sender_data.values())} total quantity")
                    
                    # Delay between requests
                    time.sleep(2)
                    
                except Exception as e:
                    logger.error(f"Error processing task {task_info.get('task_id', 'unknown')}: {str(e)}")
                    continue
            
            logger.info(f"Audit completed. Processed {len(self.audit_data)} tasks successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error during audit: {str(e)}")
            return False
        finally:
            if self.driver:
                self.driver.quit()
    
    def export_to_json(self, filename="spx_audit_data.json"):
        """Export audit data to JSON format"""
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(self.audit_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data exported to {filename}")
            return True
        except Exception as e:
            logger.error(f"Error exporting to JSON: {str(e)}")
            return False
    
    def export_to_csv(self, filename="spx_audit_data.csv"):
        """Export audit data to CSV format"""
        try:
            flattened_data = []
            
            for task in self.audit_data:
                for sender_id, quantity in task["sender_data"].items():
                    flattened_data.append({
                        "receive_task_id": task["receive_task_id"],
                        "complete_time": task["complete_time"],
                        "sender_id": sender_id,
                        "quantity": quantity,
                        "total_task_quantity": task["total_quantity"],
                        "sender_count": task["sender_count"],
                        "processed_at": task["processed_at"]
                    })
            
            if flattened_data:
                df = pd.DataFrame(flattened_data)
                df.to_csv(filename, index=False, encoding='utf-8')
                logger.info(f"Data exported to {filename}")
                return True
            else:
                logger.warning("No data to export to CSV")
                return False
                
        except Exception as e:
            logger.error(f"Error exporting to CSV: {str(e)}")
            return False
    
    def export_to_excel(self, filename="spx_audit_data.xlsx"):
        """Export audit data to Excel format with multiple sheets"""
        try:
            with pd.ExcelWriter(filename, engine='openpyxl') as writer:
                # Sheet 1: Detailed data
                flattened_data = []
                for task in self.audit_data:
                    for sender_id, quantity in task["sender_data"].items():
                        flattened_data.append({
                            "receive_task_id": task["receive_task_id"],
                            "complete_time": task["complete_time"],
                            "sender_id": sender_id,
                            "quantity": quantity,
                            "total_task_quantity": task["total_quantity"],
                            "sender_count": task["sender_count"],
                            "processed_at": task["processed_at"]
                        })
                
                if flattened_data:
                    df_detailed = pd.DataFrame(flattened_data)
                    df_detailed.to_excel(writer, sheet_name='Detailed_Data', index=False)
                
                # Sheet 2: Task summary
                summary_data = []
                for task in self.audit_data:
                    summary_data.append({
                        "receive_task_id": task["receive_task_id"],
                        "complete_time": task["complete_time"],
                        "total_senders": len(task["sender_data"]),
                        "total_quantity": task["total_quantity"],
                        "processed_at": task["processed_at"]
                    })
                
                if summary_data:
                    df_summary = pd.DataFrame(summary_data)
                    df_summary.to_excel(writer, sheet_name='Task_Summary', index=False)
                
                # Sheet 3: Sender aggregation
                sender_totals = {}
                for task in self.audit_data:
                    for sender_id, quantity in task["sender_data"].items():
                        if sender_id in sender_totals:
                            sender_totals[sender_id] += quantity
                        else:
                            sender_totals[sender_id] = quantity
                
                if sender_totals:
                    sender_data = [{"sender_id": k, "total_quantity": v} for k, v in sender_totals.items()]
                    df_senders = pd.DataFrame(sender_data)
                    df_senders = df_senders.sort_values('total_quantity', ascending=False)
                    df_senders.to_excel(writer, sheet_name='Sender_Totals', index=False)
            
            logger.info(f"Data exported to {filename}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting to Excel: {str(e)}")
            return False
    
    def export_all_formats(self, base_filename="spx_audit_data"):
        """Export data to all formats"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        success = True
        success &= self.export_to_json(f"{base_filename}_{timestamp}.json")
        success &= self.export_to_csv(f"{base_filename}_{timestamp}.csv")
        success &= self.export_to_excel(f"{base_filename}_{timestamp}.xlsx")
        
        return success

def main():
    """Main execution function"""
    print("SPX Shopee Receive Task Audit Automation (Production)")
    print("=" * 65)
    print("This script will:")
    print("1. Open the SPX website in Chrome")
    print("2. Extract all receive task IDs")
    print("3. Process each task to count quantities per sender")
    print("4. Export data to Excel, CSV, and JSON formats")
    print("=" * 65)
    
    # Configuration
    headless = False
    max_tasks = None
    
    # Ask user for configuration
    try:
        response = input("\nDo you want to run in test mode (process only first 5 tasks)? (y/n): ").strip().lower()
        if response == 'y':
            max_tasks = 5
            print("Running in test mode - will process only 5 tasks")
    except:
        pass
    
    # Create automation instance
    automation = SPXAuditAutomationProduction(headless=headless)
    
    try:
        print("\nStarting automation...")
        success = automation.audit_all_tasks(max_tasks=max_tasks)
        
        if success and automation.audit_data:
            print(f"\n✅ Audit completed successfully!")
            print(f"📊 Processed {len(automation.audit_data)} tasks")
            
            # Export data
            print("\n📁 Exporting data to files...")
            automation.export_all_formats()
            
            # Print summary
            total_quantity = sum(task["total_quantity"] for task in automation.audit_data)
            total_senders = sum(task["sender_count"] for task in automation.audit_data)
            
            print(f"\n📈 Summary:")
            print(f"   • Total tasks processed: {len(automation.audit_data)}")
            print(f"   • Total quantity across all tasks: {total_quantity}")
            print(f"   • Total sender entries: {total_senders}")
            
            # Show file locations
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            print(f"\n📄 Generated files:")
            print(f"   • spx_audit_data_{timestamp}.xlsx (Excel with multiple sheets)")
            print(f"   • spx_audit_data_{timestamp}.csv (CSV for easy import)")
            print(f"   • spx_audit_data_{timestamp}.json (JSON for developers)")
            print(f"   • spx_audit.log (Detailed log file)")
            
        else:
            print("❌ Audit failed or no data collected")
            print("Check the spx_audit.log file for details")
            
    except KeyboardInterrupt:
        print("\n⏹️ Process interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        print(f"❌ Unexpected error occurred: {str(e)}")
    
    print("\n✨ Process completed. Check the generated files and logs for details.")
    input("Press Enter to exit...")

if __name__ == "__main__":
    main()
