#!/usr/bin/env python3
"""
SPX Audit Automation with Interactive Debugging
Includes manual element selection and improved detection strategies
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
from selenium.webdriver.common.action_chains import ActionChains
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

class SPXAuditAutomationInteractive:
    def __init__(self, headless=False, wait_time=10):
        """
        Initialize the SPX audit automation with interactive debugging
        
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
    
    def debug_page_structure(self):
        """Debug the page structure to help identify receive task elements"""
        try:
            print("\n" + "="*60)
            print("PAGE STRUCTURE ANALYSIS")
            print("="*60)
            
            # Get page info
            print(f"Current URL: {self.driver.current_url}")
            print(f"Page Title: {self.driver.title}")
            
            # Look for common table structures
            tables = self.driver.find_elements(By.TAG_NAME, "table")
            print(f"\nFound {len(tables)} table(s) on the page")
            
            for i, table in enumerate(tables, 1):
                try:
                    rows = table.find_elements(By.TAG_NAME, "tr")
                    print(f"  Table {i}: {len(rows)} rows")
                    
                    if len(rows) > 0:
                        # Check first few rows for content
                        for j, row in enumerate(rows[:3], 1):
                            cells = row.find_elements(By.TAG_NAME, "td")
                            if len(cells) > 0:
                                cell_texts = [cell.text.strip()[:20] for cell in cells[:5]]
                                print(f"    Row {j}: {cell_texts}")
                except:
                    continue
            
            # Look for elements containing "DRT"
            drt_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'DRT')]")
            print(f"\nFound {len(drt_elements)} elements containing 'DRT'")
            
            for i, element in enumerate(drt_elements[:5], 1):
                try:
                    print(f"  DRT Element {i}: '{element.text.strip()[:50]}' (tag: {element.tag_name})")
                except:
                    continue
            
            # Look for elements containing dates
            date_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), '2025-08')]")
            print(f"\nFound {len(date_elements)} elements containing '2025-08'")
            
            for i, element in enumerate(date_elements[:5], 1):
                try:
                    print(f"  Date Element {i}: '{element.text.strip()[:50]}' (tag: {element.tag_name})")
                except:
                    continue
            
            # Look for ant design components
            ant_elements = self.driver.find_elements(By.XPATH, "//*[contains(@class, 'ant-table')]")
            print(f"\nFound {len(ant_elements)} Ant Design table elements")
            
            # Look for any clickable elements that might be task IDs
            clickable_elements = self.driver.find_elements(By.XPATH, "//a | //button | //*[@onclick] | //*[contains(@class, 'clickable')]")
            task_like_elements = []
            for element in clickable_elements:
                try:
                    text = element.text.strip()
                    if text.startswith('DRT') and len(text) > 10:
                        task_like_elements.append(element)
                except:
                    continue
            
            print(f"\nFound {len(task_like_elements)} clickable elements that look like task IDs")
            for i, element in enumerate(task_like_elements[:5], 1):
                try:
                    print(f"  Clickable Task {i}: '{element.text.strip()}'")
                except:
                    continue
            
            print("="*60)
            
        except Exception as e:
            logger.error(f"Error in page structure analysis: {str(e)}")
    
    def interactive_element_selection(self):
        """Allow user to manually identify task elements"""
        try:
            print("\n" + "="*60)
            print("INTERACTIVE ELEMENT SELECTION")
            print("="*60)
            print("I'll help you identify the receive task elements manually.")
            print("\nInstructions:")
            print("1. Look at the Chrome browser window")
            print("2. Find a receive task ID (like DRT2025080401NDL)")
            print("3. Double-click on it to select it")
            print("4. Come back here and press Enter")
            print("="*60)
            
            input("\nPress Enter after you've double-clicked on a task ID...")
            
            # Try to find currently selected/focused element
            try:
                active_element = self.driver.switch_to.active_element
                if active_element:
                    selected_text = active_element.text.strip()
                    print(f"\nDetected selected element: '{selected_text}'")
                    
                    if selected_text and 'DRT' in selected_text:
                        print("✅ Great! Found a task ID.")
                        return self._analyze_selected_element(active_element)
                    else:
                        print("❌ The selected element doesn't look like a task ID.")
            except:
                pass
            
            # Alternative: Get text selection from page
            try:
                selected_text = self.driver.execute_script("return window.getSelection().toString();")
                if selected_text and 'DRT' in selected_text:
                    print(f"✅ Found selected text: '{selected_text}'")
                    return self._find_elements_by_text_pattern(selected_text)
            except:
                pass
            
            print("❌ Could not detect the selected task ID.")
            print("Let's try a different approach...")
            
            return False
            
        except Exception as e:
            logger.error(f"Error in interactive selection: {str(e)}")
            return False
    
    def _analyze_selected_element(self, element):
        """Analyze the structure around a selected element"""
        try:
            # Get the parent row
            row = element.find_element(By.XPATH, "./ancestor::tr[1]")
            cells = row.find_elements(By.TAG_NAME, "td")
            
            print(f"\nFound row with {len(cells)} cells:")
            for i, cell in enumerate(cells, 1):
                text = cell.text.strip()[:30]
                print(f"  Cell {i}: '{text}'")
            
            # Try to find all similar rows
            table = row.find_element(By.XPATH, "./ancestor::table[1]")
            all_rows = table.find_elements(By.TAG_NAME, "tr")
            
            task_data = []
            for row in all_rows[1:]:  # Skip header row
                try:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 2:
                        task_id = cells[0].text.strip()
                        if task_id.startswith('DRT'):
                            # Try to find complete time in the same row
                            complete_time = "N/A"
                            for cell in cells:
                                cell_text = cell.text.strip()
                                if "2025-08" in cell_text:
                                    complete_time = cell_text
                                    break
                            
                            task_data.append({
                                "task_id": task_id,
                                "complete_time": complete_time
                            })
                except:
                    continue
            
            if task_data:
                print(f"\n✅ Successfully extracted {len(task_data)} tasks using selected element structure!")
                for i, task in enumerate(task_data[:3], 1):
                    print(f"  Sample {i}: {task['task_id']} - {task['complete_time']}")
                return task_data
            
            return []
            
        except Exception as e:
            logger.error(f"Error analyzing selected element: {str(e)}")
            return []
    
    def _find_elements_by_text_pattern(self, sample_text):
        """Find similar elements based on text pattern"""
        try:
            # Extract the task ID pattern
            import re
            task_id_match = re.search(r'(DRT\d{10}[A-Z]*)', sample_text)
            if not task_id_match:
                return []
            
            sample_task_id = task_id_match.group(1)
            print(f"Looking for elements similar to: {sample_task_id}")
            
            # Find all elements with similar pattern
            all_elements = self.driver.find_elements(By.XPATH, f"//*[contains(text(), '{sample_task_id[:3]}')]")
            
            task_data = []
            for element in all_elements:
                try:
                    text = element.text.strip()
                    task_match = re.search(r'(DRT\d{10}[A-Z]*)', text)
                    if task_match:
                        task_id = task_match.group(1)
                        
                        # Try to find complete time in the same row or nearby
                        complete_time = "N/A"
                        try:
                            row = element.find_element(By.XPATH, "./ancestor::tr[1]")
                            cells = row.find_elements(By.TAG_NAME, "td")
                            for cell in cells:
                                cell_text = cell.text.strip()
                                if "2025-08" in cell_text:
                                    complete_time = cell_text
                                    break
                        except:
                            pass
                        
                        task_data.append({
                            "task_id": task_id,
                            "complete_time": complete_time
                        })
                except:
                    continue
            
            # Remove duplicates
            unique_tasks = []
            seen_ids = set()
            for task in task_data:
                if task["task_id"] not in seen_ids:
                    unique_tasks.append(task)
                    seen_ids.add(task["task_id"])
            
            if unique_tasks:
                print(f"\n✅ Found {len(unique_tasks)} unique tasks using pattern matching!")
                return unique_tasks
            
            return []
            
        except Exception as e:
            logger.error(f"Error in pattern matching: {str(e)}")
            return []
    
    def get_receive_task_ids_and_complete_times_interactive(self):
        """Enhanced extraction with interactive debugging"""
        try:
            print("\n🔍 Starting enhanced task extraction...")
            
            # First, try automatic extraction
            receive_tasks = self._try_automatic_extraction()
            
            if receive_tasks:
                logger.info(f"✅ Automatic extraction successful: Found {len(receive_tasks)} tasks")
                return receive_tasks
            
            print("\n❌ Automatic extraction failed. Let's debug the page structure...")
            
            # Debug page structure
            self.debug_page_structure()
            
            # Ask user if they want to try interactive selection
            response = input("\nWould you like to try interactive element selection? (y/n): ").strip().lower()
            if response == 'y':
                tasks = self.interactive_element_selection()
                if tasks:
                    return tasks
            
            # Last resort: manual XPath input
            print("\n🔧 Let's try manual XPath selection...")
            return self._manual_xpath_selection()
            
        except Exception as e:
            logger.error(f"Error in interactive task extraction: {str(e)}")
            return []
    
    def _try_automatic_extraction(self):
        """Try the original automatic extraction strategies"""
        try:
            receive_tasks = []
            
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
                    "name": "Any table with DRT",
                    "rows": "//tr[td[contains(text(), 'DRT')]]",
                    "task_id_cell": ".//td[contains(text(), 'DRT')]",
                    "complete_time_cell": ".//td[contains(text(), '2025-08')]"
                },
                {
                    "name": "Generic DRT search",
                    "rows": "//*[contains(text(), 'DRT')]/ancestor::tr",
                    "task_id_cell": ".//td[contains(text(), 'DRT')]",
                    "complete_time_cell": ".//td[contains(text(), '2025-08')]"
                }
            ]
            
            for i, strategy in enumerate(strategies, 1):
                try:
                    logger.info(f"Trying strategy {i}: {strategy['name']}")
                    rows = self.driver.find_elements(By.XPATH, strategy["rows"])
                    
                    if not rows:
                        logger.info(f"  No rows found with: {strategy['rows']}")
                        continue
                    
                    logger.info(f"  Found {len(rows)} rows")
                    
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
                                # Try all cells for date
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
            
            return unique_tasks
            
        except Exception as e:
            logger.error(f"Error in automatic extraction: {str(e)}")
            return []
    
    def _manual_xpath_selection(self):
        """Allow user to manually input XPath selectors"""
        try:
            print("\n" + "="*60)
            print("MANUAL XPATH SELECTION")
            print("="*60)
            print("If you know how to inspect elements, you can provide XPath selectors.")
            print("Otherwise, press Enter to skip.")
            
            task_xpath = input("\nEnter XPath for task ID elements (or press Enter to skip): ").strip()
            if not task_xpath:
                return []
            
            elements = self.driver.find_elements(By.XPATH, task_xpath)
            print(f"Found {len(elements)} elements with your XPath")
            
            if elements:
                tasks = []
                for element in elements:
                    try:
                        task_id = element.text.strip()
                        if task_id.startswith('DRT'):
                            tasks.append({
                                "task_id": task_id,
                                "complete_time": "N/A"
                            })
                    except:
                        continue
                
                if tasks:
                    print(f"✅ Extracted {len(tasks)} tasks using manual XPath!")
                    return tasks
            
            return []
            
        except Exception as e:
            logger.error(f"Error in manual XPath selection: {str(e)}")
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
        """Main method to audit all receive tasks with interactive debugging"""
        try:
            if not self.setup_driver():
                return False
            
            if not self.navigate_to_receive_tasks():
                return False
            
            # Enhanced task extraction
            tasks_data = self.get_receive_task_ids_and_complete_times_interactive()
            
            if not tasks_data:
                print("\n❌ Could not extract any receive tasks.")
                print("This could be because:")
                print("1. You're not logged into SPX")
                print("2. There are no receive tasks visible")
                print("3. The page structure is different than expected")
                print("4. The website has changed its layout")
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
    print("SPX Shopee Receive Task Audit Automation (Interactive Debug)")
    print("=" * 70)
    print("This version includes interactive debugging to help identify")
    print("receive task elements when automatic detection fails.")
    print("=" * 70)
    
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
    automation = SPXAuditAutomationInteractive(headless=headless)
    
    try:
        print("\nStarting interactive automation...")
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
