# Telegram Data Extraction Bot

Một bot Telegram tự động trích xuất dữ liệu từ website và gửi thông báo vào nhóm Telegram.

## Tính năng

- 🕷️ Trích xuất dữ liệu từ website tự động
- 📨 Gửi thông báo vào nhóm Telegram
- ⏱️ Chạy theo lịch biểu tùy chỉnh
- 🗑️ Xóa dữ liệu sau khi xử lý
- 📝 Ghi log chi tiết
- ⚙️ Cấu hình linh hoạt qua .env

## Yêu cầu

- Python 3.8+
- Telegram Bot Token (lấy từ @BotFather)
- Group ID của nhóm Telegram

## Cài đặt

### 1. Clone và cấu hình môi trường

```bash
# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment
# On Windows
venv\Scripts\activate
# On macOS/Linux
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

### 2. Cấu hình

Sao chép `.env.example` thành `.env` và điền thông tin:

```bash
cp .env.example .env
```

Chỉnh sửa `.env`:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_GROUP_ID=your_group_id_here
TARGET_URL=https://example.com
EXTRACT_SELECTOR=.data-element
EXTRACTION_INTERVAL=3600
LOG_LEVEL=INFO
```

### 3. Tìm Group ID của Telegram

1. Thêm bot vào nhóm Telegram
2. Gửi bất kỳ tin nhắn nào vào nhóm
3. Chạy lệnh:
```bash
curl https://api.telegram.org/bot{YOUR_TOKEN}/getUpdates
```
4. Tìm `"id": -100...` trong Group Chat

## Sử dụng

### Chạy bot

```bash
python src/bot.py
```

### Tùy chỉnh CSS Selector

Mở `.env` và thay đổi `EXTRACT_SELECTOR` để matchwebsite target của bạn:

```
# Ví dụ: trích xuất tất cả tiêu đề h2
EXTRACT_SELECTOR=h2

# Ví dụ: trích xuất từ class cụ thể
EXTRACT_SELECTOR=.article-title

# Ví dụ: trích xuất từ id cụ thể
EXTRACT_SELECTOR=#main-content
```

### Điều chỉnh chu kỳ

Thay đổi `EXTRACTION_INTERVAL` (tính bằng giây):

```
EXTRACTION_INTERVAL=1800  # Chạy mỗi 30 phút
```

## Cấu trúc project

```
bot/
├── src/
│   ├── bot.py           # Main bot logic
│   └── scraper.py       # Web scraper module
├── config/
│   └── config.py        # Configuration
├── logs/                # Log files
├── .github/
│   └── copilot-instructions.md
├── .env.example         # Environment template
├── .gitignore
├── requirements.txt
└── README.md
```

## Troubleshooting

### Bot không gửi được tin nhắn

- Kiểm tra `TELEGRAM_BOT_TOKEN` có đúng không
- Kiểm tra `TELEGRAM_GROUP_ID` có đúng không
- Chắc chắn bot đã được thêm vào nhóm với quyền admin

### Không trích xuất được dữ liệu

- Kiểm tra `TARGET_URL` có đúng không
- Kiểm tra `EXTRACT_SELECTOR` có đúng không (dùng DevTools browser)
- Xem logs để tìm lỗi chi tiết

### Lỗi parse_mode không hỗ trợ

- Cập nhật `python-telegram-bot` lên phiên bản 20.0+

## Logs

Logs được lưu trong thư mục `logs/`:

```bash
# Xem logs real-time
tail -f logs/bot.log
```

## Liên hệ

Nếu có thắc mắc, vui lòng tạo issue hoặc liên hệ hỗ trợ.
