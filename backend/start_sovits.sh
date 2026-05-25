#!/bin/bash
echo "🚀 Khởi động GPT-SoVITS API Server trên port 9880..."

cd "$(dirname "$0")/gpt_sovits_service/GPT-SoVITS"

if [ ! -d "venv" ]; then
    echo "❌ Chưa tìm thấy môi trường cài đặt. Vui lòng chạy bash setup_sovits.sh trước!"
    exit 1
fi

source venv/bin/activate

# Khởi động api.py
# Lưu ý: -d mps được sử dụng làm mặc định vì model MPS trên Mac có thể bị lỗi với một số pipeline. Bạn có thể thử đổi thành -d mps nếu cấu hình mạnh.
python api.py -a 127.0.0.1 -p 9880 -d mps
