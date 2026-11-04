import React, { useState, useEffect, useMemo, useRef } from 'react';

import {
  Shield,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Send,
  FileText,
  Download,
  Printer,
  Radio,
  Plus,
  ExternalLink,
  Award,
  RefreshCw,
  LogOut,
  Crown,
  UserCheck,
  History,
  Sparkles,
  Link2,
  Check,
  X,
  Copy,
  Layers,
  Terminal,
  Flame,
  Filter,
  Search,
  ChevronRight,
  Info,
  FolderGit2,
  HardDrive,
  FileCode2,
  Presentation,
} from 'lucide-react';

import {
  BRAND,
  STORAGE_KEY_WORKSPACES,
  SESSION_KEY_ACTIVE_WS,
  SESSION_KEY_ACTIVE_MEMBER,
  CHANNEL_NAME,
  createInitialDemoWorkspace,
} from './data/initialData';

import {
  formatDateTime,
  getEffectiveTaskStatus,
  getCategoryMeta,
  getRoleBadge,
} from './utils/taskUtils';

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // --- STATES ---
  const [workspaces, setWorkspaces] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WORKSPACES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Lỗi parse danh sách không gian làm việc:', e);
      }
    }
    return [createInitialDemoWorkspace()];
  });

  const [activeWsId, setActiveWsId] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY_ACTIVE_WS) || workspaces[0]?.id || '';
  });

  const [activeMemberId, setActiveMemberId] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY_ACTIVE_MEMBER) || workspaces[0]?.members[0]?.id || '';
  });

  // --- DERIVED STATES ---
  const currentWs = useMemo(() => {
    return workspaces.find((w: any) => w.id === activeWsId) || workspaces[0];
  }, [workspaces, activeWsId]);

  const currentMember = useMemo(() => {
    if (!currentWs) return null;
    return currentWs.members.find((m: any) => m.id === activeMemberId) || currentWs.members[0];
  }, [currentWs, activeMemberId]);

  // Đồng bộ LocalStorage & SessionStorage khi có thay đổi
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(workspaces));
  }, [workspaces]);

  useEffect(() => {
    if (activeWsId) sessionStorage.setItem(SESSION_KEY_ACTIVE_WS, activeWsId);
  }, [activeWsId]);

  useEffect(() => {
    if (activeMemberId) sessionStorage.setItem(SESSION_KEY_ACTIVE_MEMBER, activeMemberId);
  }, [activeMemberId]);

  // Tránh lỗi crash nếu không tìm thấy dữ liệu hợp lệ
  if (!currentWs || !currentMember) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
          <p className="text-lg font-medium">Không tìm thấy dữ liệu không gian làm việc hợp lệ.</p>
          <button
            onClick={() => {
              localStorage.removeItem(STORAGE_KEY_WORKSPACES);
              sessionStorage.clear();
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
          >
            Khởi tạo lại dữ liệu mẫu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
              {BRAND.name}
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{BRAND.version} • {BRAND.codename}</p>
          </div>
        </div>

        {/* WORKSPACE SELECTION & USER INFO */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">{currentMember.name}</span>
              {getRoleBadge(currentMember.role)}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{currentWs.name}</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 shadow-inner">
            {currentMember.name.charAt(0)}
          </div>
        </div>
      </header>

      {/* DASHBOARD CONTENT BODY */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 gap-6">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                Bảng quản lý công việc
              </h2>
              <p className="text-xs text-slate-400">Theo dõi tiến độ, danh mục kỹ thuật Figma, GitHub, CAD, Slide trên hệ thống</p>
            </div>
          </div>

          {/* TASK LIST PLACEHOLDER / LIST RENDERING */}
          <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-950/40">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-800 text-xs font-mono text-slate-400 uppercase tracking-wider">
                  <th className="p-4">Tên công việc</th>
                  <th className="p-4">Phân loại</th>
                  <th className="p-4">Hạn chót</th>
                  <th className="p-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {currentWs.tasks && currentWs.tasks.length > 0 ? (
                  currentWs.tasks.map((task: any) => {
                    const meta = getCategoryMeta(task.category);
                    const TaskIcon = meta.icon;
                    return (
                      <tr key={task.id} className="hover:bg-slate-900/30 transition-colors group">
                        <td className="p-4 font-medium text-slate-200 group-hover:text-white">
                          {task.title}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${meta.color}`}>
                            <TaskIcon className="w-3.5 h-3.5" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-400">
                          {formatDateTime(task.deadline)}
                        </td>
                        <td className="p-4">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {getEffectiveTaskStatus(task)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-sm text-slate-500 font-mono">
                      Không có công việc nào trong không gian này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
