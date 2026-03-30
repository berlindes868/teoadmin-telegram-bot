<!-- Telegram Bot Project Instructions -->

# Telegram Data Extraction Bot - Setup Instructions

## Project Overview
A Python-based Telegram bot that automatically scrapes data from websites and sends notifications to Telegram groups.

## Setup Checklist

- [x] Verify that the copilot-instructions.md file in the .github directory is created.
- [x] Clarify Project Requirements
  - Language: Python
  - Main Libraries: python-telegram-bot, beautifulsoup4, requests
  - Purpose: Web scraping and Telegram notification bot
- [x] Scaffold the Project
  - Project structure created with src/, config/, logs/ directories
  - All core modules created

## Installation Steps

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env`
   - Fill in your Telegram Bot Token
   - Fill in your Group Chat ID
   - Set target URL and CSS selector

3. **Run the bot:**
   ```bash
   python src/bot.py
   ```

## File Structure

```
bot/
├── src/
│   ├── bot.py           - Main bot class
│   ├── scraper.py       - Web scraper module
│   └── __init__.py      - Package init
├── config/
│   ├── config.py        - Configuration management
│   └── __init__.py      - Package init
├── logs/                - Log files output
├── .github/
│   └── copilot-instructions.md
├── .env.example         - Environment variables template
├── .gitignore           - Git ignore rules
├── requirements.txt     - Python dependencies
└── README.md           - Full documentation
```

## Customization

### Change Website Target
Edit `.env`:
```
TARGET_URL=https://your-target-website.com
EXTRACT_SELECTOR=.article-list  # CSS selector for data
```

### Change Extraction Schedule
Edit `.env`:
```
EXTRACTION_INTERVAL=1800  # Run every 30 minutes (in seconds)
```

### Add More Data Attributes
Edit `src/scraper.py` - modify `self.scraper_config['attributes']`

## Debugging

Enable debug logging:
```
LOG_LEVEL=DEBUG
```

Check logs:
```bash
tail -f logs/bot.log
```

## Next Steps

1. Get Telegram Bot Token from @BotFather
2. Find your Group Chat ID
3. Set environment variables in `.env`
4. Test with `python src/bot.py`
5. Deploy to server (optional)
