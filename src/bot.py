import logging
import asyncio
from telegram import Bot
from telegram.error import TelegramError
from telegram.constants import ParseMode
from datetime import datetime
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.config import TELEGRAM_BOT_TOKEN, TELEGRAM_GROUP_ID, EXTRACTION_INTERVAL, TARGET_URL, LOG_FILE, LOG_LEVEL
from config.config import WEBSITE_USERNAME, WEBSITE_PASSWORD, validate_config
from src.scraper import WebScraper

# Setup logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self):
        validate_config()
        self.bot = Bot(token=TELEGRAM_BOT_TOKEN)
        self.group_id = TELEGRAM_GROUP_ID
        self.scraper = WebScraper(
            config={'target_url': TARGET_URL},
            username=WEBSITE_USERNAME,
            password=WEBSITE_PASSWORD
        )
        self.is_running = False
        self.previous_data = {}  # Store previous data to detect changes

    async def send_message(self, text: str) -> bool:
        """Send message to Telegram group"""
        try:
            await self.bot.send_message(
                chat_id=self.group_id,
                text=text,
                parse_mode=ParseMode.MARKDOWN,
                disable_web_page_preview=True
            )
            logger.info(f"Message sent successfully to group {self.group_id}")
            return True
        except TelegramError as e:
            logger.error(f"Error sending message to Telegram: {e}")
            return False

    def data_has_changed(self, new_data) -> bool:
        """Check if data has changed from previous extraction"""
        # Convert to comparable format
        new_str = str(sorted(new_data.items()))
        prev_str = str(sorted(self.previous_data.items()))
        
        has_changed = new_str != prev_str
        
        if has_changed:
            logger.info("Data has changed - will send notification")
        else:
            logger.debug("Data unchanged - skipping notification")
        
        return has_changed

    async def extract_and_notify(self):
        """Extract data from website and send notification if changed"""
        try:
            logger.info(f"Checking for updates from {TARGET_URL}")
            data = self.scraper.scrape(TARGET_URL)

            if data and self.data_has_changed(data):
                message = self.scraper.format_message(data)
                success = await self.send_message(message)

                if success:
                    self.previous_data = data.copy()
                    logger.info("Data updated after successful notification")
            elif not data:
                logger.warning("No participants found")

        except Exception as e:
            logger.error(f"Error in extract_and_notify: {e}")

    async def start_scheduler(self):
        """Run extraction task on schedule"""
        self.is_running = True
        logger.info(f"Bot scheduler started. Check interval: {EXTRACTION_INTERVAL} seconds")

        try:
            while self.is_running:
                await self.extract_and_notify()
                await asyncio.sleep(EXTRACTION_INTERVAL)
        except asyncio.CancelledError:
            logger.info("Scheduler stopped")
        except Exception as e:
            logger.error(f"Scheduler error: {e}")

    async def stop(self):
        """Stop the bot gracefully"""
        self.is_running = False
        logger.info("Bot stopping...")

async def main():
    """Main entry point"""
    bot = TelegramBot()

    try:
        logger.info("Starting Telegram Data Extraction Bot")
        logger.info(f"Target: {TARGET_URL}")
        logger.info(f"Group ID: {bot.group_id}")
        await bot.start_scheduler()
    except KeyboardInterrupt:
        logger.info("Received interrupt signal")
    except Exception as e:
        logger.error(f"Fatal error: {e}")
    finally:
        await bot.stop()

if __name__ == '__main__':
    asyncio.run(main())
