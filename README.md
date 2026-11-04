# ONEFLOW — Teamwork Platform

**NUMBERONE K22 · IUH**  
*One Team. One Flow. One Goal.*

Ứng dụng React + TypeScript (Vite) hỗ trợ quản lý không gian làm việc nhóm, phân công nhiệm vụ, nộp bài, kiểm duyệt, ghi nhận ngoại lệ, thông báo họp khẩn và xuất báo cáo.

## Yêu cầu

- Node.js 20.19+ hoặc phiên bản tương thích với Vite hiện tại
- npm

## Cài đặt và chạy local

```bash
npm install
npm run dev
```

Mở URL Vite hiển thị trong terminal (thường là `http://localhost:5173`).

## Build kiểm tra

```bash
npm run build
npm run preview
```

## Cấu trúc thư mục

```text
oneflow-teamwork-platform/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx
│   ├── index.css
│   ├── App.tsx
│   ├── data/
│   │   └── initialData.ts
│   └── utils/
│       └── taskUtils.tsx
└── README.md
```

## Đưa lên GitHub

1. Tạo repository mới trên GitHub.
2. Giải nén bộ mã nguồn này.
3. Upload **toàn bộ nội dung bên trong thư mục** lên repository (không chỉ upload riêng `App.tsx`).
4. Chờ GitHub hoàn tất upload. Nếu dùng Git trên máy:

```bash
git init
git add .
git commit -m "Initial commit: ONEFLOW teamwork platform"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPOSITORY>.git
git push -u origin main
```

Thay `<YOUR_USERNAME>` và `<YOUR_REPOSITORY>` bằng thông tin repository thật.

## Lưu ý kỹ thuật quan trọng

- Dữ liệu hiện được lưu trong `localStorage`; phiên tab dùng `sessionStorage`.
- `BroadcastChannel` và sự kiện `storage` đồng bộ dữ liệu giữa các tab trên cùng trình duyệt.
- Đây **chưa phải đồng bộ đa thiết bị qua Internet** và chưa có backend/database dùng chung. Mỗi trình duyệt/máy có dữ liệu riêng.
- Dữ liệu demo trong `src/data/initialData.ts` là dữ liệu minh họa. Hãy thay tên, mã số sinh viên, thành viên, đường dẫn và thông tin demo trước khi triển khai thực tế.
- Không đưa thông tin cá nhân thật hoặc dữ liệu nhạy cảm lên repository công khai.
