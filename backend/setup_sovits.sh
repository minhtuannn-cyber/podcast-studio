#!/bin/bash
echo "🎙️ Bắt đầu cài đặt GPT-SoVITS cho PodStudio (macOS Apple Silicon)..."

# Kiểm tra Homebrew
if ! command -v brew &> /dev/null
then
    echo "❌ Không tìm thấy Homebrew. Vui lòng cài đặt Homebrew trước."
    exit 1
fi

echo "📦 Đang cài đặt ffmpeg..."
brew install ffmpeg

cd "$(dirname "$0")"
mkdir -p gpt_sovits_service
cd gpt_sovits_service

if [ ! -d "GPT-SoVITS" ]; then
    echo "📥 Đang clone repository GPT-SoVITS..."
    git clone https://github.com/RVC-Boss/GPT-SoVITS.git
fi

cd GPT-SoVITS

echo "🐍 Đang tạo môi trường ảo Python (venv)..."
python3 -m venv venv
source venv/bin/activate

echo "📦 Đang cài đặt các thư viện lõi..."
pip install --upgrade pip
pip install -r requirements.txt

echo "🍎 Đang cài đặt PyTorch cho macOS (MPS)..."
pip install torch torchvision torchaudio

echo "⬇️ Đang tải các pretrained model (Cần kết nối mạng tốt)..."
# Tải NLTK data
python -m nltk.downloader averaged_perceptron_tagger_eng

# Note: Download models can take a very long time. We will use a python script to download them via huggingface_hub
cat << 'EOF' > download_models.py
from huggingface_hub import snapshot_download
import os

print("Downloading Chinese RoBERTa...")
snapshot_download(repo_id="hfl/chinese-roberta-wwm-ext-large", local_dir="tools/bert", allow_patterns=["*.json", "*.bin", "*.txt"])

print("Downloading Hubert...")
snapshot_download(repo_id="TencentGameMate/chinese-hubert-base", local_dir="tools/cnhubert", allow_patterns=["*.pt", "*.json"])

print("Downloading GPT-SoVITS Pretrained Models...")
snapshot_download(repo_id="lj1995/GPT-SoVITS", local_dir="GPT_SoVITS/pretrained_models")
print("All models downloaded successfully!")
EOF

pip install huggingface_hub
python download_models.py

echo "✅ Cài đặt hoàn tất! Để chạy API server, hãy sử dụng script start_sovits.sh"
