# 🎙️ PodStudio

Ứng dụng tạo Podcast từ văn bản với AI Voice (Microsoft Neural TTS).

## Tính năng

- ✅ Chuyển văn bản thành giọng nói AI (8 giọng Việt Nam)
- ✅ Giao diện block editor giống Vivibe
- ✅ Drag & Drop sắp xếp đoạn
- ✅ Chọn giọng nói cho từng đoạn
- ✅ Nghe thử giọng nói trước khi chọn
- ✅ 5 template nhạc nền có sẵn
- ✅ Xuất toàn bộ thành 1 file MP3 (có trộn nhạc nền)
- ✅ Paste tự động chia đoạn

## Cấu trúc

```
podcast-studio/
├── frontend/          # React + Vite
│   └── src/
│       ├── App.jsx    # Main component
│       └── App.css    # Styling
├── backend/           # Python FastAPI
│   ├── server.py      # API server
│   ├── generate_bgm.py # BGM generator
│   └── requirements.txt
└── README.md
```

## Cài đặt & Chạy

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python generate_bgm.py          # Tạo nhạc nền (chạy 1 lần)
uvicorn server:app --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:5173`

## Yêu cầu hệ thống

- Python 3.9+
- Node.js 18+
- ffmpeg (cho tính năng ghép audio)

## Tech Stack

- **Frontend**: React, Vite, Vanilla CSS
- **Backend**: FastAPI, edge-tts, pydub
- **TTS Engine**: Microsoft Neural TTS (miễn phí)
