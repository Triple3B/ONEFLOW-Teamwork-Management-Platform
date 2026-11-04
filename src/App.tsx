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
  Figma,
  HardDrive,
  FileCode2,
  Presentation
} from 'lucide-react';

import { BRAND, STORAGE_KEY_WORKSPACES, SESSION_KEY_ACTIVE_WS, SESSION_KEY_ACTIVE_MEMBER, CHANNEL_NAME, createInitialDemoWorkspace } from './data/initialData';
import { formatDateTime, getEffectiveTaskStatus, getCategoryMeta, getRoleBadge } from './utils/taskUtils';

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  // 1. State for all workspaces persisted in localStorage
  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORKSPACES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load workspaces:', e);
    }
    const initial = [createInitialDemoWorkspace()];
    localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(initial));
    return initial;
  });

  // 2. Per-Tab Session Isolation via sessionStorage (Patch #1 & #4)
  const [activeWsId, setActiveWsId] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY_ACTIVE_WS) || 'ws-k22iuh-default';
  });

  const [currentMemberId, setCurrentMemberId] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY_ACTIVE_MEMBER) || 'mem-1';
  });

  // Live clock for automatic deadline detection
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Navigation & UI Modals State
  const [activeTab, setActiveTab] = useState('HUB'); // 'HUB' | 'MEMBERS' | 'REPORT' | 'LOGS'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [memberFilter, setMemberFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modals
  const [showWorkspaceGateModal, setShowWorkspaceGateModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [submitModalTask, setSubmitModalTask] = useState(null);
  const [rejectModalTask, setRejectModalTask] = useState(null);
  const [overrideModalTask, setOverrideModalTask] = useState(null);
  const [transferOwnerModalTarget, setTransferOwnerModalTarget] = useState(null);
  const [showEmergencyTriggerModal, setShowEmergencyTriggerModal] = useState(false);
  const [showPdfReportModal, setShowPdfReportModal] = useState(false);
  const [dismissedEmergencyTimestamp, setDismissedEmergencyTimestamp] = useState(null);

  // Form states
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    category: 'DRIVE',
    assigneeId: '',
    deadlinePreset: 'TOMORROW',
    customHoursOffset: 24,
  });

  const [submitForm, setSubmitForm] = useState({ url: '', note: '' });
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [overrideReasonInput, setOverrideReasonInput] = useState('');
  const [emergencyForm, setEmergencyForm] = useState({
    url: 'https://meet.google.com/k22-iuh-flow',
    message: 'Triệu tập khẩn cấp toàn bộ thành viên NUMBERONE K22 · IUH để rà soát tiến độ đồ án ngay lập tức!',
  });

  // Join / Create Workspace Form
  const [gateMode, setGateMode] = useState('JOIN'); // 'JOIN' | 'CREATE'
  const [joinForm, setJoinForm] = useState({ inviteCode: 'K22IUH', userName: '', studentId: '', specialty: 'Member' });
  const [createWsForm, setCreateWsForm] = useState({
    wsName: '',
    courseName: 'Kỹ Năng Làm Việc Nhóm - IUH',
    className: 'K22 · IUH',
    ownerName: 'MR_TRIPLEF.EXE',
    studentId: '22654321',
  });

  // BroadcastChannel ref for instant multi-tab sync (NFR-002)
  const channelRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Setup Real-time Cross-Tab Synchronization via BroadcastChannel + Storage Event
  useEffect(() => {
    let bc = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_WORKSPACES') {
          setWorkspaces(event.data.payload);
        }
      };
      channelRef.current = bc;
    }

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY_WORKSPACES && e.newValue) {
        try {
          setWorkspaces(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Persist sessionStorage per tab
  useEffect(() => {
    if (activeWsId) sessionStorage.setItem(SESSION_KEY_ACTIVE_WS, activeWsId);
  }, [activeWsId]);

  useEffect(() => {
    if (currentMemberId) sessionStorage.setItem(SESSION_KEY_ACTIVE_MEMBER, currentMemberId);
  }, [currentMemberId]);

  // Helper to update workspaces and broadcast immediately to all open tabs
  const commitWorkspaces = (updater) => {
    setWorkspaces((prev) => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(updated));
      } catch (e) {
        console.error('Storage error:', e);
      }
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'SYNC_WORKSPACES', payload: updated });
      }
      return updated;
    });
  };

  // Current active workspace & logged-in member in this tab
  const currentWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWsId) || workspaces[0];
  }, [workspaces, activeWsId]);

  const currentMember = useMemo(() => {
    if (!currentWorkspace) return null;
    return (
      currentWorkspace.members.find((m) => m.id === currentMemberId) ||
      currentWorkspace.members[0]
    );
  }, [currentWorkspace, currentMemberId]);

  const isOwner = currentMember?.role === 'OWNER';
  const isAdminOrOwner = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';

  // Helper to update current workspace
  const updateCurrentWorkspace = (mutator) => {
    commitWorkspaces((prev) =>
      prev.map((ws) => {
        if (ws.id !== currentWorkspace.id) return ws;
        return mutator(ws);
      })
    );
  };

  // ============================================================================
  // CORE BUSINESS ACTIONS (FR-001 -> FR-007)
  // ============================================================================

  // FR-001: Create or Join Workspace
  const handleCreateWorkspace = (e) => {
    e.preventDefault();
    if (!createWsForm.wsName.trim() || !createWsForm.ownerName.trim()) return;

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const newWsId = 'ws-' + Date.now();
    const ownerId = 'mem-' + Date.now();
    const newWs = {
      id: newWsId,
      name: createWsForm.wsName.trim(),
      courseName: createWsForm.courseName.trim() || 'Kỹ Năng Làm Việc Nhóm',
      className: createWsForm.className.trim() || 'NUMBERONE K22 · IUH',
      inviteCode: code,
      createdAt: Date.now(),
      emergencyMeeting: { active: false, url: '', message: '', triggeredBy: '', triggeredAt: null },
      members: [
        {
          id: ownerId,
          name: createWsForm.ownerName.trim(),
          studentId: createWsForm.studentId.trim() || '2265xxxx',
          role: 'OWNER',
          avatarColor: 'from-indigo-500 to-purple-600',
          specialty: 'Project Owner / Team Lead',
          joinedAt: Date.now(),
        },
      ],
      tasks: [],
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: createWsForm.ownerName.trim(),
          type: 'SYSTEM',
          text: `Khởi tạo dự án mới "${createWsForm.wsName.trim()}" với Mã mời: ${code}`,
        },
      ],
    };

    commitWorkspaces((prev) => [...prev, newWs]);
    setActiveWsId(newWsId);
    setCurrentMemberId(ownerId);
    setShowWorkspaceGateModal(false);
    showNotification(`Đã tạo dự án mới! Mã mời 6 ký tự: ${code}`);
  };

  const handleJoinWorkspace = (e) => {
    e.preventDefault();
    const code = joinForm.inviteCode.trim().toUpperCase();
    const name = joinForm.userName.trim();
    if (!code || !name) return;

    const targetWs = workspaces.find((w) => w.inviteCode.toUpperCase() === code);
    if (!targetWs) {
      showNotification(`Không tìm thấy Không gian làm việc với mã mời "${code}"!`, 'error');
      return;
    }

    // Check if member with same name already exists in workspace (Patch #1 safe reconnect)
    const existingMember = targetWs.members.find(
      (m) => m.name.toLowerCase() === name.toLowerCase()
    );

    if (existingMember) {
      setActiveWsId(targetWs.id);
      setCurrentMemberId(existingMember.id);
      setShowWorkspaceGateModal(false);
      showNotification(`Chào mừng trở lại, ${existingMember.name} (${existingMember.role})!`);
      return;
    }

    const colors = [
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-cyan-500 to-blue-600',
    ];
    const newMemId = 'mem-' + Date.now();
    const newMember = {
      id: newMemId,
      name,
      studentId: joinForm.studentId.trim() || '2265xxxx',
      role: 'MEMBER',
      avatarColor: colors[targetWs.members.length % colors.length],
      specialty: joinForm.specialty.trim() || 'Team Member',
      joinedAt: Date.now(),
    };

    commitWorkspaces((prev) =>
      prev.map((ws) => {
        if (ws.id !== targetWs.id) return ws;
        return {
          ...ws,
          members: [...ws.members, newMember],
          logs: [
            {
              id: 'log-' + Date.now(),
              time: Date.now(),
              actor: name,
              type: 'JOIN',
              text: `${name} đã tham gia Không gian làm việc qua mã mời ${code}.`,
            },
            ...ws.logs,
          ],
        };
      })
    );

    setActiveWsId(targetWs.id);
    setCurrentMemberId(newMemId);
    setShowWorkspaceGateModal(false);
    showNotification(`Đã gia nhập "${targetWs.name}" thành công với quyền MEMBER!`);
  };

  // FR-002: Dynamic RBAC (Promote / Demote / Transfer Ownership)
  const handleToggleAdminRole = (targetMember) => {
    if (!isOwner || targetMember.role === 'OWNER') return;
    const nextRole = targetMember.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';

    updateCurrentWorkspace((ws) => ({
      ...ws,
      members: ws.members.map((m) => (m.id === targetMember.id ? { ...m, role: nextRole } : m)),
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: currentMember.name,
          type: 'RBAC',
          text: `Đã thay đổi quyền của ${targetMember.name} từ ${targetMember.role} sang ${nextRole}.`,
        },
        ...ws.logs,
      ],
    }));

    showNotification(`Đã cập nhật quyền của ${targetMember.name} thành ${nextRole}!`);
  };

  const handleConfirmTransferOwnership = () => {
    if (!isOwner || !transferOwnerModalTarget) return;
    const target = transferOwnerModalTarget;

    updateCurrentWorkspace((ws) => ({
      ...ws,
      members: ws.members.map((m) => {
        if (m.id === currentMember.id) return { ...m, role: 'ADMIN' };
        if (m.id === target.id) return { ...m, role: 'OWNER' };
        return m;
      }),
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: currentMember.name,
          type: 'RBAC',
          text: `Đã CHUYỂN GIAO QUYỀN OWNER (Trưởng nhóm) cho ${target.name}.`,
        },
        ...ws.logs,
      ],
    }));

    setTransferOwnerModalTarget(null);
    showNotification(`Đã chuyển giao quyền OWNER cho ${target.name}!`);
  };

  // FR-003: Create Task & Submit URL
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!isAdminOrOwner) return;
    if (!newTaskForm.title.trim()) return;

    const assigneeId = newTaskForm.assigneeId || currentWorkspace.members[0]?.id;
    const assignee = currentWorkspace.members.find((m) => m.id === assigneeId);

    let deadlineOffsetMs = 24 * 3600 * 1000;
    if (newTaskForm.deadlinePreset === 'PLUS_2H') deadlineOffsetMs = 2 * 3600 * 1000;
    if (newTaskForm.deadlinePreset === 'TOMORROW') deadlineOffsetMs = 24 * 3600 * 1000;
    if (newTaskForm.deadlinePreset === 'NEXT_3DAYS') deadlineOffsetMs = 72 * 3600 * 1000;
    if (newTaskForm.deadlinePreset === 'OVERDUE_TEST') deadlineOffsetMs = -2 * 3600 * 1000;

    const taskNumber = 101 + currentWorkspace.tasks.length;
    const newTask = {
      id: `TSK-${taskNumber}`,
      title: newTaskForm.title.trim(),
      description: newTaskForm.description.trim() || 'Thực hiện và dán link kết quả vào hệ thống đúng hạn.',
      category: newTaskForm.category,
      assigneeId,
      createdBy: currentMember.id,
      createdAt: Date.now(),
      deadline: Date.now() + deadlineOffsetMs,
      status: 'TODO',
      submissionUrl: '',
      submissionNote: '',
      submittedAt: null,
      isLate: false,
      rejectCount: 0,
      lastRejectReason: '',
      overrideFlag: false,
      overrideReason: '',
      overrideBy: '',
      reviewedBy: '',
      reviewedAt: null,
    };

    updateCurrentWorkspace((ws) => ({
      ...ws,
      tasks: [newTask, ...ws.tasks],
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: currentMember.name,
          type: 'TASK_CREATE',
          text: `Đã tạo task [${newTask.id}] "${newTask.title}" và giao cho ${assignee?.name || 'Thành viên'}.`,
        },
        ...ws.logs,
      ],
    }));

    setNewTaskForm({
      title: '',
      description: '',
      category: 'DRIVE',
      assigneeId: currentWorkspace.members[0]?.id || '',
      deadlinePreset: 'TOMORROW',
      customHoursOffset: 24,
    });
    setShowCreateTaskModal(false);
    showNotification(`Đã giao Task [${newTask.id}] thành công!`);
  };

  const openSubmitModal = (task) => {
    setSubmitModalTask(task);
    setSubmitForm({
      url: task.submissionUrl || 'https://drive.google.com/drive/folders/OneFlow-K22IUH-Submission',
      note: task.submissionNote || '',
    });
  };

  const handleTaskSubmit = (e) => {
    e.preventDefault();
    if (!submitModalTask || !submitForm.url.trim()) return;

    const submitTimestamp = Date.now();
    const isSubmittedAfterDeadline = submitTimestamp > submitModalTask.deadline;

    updateCurrentWorkspace((ws) => ({
      ...ws,
      tasks: ws.tasks.map((t) => {
        if (t.id !== submitModalTask.id) return t;
        return {
          ...t,
          status: 'PENDING_REVIEW',
          submissionUrl: submitForm.url.trim(),
          submissionNote: submitForm.note.trim(),
          submittedAt: submitTimestamp,
          isLate: t.isLate || isSubmittedAfterDeadline,
        };
      }),
      logs: [
        {
          id: 'log-' + Date.now(),
          time: submitTimestamp,
          actor: currentMember.name,
          type: 'SUBMIT',
          text: `Đã NỘP BÀI cho task [${submitModalTask.id}] (${
            isSubmittedAfterDeadline ? 'NỘP TRỄ HẠN - Gắn cờ IS_LATE' : 'Đúng hạn'
          }). Chờ Admin/Owner kiểm duyệt.`,
        },
        ...ws.logs,
      ],
    }));

    setSubmitModalTask(null);
    showNotification(
      isSubmittedAfterDeadline
        ? 'Đã nộp bài (Ghi nhận cờ Nộp trễ hạn IS_LATE)! Trạng thái: PENDING REVIEW.'
        : 'Đã nộp link bài làm thành công! Trạng thái: PENDING REVIEW.'
    );
  };

  // FR-004: Feedback Loop (Approve / Reject with mandatory reason)
  const handleApproveTask = (task) => {
    if (!isAdminOrOwner) return;

    updateCurrentWorkspace((ws) => ({
      ...ws,
      tasks: ws.tasks.map((t) => {
        if (t.id !== task.id) return t;
        return {
          ...t,
          status: 'DONE',
          reviewedBy: currentMember.name,
          reviewedAt: Date.now(),
        };
      }),
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: currentMember.name,
          type: 'APPROVE',
          text: `Đã DUYỆT (APPROVE) task [${task.id}] "${task.title}". Chuyển trạng thái sang DONE.`,
        },
        ...ws.logs,
      ],
    }));

    showNotification(`Đã APPROVE task [${task.id}]! Trạng thái chuyển xanh (DONE).`);
  };

  const handleConfirmRejectTask = (e) => {
    e.preventDefault();
    if (!isAdminOrOwner || !rejectModalTask || !rejectReasonInput.trim()) return;

    const reason = rejectReasonInput.trim();
    updateCurrentWorkspace((ws) => ({
      ...ws,
      tasks: ws.tasks.map((t) => {
        if (t.id !== rejectModalTask.id) return t;
        return {
          ...t,
          status: 'REJECTED',
          rejectCount: (t.rejectCount || 0) + 1,
          lastRejectReason: reason,
          reviewedBy: currentMember.name,
          reviewedAt: Date.now(),
        };
      }),
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: currentMember.name,
          type: 'REJECT',
          text: `Đã TỪ CHỐI (REJECT lần ${(rejectModalTask.rejectCount || 0) + 1}) task [${
            rejectModalTask.id
          }]. Lý do: "${reason}"`,
        },
        ...ws.logs,
      ],
    }));

    setRejectModalTask(null);
    setRejectReasonInput('');
    showNotification(`Đã REJECT task [${rejectModalTask.id}] và trả về cho thành viên sửa!`, 'error');
  };

  // FR-005: Human Override (Duyệt ngoại lệ cho Task trễ hạn / quá hạn)
  const handleConfirmHumanOverride = (e) => {
    e.preventDefault();
    if (!isAdminOrOwner || !overrideModalTask || !overrideReasonInput.trim()) return;

    const reason = overrideReasonInput.trim();
    updateCurrentWorkspace((ws) => ({
      ...ws,
      tasks: ws.tasks.map((t) => {
        if (t.id !== overrideModalTask.id) return t;
        return {
          ...t,
          status: 'DONE',
          overrideFlag: true,
          overrideReason: reason,
          overrideBy: currentMember.name,
          reviewedBy: currentMember.name,
          reviewedAt: Date.now(),
          submissionUrl: t.submissionUrl || 'https://drive.google.com/drive/folders/Approved-By-Human-Override',
          submittedAt: t.submittedAt || Date.now(),
        };
      }),
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: currentMember.name,
          type: 'OVERRIDE',
          text: `Đã DUYỆT NGOẠI LỆ (Human Override) task [${overrideModalTask.id}]. Lý do minh bạch: "${reason}"`,
        },
        ...ws.logs,
      ],
    }));

    setOverrideModalTask(null);
    setOverrideReasonInput('');
    showNotification(`Đã Duyệt Ngoại Lệ (Human Override) cho [${overrideModalTask.id}] kèm cờ minh bạch!`);
  };

  // FR-006: Emergency Sync-Meeting Broadcast
  const handleTriggerEmergencyMeeting = (e) => {
    e.preventDefault();
    if (!isAdminOrOwner || !emergencyForm.url.trim()) return;

    const triggeredAt = Date.now();
    updateCurrentWorkspace((ws) => ({
      ...ws,
      emergencyMeeting: {
        active: true,
        url: emergencyForm.url.trim(),
        message:
          emergencyForm.message.trim() ||
          'Yêu cầu tất cả thành viên tham gia phòng họp khẩn cấp ngay lập tức!',
        triggeredBy: currentMember.name,
        triggeredAt,
      },
      logs: [
        {
          id: 'log-' + triggeredAt,
          time: triggeredAt,
          actor: currentMember.name,
          type: 'EMERGENCY',
          text: `🚨 PHÁT LỆNH TRIỆU TẬP KHẨN CẤP (Sync-Meeting): "${emergencyForm.message.trim()}"`,
        },
        ...ws.logs,
      ],
    }));

    setDismissedEmergencyTimestamp(null);
    setShowEmergencyTriggerModal(false);
    showNotification('🚨 Đã phát tín hiệu Triệu tập Khẩn cấp tới toàn bộ màn hình thành viên!');
  };

  const handleStopEmergencyMeeting = () => {
    updateCurrentWorkspace((ws) => ({
      ...ws,
      emergencyMeeting: {
        ...ws.emergencyMeeting,
        active: false,
      },
    }));
    showNotification('Đã kết thúc lệnh triệu tập khẩn cấp.');
  };

  // Demo Helpers for Presentation Defense
  const handleSimulateOverdueTask = () => {
    const taskNumber = 101 + currentWorkspace.tasks.length;
    const targetMember =
      currentWorkspace.members.find((m) => m.role === 'MEMBER') || currentWorkspace.members[0];
    const overdueTask = {
      id: `TSK-${taskNumber}`,
      title: `Kiểm thử Mô phỏng Quá Hạn (Deadline trễ 3 giờ trước)`,
      description:
        'Task được tạo tự động bởi thanh công cụ Demo Hội Đồng để trình diễn tính năng Cảnh báo Đỏ (OVERDUE) và nút Duyệt Ngoại Lệ (Human Override - FR-005).',
      category: 'CAD',
      assigneeId: targetMember.id,
      createdBy: currentMember.id,
      createdAt: Date.now() - 10 * 3600 * 1000,
      deadline: Date.now() - 3 * 3600 * 1000,
      status: 'TODO',
      submissionUrl: '',
      submissionNote: '',
      submittedAt: null,
      isLate: false,
      rejectCount: 0,
      lastRejectReason: '',
      overrideFlag: false,
      overrideReason: '',
      overrideBy: '',
      reviewedBy: '',
      reviewedAt: null,
    };

    updateCurrentWorkspace((ws) => ({
      ...ws,
      tasks: [overdueTask, ...ws.tasks],
      logs: [
        {
          id: 'log-' + Date.now(),
          time: Date.now(),
          actor: currentMember.name,
          type: 'DEMO',
          text: `⚡ [Demo Hội Đồng] Đã tạo task quá hạn [${overdueTask.id}] cho ${targetMember.name} để test Human Override.`,
        },
        ...ws.logs,
      ],
    }));

    showNotification(`⚡ Đã tạo Task Quá Hạn [${overdueTask.id}]! Hãy thử bấm "Duyệt Ngoại Lệ".`);
  };

  const handleResetDemoData = () => {
    const fresh = createInitialDemoWorkspace();
    commitWorkspaces([fresh]);
    setActiveWsId(fresh.id);
    setCurrentMemberId('mem-1');
    setDismissedEmergencyTimestamp(null);
    showNotification('Đã khôi phục bộ dữ liệu mẫu chuẩn bảo vệ NUMBERONE K22 · IUH!');
  };

  // ============================================================================
  // FR-007: ANALYTICS & DUAL METRICS REPORT ENGINE (PATCH #3)
  // ============================================================================
  const reportData = useMemo(() => {
    if (!currentWorkspace) return { membersReport: [], summary: {} };
    const totalWorkspaceTasks = currentWorkspace.tasks.length;

    const membersReport = currentWorkspace.members.map((m) => {
      const assignedTasks = currentWorkspace.tasks.filter((t) => t.assigneeId === m.id);
      const totalAssigned = assignedTasks.length;

      const doneTasks = assignedTasks.filter((t) => t.status === 'DONE');
      const doneCount = doneTasks.length;

      const pendingCount = assignedTasks.filter((t) => t.status === 'PENDING_REVIEW').length;
      const rejectedCountActive = assignedTasks.filter((t) => t.status === 'REJECTED').length;

      // Total times rejected across all assigned tasks (Quality indicator)
      const totalRejections = assignedTasks.reduce((acc, t) => acc + (t.rejectCount || 0), 0);

      // Overdue or unexcused late tasks
      const unexcusedLateCount = assignedTasks.filter((t) => {
        const eff = getEffectiveTaskStatus(t, now);
        const isCurrentlyOverdue = eff === 'OVERDUE';
        const isLateSubmissionWithoutOverride = t.isLate && !t.overrideFlag;
        return isCurrentlyOverdue || isLateSubmissionWithoutOverride;
      }).length;

      // Human Override count & details
      const overrideTasks = assignedTasks.filter((t) => t.overrideFlag);
      const overrideCount = overrideTasks.length;

      // Dual Fair Contribution Metrics (Gate 3 Approved Patch #3)
      // Metric A: Personal Completion Rate (%)
      const personalCompletionRate =
        totalAssigned > 0 ? Math.round((doneCount / totalAssigned) * 100) : 0;

      // Metric B: Overall Team Contribution Share (%)
      const teamContributionShare =
        totalWorkspaceTasks > 0 ? Math.round((doneCount / totalWorkspaceTasks) * 100) : 0;

      // Automated Suggested Rubric Score (10-point scale reference for Lecturer)
      let rubricScore = 10.0;
      if (totalAssigned === 0) {
        rubricScore = 0.0;
      } else {
        const baseFromCompletion = (doneCount / totalAssigned) * 8.5;
        const bonusTeamLoad = Math.min(1.5, (doneCount / Math.max(1, totalWorkspaceTasks)) * 4.5);
        const penaltyLate = unexcusedLateCount * 0.75;
        const penaltyReject = totalRejections * 0.35;
        rubricScore = Math.max(
          1.0,
          Math.min(10.0, Number((baseFromCompletion + bonusTeamLoad - penaltyLate - penaltyReject).toFixed(1)))
        );
      }

      let ratingLabel = 'Xuất sắc (A+)';
      let ratingColor = 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
      if (rubricScore < 5.0) {
        ratingLabel = 'Cần cảnh báo (D)';
        ratingColor = 'text-rose-400 bg-rose-500/15 border-rose-500/30';
      } else if (rubricScore < 7.0) {
        ratingLabel = 'Trung bình (C)';
        ratingColor = 'text-amber-400 bg-amber-500/15 border-amber-500/30';
      } else if (rubricScore < 8.5) {
        ratingLabel = 'Tốt (B+)';
        ratingColor = 'text-sky-400 bg-sky-500/15 border-sky-500/30';
      }

      return {
        member: m,
        totalAssigned,
        doneCount,
        pendingCount,
        rejectedCountActive,
        totalRejections,
        unexcusedLateCount,
        overrideCount,
        overrideTasks,
        personalCompletionRate,
        teamContributionShare,
        rubricScore,
        ratingLabel,
        ratingColor,
      };
    });

    const totalDone = currentWorkspace.tasks.filter((t) => t.status === 'DONE').length;
    const totalPending = currentWorkspace.tasks.filter((t) => t.status === 'PENDING_REVIEW').length;
    const totalIssues = currentWorkspace.tasks.filter((t) => {
      const eff = getEffectiveTaskStatus(t, now);
      return eff === 'REJECTED' || eff === 'OVERDUE' || (t.isLate && !t.overrideFlag);
    }).length;
    const totalOverrides = currentWorkspace.tasks.filter((t) => t.overrideFlag).length;

    return {
      membersReport,
      summary: {
        totalWorkspaceTasks,
        totalDone,
        totalPending,
        totalIssues,
        totalOverrides,
        overallProgress:
          totalWorkspaceTasks > 0 ? Math.round((totalDone / totalWorkspaceTasks) * 100) : 0,
      },
    };
  }, [currentWorkspace, now]);

  // CSV Export Handler (FR-007 Secondary Format)
  const handleDownloadCSV = () => {
    if (!currentWorkspace) return;

    const headers = [
      'STT',
      'Ho va Ten Thanh Vien',
      'MSSV',
      'Vai Tro (Role)',
      'So Task Duoc Giao',
      'So Task Hoan Thanh (DONE)',
      'Tien Do Ca Nhan (%)',
      'Ty Trong Dong Gop Nhom (%)',
      'So Lan Nop Tre (Khong phep)',
      'So Lan Bi Reject (Chat luong ban dau)',
      'So Lan Duyet Ngoai Le (Human Override)',
      'Ly Do Duyet Ngoai Le',
      'Diem De Xuat Tham Khao (He 10)',
      'Xep Loai Danh Gia',
    ];

    const rows = reportData.membersReport.map((r, idx) => [
      idx + 1,
      `"${r.member.name}"`,
      `"${r.member.studentId || ''}"`,
      r.member.role,
      r.totalAssigned,
      r.doneCount,
      `${r.personalCompletionRate}%`,
      `${r.teamContributionShare}%`,
      r.unexcusedLateCount,
      r.totalRejections,
      r.overrideCount,
      `"${r.overrideTasks.map((t) => `[${t.id}] ${t.overrideReason}`).join(' | ') || 'Khong'}"`,
      r.rubricScore,
      `"${r.ratingLabel}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      `"HE THONG TRAM DONG BO NHOM: ${BRAND.appName} - ${BRAND.org}"\n` +
      `"Tac gia kien truc: ${BRAND.creator} | Khau hieu: ${BRAND.slogan}"\n` +
      `"Du an: ${currentWorkspace.name} | Ma moi: ${currentWorkspace.inviteCode} | Ngay xuat: ${formatDateTime(Date.now())}"\n\n` +
      headers.join(',') +
      '\n' +
      rows.map((e) => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `BaoCao_ONEFLOW_${currentWorkspace.inviteCode}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification('📊 Đã tải xuống file Báo cáo Excel/CSV (Chuẩn mã hóa UTF-8)!');
  };

  // Filtered Tasks for Hub View
  const filteredTasks = useMemo(() => {
    if (!currentWorkspace) return [];
    return currentWorkspace.tasks.filter((task) => {
      const effStatus = getEffectiveTaskStatus(task, now);
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'ISSUES') {
          if (effStatus !== 'REJECTED' && effStatus !== 'OVERDUE' && !task.isLate) return false;
        } else if (statusFilter === 'OVERRIDE') {
          if (!task.overrideFlag) return false;
        } else if (effStatus !== statusFilter) {
          return false;
        }
      }
      if (memberFilter !== 'ALL' && task.assigneeId !== memberFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchId = task.id.toLowerCase().includes(q);
        const matchDesc = task.description.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchDesc) return false;
      }
      return true;
    });
  }, [currentWorkspace, statusFilter, memberFilter, searchQuery, now]);

  // Check if Emergency Pop-up should be shown
  const isEmergencyPopupVisible =
    currentWorkspace?.emergencyMeeting?.active &&
    dismissedEmergencyTimestamp !== currentWorkspace?.emergencyMeeting?.triggeredAt;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* PRINT MEDIA STYLES FOR FORMAL ADMINISTRATIVE A4 PDF REPORT */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #oneflow-printable-report, #oneflow-printable-report * {
            visibility: visible !important;
          }
          #oneflow-printable-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            padding: 12mm !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* FLOATING NOTIFICATION TOAST */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce no-print">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500 text-rose-100'
                : 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          FR-006: RED EMERGENCY SYNC-MEETING POP-UP OVERLAY (REAL-TIME)
      ===================================================================== */}
      {isEmergencyPopupVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/85 backdrop-blur-md animate-fadeIn no-print">
          <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border-2 border-rose-500 shadow-[0_0_60px_rgba(244,63,94,0.6)] overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white"></span>
                </span>
                <h2 className="text-lg font-black tracking-wider uppercase text-white">
                  🚨 LỆNH TRIỆU TẬP KHẨN CẤP (SYNC-MEETING)
                </h2>
              </div>
              <span className="text-xs font-mono bg-black/30 px-2.5 py-1 rounded text-rose-100">
                FR-006 REAL-TIME ALERT
              </span>
            </div>

            <div className="p-6 space-y-5">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-rose-300">
                  <span>
                    Người phát lệnh: <strong className="text-white">{currentWorkspace.emergencyMeeting.triggeredBy}</strong>
                  </span>
                  <span>Lúc: {formatDateTime(currentWorkspace.emergencyMeeting.triggeredAt)}</span>
                </div>
                <p className="text-base font-semibold text-white leading-relaxed">
                  “{currentWorkspace.emergencyMeeting.message}”
                </p>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
                <div className="truncate">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Đường dẫn phòng họp trực tuyến:</div>
                  <div className="text-sm font-mono text-indigo-400 truncate">
                    {currentWorkspace.emergencyMeeting.url}
                  </div>
                </div>
                <a
                  href={currentWorkspace.emergencyMeeting.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white shadow-lg shadow-rose-600/40 transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> THAM GIA NGAY
                </a>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() =>
                    setDismissedEmergencyTimestamp(currentWorkspace.emergencyMeeting.triggeredAt)
                  }
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Đã hiểu / Tạm ẩn trên tab này
                </button>

                {isAdminOrOwner && (
                  <button
                    onClick={handleStopEmergencyMeeting}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 transition"
                  >
                    Tắt lệnh triệu tập cho toàn nhóm (Admin/Owner)
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PATCH #4: TOP DEMO DEFENSE CONTROLLER BAR (CHẾ ĐỘ DEMO HỘI ĐỒNG)
      ===================================================================== */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-500/30 px-4 py-2 text-xs no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              CHẾ ĐỘ DEMO HỘI ĐỒNG (Chuyển vai 1-Click trên Tab này):
            </span>

            <div className="flex items-center gap-1.5 flex-wrap">
              {currentWorkspace?.members.map((m) => {
                const active = m.id === currentMember?.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCurrentMemberId(m.id);
                      showNotification(`Đã chuyển phiên tab hiện tại sang: ${m.name} (${m.role})`);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                      active
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-300'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span>{m.name}</span>
                    <span className="text-[10px] opacity-80 px-1 rounded bg-black/30">{m.role}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateOverdueTask}
              className="px-2.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1 transition"
              title="Tạo ngay 1 task đã quá hạn 3 tiếng để biểu diễn tính năng cảnh báo đỏ & Duyệt Ngoại Lệ"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" /> + Mô phỏng Task Quá Hạn
            </button>
            <button
              onClick={handleResetDemoData}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition"
              title="Khôi phục lại toàn bộ dữ liệu mẫu ban đầu"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Mẫu Bảo Vệ
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MAIN BRAND HEADER (ONEFLOW + NUMBERONE K22 · IUH + MR_TRIPLEF.EXE)
      ===================================================================== */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/15">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                  {BRAND.appName}
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {BRAND.org}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5 flex-wrap">
                <span className="italic text-indigo-300 font-medium">“{BRAND.slogan}”</span>
                <span>•</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400">
                  <Terminal className="w-3 h-3" /> Architect: <strong>{BRAND.creator}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Active Workspace Invite Code & Quick Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Invite Code Pill */}
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Mã mời (FR-001):</div>
              <span className="font-mono font-black text-sm tracking-widest text-amber-400">
                {currentWorkspace?.inviteCode}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(currentWorkspace?.inviteCode || '');
                  showNotification(`Đã copy mã mời: ${currentWorkspace?.inviteCode}`);
                }}
                className="text-slate-400 hover:text-white p-1 rounded"
                title="Copy mã mời 6 ký tự"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Switch / Join Workspace Button */}
            <button
              onClick={() => setShowWorkspaceGateModal(true)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-indigo-400" /> Đổi Phòng / Nhập Mã Mời
            </button>

            {/* FR-006 Emergency Sync-Meeting Button */}
            {isAdminOrOwner && (
              <button
                onClick={() => setShowEmergencyTriggerModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 animate-pulse"
              >
                <Radio className="w-4 h-4" /> Triệu Tập Khẩn (FR-006)
              </button>
            )}

            {/* FR-007 Killer Feature One-Click PDF Report */}
            {isAdminOrOwner && (
              <button
                onClick={() => setShowPdfReportModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" /> Xuất PDF Hành Chính (FR-007)
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =====================================================================
          WORKSPACE INFO BANNER & CURRENT USER STATUS BAR
      ===================================================================== */}
      <div className="max-w-7xl w-full mx-auto px-4 pt-5 space-y-5 flex-1 no-print">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              <span>{currentWorkspace?.courseName}</span>
              <span>•</span>
              <span>{currentWorkspace?.className}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">{currentWorkspace?.name}</h2>
            <p className="text-xs text-slate-400">
              Trạm trung chuyển Zero-File Storage: Quản lý giao nộp link (Drive/GitHub/Figma/CAD), kiểm duyệt vòng lặp, xử lý ngoại lệ minh bạch & trích xuất báo cáo nộp giảng viên.
            </p>
          </div>

          {/* Current Logged-in Identity Card */}
          {currentMember && (
            <div className="flex items-center gap-3.5 bg-slate-950/90 px-4 py-3 rounded-xl border border-slate-800 shrink-0">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentMember.avatarColor} flex items-center justify-center font-black text-white text-sm shadow-md`}
              >
                {currentMember.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Đang thao tác dưới quyền:</div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{currentMember.name}</span>
                  {getRoleBadge(currentMember.role)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  MSSV: {currentMember.studentId} • {currentMember.specialty}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================
            SEMANTIC KPI SUMMARY CARDS (NFR-001 COLOR SYSTEM)
        =================================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Tổng số Task dự án</div>
              <div className="text-2xl font-black text-white mt-1">
                {reportData.summary.totalWorkspaceTasks}
              </div>
              <div className="text-[11px] text-indigo-400 mt-0.5">
                Tiến độ chung: {reportData.summary.overallProgress}%
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          {/* GREEN: DONE */}
          <div className="p-4 rounded-xl bg-emerald-950/25 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-300 font-medium">Hoàn thành (DONE)</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {reportData.summary.totalDone}
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-0.5">Đã kiểm duyệt đạt</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* YELLOW: PENDING REVIEW */}
          <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-300 font-medium">Chờ duyệt (PENDING)</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {reportData.summary.totalPending}
              </div>
              <div className="text-[11px] text-amber-400/80 mt-0.5">Đã nộp link, chờ review</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* RED: REJECTED / OVERDUE / LATE */}
          <div className="p-4 rounded-xl bg-rose-950/25 border border-rose-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-rose-300 font-medium">Có vấn đề (REJECT/LATE)</div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {reportData.summary.totalIssues}
              </div>
              <div className="text-[11px] text-rose-400/80 mt-0.5">Bị trả bài hoặc trễ hạn</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* PURPLE: HUMAN OVERRIDE */}
          <div className="col-span-2 lg:col-span-1 p-4 rounded-xl bg-purple-950/25 border border-purple-500/30 flex items-center justify-between">
            <div>
              <div className="text-xs text-purple-300 font-medium">Duyệt ngoại lệ (FR-005)</div>
              <div className="text-2xl font-black text-purple-400 mt-1">
                {reportData.summary.totalOverrides}
              </div>
              <div className="text-[11px] text-purple-400/80 mt-0.5">Có gắn cờ minh bạch</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* ===================================================================
            MAIN NAVIGATION TABS
        =================================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('HUB')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'HUB'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Link2 className="w-4 h-4" />
              Trạm Giao Nộp & Kiểm Duyệt ({currentWorkspace?.tasks.length})
            </button>

            <button
              onClick={() => setActiveTab('MEMBERS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'MEMBERS'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Thành Viên & Phân Quyền RBAC ({currentWorkspace?.members.length})
            </button>

            <button
              onClick={() => setActiveTab('REPORT')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'REPORT'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900 text-emerald-400 hover:bg-slate-800 border border-emerald-500/30'
              }`}
            >
              <Award className="w-4 h-4" />
              Báo Cáo Đánh Giá & Xuất File (FR-007 Killer Feature)
            </button>

            <button
              onClick={() => setActiveTab('LOGS')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'LOGS'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              Nhật Ký Hệ Thống ({currentWorkspace?.logs.length})
            </button>
          </div>

          {isAdminOrOwner && (
            <button
              onClick={() => {
                setNewTaskForm((prev) => ({
                  ...prev,
                  assigneeId: currentWorkspace.members[0]?.id || '',
                }));
                setShowCreateTaskModal(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/30 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Giao Task Mới (Admin/Owner)
            </button>
          )}
        </div>

        {/* ===================================================================
            TAB 1: SUBMISSION HUB & QUALITY GATE (FR-003, FR-004, FR-005)
        =================================================================== */}
        {activeTab === 'HUB' && (
          <div className="space-y-4 pb-10">
            {/* Filter & Search Bar */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Trạng thái:
                </span>
                {[
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'TODO', label: 'Đang làm (TODO)' },
                  { id: 'PENDING_REVIEW', label: 'Chờ duyệt (Vàng)' },
                  { id: 'DONE', label: 'Hoàn thành (Xanh)' },
                  { id: 'ISSUES', label: 'Trễ hạn / Bị Reject (Đỏ)' },
                  { id: 'OVERRIDE', label: 'Duyệt ngoại lệ (Tím)' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      statusFilter === st.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <select
                  value={memberFilter}
                  onChange={(e) => setMemberFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">👤 Tất cả thành viên</option>
                  {currentWorkspace?.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm mã task, tên việc..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Task Cards List */}
            {filteredTasks.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 text-slate-400">
                Không có Task nào khớp với bộ lọc hiện tại.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTasks.map((task) => {
                  const effStatus = getEffectiveTaskStatus(task, now);
                  const assignee = currentWorkspace.members.find((m) => m.id === task.assigneeId);
                  const catMeta = getCategoryMeta(task.category);
                  const CatIcon = catMeta.icon;
                  const canSubmit =
                    currentMember?.id === task.assigneeId || isAdminOrOwner;

                  // Semantic Border & Badge styling (NFR-001)
                  let cardBorder = 'border-slate-800 bg-slate-900/90';
                  let statusBadge = null;

                  if (effStatus === 'DONE') {
                    cardBorder = 'border-emerald-500/40 bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/20';
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> DONE (Đã Duyệt)
                      </span>
                    );
                  } else if (effStatus === 'PENDING_REVIEW') {
                    cardBorder = 'border-amber-500/50 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/25';
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> PENDING REVIEW (Chờ Duyệt)
                      </span>
                    );
                  } else if (effStatus === 'REJECTED') {
                    cardBorder = 'border-rose-500/60 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/30';
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/50">
                        <XCircle className="w-3.5 h-3.5 text-rose-400" /> REJECTED (Yêu Cầu Sửa)
                      </span>
                    );
                  } else if (effStatus === 'OVERDUE') {
                    cardBorder = 'border-rose-500/60 bg-gradient-to-r from-slate-900 via-slate-900 to-rose-950/30';
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-600/30 text-rose-200 border border-rose-500">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> OVERDUE (Trễ Hạn Chưa Nộp)
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> TODO (Đang Thực Hiện)
                      </span>
                    );
                  }

                  return (
                    <div
                      key={task.id}
                      className={`p-5 rounded-2xl border ${cardBorder} shadow-lg transition-all space-y-4`}
                    >
                      {/* Top Row: ID, Category, Status & Flags */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {task.id}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium border ${catMeta.color}`}
                            >
                              <CatIcon className="w-3.5 h-3.5" /> {catMeta.label}
                            </span>

                            {/* Flag IS_LATE (Patch #2) */}
                            {task.isLate && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                <AlertTriangle className="w-3 h-3" /> Cờ IS_LATE (Nộp sau Deadline)
                              </span>
                            )}

                            {/* Reject Counter Badge */}
                            {task.rejectCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                                Bị Reject: {task.rejectCount} lần
                              </span>
                            )}

                            {/* Flag HUMAN OVERRIDE (FR-005) */}
                            {task.overrideFlag && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/25 text-purple-200 border border-purple-400/50">
                                <Shield className="w-3 h-3 text-purple-300" /> FLAGGED: DUYỆT NGOẠI LỆ
                              </span>
                            )}
                          </div>

                          <h3 className="text-base md:text-lg font-bold text-white">{task.title}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {statusBadge}
                          <div className="text-[11px] text-slate-400">
                            Hạn chót (Deadline):{' '}
                            <strong
                              className={
                                now > task.deadline && effStatus !== 'DONE'
                                  ? 'text-rose-400'
                                  : 'text-slate-200'
                              }
                            >
                              {formatDateTime(task.deadline)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Alert Box if REJECTED (FR-004) */}
                      {task.lastRejectReason && (
                        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-xs">
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-300">
                              Phản hồi Kiểm duyệt (Lý do Reject gần nhất):{' '}
                            </span>
                            <span className="text-rose-100">“{task.lastRejectReason}”</span>
                          </div>
                        </div>
                      )}

                      {/* Transparency Box if HUMAN OVERRIDE (FR-005) */}
                      {task.overrideFlag && (
                        <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-start gap-2.5 text-xs">
                          <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-purple-300">
                              Minh bạch Duyệt Ngoại Lệ (Human Override bởi {task.overrideBy}):{' '}
                            </span>
                            <span className="text-purple-100">“{task.overrideReason}”</span>
                          </div>
                        </div>
                      )}

                      {/* Submission Link Display Box (Zero-File Storage Aggregator) */}
                      {task.submissionUrl ? (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span className="font-semibold text-indigo-400">
                                🔗 Link sản phẩm đã nộp:
                              </span>
                              <span>Lúc {formatDateTime(task.submittedAt)}</span>
                            </div>
                            <a
                              href={task.submissionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs md:text-sm font-mono text-sky-400 hover:underline break-all flex items-center gap-1.5"
                            >
                              <span>{task.submissionUrl}</span>
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                            </a>
                            {task.submissionNote && (
                              <div className="text-xs text-slate-300 italic">
                                Ghi chú thành viên: “{task.submissionNote}”
                              </div>
                            )}
                          </div>

                          <a
                            href={task.submissionUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Mở Link Kiểm Tra
                          </a>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                          <span>Chưa có đường dẫn sản phẩm (URL Drive/GitHub/Figma) nào được nộp.</span>
                        </div>
                      )}

                      {/* Footer Row: Assignee Info & Action Buttons */}
                      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${
                              assignee?.avatarColor || 'from-slate-600 to-slate-700'
                            } flex items-center justify-center text-xs font-bold text-white`}
                          >
                            {assignee?.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="text-xs">
                            <span className="text-slate-400">Người phụ trách: </span>
                            <strong className="text-white">{assignee?.name}</strong>
                            <span className="text-slate-500 ml-1.5">({assignee?.studentId})</span>
                          </div>
                        </div>

                        {/* Contextual Action Buttons based on Role & Task State */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Member / Assignee Submit or Resubmit Button (Never locked out per Patch #2) */}
                          {canSubmit && effStatus !== 'DONE' && (
                            <button
                              onClick={() => openSubmitModal(task)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {task.submissionUrl ? 'Cập Nhật / Nộp Lại Link' : 'Dán Link Nộp Bài (FR-003)'}
                            </button>
                          )}

                          {/* Admin / Owner Review Actions: APPROVE & REJECT (FR-004) */}
                          {isAdminOrOwner && effStatus === 'PENDING_REVIEW' && (
                            <>
                              <button
                                onClick={() => handleApproveTask(task)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
                              >
                                <Check className="w-3.5 h-3.5" /> APPROVE (Duyệt Bài)
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalTask(task);
                                  setRejectReasonInput('');
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition flex items-center gap-1.5"
                              >
                                <X className="w-3.5 h-3.5" /> REJECT (Yêu Cầu Sửa)
                              </button>
                            </>
                          )}

                          {/* FR-005: Human Override Button for Admin/Owner when Task is OVERDUE or LATE */}
                          {isAdminOrOwner &&
                            !task.overrideFlag &&
                            (effStatus === 'OVERDUE' || task.isLate || effStatus === 'REJECTED') && (
                              <button
                                onClick={() => {
                                  setOverrideModalTask(task);
                                  setOverrideReasonInput(
                                    'Máy tính hỏng phần cứng / Sự cố khách quan, đã báo trước cho Trưởng nhóm.'
                                  );
                                }}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-400/50 transition flex items-center gap-1.5"
                              >
                                <Shield className="w-3.5 h-3.5 text-purple-300" />
                                Duyệt Ngoại Lệ (Human Override)
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================
            TAB 2: DYNAMIC RBAC & MEMBER MANAGEMENT (FR-002)
        =================================================================== */}
        {activeTab === 'MEMBERS' && (
          <div className="space-y-4 pb-10">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Quản Lý Phân Quyền Động (FR-002: Dynamic RBAC)
                </h3>
                <p className="text-xs text-slate-400">
                  Owner có toàn quyền chỉ định Member lên Admin, hạ quyền Admin xuống Member, hoặc Chuyển giao quyền Owner cho thành viên khác.
                </p>
              </div>
              <div className="text-xs text-slate-400">
                Quyền hiện tại của bạn: {getRoleBadge(currentMember?.role)}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentWorkspace?.members.map((m) => {
                const memberStats = reportData.membersReport.find((r) => r.member.id === m.id);
                return (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.avatarColor} flex items-center justify-center font-black text-white text-base shadow-lg`}
                        >
                          {m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-base">{m.name}</h4>
                            {getRoleBadge(m.role)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            MSSV: <span className="font-mono text-slate-300">{m.studentId}</span> •{' '}
                            {m.specialty}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Mini Stats */}
                    {memberStats && (
                      <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs">
                        <div>
                          <div className="text-slate-400">Hoàn thành</div>
                          <div className="font-bold text-emerald-400 mt-0.5">
                            {memberStats.doneCount}/{memberStats.totalAssigned} task
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Đóng góp nhóm</div>
                          <div className="font-bold text-indigo-400 mt-0.5">
                            {memberStats.teamContributionShare}%
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400">Bị Reject / Trễ</div>
                          <div className="font-bold text-rose-400 mt-0.5">
                            {memberStats.totalRejections} / {memberStats.unexcusedLateCount}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Owner RBAC Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <button
                        onClick={() => {
                          setCurrentMemberId(m.id);
                          showNotification(`Đã chuyển sang góc nhìn của ${m.name} (${m.role})`);
                        }}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        Đóng vai thành viên này <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      {isOwner && m.id !== currentMember.id && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleAdminRole(m)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                          >
                            {m.role === 'ADMIN' ? 'Hạ xuống MEMBER' : 'Bổ nhiệm ADMIN'}
                          </button>

                          <button
                            onClick={() => setTransferOwnerModalTarget(m)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition flex items-center gap-1"
                          >
                            <Crown className="w-3.5 h-3.5" /> Chuyển quyền OWNER
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: KILLER FEATURE - ANALYTICS & ONE-CLICK EXPORT (FR-007)
        =================================================================== */}
        {activeTab === 'REPORT' && (
          <div className="space-y-6 pb-12">
            {/* Top Action Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-teal-950/60 border border-emerald-500/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  KILLER FEATURE • FR-007 ONE-CLICK EXPORT
                </div>
                <h3 className="text-lg md:text-xl font-black text-white">
                  Trích Xuất Báo Cáo Đánh Giá Hiệu Suất Thành Viên (Chuẩn Nộp Giảng Viên)
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl">
                  Tự động tổng hợp tỷ lệ hoàn thành cá nhân, tỷ trọng đóng góp vào đồ án chung, số lần nộp trễ hạn, số lần bị Reject chất lượng và danh sách lý do Duyệt ngoại lệ minh bạch.
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap shrink-0">
                <button
                  onClick={() => setShowPdfReportModal(true)}
                  className="px-4 py-3 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/30 transition flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  📄 Xuất PDF Hành Chính (Chuẩn IUH)
                </button>

                <button
                  onClick={handleDownloadCSV}
                  className="px-4 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  📊 Xuất File Excel / CSV (Dữ liệu thô)
                </button>
              </div>
            </div>

            {/* Dual Metrics Evaluation Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">
                  Bảng Tổng Hợp Chỉ Số Đánh Giá Công Bằng (Gate 3 Patch #3: Dual Metrics)
                </h4>
                <span className="text-xs text-slate-400">
                  Cập nhật thời gian thực: {formatDateTime(now)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                      <th className="py-3.5 px-4">Thành viên</th>
                      <th className="py-3.5 px-3">Vai trò</th>
                      <th className="py-3.5 px-3 text-center">Task Hoàn thành</th>
                      <th className="py-3.5 px-4">Tiến độ Cá nhân (%)</th>
                      <th className="py-3.5 px-4">Tỷ trọng Đóng góp Nhóm (%)</th>
                      <th className="py-3.5 px-3 text-center">Nộp trễ (Không phép)</th>
                      <th className="py-3.5 px-3 text-center">Số lần bị Reject</th>
                      <th className="py-3.5 px-3 text-center">Duyệt ngoại lệ</th>
                      <th className="py-3.5 px-4 text-right">Điểm Đề xuất / Xếp loại</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {reportData.membersReport.map((r) => (
                      <tr key={r.member.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm">{r.member.name}</div>
                          <div className="text-[11px] text-slate-400">
                            MSSV: {r.member.studentId} • {r.member.specialty}
                          </div>
                        </td>
                        <td className="py-4 px-3">{getRoleBadge(r.member.role)}</td>
                        <td className="py-4 px-3 text-center font-mono font-bold text-sm text-white">
                          {r.doneCount} / {r.totalAssigned}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${r.personalCompletionRate}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-emerald-400">
                              {r.personalCompletionRate}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${r.teamContributionShare}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-indigo-400">
                              {r.teamContributionShare}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold ${
                              r.unexcusedLateCount > 0
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'text-slate-400'
                            }`}
                          >
                            {r.unexcusedLateCount}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold ${
                              r.totalRejections > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : 'text-slate-400'
                            }`}
                          >
                            {r.totalRejections}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full font-bold ${
                              r.overrideCount > 0
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                                : 'text-slate-400'
                            }`}
                          >
                            {r.overrideCount}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <span className="font-mono text-sm font-black text-white">
                              {r.rubricScore}/10
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${r.ratingColor}`}
                            >
                              {r.ratingLabel}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: AUDIT TIMELINE LOGS
        =================================================================== */}
        {activeTab === 'LOGS' && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3 pb-10">
            <h3 className="text-sm font-bold text-white">
              Nhật Ký Hoạt Động Thời Gian Thực (Real-time Audit Trail)
            </h3>
            <div className="space-y-2.5">
              {currentWorkspace?.logs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-indigo-400">{log.actor}: </span>
                    <span className="text-slate-200">{log.text}</span>
                  </div>
                  <span className="text-slate-500 font-mono shrink-0">
                    {formatDateTime(log.time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          MODAL 1: CREATE OR JOIN WORKSPACE (FR-001)
      ===================================================================== */}
      {showWorkspaceGateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">
                  Trạm Không Gian Làm Việc (FR-001: Invite Code 6 Ký Tự)
                </h3>
                <p className="text-xs text-slate-400">{BRAND.appName}</p>
              </div>
              <button
                onClick={() => setShowWorkspaceGateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setGateMode('JOIN')}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    gateMode === 'JOIN'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Nhập Mã Mời 6 Ký Tự
                </button>
                <button
                  onClick={() => setGateMode('CREATE')}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    gateMode === 'CREATE'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  + Tạo Dự Án Mới
                </button>
              </div>

              {gateMode === 'JOIN' ? (
                <form onSubmit={handleJoinWorkspace} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Mã mời Không gian làm việc (6 ký tự - Mặc định: K22IUH)
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={joinForm.inviteCode}
                      onChange={(e) =>
                        setJoinForm({ ...joinForm, inviteCode: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 font-mono text-base font-black tracking-widest text-amber-400 uppercase"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Họ và Tên của bạn
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="VD: Phạm Quốc Bảo"
                        value={joinForm.userName}
                        onChange={(e) => setJoinForm({ ...joinForm, userName: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Mã số sinh viên (MSSV)
                      </label>
                      <input
                        type="text"
                        placeholder="VD: 22651234"
                        value={joinForm.studentId}
                        onChange={(e) => setJoinForm({ ...joinForm, studentId: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition"
                  >
                    Vào Không Gian Làm Việc Ngay
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tên Dự Án / Đề Tài Nhóm
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Đồ Án Thiết Kế Hệ Thống Nhúng IoT - Nhóm 1"
                      value={createWsForm.wsName}
                      onChange={(e) =>
                        setCreateWsForm({ ...createWsForm, wsName: e.target.value })
                      }
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Tên Người Tạo (Owner)
                      </label>
                      <input
                        type="text"
                        required
                        value={createWsForm.ownerName}
                        onChange={(e) =>
                          setCreateWsForm({ ...createWsForm, ownerName: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Lớp / Thương hiệu Nhóm
                      </label>
                      <input
                        type="text"
                        value={createWsForm.className}
                        onChange={(e) =>
                          setCreateWsForm({ ...createWsForm, className: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition"
                  >
                    Khởi Tạo & Sinh Mã Mời 6 Ký Tự Tự Động
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: CREATE TASK (FR-003)
      ===================================================================== */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Giao Task Mới Cho Thành Viên</h3>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tên công việc (Task Title) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Thiết kế mạch nguyên lý PCB trên Altium Designer"
                  value={newTaskForm.title}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Mô tả yêu cầu đầu ra (Acceptance Criteria)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi rõ tiêu chuẩn: xuất file PDF + link thư mục Drive phân quyền xem..."
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Giao cho thành viên
                  </label>
                  <select
                    value={newTaskForm.assigneeId}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, assigneeId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  >
                    {currentWorkspace?.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Loại nền tảng lưu trữ
                  </label>
                  <select
                    value={newTaskForm.category}
                    onChange={(e) => setNewTaskForm({ ...newTaskForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                  >
                    <option value="DRIVE">Google Drive / Docs</option>
                    <option value="GITHUB">GitHub / GitLab Repo</option>
                    <option value="FIGMA">Figma / UI Prototype</option>
                    <option value="CAD">Bản vẽ CAD / Kỹ thuật</option>
                    <option value="SLIDE">Canva / PowerPoint Slide</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Thiết lập hạn chót (Deadline)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'PLUS_2H', label: '+2 Giờ tới' },
                    { id: 'TOMORROW', label: 'Ngày mai (+24h)' },
                    { id: 'NEXT_3DAYS', label: '+3 Ngày tới' },
                    { id: 'OVERDUE_TEST', label: '⚡ Quá hạn (-2h)' },
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset.id}
                      onClick={() => setNewTaskForm({ ...newTaskForm, deadlinePreset: preset.id })}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border transition ${
                        newTaskForm.deadlinePreset === preset.id
                          ? 'bg-indigo-600 text-white border-indigo-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Giao Việc Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: SUBMIT WORK LINK (FR-003 ZERO-FILE STORAGE)
      ===================================================================== */}
      {submitModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Nộp Link Sản Phẩm [{submitModalTask.id}] (FR-003)
              </h3>
              <button
                onClick={() => setSubmitModalTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTaskSubmit} className="p-6 space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="font-bold text-white">{submitModalTask.title}</div>
                <div className="text-slate-400">
                  Hạn chót: {formatDateTime(submitModalTask.deadline)}
                </div>
                {Date.now() > submitModalTask.deadline && (
                  <div className="text-rose-400 font-semibold">
                    ⚠️ Đã qua giờ Deadline! Hệ thống vẫn cho phép nộp bài nhưng sẽ tự động gắn cờ IS_LATE (Nộp trễ).
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Dán URL bài làm (Google Drive, GitHub PR, Figma, OneDrive...) *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/..."
                  value={submitForm.url}
                  onChange={(e) => setSubmitForm({ ...submitForm, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-sky-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ghi chú bàn giao (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="VD: Đã phân quyền View cho cả nhóm và bổ sung đầy đủ kích thước bản vẽ..."
                  value={submitForm.note}
                  onChange={(e) => setSubmitForm({ ...submitForm, note: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Xác Nhận Nộp Bài (Chuyển sang PENDING REVIEW)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: REJECT TASK WITH MANDATORY REASON (FR-004)
      ===================================================================== */}
      {rejectModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-rose-500/50 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-rose-950/60 border-b border-rose-500/30 flex items-center justify-between">
              <h3 className="text-base font-bold text-rose-200">
                Từ Chối Bài Làm - Yêu Cầu Sửa (FR-004)
              </h3>
              <button
                onClick={() => setRejectModalTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRejectTask} className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Bạn đang từ chối task <strong>[{rejectModalTask.id}]</strong>. Bắt buộc nhập lý do cụ thể để thành viên biết điểm cần sửa (Số lần Reject sẽ được ghi vào Báo cáo cuối kỳ).
              </p>

              <div>
                <label className="block text-xs font-semibold text-rose-300 mb-1">
                  Lý do chưa đạt (Mandatory Feedback) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="VD: Bản vẽ CAD thiếu kích thước tổng thể, link Drive chưa mở quyền truy cập..."
                  value={rejectReasonInput}
                  onChange={(e) => setRejectReasonInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-rose-500/50 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  Xác Nhận REJECT (Trả Về Cho Member)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: HUMAN OVERRIDE - DUYỆT NGOẠI LỆ (FR-005)
      ===================================================================== */}
      {overrideModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-purple-500/50 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-purple-950/60 border-b border-purple-500/30 flex items-center justify-between">
              <h3 className="text-base font-bold text-purple-200 flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Quyền Lực Con Người - Duyệt Ngoại Lệ (FR-005)
              </h3>
              <button
                onClick={() => setOverrideModalTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmHumanOverride} className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Chuyển trạng thái của <strong>[{overrideModalTask.id}]</strong> từ Trễ hạn sang{' '}
                <strong className="text-emerald-400">DONE</strong> nhưng gắn cờ{' '}
                <strong className="text-purple-300">FLAGGED_OVERRIDE</strong> kèm lý do giải trình minh bạch trong báo cáo nộp giảng viên.
              </p>

              <div>
                <label className="block text-xs font-semibold text-purple-300 mb-1">
                  Lý do duyệt ngoại lệ chính đáng *
                </label>
                <textarea
                  rows={3}
                  required
                  value={overrideReasonInput}
                  onChange={(e) => setOverrideReasonInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-purple-500/50 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalTask(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
                >
                  Xác Nhận Duyệt Ngoại Lệ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 6: TRANSFER OWNERSHIP CONFIRMATION (FR-002)
      ===================================================================== */}
      {transferOwnerModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-amber-500/50 p-6 space-y-4">
            <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
              <Crown className="w-5 h-5" /> Xác Nhận Chuyển Giao Quyền OWNER
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn nhường quyền <strong>OWNER (Trưởng nhóm)</strong> cho{' '}
              <strong className="text-white">{transferOwnerModalTarget.name}</strong>? Sau khi chuyển giao, vai trò của bạn sẽ trở thành <strong>ADMIN</strong>.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setTransferOwnerModalTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmTransferOwnership}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950"
              >
                Đồng Ý Chuyển Giao
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 7: TRIGGER EMERGENCY SYNC-MEETING (FR-006)
      ===================================================================== */}
      {showEmergencyTriggerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm no-print">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-rose-500 shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-rose-950/80 border-b border-rose-500/40 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-400" />
                Phát Lệnh Triệu Tập Khẩn Cấp (FR-006 Sync-Meeting)
              </h3>
              <button
                onClick={() => setShowEmergencyTriggerModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTriggerEmergencyMeeting} className="p-6 space-y-4">
              <p className="text-xs text-slate-300">
                Ngay khi bấm nút, toàn bộ màn hình các thành viên đang mở ứng dụng sẽ bật Pop-up Đỏ khẩn cấp yêu cầu tham gia cuộc họp ngay lập tức.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Đường dẫn phòng họp (Google Meet / Zalo Call / Zoom / MS Teams) *
                </label>
                <input
                  type="url"
                  required
                  value={emergencyForm.url}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, url: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-rose-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nội dung thông điệp triệu tập khẩn
                </label>
                <textarea
                  rows={2}
                  required
                  value={emergencyForm.message}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, message: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmergencyTriggerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-lg shadow-rose-600/30"
                >
                  🚨 PHÁT TÍN HIỆU TRIỆU TẬP NGAY
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 8: OFFICIAL ADMINISTRATIVE PDF REPORT PREVIEW & PRINT (FR-007)
      ===================================================================== */}
      {showPdfReportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md p-4 md:p-8 flex justify-center">
          <div className="w-full max-w-4xl space-y-4 my-auto">
            {/* Top Action Bar (Hidden when printing) */}
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 no-print shadow-2xl">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Bản Xem Trước Báo Cáo Hành Chính Chuẩn Nộp Giảng Viên (A4 PDF)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bấm nút "In / Lưu File PDF" bên phải và chọn Destination là "Save as PDF".
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleDownloadCSV}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-emerald-400" /> Tải Kèm File CSV
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/30 flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> 🖨️ In / Lưu File PDF (A4)
                </button>
                <button
                  onClick={() => setShowPdfReportModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* A4 FORMAL DOCUMENT PAPER */}
            <div
              id="oneflow-printable-report"
              className="bg-white text-slate-950 rounded-2xl p-8 md:p-12 shadow-2xl space-y-6 font-serif"
            >
              {/* Formal Vietnamese Administrative Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b-2 border-slate-900 pb-4 text-center">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase">{BRAND.university}</div>
                  <div className="text-xs font-extrabold uppercase text-indigo-900">
                    THƯƠNG HIỆU TẬP THỂ: {BRAND.org}
                  </div>
                  <div className="text-[11px] italic">
                    Hệ thống trích xuất: {BRAND.appName}
                  </div>
                  <div className="w-24 h-0.5 bg-slate-900 mx-auto mt-1" />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="text-xs font-bold">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="w-32 h-0.5 bg-slate-900 mx-auto mt-1" />
                  <div className="text-[11px] italic pt-1">
                    TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1}{' '}
                    năm {new Date().getFullYear()}
                  </div>
                </div>
              </div>

              {/* Report Title */}
              <div className="text-center space-y-1.5 py-2">
                <h1 className="text-lg md:text-xl font-black uppercase tracking-wide">
                  BÁO CÁO ĐÁNH GIÁ HIỆU SUẤT & MỨC ĐỘ ĐÓNG GÓP THÀNH VIÊN NHÓM
                </h1>
                <p className="text-xs font-bold uppercase text-slate-700">
                  Đề tài / Dự án: {currentWorkspace?.name}
                </p>
                <p className="text-xs text-slate-600">
                  Học phần: {currentWorkspace?.courseName} • Lớp: {currentWorkspace?.className} • Mã định danh phòng:{' '}
                  <strong className="font-mono">{currentWorkspace?.inviteCode}</strong>
                </p>
              </div>

              {/* Section 1: Summary Table */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider border-l-4 border-slate-900 pl-2">
                  I. BẢNG TỔNG HỢP ĐÁNH GIÁ HIỆU SUẤT TỪNG THÀNH VIÊN (TRÍCH XUẤT TỰ ĐỘNG)
                </h2>
                <table className="w-full border-collapse border border-slate-900 text-xs">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900">
                      <th className="border border-slate-900 p-2 text-center">STT</th>
                      <th className="border border-slate-900 p-2 text-left">Họ và Tên Thành Viên</th>
                      <th className="border border-slate-900 p-2 text-center">MSSV</th>
                      <th className="border border-slate-900 p-2 text-center">Vai trò</th>
                      <th className="border border-slate-900 p-2 text-center">Hoàn thành</th>
                      <th className="border border-slate-900 p-2 text-center">Tiến độ cá nhân</th>
                      <th className="border border-slate-900 p-2 text-center">Đóng góp tổng</th>
                      <th className="border border-slate-900 p-2 text-center">Trễ hạn</th>
                      <th className="border border-slate-900 p-2 text-center">Số lần Reject</th>
                      <th className="border border-slate-900 p-2 text-center">Ngoại lệ</th>
                      <th className="border border-slate-900 p-2 text-center">Điểm đề xuất</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.membersReport.map((r, idx) => (
                      <tr key={r.member.id}>
                        <td className="border border-slate-900 p-2 text-center">{idx + 1}</td>
                        <td className="border border-slate-900 p-2 font-bold">{r.member.name}</td>
                        <td className="border border-slate-900 p-2 text-center font-mono">
                          {r.member.studentId}
                        </td>
                        <td className="border border-slate-900 p-2 text-center">{r.member.role}</td>
                        <td className="border border-slate-900 p-2 text-center font-bold">
                          {r.doneCount}/{r.totalAssigned}
                        </td>
                        <td className="border border-slate-900 p-2 text-center font-bold">
                          {r.personalCompletionRate}%
                        </td>
                        <td className="border border-slate-900 p-2 text-center font-bold">
                          {r.teamContributionShare}%
                        </td>
                        <td className="border border-slate-900 p-2 text-center">
                          {r.unexcusedLateCount}
                        </td>
                        <td className="border border-slate-900 p-2 text-center">
                          {r.totalRejections}
                        </td>
                        <td className="border border-slate-900 p-2 text-center">
                          {r.overrideCount}
                        </td>
                        <td className="border border-slate-900 p-2 text-center font-bold">
                          {r.rubricScore}/10 ({r.ratingLabel})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section 2: Transparency Log for Human Override & Rejections */}
              <div className="space-y-2">
                <h2 className="text-xs font-bold uppercase tracking-wider border-l-4 border-slate-900 pl-2">
                  II. NHẬT KÝ MINH BẠCH CÁC TRƯỜNG HỢP DUYỆT NGOẠI LỆ (HUMAN OVERRIDE) & KIỂM DUYỆT CHẤT LƯỢNG
                </h2>
                <div className="border border-slate-900 p-3 text-xs space-y-2">
                  {currentWorkspace?.tasks.filter((t) => t.overrideFlag || t.rejectCount > 0)
                    .length === 0 ? (
                    <p className="italic">
                      Không phát sinh trường hợp duyệt ngoại lệ hoặc từ chối bài làm nào.
                    </p>
                  ) : (
                    currentWorkspace?.tasks
                      .filter((t) => t.overrideFlag || t.rejectCount > 0)
                      .map((t) => {
                        const assignee = currentWorkspace.members.find(
                          (m) => m.id === t.assigneeId
                        );
                        return (
                          <div
                            key={t.id}
                            className="pb-2 border-b border-dashed border-slate-400 last:border-none"
                          >
                            <div className="font-bold">
                              • [{t.id}] {t.title} — Phụ trách: {assignee?.name} ({assignee?.studentId})
                            </div>
                            {t.overrideFlag && (
                              <div className="pl-3 text-slate-800">
                                + <strong>[Duyệt Ngoại Lệ - FR-005]:</strong> Được duyệt bởi{' '}
                                {t.overrideBy}. Lý do: “{t.overrideReason}”
                              </div>
                            )}
                            {t.rejectCount > 0 && (
                              <div className="pl-3 text-slate-800">
                                + <strong>[Lịch sử Kiểm duyệt - FR-004]:</strong> Đã yêu cầu sửa lại{' '}
                                {t.rejectCount} lần. Phản hồi: “{t.lastRejectReason}”
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Section 3: Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 text-center text-xs">
                <div className="space-y-16">
                  <div>
                    <div className="font-bold uppercase">XÁC NHẬN CỦA GIẢNG VIÊN CHẤM ĐIỂM</div>
                    <div className="italic text-[11px]">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div className="text-slate-400">....................................................</div>
                </div>

                <div className="space-y-16">
                  <div>
                    <div className="font-bold uppercase">ĐẠI DIỆN NHÓM TRƯỞNG (PROJECT OWNER)</div>
                    <div className="italic text-[11px]">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div className="font-bold uppercase">
                    {currentWorkspace?.members.find((m) => m.role === 'OWNER')?.name ||
                      BRAND.creator}
                  </div>
                </div>
              </div>

              {/* Official System Watermark Footer */}
              <div className="pt-6 border-t border-slate-400 flex items-center justify-between text-[10px] text-slate-600 font-sans">
                <span>
                  Báo cáo được trích xuất tự động từ hệ thống <strong>{BRAND.appName}</strong> ({BRAND.slogan})
                </span>
                <span>
                  Thương hiệu: <strong>{BRAND.org}</strong> • Kiến trúc sư trưởng: <strong>{BRAND.creator}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PERSISTENT BRAND FOOTER
      ===================================================================== */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-4 px-4 text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">{BRAND.appName}</span>
            <span>•</span>
            <span className="text-indigo-400 font-medium">{BRAND.slogan}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Thương hiệu tập thể: <strong className="text-slate-300">{BRAND.org}</strong></span>
            <span>|</span>
            <span>Sáng lập & Phát triển (Cá nhân): <strong className="text-emerald-400 font-mono">{BRAND.creator}</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
}