# Tích hợp GPT-SoVITS vào PodStudio

GPT-SoVITS là một trong những mô hình chuyển đổi văn bản thành giọng nói (TTS) mã nguồn mở mạnh mẽ nhất hiện nay. Khác với `edge-tts` (đọc theo quy tắc có sẵn), GPT-SoVITS sử dụng AI Few-shot Voice Cloning để sao chép y hệt ngữ điệu, cảm xúc và chất giọng của một người thật chỉ từ một đoạn audio mẫu dài 3-10 giây.

Dưới đây là kế hoạch chi tiết để tích hợp GPT-SoVITS vào hệ thống PodStudio của chúng ta.

## ⚠️ User Review Required

> [!WARNING]
> **Yêu cầu phần cứng:** GPT-SoVITS là một mô hình Deep Learning khá nặng. Trên máy Mac, nó có thể chạy trên CPU (chậm) hoặc Apple Silicon GPU (nhanh hơn nhưng cài đặt phức tạp). Việc tích hợp sẽ khiến ứng dụng của bạn nặng hơn đáng kể và yêu cầu tải về vài GB model weights.

> [!IMPORTANT]
> **Mô hình triển khai:** GPT-SoVITS không thể cài chung với backend hiện tại dễ dàng do xung đột thư viện (yêu cầu Python 3.10, PyTorch bản đặc biệt). Chúng ta sẽ phải chạy nó như một **Microservice độc lập**.

## ❓ Open Questions

1. **Cách tiếp cận Giọng Đọc (Voice):** Bạn muốn hệ thống có các giọng GPT-SoVITS được tạo sẵn (chúng ta sẽ thu âm trước vài đoạn mẫu làm template), HAY bạn muốn thêm tính năng "Clone Giọng Của Bạn" (Upload file ghi âm 5 giây lên để AI đọc theo giọng đó)?
2. **Ngôn ngữ:** GPT-SoVITS hiện tại hỗ trợ tốt nhất là Tiếng Trung, Tiếng Nhật, Tiếng Anh. Phiên bản tiếng Việt (Vietnamese) hiện chưa có model pretrained chính thức mạnh mẽ như các ngôn ngữ kia, mà phải dùng cross-lingual (cho model Anh/Trung đọc tiếng Việt). Bạn có chấp nhận thử nghiệm chất lượng cross-lingual này không?

## 🛠️ Proposed Changes

### 1. Kiến trúc Hệ thống (Architecture)
Thay vì chỉ có 1 backend như hiện tại, hệ thống sẽ gồm 3 phần:
- **Frontend (Vite/React):** Chạy trên port 5173.
- **Main Backend (FastAPI):** Chạy trên port 8000. Đóng vai trò là cầu nối.
- **GPT-SoVITS API Server:** Chạy trên port 9880 (cần clone repo GPT-SoVITS riêng và chạy `api.py`).

### 2. Backend (FastAPI - `server.py`)
- Mở rộng hàm `generate_audio` trong `/api/preview`.
- Nếu `voiceId` thuộc loại `edge-tts` (như Hoài My), tiếp tục dùng code cũ.
- Nếu `voiceId` thuộc loại `gpt-sovits`, backend sẽ thực hiện request HTTP `GET/POST` tới `http://127.0.0.1:9880` với các tham số:
  - `text`: Nội dung cần đọc.
  - `text_language`: `vi` (hoặc `en` tùy ngôn ngữ).
  - `prompt_text`: Văn bản của đoạn audio mẫu.
  - `prompt_language`: Ngôn ngữ của đoạn audio mẫu.
  - `prompt_audio`: Đường dẫn tới file audio mẫu.

#### [MODIFY] [backend/server.py](file:///Users/nnminhtuan/.gemini/antigravity/scratch/podcast-studio/backend/server.py)
- Thêm biến môi trường `GPT_SOVITS_URL = "http://127.0.0.1:9880"`
- Viết hàm `generate_with_gpt_sovits()` sử dụng `httpx` hoặc `requests` để gọi API.

### 3. Cài đặt GPT-SoVITS (Thủ công)
Do GPT-SoVITS rất lớn, tôi sẽ tạo một script `setup_sovits.sh` để:
1. Clone repo `RVC-Boss/GPT-SoVITS`.
2. Tạo Conda environment (Python 3.10).
3. Cài đặt các thư viện `torch`, `torchaudio` hỗ trợ MPS cho Mac.
4. Tải các pretrained models (Hubert, VITS) vào đúng thư mục.

#### [NEW] [backend/setup_sovits.sh](file:///Users/nnminhtuan/.gemini/antigravity/scratch/podcast-studio/backend/setup_sovits.sh)
- Chứa các lệnh shell tự động hóa quá trình cài đặt phức tạp này.

### 4. Frontend (App.jsx)
- Cập nhật biến `VOICE_PRESETS` để thêm các tuỳ chọn giọng GPT-SoVITS.
- (Tùy chọn) Thêm một giao diện nhỏ ở tab "Giọng nói của bạn" cho phép tải lên file `.wav` mẫu và nhập văn bản gốc để tự tạo Voice Template mới.

#### [MODIFY] [frontend/src/App.jsx](file:///Users/nnminhtuan/.gemini/antigravity/scratch/podcast-studio/frontend/src/App.jsx)
- Thêm tag hiển thị engine: "[Edge-TTS]" hoặc "[GPT-SoVITS]" bên cạnh tên giọng nói để người dùng dễ phân biệt.

## 🧪 Verification Plan

1. **Cài đặt:** Chạy thử `setup_sovits.sh` và đảm bảo `api.py` của GPT-SoVITS start thành công trên port 9880 mà không báo lỗi.
2. **Kết nối API:** Viết một script python nhỏ gọi thử port 9880 để xem AI có sinh ra file audio `.wav` hợp lệ không.
3. **Tích hợp:** Chọn một giọng GPT-SoVITS trên giao diện Web, bấm "Tạo Audio", kiểm tra xem quá trình gọi chéo giữa React -> FastAPI -> GPT-SoVITS có hoạt động trơn tru và trả về file MP3 hay không.
4. **Đánh giá chất lượng:** Nghe thử file âm thanh để xác định độ tự nhiên của nhịp điệu so với Microsoft Edge-TTS.
