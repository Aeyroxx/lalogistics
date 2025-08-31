#!/usr/bin/env python3
"""
SPX Audit Automation - Simplified Version
Opens main SPX site first, waits for login, then navigates to receive tasks
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

class SPXAuditAutomationSimple:
    def __init__(self, headless=False, wait_time=10):
        """
        Initialize the SPX audit automation
        
        Args:
            headless (bool): Run browser in headless mode
            wait_time (int): Default wait time for elements
        """
        self.wait_time = wait_time
        self.driver = None
        self.wait = None
        self.audit_data = []
        
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
            chrome_binary_path = self.find_chrome_binary()
            
            if chrome_binary_path:
                self.chrome_options.binary_location = chrome_binary_path
                logger.info(f"Using Chrome binary: {chrome_binary_path}")
            
            # Get ChromeDriver
            service = Service(ChromeDriverManager().install())
            
            # Create driver
            self.driver = webdriver.Chrome(service=service, options=self.chrome_options)
            
            # Execute script to remove webdriver property
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            self.wait = WebDriverWait(self.driver, self.wait_time)
            logger.info("Chrome WebDriver initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize WebDriver: {str(e)}")
            return False
    
    def open_spx_homepage(self):
        """Open SPX homepage for login"""
        try:
            url = "https://sp.spx.shopee.ph/"
            logger.info(f"Opening SPX homepage: {url}")
            self.driver.get(url)
            
            # Wait for page to load
            time.sleep(3)
            
            print("\n" + "="*60)
            print("SPX WEBSITE OPENED")
            print("="*60)
            print("The SPX website has been opened in Chrome.")
            print("\nPlease follow these steps:")
            print("1. Look for the Chrome browser window that opened")
            print("2. Login to your SPX account in that window")
            print("3. Make sure you are successfully logged in")
            print("4. Return to this terminal and press Enter to continue")
            print("\nNOTE: Do NOT close the browser window!")
            print("="*60)
            
            input("\nPress Enter after you have logged in successfully...")
            
            logger.info("User confirmed login completion")
            return True
            
        except Exception as e:
            logger.error(f"Error opening SPX homepage: {str(e)}")
            return False
    
    def navigate_to_receive_tasks(self):
        """Navigate to the receive tasks page after login"""
        try:
            url = "https://sp.spx.shopee.ph/inbound-management/receive-task"
            logger.info(f"Navigating to receive tasks: {url}")
            self.driver.get(url)
            
            # Wait for page to load
            time.sleep(5)
            
            print("\n" + "="*60)
            print("RECEIVE TASKS PAGE")
            print("="*60)
            print("Now navigating to the receive tasks page...")
            print("Please wait while the page loads...")
            print("="*60)
            
            # Wait a bit more for the page to fully load
            time.sleep(3)
            
            logger.info("Successfully navigated to receive tasks page")
            return True
            
        except Exception as e:
            logger.error(f"Error navigating to receive tasks: {str(e)}")
            return False
    
    def scan_and_extract_tasks(self):
        """Scan the page and extract receive task data"""
        try:
            print("\n🔍 Scanning page for receive task data...")
            
            # Multiple strategies to find task data
            tasks_data = []
            
            # Strategy 1: Look for any elements containing "DRT" (task ID pattern)
            logger.info("Strategy 1: Looking for DRT elements...")
            drt_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'DRT')]")
            
            if drt_elements:
                logger.info(f"Found {len(drt_elements)} elements containing 'DRT'")
                
                for element in drt_elements:
                    try:
                        text = element.text.strip()
                        if text.startswith('DRT') and len(text) >= 10:
                            # Try to find complete time in the same row or nearby
                            complete_time = "N/A"
                            try:
                                # Look for parent row
                                row = element.find_element(By.XPATH, "./ancestor::tr[1]")
                                cells = row.find_elements(By.TAG_NAME, "td")
                                
                                for cell in cells:
                                    cell_text = cell.text.strip()
                                    if "2025-08" in cell_text or ":" in cell_text:
                                        complete_time = cell_text
                                        break
                            except:
                                # Look for nearby elements with date/time
                                try:
                                    parent = element.find_element(By.XPATH, "./parent::*")
                                    siblings = parent.find_elements(By.XPATH, ".//*")
                                    for sibling in siblings:
                                        sibling_text = sibling.text.strip()
                                        if "2025-08" in sibling_text or ":" in sibling_text:
                                            complete_time = sibling_text
                                            break
                                except:
                                    pass
                            
                            task_data = {
                                "task_id": text,
                                "complete_time": complete_time
                            }
                            
                            # Check if we already have this task
                            if not any(task["task_id"] == text for task in tasks_data):
                                tasks_data.append(task_data)
                                logger.info(f"Found task: {text} - {complete_time}")
                    
                    except Exception as e:
                        continue
            
            # Strategy 2: Look in table structures
            if not tasks_data:
                logger.info("Strategy 2: Looking in table structures...")
                
                tables = self.driver.find_elements(By.TAG_NAME, "table")
                for table in tables:
                    try:
                        rows = table.find_elements(By.TAG_NAME, "tr")
                        for row in rows:
                            cells = row.find_elements(By.TAG_NAME, "td")
                            if len(cells) >= 2:
                                task_id = None
                                complete_time = "N/A"
                                
                                for cell in cells:
                                    cell_text = cell.text.strip()
                                    if cell_text.startswith('DRT') and len(cell_text) >= 10:
                                        task_id = cell_text
                                    elif "2025-08" in cell_text or ":" in cell_text:
                                        complete_time = cell_text
                                
                                if task_id and not any(task["task_id"] == task_id for task in tasks_data):
                                    tasks_data.append({
                                        "task_id": task_id,
                                        "complete_time": complete_time
                                    })
                                    logger.info(f"Found task in table: {task_id} - {complete_time}")
                    
                    except Exception:
                        continue
            
            # Strategy 3: Look for clickable elements
            if not tasks_data:
                logger.info("Strategy 3: Looking for clickable elements...")
                
                clickable_selectors = [
                    "//a[contains(text(), 'DRT')]",
                    "//button[contains(text(), 'DRT')]",
                    "//*[@onclick and contains(text(), 'DRT')]",
                    "//*[contains(@class, 'clickable') and contains(text(), 'DRT')]"
                ]
                
                for selector in clickable_selectors:
                    try:
                        elements = self.driver.find_elements(By.XPATH, selector)
                        for element in elements:
                            try:
                                text = element.text.strip()
                                if text.startswith('DRT') and len(text) >= 10:
                                    if not any(task["task_id"] == text for task in tasks_data):
                                        tasks_data.append({
                                            "task_id": text,
                                            "complete_time": "N/A"
                                        })
                                        logger.info(f"Found clickable task: {text}")
                            except:
                                continue
                    except:
                        continue
            
            # Strategy 4: JavaScript search for dynamic content
            if not tasks_data:
                logger.info("Strategy 4: JavaScript search for dynamic content...")
                try:
                    # Use JavaScript to find all text nodes containing DRT
                    script = """
                    var walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    var textNodes = [];
                    var node;
                    while(node = walker.nextNode()) {
                        if(node.nodeValue.includes('DRT')) {
                            textNodes.push(node.nodeValue.trim());
                        }
                    }
                    return textNodes;
                    """
                    
                    text_nodes = self.driver.execute_script(script)
                    
                    for text in text_nodes:
                        if text.startswith('DRT') and len(text) >= 10:
                            if not any(task["task_id"] == text for task in tasks_data):
                                tasks_data.append({
                                    "task_id": text,
                                    "complete_time": "N/A"
                                })
                                logger.info(f"Found task via JavaScript: {text}")
                
                except Exception as e:
                    logger.warning(f"JavaScript search failed: {str(e)}")
            
            if tasks_data:
                logger.info(f"✅ Successfully found {len(tasks_data)} receive tasks")
                return tasks_data
            else:
                print("\n❌ No receive tasks found on the page.")
                print("This could be because:")
                print("1. There are no receive tasks available")
                print("2. The page hasn't fully loaded")
                print("3. You might not be on the correct page")
                print("4. The website structure is different than expected")
                
                # Debug information
                print(f"\nCurrent URL: {self.driver.current_url}")
                print(f"Page Title: {self.driver.title}")
                
                response = input("\nWould you like to wait and try again? (y/n): ").strip().lower()
                if response == 'y':
                    print("Waiting 10 seconds for page to load...")
                    time.sleep(10)
                    return self.scan_and_extract_tasks()  # Recursive retry
                
                return []
            
        except Exception as e:
            logger.error(f"Error scanning page for tasks: {str(e)}")
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
            
            # Strategy 2: Look for any numeric data
            if not sender_data:
                try:
                    # Find all elements with numbers
                    all_elements = self.driver.find_elements(By.XPATH, "//*")
                    
                    potential_senders = []
                    potential_quantities = []
                    
                    for element in all_elements:
                        try:
                            text = element.text.strip()
                            if text.isdigit():
                                num = int(text)
                                if len(text) >= 8:  # Likely sender ID
                                    potential_senders.append(text)
                                elif 1 <= num <= 999:  # Likely quantity
                                    potential_quantities.append(num)
                        except:
                            continue
                    
                    # Try to pair senders with quantities
                    if potential_senders and potential_quantities:
                        total_quantity = sum(potential_quantities)
                        
                        # If we have equal numbers, pair them
                        if len(potential_senders) == len(potential_quantities):
                            for sender, qty in zip(potential_senders, potential_quantities):
                                sender_data[sender] = qty
                        else:
                            # Use total quantity for first sender found
                            if potential_senders:
                                sender_data[potential_senders[0]] = total_quantity
                
                except Exception as e:
                    logger.warning(f"Numeric data extraction failed for {task_id}: {str(e)}")
            
            # Strategy 3: Count visible items as fallback
            if not sender_data:
                try:
                    # Count table rows or list items
                    rows = self.driver.find_elements(By.XPATH, "//tr | //li")
                    visible_rows = [row for row in rows if row.is_displayed()]
                    
                    if len(visible_rows) > 1:  # Exclude header
                        estimated_count = len(visible_rows) - 1
                        sender_data["ESTIMATED_COUNT"] = estimated_count
                        logger.info(f"Using estimated count for {task_id}: {estimated_count} items")
                
                except Exception:
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
            
            # Step 1: Open SPX homepage for login
            if not self.open_spx_homepage():
                return False
            
            # Step 2: Navigate to receive tasks page
            if not self.navigate_to_receive_tasks():
                return False
            
            # Step 3: Scan and extract tasks
            tasks_data = self.scan_and_extract_tasks()
            
            if not tasks_data:
                print("\n❌ Could not extract any receive tasks.")
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
        """Export audit data to Excel format"""
        try:
            with pd.ExcelWriter(filename, engine='openpyxl') as writer:
                # Detailed data
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
                
                # Task summary
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
    print("SPX Shopee Receive Task Audit Automation (Simplified)")
    print("=" * 60)
    print("This version opens the main SPX site first for easy login,")
    print("then navigates to receive tasks and processes the data.")
    print("=" * 60)
    
    # Configuration
    headless = False
    max_tasks = None
    
    # Ask user for configuration
    try:
        response = input("\nDo you want to run in test mode (process only first 3 tasks)? (y/n): ").strip().lower()
        if response == 'y':
            max_tasks = 3
            print("Running in test mode - will process only 3 tasks")
    except:
        pass
    
    # Create automation instance
    automation = SPXAuditAutomationSimple(headless=headless)
    
    try:
        print("\nStarting simplified automation...")
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
            print(f"   • spx_audit_data_{timestamp}.xlsx")
            print(f"   • spx_audit_data_{timestamp}.csv")
            print(f"   • spx_audit_data_{timestamp}.json")
            print(f"   • spx_audit.log (log file)")
            
        else:
            print("❌ Audit failed or no data collected")
            print("Check the spx_audit.log file for details")
            
    except KeyboardInterrupt:
        print("\n⏹️ Process interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        print(f"❌ Unexpected error occurred: {str(e)}")
    
    print("\n✨ Process completed.")
    input("Press Enter to exit...")

if __name__ == "__main__":
    main()
