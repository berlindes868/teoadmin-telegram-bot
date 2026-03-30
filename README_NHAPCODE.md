# Telegram Data Extraction Bot - nhapcode8k.com

Bot Telegram tự động trích xuất danh sách tài khoản nhập code thành công từ nhapcode8k.com/manage và gửi vào nhóm Telegram.

## Tính năng

- 🕷️ Trích xuất dữ liệu từ website nhapcode tự động
- 📨 Gửi thông báo khi có người tham gia nhập code thành công
- 🔄 Kiểm tra cập nhật mỗi 30 giây
- 📊 Nhóm dữ liệu theo loại code (18k, 28k, 38k, v.v.)
- 🗑️ Tự động xóa dữ liệu không cần thiết
- 📝 Ghi log chi tiết
- ⚙️ Cấu hình linh hoạt qua .env

## Yêu cầu

- Python 3.8+
- Telegram Bot Token (lấy từ @BotFather)
- Group ID của nhóm Telegram (đã được cành -5176953753)
- Tài khoản nhapcode8k (username: berlin, password: berlin)

## Cài đặt

### 1. Tạo virtual environment

```bash
# Tạo virtual environment
python -m venv venv

# Kích hoạt virtual environment (Windows)
venv\Scripts\Activate.ps1

# Kích hoạt virtual environment (macOS/Linux)
source venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

### 2. Cấu hình

File `.env` đã được tạo với các giá trị mặc định:

```
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_GROUP_ID=-5176953753
TARGET_URL=https://nhapcode8k.com/manage
WEBSITE_USERNAME=berlin
WEBSITE_PASSWORD=berlin
EXTRACTION_INTERVAL=30
LOG_LEVEL=INFO
```

**Bước quan trọng:** Thay `TELEGRAM_BOT_TOKEN` bằng token từ @BotFather

### 3. Lấy Telegram Bot Token

1. Mở Telegram, nhắn @BotFather
2. Gõ `/newbot` để tạo bot mới
3. Đặt tên và username cho bot
4. Sao chép token nhận được
5. Dán vào file `.env` (thay `your_bot_token_here`)

## Cách sử dụng

### Chạy bot

```bash
# Đảm bảo đã kích hoạt virtual environment
venv\Scripts\Activate.ps1

# Chạy bot
python src/bot.py
```

### Kết quả

Bot sẽ:
1. ✅ Đăng nhập vào nhapcode8k.com/manage
2. ✅ Kiểm tra danh sách code + người tham gia mỗi 30 giây
3. ✅ Gửi thông báo vào nhóm Telegram khi có người mới
4. ✅ Nhóm dữ liệu theo loại code

### Format thông báo

Khi có người nhập code, bot gửi tin nhắn theo format:

```
📊 Danh sách tham gia nhập code
🕐 10:30:45 29/03/2026
════════════════════════════════════════

+18k-tgcode
• Tên người tham gia 1
• Tên người tham gia 2

+28k-tgcode
• Tên người tham gia 3

+38k-tgcode
• Tên người tham gia 4
• Tên người tham gia 5
```

## Cấu trúc project

```
bot/
├── src/
│   ├── bot.py           # Main bot logic
│   ├── scraper.py       # Web scraper module
│   └── __init__.py
├── config/
│   ├── config.py        # Configuration
│   └── __init__.py
├── logs/                # Log files
├── .env                 # Environment config (ĐÃ TẠO)
├── .env.example         # Environment template
├── requirements.txt     # Python dependencies
└── README.md           # This file
```

## Troubleshooting

### Bot không gửi được tin nhắn

Kiểm tra:
- `TELEGRAM_BOT_TOKEN` có đúng không
- Bot đã được thêm vào nhóm Telegram với quyền admin
- Kiểm tra logs: `Get-Content -Path logs/bot.log -Wait`

### Không khả dụng đăng nhập website

Kiểm tra:
- Website credentials có đúng không (berlin/berlin)
- Kết nối internet
- Xem logs để tìm lỗi chi tiết

### Xem logs chi tiết

```bash
# Windows PowerShell - xem logs real-time
Get-Content -Path logs/bot.log -Wait

# macOS/Linux
tail -f logs/bot.log
```

## Tùy chỉnh

### Thay đổi tần suất kiểm tra

Sửa `EXTRACTION_INTERVAL` trong `.env` (tính bằng giây):

```
EXTRACTION_INTERVAL=10  # Kiểm tra mỗi 10 giây
```

### Thay đổi mức độ chi tiết logs

Sửa `LOG_LEVEL` trong `.env`:

```
LOG_LEVEL=DEBUG   # Chi tiết nhất (debug)
LOG_LEVEL=INFO    # Thông thường (mặc định)
LOG_LEVEL=WARNING # Chỉ cảnh báo
```

## Lưu ý

- Bot chỉ gửi thông báo khi có dữ liệu mới (không gửi trùng lặp)
- Dữ liệu được sắp xếp theo loại code theo thứ tự tăng dần
- Logs được lưu trong thư mục `logs/bot.log`
- Cần đảm bảo bot được thêm vào nhóm với quyền admin

## FAQ

**Q: Bot không tìm thấy dữ liệu?**
A: Kiểm tra:
- Website username/password có đúng không
- Website có thay đổi layout không
- Xem logs để tìm lỗi

**Q: Bot gửi trùng lặp?**
A: Bot chỉ gửi khi dữ liệu thay đổi. Kiểm tra logs để xem chi tiết.

**Q: Muốn gửi vào nhóm khác?**
A: Thay đổi `TELEGRAM_GROUP_ID` trong `.env` bằng group ID mới.

**Q: Cách lấy group ID?**
A: Thêm bot vào nhóm, gửi tin nhắn, sau đó:
```bash
curl https://api.telegram.org/bot{TOKEN}/getUpdates
```
Tìm `"id": -10...` trong kết quả.

## Liên hệ

Nếu có vấn đề, xem logs trong `logs/bot.log` để tìm chi tiết lỗi.
