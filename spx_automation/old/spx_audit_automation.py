#!/usr/bin/env python3
"""
SPX Shopee Receive Task Audit Automation
Automates the process of extracting receive task data from SPX website
and exports to Excel, CSV, and JSON formats.
"""

import time
import json
import csv
import pandas as pd
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
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

class SPXAuditAutomation:
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
        self.chrome_options.add_argument("--no-sandbox")
        self.chrome_options.add_argument("--disable-dev-shm-usage")
        self.chrome_options.add_argument("--disable-gpu")
        self.chrome_options.add_argument("--window-size=1920,1080")
        
        # User agent to avoid detection
        self.chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    
    def setup_driver(self):
        """Setup Chrome WebDriver"""
        try:
            # You might need to specify the path to chromedriver
            # Download from: https://chromedriver.chromium.org/
            self.driver = webdriver.Chrome(options=self.chrome_options)
            self.wait = WebDriverWait(self.driver, self.wait_time)
            logger.info("Chrome WebDriver initialized successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize WebDriver: {str(e)}")
            logger.error("Please make sure ChromeDriver is installed and in PATH")
            logger.error("Download from: https://chromedriver.chromium.org/")
            return False
    
    def navigate_to_receive_tasks(self):
        """Navigate to the SPX receive tasks page"""
        try:
            url = "https://sp.spx.shopee.ph/inbound-management/receive-task"
            logger.info(f"Navigating to: {url}")
            self.driver.get(url)
            
            # Wait for the page to load and check if we need to login
            time.sleep(3)
            
            # Check if we're on login page or if login is required
            current_url = self.driver.current_url
            if "login" in current_url.lower() or "auth" in current_url.lower():
                logger.warning("Login required! Please login manually and press Enter to continue...")
                input("Press Enter after you have logged in...")
            
            # Wait for the receive tasks table to load
            self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "ant-table-tbody")))
            logger.info("Successfully loaded receive tasks page")
            return True
            
        except TimeoutException:
            logger.error("Timeout waiting for receive tasks page to load")
            return False
        except Exception as e:
            logger.error(f"Error navigating to receive tasks: {str(e)}")
            return False
    
    def get_receive_task_ids(self):
        """Extract all receive task IDs from the current page"""
        try:
            receive_task_ids = []
            
            # Find all receive task ID links
            task_elements = self.driver.find_elements(By.XPATH, "//td[1]//a | //td[contains(@class, 'ant-table-cell')][1]//a")
            
            if not task_elements:
                # Try alternative selector
                task_elements = self.driver.find_elements(By.XPATH, "//tbody//tr//td[1]")
            
            for element in task_elements:
                try:
                    task_id = element.text.strip()
                    if task_id and task_id.startswith('DRT'):
                        receive_task_ids.append(task_id)
                except:
                    continue
            
            logger.info(f"Found {len(receive_task_ids)} receive task IDs")
            return receive_task_ids
            
        except Exception as e:
            logger.error(f"Error extracting receive task IDs: {str(e)}")
            return []
    
    def get_task_complete_time(self, task_id):
        """Get complete time for a specific task from the main table"""
        try:
            # Find the row containing this task ID
            row_xpath = f"//td[contains(text(), '{task_id}')]/parent::tr"
            row_element = self.driver.find_element(By.XPATH, row_xpath)
            
            # Get complete time from the last column (assuming it's the complete time column)
            complete_time_element = row_element.find_elements(By.TAG_NAME, "td")[-2]  # Second to last column
            complete_time = complete_time_element.text.strip()
            
            return complete_time if complete_time else "N/A"
            
        except NoSuchElementException:
            logger.warning(f"Could not find complete time for task {task_id}")
            return "N/A"
        except Exception as e:
            logger.error(f"Error getting complete time for {task_id}: {str(e)}")
            return "N/A"
    
    def process_receive_task_detail(self, task_id):
        """Process a single receive task detail page"""
        try:
            # Navigate to task detail page
            detail_url = f"https://sp.spx.shopee.ph/inbound-management/receive-task/detail/{task_id}"
            logger.info(f"Processing task: {task_id}")
            self.driver.get(detail_url)
            
            # Wait for the detail page to load
            time.sleep(2)
            
            # Try to find the table with sender data
            try:
                self.wait.until(EC.presence_of_element_located((By.XPATH, "//table//tbody")))
            except TimeoutException:
                logger.warning(f"Timeout waiting for detail table for task {task_id}")
                return None
            
            # Extract sender data
            sender_data = {}
            
            try:
                # Find all table rows
                rows = self.driver.find_elements(By.XPATH, "//table//tbody//tr")
                
                for row in rows:
                    try:
                        cells = row.find_elements(By.TAG_NAME, "td")
                        if len(cells) >= 2:
                            # Assuming first column is Sender ID
                            sender_id = cells[0].text.strip()
                            
                            # Look for quantity in the visible cells
                            # This might need adjustment based on actual table structure
                            for i, cell in enumerate(cells):
                                cell_text = cell.text.strip()
                                if cell_text.isdigit():
                                    quantity = int(cell_text)
                                    if sender_id in sender_data:
                                        sender_data[sender_id] += quantity
                                    else:
                                        sender_data[sender_id] = quantity
                                    break
                    except:
                        continue
                        
            except Exception as e:
                logger.error(f"Error extracting sender data for {task_id}: {str(e)}")
            
            # If no sender data found, try alternative method
            if not sender_data:
                try:
                    # Try to find quantity summary or total
                    total_element = self.driver.find_element(By.XPATH, "//span[contains(text(), 'Total')]//following-sibling::span | //span[contains(text(), 'total')]//following-sibling::span")
                    total_quantity = total_element.text.strip()
                    if total_quantity.isdigit():
                        sender_data["TOTAL"] = int(total_quantity)
                except:
                    logger.warning(f"Could not extract detailed sender data for {task_id}")
                    sender_data["UNKNOWN"] = 1  # Default entry
            
            return sender_data
            
        except Exception as e:
            logger.error(f"Error processing task detail {task_id}: {str(e)}")
            return None
    
    def audit_all_tasks(self, max_tasks=None):
        """Main method to audit all receive tasks"""
        try:
            if not self.setup_driver():
                return False
            
            if not self.navigate_to_receive_tasks():
                return False
            
            # Get all receive task IDs
            task_ids = self.get_receive_task_ids()
            
            if not task_ids:
                logger.error("No receive task IDs found")
                return False
            
            # Limit number of tasks if specified
            if max_tasks:
                task_ids = task_ids[:max_tasks]
            
            logger.info(f"Starting audit of {len(task_ids)} tasks")
            
            # Go back to main page to get complete times
            self.navigate_to_receive_tasks()
            
            # Process each task
            for i, task_id in enumerate(task_ids, 1):
                try:
                    logger.info(f"Processing task {i}/{len(task_ids)}: {task_id}")
                    
                    # Get complete time from main table
                    complete_time = self.get_task_complete_time(task_id)
                    
                    # Process task detail
                    sender_data = self.process_receive_task_detail(task_id)
                    
                    if sender_data:
                        task_info = {
                            "receive_task_id": task_id,
                            "complete_time": complete_time,
                            "sender_data": sender_data,
                            "total_quantity": sum(sender_data.values()),
                            "processed_at": datetime.now().isoformat()
                        }
                        self.audit_data.append(task_info)
                        
                        logger.info(f"Task {task_id}: {len(sender_data)} senders, {sum(sender_data.values())} total quantity")
                    else:
                        logger.warning(f"No data extracted for task {task_id}")
                    
                    # Small delay between requests
                    time.sleep(1)
                    
                except Exception as e:
                    logger.error(f"Error processing task {task_id}: {str(e)}")
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
            # Flatten the data for CSV
            flattened_data = []
            
            for task in self.audit_data:
                for sender_id, quantity in task["sender_data"].items():
                    flattened_data.append({
                        "receive_task_id": task["receive_task_id"],
                        "complete_time": task["complete_time"],
                        "sender_id": sender_id,
                        "quantity": quantity,
                        "total_task_quantity": task["total_quantity"],
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
                # Sheet 1: Detailed data (flattened)
                flattened_data = []
                for task in self.audit_data:
                    for sender_id, quantity in task["sender_data"].items():
                        flattened_data.append({
                            "receive_task_id": task["receive_task_id"],
                            "complete_time": task["complete_time"],
                            "sender_id": sender_id,
                            "quantity": quantity,
                            "total_task_quantity": task["total_quantity"],
                            "processed_at": task["processed_at"]
                        })
                
                if flattened_data:
                    df_detailed = pd.DataFrame(flattened_data)
                    df_detailed.to_excel(writer, sheet_name='Detailed_Data', index=False)
                
                # Sheet 2: Summary by task
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
    print("SPX Shopee Receive Task Audit Automation")
    print("=" * 50)
    
    # Configuration
    headless = False  # Set to True to run without GUI
    max_tasks = None  # Set to a number to limit tasks for testing (e.g., 5)
    
    # Create automation instance
    automation = SPXAuditAutomation(headless=headless)
    
    try:
        # Run the audit
        success = automation.audit_all_tasks(max_tasks=max_tasks)
        
        if success and automation.audit_data:
            print(f"\nAudit completed successfully!")
            print(f"Processed {len(automation.audit_data)} tasks")
            
            # Export data
            print("Exporting data to files...")
            automation.export_all_formats()
            
            # Print summary
            total_quantity = sum(task["total_quantity"] for task in automation.audit_data)
            print(f"\nSummary:")
            print(f"Total tasks processed: {len(automation.audit_data)}")
            print(f"Total quantity across all tasks: {total_quantity}")
            
        else:
            print("Audit failed or no data collected")
            
    except KeyboardInterrupt:
        print("\nProcess interrupted by user")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
    
    print("\nProcess completed. Check the generated files and logs for details.")

if __name__ == "__main__":
    main()
