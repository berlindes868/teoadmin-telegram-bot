import logging
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Any
import re
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger(__name__)

class WebScraper:
    def __init__(self, config, username: str = "", password: str = ""):
        self.config = config
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        self.extracted_data = []
        self.is_logged_in = False

    def login(self, login_url: str) -> bool:
        """Login to the website"""
        try:
            login_data = {
                'username': self.username,
                'password': self.password
            }
            
            response = self.session.post(login_url, data=login_data, timeout=10)
            
            if response.status_code == 200:
                self.is_logged_in = True
                logger.info("Successfully logged in")
                return True
            else:
                logger.warning(f"Login failed with status code: {response.status_code}")
                return False
                
        except requests.RequestException as e:
            logger.error(f"Error during login: {e}")
            return False

    def fetch_page(self, url: str) -> str:
        """Fetch webpage content"""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            logger.error(f"Error fetching page {url}: {e}")
            return None

    def extract_code_data(self, html_content: str) -> Dict[str, List[str]]:
        """Extract code data grouped by code type"""
        if not html_content:
            return {}

        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Find the table
            table = soup.find('table')
            if not table:
                logger.warning("Table not found on page")
                return {}
            
            # Extract rows
            rows = table.find_all('tr')[1:]  # Skip header row
            
            # Group data by code
            code_groups = defaultdict(list)
            
            for row in rows:
                cells = row.find_all('td')
                if len(cells) >= 5:
                    # cells: STT, ID, Tên, CODE, Người tham gia, ...
                    code_cell = cells[3].get_text(strip=True)  # CODE column
                    participant_cell = cells[4].get_text(strip=True)  # Người tham gia column
                    
                    # Only add if there's a participant name (code was used)
                    if participant_cell and participant_cell != "Chưa sử dụng":
                        code_groups[code_cell].append(participant_cell)
            
            self.extracted_data = dict(code_groups)
            logger.info(f"Extracted {len(code_groups)} code groups with participants")
            return code_groups

        except Exception as e:
            logger.error(f"Error extracting code data: {e}")
            return {}

    def scrape(self, url: str) -> Dict[str, List[str]]:
        """Main scraping method"""
        html_content = self.fetch_page(url)
        if html_content:
            return self.extract_code_data(html_content)
        return {}

    def clear_extracted_data(self):
        """Clear extracted data after processing"""
        self.extracted_data = []
        logger.info("Extracted data cleared")

    def format_message(self, data: Dict[str, List[str]]) -> str:
        """Format extracted data into Telegram message"""
        if not data:
            return "No participants found"

        # Sort codes to show them in order
        sorted_codes = sorted(data.keys(), key=lambda x: (x.count('k'), x))
        
        message = f"📊 *Danh sách tham gia nhập code*\n"
        message += f"🕐 {datetime.now().strftime('%H:%M:%S %d/%m/%Y')}\n"
        message += "═" * 40 + "\n\n"

        for code in sorted_codes:
            message += f"*{code}*\n"
            participants = data[code]
            for participant in participants:
                message += f"• {participant}\n"
            message += "\n"

        return message.strip()
