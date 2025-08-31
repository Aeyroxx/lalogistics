#!/usr/bin/env python3
"""
SPX Audit Automation - Fixed Version with Proper Tracking Number Counting
Handles pagination and correctly counts tracking numbers per sender ID
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
import re

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

class SPXAuditAutomationFixed:
    def __init__(self, headless=False, wait_time=10):
        """
        Initialize the SPX audit automation with proper tracking number counting
        
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
        """Scan ALL pages of receive task list and extract task data with status checking"""
        try:
            print("\n🔍 Scanning ALL pages for receive task data...")
            
            # Multiple strategies to find task data across all pages
            all_tasks_data = []
            all_skipped_tasks = []
            current_page = 1
            
            while True:
                print(f"\n📄 Processing page {current_page} of receive task list...")
                logger.info(f"Processing receive task list page {current_page}")
                
                # Scan current page
                page_tasks, page_skipped = self.scan_current_page_tasks()
                
                # Add to overall lists
                all_tasks_data.extend(page_tasks)
                all_skipped_tasks.extend(page_skipped)
                
                print(f"   ✅ Found {len(page_tasks)} Done tasks, skipped {len(page_skipped)} non-Done tasks")
                
                # Check if there's a next page
                has_next = self.check_for_next_page_in_task_list()
                if not has_next:
                    print(f"\n📋 Completed scanning all pages. Total pages processed: {current_page}")
                    break
                
                # Navigate to next page
                if not self.navigate_to_next_page_in_task_list():
                    print(f"\n⚠️ Failed to navigate to next page. Stopping at page {current_page}")
                    break
                
                current_page += 1
                time.sleep(2)  # Wait for page to load
            
            # Final summary
            print(f"\n📊 Final Task Status Summary (All Pages):")
            print(f"✅ Total tasks to process: {len(all_tasks_data)}")
            print(f"⏭️ Total tasks skipped: {len(all_skipped_tasks)}")
            print(f"📄 Total pages scanned: {current_page}")
            
            if all_skipped_tasks:
                print(f"\nSkipped tasks (non-Done status) - showing first 10:")
                for i, skipped in enumerate(all_skipped_tasks[:10]):
                    print(f"  • {skipped['task_id']} - Status: {skipped['status']}")
                if len(all_skipped_tasks) > 10:
                    print(f"  ... and {len(all_skipped_tasks) - 10} more")
            
            return all_tasks_data
            
        except Exception as e:
            logger.error(f"Error scanning all pages for tasks: {str(e)}")
            return []
    
    def scan_current_page_tasks(self):
        """Scan current page and extract receive task data with status checking"""
        try:
            tasks_data = []
            skipped_tasks = []
            
            # Strategy 1: Look for any elements containing "DRT" (task ID pattern)
            drt_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'DRT')]")
            
            if drt_elements:
                logger.info(f"Found {len(drt_elements)} elements containing 'DRT'")
                
                for element in drt_elements:
                    try:
                        text = element.text.strip()
                        if text.startswith('DRT') and len(text) >= 10:
                            # Try to find complete time and status in the same row or nearby
                            complete_time = "N/A"
                            status = "Unknown"
                            
                            try:
                                # Look for parent row
                                row = element.find_element(By.XPATH, "./ancestor::tr[1]")
                                cells = row.find_elements(By.TAG_NAME, "td")
                                
                                # Extract time and status from row cells
                                for cell in cells:
                                    cell_text = cell.text.strip()
                                    if "2025-08" in cell_text or ":" in cell_text:
                                        complete_time = cell_text
                                    
                                    # Look for status indicators
                                    if any(status_word in cell_text.lower() for status_word in ["done", "completed", "success", "finished"]):
                                        status = "Done"
                                    elif any(status_word in cell_text.lower() for status_word in ["pending", "processing", "in progress", "running"]):
                                        status = "Pending"
                                    elif any(status_word in cell_text.lower() for status_word in ["failed", "error", "cancelled"]):
                                        status = "Failed"
                                
                                # Also check for status elements with specific classes or icons
                                status_elements = row.find_elements(By.XPATH, ".//*[contains(@class, 'status') or contains(@class, 'success') or contains(@class, 'fail') or contains(@class, 'pending')]")
                                for status_elem in status_elements:
                                    elem_class = status_elem.get_attribute("class") or ""
                                    elem_text = status_elem.text.strip().lower()
                                    
                                    if "success" in elem_class or "done" in elem_text or "completed" in elem_text:
                                        status = "Done"
                                        break
                                    elif "fail" in elem_class or "error" in elem_text or "failed" in elem_text:
                                        status = "Failed"
                                        break
                                    elif "pending" in elem_class or "processing" in elem_text or "running" in elem_text:
                                        status = "Pending"
                                        break
                                        
                            except:
                                # Look for nearby elements with date/time and status
                                try:
                                    parent = element.find_element(By.XPATH, "./parent::*")
                                    siblings = parent.find_elements(By.XPATH, ".//*")
                                    for sibling in siblings:
                                        sibling_text = sibling.text.strip()
                                        if "2025-08" in sibling_text or ":" in sibling_text:
                                            complete_time = sibling_text
                                        
                                        # Check sibling for status
                                        if any(status_word in sibling_text.lower() for status_word in ["done", "completed", "success"]):
                                            status = "Done"
                                        elif any(status_word in sibling_text.lower() for status_word in ["pending", "processing"]):
                                            status = "Pending"
                                        elif any(status_word in sibling_text.lower() for status_word in ["failed", "error"]):
                                            status = "Failed"
                                except:
                                    pass
                            
                            task_data = {
                                "task_id": text,
                                "complete_time": complete_time,
                                "status": status
                            }
                            
                            # Check if we already have this task
                            if not any(task["task_id"] == text for task in tasks_data + skipped_tasks):
                                # Only process tasks with "Done" status
                                if status == "Done":
                                    tasks_data.append(task_data)
                                    logger.info(f"[TASK] Found task: {text} - {complete_time} (Status: {status})")
                                else:
                                    skipped_tasks.append(task_data)
                                    logger.warning(f"[SKIP] Skipped task: {text} - {complete_time} (Status: {status} - Not Done)")
                    
                    except Exception as e:
                        continue
            
            return tasks_data, skipped_tasks
            
        except Exception as e:
            logger.error(f"Error scanning current page for tasks: {str(e)}")
            return [], []
    
    def check_for_next_page_in_task_list(self):
        """Check if there's a next page in the receive task list"""
        try:
            # Strategy 1: Look for active pagination elements
            try:
                pagination_elements = self.driver.find_elements(By.XPATH, "//li[contains(@class, 'pager-item')]")
                if pagination_elements:
                    # Find current active page
                    active_page = None
                    max_page = 0
                    
                    for elem in pagination_elements:
                        elem_class = elem.get_attribute("class") or ""
                        elem_text = elem.text.strip()
                        
                        if "active" in elem_class and elem_text.isdigit():
                            active_page = int(elem_text)
                        
                        # Get max page number (exclude fast-move elements)
                        if elem_text.isdigit() and "fast-move" not in elem_class:
                            page_num = int(elem_text)
                            max_page = max(max_page, page_num)
                    
                    if active_page is not None and max_page > 0:
                        logger.info(f"Task list pagination: Current page {active_page}, Max page {max_page}")
                        return (active_page, max_page)
            except Exception as e:
                logger.warning(f"Strategy 1 failed for task list pagination: {e}")
            
            # Strategy 2: Check for pagination info in page text or total count
            try:
                # Look for "Total" text to calculate pages
                total_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Total')]")
                for elem in total_elements:
                    text = elem.text.strip()
                    total_match = re.search(r'Total\s+(\d+)', text)
                    if total_match:
                        total_items = int(total_match.group(1))
                        items_per_page = 24  # Default from SPX
                        
                        # Try to get actual items per page
                        per_page_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), '/ Page')]")
                        for per_page_elem in per_page_elements:
                            per_page_text = per_page_elem.text.strip()
                            per_page_match = re.search(r'(\d+)\s*\/\s*Page', per_page_text)
                            if per_page_match:
                                items_per_page = int(per_page_match.group(1))
                                break
                        
                        import math
                        max_page = math.ceil(total_items / items_per_page)
                        
                        # Try to get current page
                        current_page = 1
                        try:
                            active_elem = self.driver.find_element(By.XPATH, "//li[contains(@class, 'pager-item') and contains(@class, 'active')]")
                            current_page = int(active_elem.text.strip())
                        except:
                            pass
                        
                        logger.info(f"Task list pagination (calculated): Current page {current_page}, Max page {max_page}")
                        return (current_page, max_page)
            except Exception as e:
                logger.warning(f"Strategy 2 failed for task list pagination: {e}")
            
            # Strategy 3: Simple next button check
            try:
                next_button = self.driver.find_element(By.XPATH, "//span[contains(@class, 'pager-next') and contains(@class, 'pager-step') and not(contains(@class, 'pager-step-disabled'))]")
                if next_button and next_button.is_enabled():
                    logger.info("Task list: Found enabled next button (assuming more pages)")
                    return (1, 2)  # Minimal info to indicate there are more pages
                else:
                    logger.info("Task list: Next button is disabled")
                    return None
            except:
                logger.info("Task list: No next button found")
                return None
                
        except Exception as e:
            logger.warning(f"Error checking for next page in task list: {e}")
            return None
    
    def navigate_to_next_page_in_task_list(self):
        """Navigate to next page in task list ensuring sequential navigation"""
        try:
            # Get current page info first
            current_page_info = self.check_for_next_page_in_task_list()
            if not current_page_info:
                logger.error("[ERROR] Could not determine current page info or no more pages")
                return False
            
            current_page, max_page = current_page_info
            next_page = current_page + 1
            
            if next_page > max_page:
                logger.info(f"[DONE] Reached last page ({max_page})")
                return False
            
            logger.info(f"[NAV] Navigating from page {current_page} to page {next_page}...")
            
            # Strategy 1: Click specific next page number if visible
            try:
                # Look for the specific next page number in visible page items
                page_selectors = [
                    f"//li[contains(@class, 'pager-item') and not(contains(@class, 'fast-move')) and not(contains(@class, 'active')) and text()='{next_page}']",
                    f"//li[contains(@class, 'pager-item')][text()='{next_page}']",
                    f"//ul[contains(@class, 'pager')]//li[text()='{next_page}']"
                ]
                
                for selector in page_selectors:
                    try:
                        page_element = self.wait.until(EC.element_to_be_clickable((By.XPATH, selector)))
                        self.driver.execute_script("arguments[0].click();", page_element)
                        logger.info(f"[CLICK] Successfully clicked page number {next_page}")
                        time.sleep(3)
                        return True
                    except Exception as e:
                        logger.debug(f"Page selector {selector} failed: {str(e)}")
                        continue
                        
            except Exception as e:
                logger.warning(f"Strategy 1 (page number click) failed: {str(e)}")
            
            # Strategy 2: Use next button (single step only, not fast-forward)
            try:
                # Make sure we get the single-step next button, not the fast-forward
                next_btn = self.wait.until(EC.element_to_be_clickable((By.XPATH, 
                    "//span[contains(@class, 'pager-next') and contains(@class, 'pager-step') and not(contains(@class, 'pager-step-disabled'))]")))
                self.driver.execute_script("arguments[0].click();", next_btn)
                logger.info(f"[NEXT] Successfully clicked next button to go to page {next_page}")
                time.sleep(3)
                return True
            except Exception as e:
                logger.warning(f"Strategy 2 (next button) failed: {str(e)}")
            
            # Strategy 3: Use page jumper input as last resort
            try:
                logger.info(f"[JUMP] Using page jumper to go to page {next_page}...")
                jumper_input = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//input[contains(@class, 'jumper-input')]")))
                jumper_button = self.wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'jumper-button')]")))
                
                # Clear input and enter next page number
                jumper_input.clear()
                jumper_input.send_keys(str(next_page))
                time.sleep(1)
                
                # Click go button
                self.driver.execute_script("arguments[0].click();", jumper_button)
                logger.info(f"[JUMP] Successfully used page jumper to go to page {next_page}")
                time.sleep(3)
                return True
            except Exception as e:
                logger.warning(f"Strategy 3 (page jumper) failed: {str(e)}")
            
            logger.error("[ERROR] All navigation strategies failed")
            return False
            
        except Exception as e:
            logger.error(f"[ERROR] Navigation failed with error: {str(e)}")
            return False
    
    def get_tracking_numbers_from_page(self):
        """Extract all tracking numbers and their sender IDs from current page"""
        tracking_data = {}
        
        try:
            # Strategy 1: Look for tracking numbers in table format (most accurate for SPX)
            rows = self.driver.find_elements(By.XPATH, "//table//tbody//tr")
            
            logger.info(f"Found {len(rows)} table rows to process")
            
            for row_idx, row in enumerate(rows):
                try:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 3:  # Need at least Sender ID, SPX Tracking Number, and other columns
                        sender_id = None
                        tracking_number = None
                        
                        # Based on the screenshot structure:
                        # Column 1: Sender ID (like 1257601721)
                        # Column 3: SPX Tracking Number (like PH251249207504S)
                        
                        if len(cells) >= 1:
                            cell_0_text = cells[0].text.strip()
                            if cell_0_text.isdigit() and len(cell_0_text) >= 8:
                                sender_id = cell_0_text
                        
                        if len(cells) >= 3:
                            cell_2_text = cells[2].text.strip()
                            if cell_2_text.startswith('PH') and len(cell_2_text) >= 10:
                                tracking_number = cell_2_text
                        
                        # If we have both sender ID and tracking number, record it
                        if sender_id and tracking_number:
                            if sender_id not in tracking_data:
                                tracking_data[sender_id] = []
                            tracking_data[sender_id].append(tracking_number)
                            logger.debug(f"Row {row_idx}: Sender {sender_id} -> Tracking {tracking_number}")
                        else:
                            # Debug: log what we found in problematic rows
                            row_text = [cell.text.strip() for cell in cells[:5]]
                            logger.debug(f"Row {row_idx}: Incomplete data - {row_text}")
                            
                except Exception as e:
                    logger.warning(f"Error processing row {row_idx}: {str(e)}")
                    continue
            
            # Strategy 2: If table parsing failed, look for tracking numbers in any elements
            if not tracking_data:
                logger.info("Table parsing failed, trying alternative methods...")
                
                try:
                    # Find all elements that might contain tracking numbers
                    tracking_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'PH')]")
                    
                    for element in tracking_elements:
                        try:
                            text = element.text.strip()
                            # Extract tracking numbers using regex
                            tracking_numbers = re.findall(r'PH\d{11,}', text)
                            
                            for tracking in tracking_numbers:
                                # Try to find associated sender ID in the same row
                                try:
                                    parent_row = element.find_element(By.XPATH, "./ancestor::tr[1]")
                                    row_cells = parent_row.find_elements(By.TAG_NAME, "td")
                                    
                                    # Look for sender ID in first cell
                                    if len(row_cells) >= 1:
                                        first_cell = row_cells[0].text.strip()
                                        if first_cell.isdigit() and len(first_cell) >= 8:
                                            sender_id = first_cell
                                            
                                            if sender_id not in tracking_data:
                                                tracking_data[sender_id] = []
                                            if tracking not in tracking_data[sender_id]:
                                                tracking_data[sender_id].append(tracking)
                                            continue
                                    
                                    # Fallback: look for any long number in the row
                                    row_text = parent_row.text
                                    sender_matches = re.findall(r'\b\d{8,}\b', row_text)
                                    if sender_matches:
                                        sender_id = sender_matches[0]
                                        
                                        if sender_id not in tracking_data:
                                            tracking_data[sender_id] = []
                                        if tracking not in tracking_data[sender_id]:
                                            tracking_data[sender_id].append(tracking)
                                except:
                                    # If can't find sender ID, group under unknown
                                    if "UNKNOWN_SENDER" not in tracking_data:
                                        tracking_data["UNKNOWN_SENDER"] = []
                                    if tracking not in tracking_data["UNKNOWN_SENDER"]:
                                        tracking_data["UNKNOWN_SENDER"].append(tracking)
                        except:
                            continue
                except Exception as e:
                    logger.warning(f"Alternative tracking extraction failed: {str(e)}")
            
            # Log results
            if tracking_data:
                total_tracking = sum(len(tracks) for tracks in tracking_data.values())
                logger.info(f"Extracted {total_tracking} tracking numbers for {len(tracking_data)} senders")
                for sender, tracks in tracking_data.items():
                    logger.info(f"  Sender {sender}: {len(tracks)} tracking numbers")
            else:
                logger.warning("No tracking numbers found on this page")
            
        except Exception as e:
            logger.error(f"Error extracting tracking numbers: {str(e)}")
        
        return tracking_data
    
    def check_for_next_page(self):
        """Check if there's a next page and navigate to it"""
        try:
            # Strategy 1: Look for active page number and total pages
            try:
                # Find current page number from active pagination item
                active_page_elem = self.driver.find_element(By.XPATH, "//li[contains(@class, 'pager-item') and contains(@class, 'active')]")
                current_page = int(active_page_elem.text.strip())
                
                # Find all page number elements to determine max page
                page_elements = self.driver.find_elements(By.XPATH, "//li[contains(@class, 'pager-item')]")
                max_page = 1
                
                for elem in page_elements:
                    try:
                        page_text = elem.text.strip()
                        if page_text.isdigit():
                            page_num = int(page_text)
                            max_page = max(max_page, page_num)
                    except:
                        continue
                
                logger.info(f"Pagination: Current page {current_page}, Max page {max_page}")
                
                # If we're not on the last page, try to click next page
                if current_page < max_page:
                    next_page_num = current_page + 1
                    
                    # Try to click the specific next page number
                    try:
                        next_page_elem = self.driver.find_element(By.XPATH, f"//li[contains(@class, 'pager-item') and text()='{next_page_num}']")
                        if next_page_elem.is_enabled() and next_page_elem.is_displayed():
                            logger.info(f"Clicking page number {next_page_num}")
                            next_page_elem.click()
                            time.sleep(4)  # Wait for page to load
                            return True
                    except:
                        # Fallback: try clicking the next button
                        try:
                            next_button = self.driver.find_element(By.XPATH, "//span[contains(@class, 'pager-next') and not(contains(@class, 'disabled'))]")
                            if next_button.is_enabled() and next_button.is_displayed():
                                logger.info(f"Clicking next button to go to page {next_page_num}")
                                next_button.click()
                                time.sleep(4)
                                return True
                        except:
                            pass
                
                logger.info(f"Already on last page ({current_page}/{max_page})")
                return False
                
            except Exception as e:
                logger.warning(f"Page number detection failed: {str(e)}")
            
            # Strategy 2: Look for total count in pagination
            try:
                total_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), 'Total ')]")
                for elem in total_elements:
                    text = elem.text.strip()
                    if "Total " in text:
                        # Extract total count like "Total 59"
                        import re
                        total_match = re.search(r'Total\s+(\d+)', text)
                        if total_match:
                            total_items = int(total_match.group(1))
                            
                            # Get items per page (default 24)
                            items_per_page = 24
                            per_page_elements = self.driver.find_elements(By.XPATH, "//*[contains(text(), '/ Page')]")
                            for per_page_elem in per_page_elements:
                                per_page_text = per_page_elem.text.strip()
                                per_page_match = re.search(r'(\d+)\s*\/\s*Page', per_page_text)
                                if per_page_match:
                                    items_per_page = int(per_page_match.group(1))
                                    break
                            
                            # Calculate total pages
                            import math
                            total_pages = math.ceil(total_items / items_per_page)
                            logger.info(f"Found total items: {total_items}, items per page: {items_per_page}, total pages: {total_pages}")
                            
                            # Get current page from URL or active element
                            current_page = 1
                            try:
                                active_elem = self.driver.find_element(By.XPATH, "//li[contains(@class, 'active')]")
                                current_page = int(active_elem.text.strip())
                            except:
                                pass
                            
                            if current_page < total_pages:
                                # Try to go to next page
                                next_page = current_page + 1
                                try:
                                    next_page_elem = self.driver.find_element(By.XPATH, f"//li[contains(@class, 'pager-item') and text()='{next_page}']")
                                    logger.info(f"Clicking page {next_page} (calculated from total)")
                                    next_page_elem.click()
                                    time.sleep(4)
                                    return True
                                except:
                                    # Try next button
                                    try:
                                        next_button = self.driver.find_element(By.XPATH, "//span[contains(@class, 'pager-next') and not(contains(@class, 'disabled'))]")
                                        logger.info(f"Clicking next button (calculated from total)")
                                        next_button.click()
                                        time.sleep(4)
                                        return True
                                    except:
                                        pass
                            else:
                                logger.info(f"On last page ({current_page}/{total_pages})")
                                return False
                            break
            except Exception as e:
                logger.warning(f"Total count detection failed: {str(e)}")
            
            # Strategy 3: Check for enabled next button
            try:
                next_button = self.driver.find_element(By.XPATH, "//span[contains(@class, 'pager-next') and not(contains(@class, 'disabled'))]")
                if next_button.is_enabled() and next_button.is_displayed():
                    # Additional check - make sure it's not disabled by class
                    class_attr = next_button.get_attribute("class") or ""
                    if "disabled" not in class_attr.lower():
                        logger.info("Found enabled next button")
                        next_button.click()
                        time.sleep(4)
                        return True
                    else:
                        logger.info("Next button found but disabled")
                        return False
            except:
                pass
            
            logger.info("No more pages available")
            return False
            
        except Exception as e:
            logger.warning(f"Error checking for next page: {str(e)}")
            return False
    
    def process_receive_task_detail(self, task_id):
        """Process a single receive task detail page with pagination support"""
        try:
            detail_url = f"https://sp.spx.shopee.ph/inbound-management/receive-task/detail/{task_id}"
            logger.info(f"Processing task: {task_id}")
            self.driver.get(detail_url)
            
            # Wait for page load
            time.sleep(5)
            
            all_tracking_data = {}
            page_number = 1
            
            while True:
                logger.info(f"Processing page {page_number} for task {task_id}")
                
                # Extract tracking numbers from current page
                page_tracking_data = self.get_tracking_numbers_from_page()
                
                if page_tracking_data:
                    # Merge with overall data
                    for sender_id, tracking_list in page_tracking_data.items():
                        if sender_id not in all_tracking_data:
                            all_tracking_data[sender_id] = []
                        
                        # Add unique tracking numbers
                        for tracking in tracking_list:
                            if tracking not in all_tracking_data[sender_id]:
                                all_tracking_data[sender_id].append(tracking)
                    
                    logger.info(f"Page {page_number}: Found tracking data for {len(page_tracking_data)} senders")
                else:
                    logger.warning(f"No tracking data found on page {page_number}")
                
                # Try to go to next page
                if not self.check_for_next_page():
                    logger.info(f"No more pages for task {task_id}")
                    break
                
                page_number += 1
                
                # Safety limit to prevent infinite loops
                if page_number > 50:
                    logger.warning(f"Reached page limit (50) for task {task_id}")
                    break
            
            # Convert tracking lists to counts
            sender_data = {}
            for sender_id, tracking_list in all_tracking_data.items():
                sender_data[sender_id] = len(tracking_list)
                logger.info(f"Sender {sender_id}: {len(tracking_list)} tracking numbers")
            
            if not sender_data:
                logger.warning(f"No tracking data extracted for {task_id}, using fallback")
                sender_data["NO_DATA"] = 0
            
            return sender_data
            
        except Exception as e:
            logger.error(f"Error processing task detail {task_id}: {str(e)}")
            return {"ERROR": 0}
    
    def audit_all_tasks(self, max_tasks=None, specific_task=None):
        """Main method to audit all receive tasks with proper tracking number counting and status filtering"""
        try:
            if not self.setup_driver():
                return False
            
            # Step 1: Open SPX homepage for login
            if not self.open_spx_homepage():
                return False
            
            # Step 2: Navigate to receive tasks page
            if not self.navigate_to_receive_tasks():
                return False
            
            # Step 3: Handle specific task processing or scan all tasks
            if specific_task:
                logger.info(f"Processing specific task: {specific_task}")
                tasks_data = [{"task_id": specific_task, "complete_time": "N/A", "status": "Done"}]
            else:
                # Scan and extract tasks (only Done status tasks will be included)
                tasks_data = self.scan_and_extract_tasks()
                
                if not tasks_data:
                    print("\n❌ Could not extract any tasks with 'Done' status.")
                    return False
                
                # Limit tasks if specified
                if max_tasks:
                    tasks_data = tasks_data[:max_tasks]
                    logger.info(f"Limited to first {max_tasks} tasks for testing")
            
            logger.info(f"Starting audit of {len(tasks_data)} tasks with 'Done' status")
            
            # Process each task
            for i, task_info in enumerate(tasks_data, 1):
                try:
                    task_id = task_info["task_id"]
                    complete_time = task_info["complete_time"]
                    status = task_info["status"]
                    
                    logger.info(f"Processing task {i}/{len(tasks_data)}: {task_id} (Status: {status})")
                    
                    # Process task detail with pagination
                    sender_data = self.process_receive_task_detail(task_id)
                    
                    if sender_data:
                        task_audit = {
                            "receive_task_id": task_id,
                            "complete_time": complete_time,
                            "status": status,
                            "sender_data": sender_data,
                            "total_quantity": sum(sender_data.values()),
                            "sender_count": len(sender_data),
                            "processed_at": datetime.now().isoformat()
                        }
                        self.audit_data.append(task_audit)
                        
                        logger.info(f"Task {task_id}: {len(sender_data)} senders, {sum(sender_data.values())} total tracking numbers")
                    
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
                        "status": task["status"],
                        "sender_id": sender_id,
                        "tracking_count": quantity,
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
                            "status": task["status"],
                            "sender_id": sender_id,
                            "tracking_count": quantity,
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
                        "status": task["status"],
                        "total_senders": len(task["sender_data"]),
                        "total_tracking_numbers": task["total_quantity"],
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
    
    def export_all_formats(self, base_filename="spx_audit_data_fixed"):
        """Export data to all formats"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        success = True
        success &= self.export_to_json(f"{base_filename}_{timestamp}.json")
        success &= self.export_to_csv(f"{base_filename}_{timestamp}.csv")
        success &= self.export_to_excel(f"{base_filename}_{timestamp}.xlsx")
        
        return success

def main():
    """Main execution function"""
    print("SPX Shopee Receive Task Audit Automation (FIXED - Status Checking + Tracking Count)")
    print("=" * 80)
    print("✨ NEW FEATURES:")
    print("  • Only processes tasks with 'Done' status")
    print("  • Skips tasks with 'Pending', 'Failed', or other non-Done status")
    print("  • Correctly counts tracking numbers per sender ID")
    print("  • Handles pagination to process all pages of each receive task")
    print("=" * 80)
    
    # Configuration
    headless = False
    max_tasks = None
    specific_task = None
    
    # Ask user for configuration
    try:
        print("\n🔧 Configuration Options:")
        response = input("Do you want to run in test mode (process only first 2 tasks)? (y/n): ").strip().lower()
        if response == 'y':
            max_tasks = 2
            print("✅ Running in test mode - will process only 2 tasks with 'Done' status")
        
        # Option to process specific task
        specific_response = input("\nDo you want to process a specific task ID? (y/n): ").strip().lower()
        if specific_response == 'y':
            task_id = input("Enter the task ID (e.g., DRT2025080401VEC): ").strip()
            if task_id:
                specific_task = task_id
                print(f"✅ Will process specific task: {specific_task}")
                max_tasks = None  # Override test mode for specific task
        
    except:
        pass
    
    # Create automation instance
    automation = SPXAuditAutomationFixed(headless=headless)
    
    try:
        print(f"\n🚀 Starting automation with status checking and accurate tracking counting...")
        if specific_task:
            print(f"🎯 Target: {specific_task}")
        elif max_tasks:
            print(f"🧪 Test mode: Processing first {max_tasks} tasks with 'Done' status")
        else:
            print("📋 Full mode: Processing all tasks with 'Done' status")
            
        success = automation.audit_all_tasks(max_tasks=max_tasks, specific_task=specific_task)
        
        if success and automation.audit_data:
            print(f"\n✅ Audit completed successfully!")
            print(f"📊 Processed {len(automation.audit_data)} tasks")
            
            # Export data
            print("\n📁 Exporting corrected data to files...")
            automation.export_all_formats()
            
            # Print summary
            total_tracking_numbers = sum(task["total_quantity"] for task in automation.audit_data)
            total_senders = sum(task["sender_count"] for task in automation.audit_data)
            
            print(f"\n📈 Summary:")
            print(f"   • Total tasks processed: {len(automation.audit_data)}")
            print(f"   • Total tracking numbers counted: {total_tracking_numbers}")
            print(f"   • Total sender entries: {total_senders}")
            
            # Show file locations
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            print(f"\n📄 Generated files:")
            print(f"   • spx_audit_data_fixed_{timestamp}.xlsx")
            print(f"   • spx_audit_data_fixed_{timestamp}.csv")
            print(f"   • spx_audit_data_fixed_{timestamp}.json")
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
