import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = BASE_DIR / 'src'
LOGS_DIR = BASE_DIR / 'logs'

# Telegram Configuration
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_GROUP_ID = int(os.getenv('TELEGRAM_GROUP_ID', -5176953753))

# Website Configuration
TARGET_URL = os.getenv('TARGET_URL', 'https://nhapcode8k.com/manage')
WEBSITE_USERNAME = os.getenv('WEBSITE_USERNAME', 'berlin')
WEBSITE_PASSWORD = os.getenv('WEBSITE_PASSWORD', 'berlin')
EXTRACT_SELECTOR = os.getenv('EXTRACT_SELECTOR', 'table tbody tr')

# Schedule Configuration (in seconds) - Check every 30 seconds for new participants
EXTRACTION_INTERVAL = int(os.getenv('EXTRACTION_INTERVAL', 30))

# Logging Configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FILE = LOGS_DIR / 'bot.log'

# Validate required configuration
def validate_config():
    if not TELEGRAM_BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN is not set in .env file")
    if TELEGRAM_GROUP_ID == 0:
        raise ValueError("TELEGRAM_GROUP_ID is not set in .env file")
    if not TARGET_URL:
        raise ValueError("TARGET_URL is not set in .env file")
