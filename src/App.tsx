import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  ShieldCheck,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
  FileText,
  Download,
  Siren,
  KeyRound,
  UserCheck,
  Crown,
  Shield,
  User,
  Send,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  Terminal,
  Printer,
  Filter,
  Search,
  Award,
  Link2,
  Eye,
  X,
} from 'lucide-react';
import {
  BRAND,
  STORAGE_KEY_WORKSPACES,
  SESSION_KEY_ACTIVE_WS,
  SESSION_KEY_ACTIVE_MEMBER,
  CHANNEL_NAME,
  createInitialDemoWorkspace,
} from './data/initialData';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
const formatDateTime = (ts?: number | null): string => {
  if (!ts) return '—';
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

const getRemainingTimeText = (deadline: number, status: string) => {
  const diff = deadline - Date.now();
  if (status === 'DONE') return { text: 'Đã hoàn thành', urgent: false };
  if (diff < 0) {
    const overdueHours = Math.abs(Math.round(diff / (3600 * 1000)));
    return { text: `Quá hạn ${overdueHours} giờ`, urgent: true };
  }
  const hours = Math.floor(diff / (3600 * 1000));
  const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  return { text: `Còn ${hours}h ${mins}p`, urgent: hours < 3 };
};

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ============================================================================
// SUB-COMPONENTS (STRICTLY TYPED FOR TSC BUILD)
// ============================================================================
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'override' | 'info' | 'owner';
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const styles: Record<string, string> = {
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    danger: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    override: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
    info: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
    owner: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/50',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant] || styles.neutral} ${className}`}>
      {children}
    </span>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, subtitle, children, maxWidth = 'max-w-lg' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className={`w-full ${maxWidth} bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden`}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function App() {
  const [workspaces, setWorkspaces] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORKSPACES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.error('Load workspace error:', err);
    }
    const initial = [createInitialDemoWorkspace()];
    localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(initial));
    return initial;
  });

  const [activeWsId, setActiveWsId] = useState<string>(() => {
    return sessionStorage.getItem(SESSION_KEY_ACTIVE_WS) || 'ws-k22iuh-default';
  });

  const [activeMemberId, setActiveMemberId] = useState<string>(() => {
    return sessionStorage.getItem(SESSION_KEY_ACTIVE_MEMBER) || 'mem-1';
  });

  const [activeTab, setActiveTab] = useState<string>('tasks');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [dismissedMeetingTime, setDismissedMeetingTime] = useState<number | null>(null);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState<boolean>(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState<boolean>(false);
  const [submitModalTask, setSubmitModalTask] = useState<any | null>(null);
  const [rejectModalTask, setRejectModalTask] = useState<any | null>(null);
  const [overrideModalTask, setOverrideModalTask] = useState<any | null>(null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const [wsFormMode, setWsFormMode] = useState<'JOIN' | 'CREATE'>('JOIN');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('K22IUH');
  const [joinNameInput, setJoinNameInput] = useState<string>('');
  const [joinStudentIdInput, setJoinStudentIdInput] = useState<string>('');
  const [newWsName, setNewWsName] = useState<string>('');
  const [newWsClass, setNewWsClass] = useState<string>('DHHTTT18B - K22 · IUH');
  const [newWsOwnerName, setNewWsOwnerName] = useState<string>('MR_TRIPLEF.EXE');

  const [taskTitle, setTaskTitle] = useState<string>('');
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [taskCategory, setTaskCategory] = useState<string>('GITHUB');
  const [taskAssignee, setTaskAssignee] = useState<string>('mem-3');
  const [taskDeadlineHours, setTaskDeadlineHours] = useState<number>(24);

  const [submissionUrlInput, setSubmissionUrlInput] = useState<string>('');
  const [submissionNoteInput, setSubmissionNoteInput] = useState<string>('');
  const [rejectReasonInput, setRejectReasonInput] = useState<string>('');
  const [overrideReasonInput, setOverrideReasonInput] = useState<string>('');

  const [emergencyUrlInput, setEmergencyUrlInput] = useState<string>('https://meet.google.com/k22-iuh-sync');
  const [emergencyMsgInput, setEmergencyMsgInput] = useState<string>(
    'Họp khẩn toàn nhóm 10 phút rà soát tiến độ và chuẩn bị bảo vệ tiểu luận!'
  );

  const showToast = useCallback((message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3600);
  }, []);

  // ============================================================================
  // MULTI-TAB REAL-TIME SYNC
  // ============================================================================
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel(CHANNEL_NAME);
      bc.onmessage = (event) => {
        if (event.data && event.data.type === 'SYNC_WORKSPACES') {
          setWorkspaces(event.data.payload);
        }
      };
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_WORKSPACES && e.newValue) {
        try {
          setWorkspaces(JSON.parse(e.newValue));
        } catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const commitWorkspaces = useCallback((updater: (prev: any[]) => any[]) => {
    setWorkspaces((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      localStorage.setItem(STORAGE_KEY_WORKSPACES, JSON.stringify(next));
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.postMessage({ type: 'SYNC_WORKSPACES', payload: next });
        bc.close();
      }
      return next;
    });
  }, []);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_ACTIVE_WS, activeWsId);
  }, [activeWsId]);

  useEffect(() => {
    sessionStorage.setItem(SESSION_KEY_ACTIVE_MEMBER, activeMemberId);
  }, [activeMemberId]);

  const currentWorkspace = useMemo(() => {
    return workspaces.find((w: any) => w.id === activeWsId) || workspaces[0];
  }, [workspaces, activeWsId]);

  const currentMember = useMemo(() => {
    if (!currentWorkspace) return null;
    return (
      currentWorkspace.members.find((m: any) => m.id === activeMemberId) ||
      currentWorkspace.members[0]
    );
  }, [currentWorkspace, activeMemberId]);

  const isAdminOrOwner = currentMember?.role === 'OWNER' || currentMember?.role === 'ADMIN';
  const isOwner = currentMember?.role === 'OWNER';

  const getEffectiveStatus = useCallback((task: any): string => {
    if (task.status === 'TODO' && Date.now() > task.deadline) {
      return 'OVERDUE';
    }
    return task.status;
  }, []);

  // ============================================================================
  // BUSINESS LOGIC HANDLERS (FR-001 -> FR-007)
  // ============================================================================
  const handleCreateOrJoinWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (wsFormMode === 'JOIN') {
      const code = joinCodeInput.trim().toUpperCase();
      const targetWs = workspaces.find((w: any) => w.inviteCode.toUpperCase() === code);
      if (!targetWs) {
        showToast(`Không tìm thấy Không gian làm việc với mã mời "${code}"!`, 'danger');
        return;
      }
      const cleanName = joinNameInput.trim();
      if (!cleanName) {
        showToast('Vui lòng nhập Họ tên hoặc Biệt danh của bạn!', 'warning');
        return;
      }

      const existingMember = targetWs.members.find(
        (m: any) => m.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (existingMember) {
        setActiveWsId(targetWs.id);
        setActiveMemberId(existingMember.id);
        setIsWorkspaceModalOpen(false);
        showToast(`Chào mừng trở lại, ${existingMember.name} (${existingMember.role})!`, 'success');
      } else {
        const newMemId = `mem-${Date.now()}`;
        const colors = [
          'from-cyan-500 to-blue-600',
          'from-violet-500 to-purple-600',
          'from-emerald-500 to-green-600',
          'from-rose-500 to-red-600',
        ];
        const newMember = {
          id: newMemId,
          name: cleanName,
          studentId: joinStudentIdInput.trim() || '2265XXXX',
          role: 'MEMBER',
          avatarColor: colors[targetWs.members.length % colors.length],
          specialty: 'Project Member',
          joinedAt: Date.now(),
        };

        commitWorkspaces((prev) =>
          prev.map((w: any) =>
            w.id === targetWs.id
              ? {
                  ...w,
                  members: [...w.members, newMember],
                  logs: [
                    {
                      id: `log-${Date.now()}`,
                      time: Date.now(),
                      actor: cleanName,
                      type: 'SYSTEM',
                      text: `Thành viên mới "${cleanName}" đã gia nhập nhóm bằng mã mời ${code}.`,
                    },
                    ...w.logs,
                  ],
                }
              : w
          )
        );
        setActiveWsId(targetWs.id);
        setActiveMemberId(newMemId);
        setIsWorkspaceModalOpen(false);
        setJoinNameInput('');
        showToast(`Đã gia nhập "${targetWs.name}" với vai trò MEMBER!`, 'success');
      }
    } else {
      if (!newWsName.trim() || !newWsOwnerName.trim()) {
        showToast('Vui lòng nhập đầy đủ Tên dự án và Tên người tạo!', 'warning');
        return;
      }
      const code = generateInviteCode();
      const newWsId = `ws-${Date.now()}`;
      const ownerId = `mem-${Date.now()}`;
      const newWorkspace = {
        id: newWsId,
        name: newWsName.trim(),
        courseName: 'Kỹ Năng Làm Việc Nhóm (IUH)',
        className: newWsClass.trim() || 'NUMBERONE K22 · IUH',
        inviteCode: code,
        createdAt: Date.now(),
        emergencyMeeting: {
          active: false,
          url: 'https://meet.google.com',
          message: '',
          triggeredBy: newWsOwnerName.trim(),
          triggeredAt: null as number | null,
        },
        members: [
          {
            id: ownerId,
            name: newWsOwnerName.trim(),
            studentId: '22654321',
            role: 'OWNER',
            avatarColor: 'from-indigo-500 to-purple-600',
            specialty: 'Project Owner / Leader',
            joinedAt: Date.now(),
          },
        ],
        tasks: [],
        logs: [
          {
            id: `log-${Date.now()}`,
            time: Date.now(),
            actor: newWsOwnerName.trim(),
            type: 'SYSTEM',
            text: `Khởi tạo Không gian làm việc mới "${newWsName.trim()}" với Mã mời: ${code}.`,
          },
        ],
      };

      commitWorkspaces((prev) => [...prev, newWorkspace]);
      setActiveWsId(newWsId);
      setActiveMemberId(ownerId);
      setIsWorkspaceModalOpen(false);
      setNewWsName('');
      showToast(`Đã tạo dự án mới! Mã mời của nhóm là: ${code}`, 'success');
    }
  };

  const handleToggleAdmin = (targetMemberId: string) => {
    if (!isOwner) {
      showToast('Chỉ có OWNER mới có quyền bổ nhiệm hoặc bãi nhiệm ADMIN!', 'danger');
      return;
    }
    commitWorkspaces((prev) =>
      prev.map((w: any) => {
        if (w.id !== currentWorkspace.id) return w;
        const target = w.members.find((m: any) => m.id === targetMemberId);
        if (!target || target.role === 'OWNER') return w;
        const nextRole = target.role === 'ADMIN' ? 'MEMBER' : 'ADMIN';
        return {
          ...w,
          members: w.members.map((m: any) =>
            m.id === targetMemberId ? { ...m, role: nextRole } : m
          ),
          logs: [
            {
              id: `log-${Date.now()}`,
              time: Date.now(),
              actor: currentMember.name,
              type: 'ROLE',
              text: `Chuyển đổi quyền của "${target.name}" từ ${target.role} sang ${nextRole}.`,
            },
            ...w.logs,
          ],
        };
      })
    );
    showToast('Đã cập nhật phân quyền thành viên (Dynamic RBAC)!', 'success');
  };

  const handleTransferOwnership = (targetMemberId: string) => {
    if (!isOwner) return;
    const target = currentWorkspace.members.find((m: any) => m.id === targetMemberId);
    if (!target || target.id === currentMember.id) return;

    commitWorkspaces((prev) =>
      prev.map((w: any) => {
        if (w.id !== currentWorkspace.id) return w;
        return {
          ...w,
          members: w.members.map((m: any) => {
            if (m.id === currentMember.id) return { ...m, role: 'ADMIN' };
            if (m.id === targetMemberId) return { ...m, role: 'OWNER' };
            return m;
          }),
          logs: [
            {
              id: `log-${Date.now()}`,
              time: Date.now(),
              actor: currentMember.name,
              type: 'ROLE',
              text: `Đã chuyển giao quyền tối cao (OWNER) cho thành viên "${target.name}".`,
            },
            ...w.logs,
          ],
        };
      })
    );
    showToast(`Đã chuyển giao quyền OWNER cho ${target.name}!`, 'info');
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrOwner) {
      showToast('Chỉ OWNER hoặc ADMIN mới có quyền tạo Task!', 'danger');
      return;
    }
    if (!taskTitle.trim()) {
      showToast('Vui lòng nhập tên công việc (Task Title)!', 'warning');
      return;
    }

    const nextNum = 101 + currentWorkspace.tasks.length;
    const newTaskId = `TSK-${nextNum}`;
    const deadlineMs = Date.now() + Number(taskDeadlineHours) * 3600 * 1000;
    const assigneeObj = currentWorkspace.members.find((m: any) => m.id === taskAssignee);

    const newTask = {
      id: newTaskId,
      title: taskTitle.trim(),
      description: taskDesc.trim() || 'Thực hiện đúng tiêu chuẩn kỹ thuật của nhóm và nộp link đúng hạn.',
      category: taskCategory,
      assigneeId: taskAssignee,
      createdBy: currentMember.id,
      createdAt: Date.now(),
      deadline: deadlineMs,
      status: 'TODO',
      submissionUrl: '',
      submissionNote: '',
      submittedAt: null as number | null,
      isLate: false,
      rejectCount: 0,
      lastRejectReason: '',
      overrideFlag: false,
      overrideReason: '',
      overrideBy: '',
      reviewedBy: '',
      reviewedAt: null as number | null,
    };

    commitWorkspaces((prev) =>
      prev.map((w: any) =>
        w.id === currentWorkspace.id
          ? {
              ...w,
              tasks: [newTask, ...w.tasks],
              logs: [
                {
                  id: `log-${Date.now()}`,
                  time: Date.now(),
                  actor: currentMember.name,
                  type: 'TASK',
                  text: `Giao task mới [${newTaskId}] "${newTask.title}" cho ${assigneeObj?.name || 'Thành viên'}.`,
                },
                ...w.logs,
              ],
            }
          : w
      )
    );

    setTaskTitle('');
    setTaskDesc('');
    setIsCreateTaskModalOpen(false);
    showToast(`Đã tạo và phân công task [${newTaskId}] thành công!`, 'success');
  };

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitModalTask) return;
    const rawUrl = submissionUrlInput.trim();
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      showToast('URL nộp bài phải bắt đầu bằng https:// hoặc http:// (VD: link Drive, GitHub, Figma)', 'danger');
      return;
    }

    const now = Date.now();
    const isSubmittedLate = now > submitModalTask.deadline || submitModalTask.isLate;

    commitWorkspaces((prev) =>
      prev.map((w: any) => {
        if (w.id !== currentWorkspace.id) return w;
        return {
          ...w,
          tasks: w.tasks.map((t: any) =>
            t.id === submitModalTask.id
              ? {
                  ...t,
                  status: 'PENDING_REVIEW',
                  submissionUrl: rawUrl,
                  submissionNote: submissionNoteInput.trim() || 'Đã hoàn thành và đính kèm link sản phẩm.',
                  submittedAt: now,
                  isLate: isSubmittedLate,
                }
              : t
          ),
          logs: [
            {
              id: `log-${now}`,
              time: now,
              actor: currentMember.name,
              type: 'SUBMIT',
              text: `Đã nộp link sản phẩm cho task [${submitModalTask.id}]${isSubmittedLate ? ' (Ghi nhận NỘP TRỄ HẠN)' : ' (Đúng hạn)'}. Chuyển sang PENDING REVIEW.`,
            },
            ...w.logs,
          ],
        };
      })
    );

    setSubmitModalTask(null);
    setSubmissionUrlInput('');
    setSubmissionNoteInput('');
    showToast(
      isSubmittedLate
        ? 'Đã nộp bài (Hệ thống tự động gắn cờ NỘP TRỄ do quá giờ Deadline)!'
        : 'Đã nộp bài thành công! Trạng thái chuyển sang Chờ Duyệt (PENDING REVIEW).',
      isSubmittedLate ? 'warning' : 'success'
    );
  };

  const handleApproveTask = (task: any) => {
    if (!isAdminOrOwner) {
      showToast('Chỉ OWNER hoặc ADMIN mới có quyền Duyệt bài (Approve)!', 'danger');
      return;
    }
    const now = Date.now();
    const assignee = currentWorkspace.members.find((m: any) => m.id === task.assigneeId);

    commitWorkspaces((prev) =>
      prev.map((w: any) => {
        if (w.id !== currentWorkspace.id) return w;
        return {
          ...w,
          tasks: w.tasks.map((t: any) =>
            t.id === task.id
              ? {
                  ...t,
                  status: 'DONE',
                  reviewedBy: currentMember.name,
                  reviewedAt: now,
                }
              : t
          ),
          logs: [
            {
              id: `log-${now}`,
              time: now,
              actor: currentMember.name,
              type: 'APPROVE',
              text: `Đã DUYỆT (APPROVE) task [${task.id}] của ${assignee?.name || ''}. Trạng thái: DONE.`,
            },
            ...w.logs,
          ],
        };
      })
    );
    showToast(`Đã duyệt hoàn thành (DONE) cho task [${task.id}]!`, 'success');
  };

  const handleRejectTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalTask || !isAdminOrOwner) return;
    if (!rejectReasonInput.trim()) {
      showToast('Bắt buộc phải nhập lý do từ chối để thành viên biết điểm cần sửa!', 'danger');
      return;
    }

    const now = Date.now();
    const assignee = currentWorkspace.members.find((m: any) => m.id === rejectModalTask.assigneeId);

    commitWorkspaces((prev) =>
      prev.map((w: any) => {
        if (w.id !== currentWorkspace.id) return w;
        return {
          ...w,
          tasks: w.tasks.map((t: any) =>
            t.id === rejectModalTask.id
              ? {
                  ...t,
                  status: 'REJECTED',
                  rejectCount: (t.rejectCount || 0) + 1,
                  lastRejectReason: rejectReasonInput.trim(),
                  reviewedBy: currentMember.name,
                  reviewedAt: now,
                }
              : t
          ),
          logs: [
            {
              id: `log-${now}`,
              time: now,
              actor: currentMember.name,
              type: 'REJECT',
              text: `Đã TỪ CHỐI (REJECT) task [${rejectModalTask.id}] của ${assignee?.name || ''}. Lý do: "${rejectReasonInput.trim()}"`,
            },
            ...w.logs,
          ],
        };
      })
    );

    setRejectModalTask(null);
    setRejectReasonInput('');
    showToast(`Đã trả bài [${rejectModalTask.id}] kèm yêu cầu chỉnh sửa!`, 'warning');
  };

  const handleOverrideTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideModalTask || !isAdminOrOwner) return;
    if (!overrideReasonInput.trim()) {
      showToast('Bắt buộc nhập lý do Duyệt Ngoại Lệ để lưu vết minh bạch trong báo cáo!', 'danger');
      return;
    }

    const now = Date.now();
    const assignee = currentWorkspace.members.find((m: any) => m.id === overrideModalTask.assigneeId);

    commitWorkspaces((prev) =>
      prev.map((w: any) => {
        if (w.id !== currentWorkspace.id) return w;
        return {
          ...w,
          tasks: w.tasks.map((t: any) =>
            t.id === overrideModalTask.id
              ? {
                  ...t,
                  status: 'DONE',
                  isLate: true,
                  overrideFlag: true,
                  overrideReason: overrideReasonInput.trim(),
                  overrideBy: currentMember.name,
                  reviewedBy: currentMember.name,
                  reviewedAt: now,
                  submissionUrl: t.submissionUrl || 'https://drive.google.com/drive/u/0/folders/override-verified',
                  submissionNote: t.submissionNote || 'Được Trưởng nhóm/Admin xác nhận hoàn thành thông qua cơ chế Duyệt Ngoại Lệ (FR-005).',
                  submittedAt: t.submittedAt || now,
                }
              : t
          ),
          logs: [
            {
              id: `log-${now}`,
              time: now,
              actor: currentMember.name,
              type: 'OVERRIDE',
              text: `Đã DUYỆT NGOẠI LỆ (Human Override) cho task [${overrideModalTask.id}] của ${assignee?.name || ''}. Lý do: "${overrideReasonInput.trim()}"`,
            },
            ...w.logs,
          ],
        };
      })
    );

    setOverrideModalTask(null);
    setOverrideReasonInput('');
    showToast(`Đã kích hoạt Quyền Duyệt Ngoại Lệ (FR-005) cho task [${overrideModalTask.id}]!`, 'success');
  };

  const handleTriggerEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrOwner) return;
    if (!emergencyUrlInput.trim().startsWith('http')) {
      showToast('Vui lòng nhập đường dẫn Google Meet / Zalo Call hợp lệ (https://...)', 'danger');
      return;
    }

    const now = Date.now();
    commitWorkspaces((prev) =>
      prev.map((w: any) =>
        w.id === currentWorkspace.id
          ? {
              ...w,
              emergencyMeeting: {
                active: true,
                url: emergencyUrlInput.trim(),
                message: emergencyMsgInput.trim() || 'Triệu tập họp khẩn cấp toàn nhóm ngay lập tức!',
                triggeredBy: currentMember.name,
                triggeredAt: now,
              },
              logs: [
                {
                  id: `log-${now}`,
                  time: now,
                  actor: currentMember.name,
                  type: 'MEETING',
                  text: `Đã phát lệnh TRIỆU TẬP KHẨN CẤP (Sync-Meeting) tới toàn bộ thành viên đang mở ứng dụng.`,
                },
                ...w.logs,
              ],
            }
          : w
      )
    );

    setDismissedMeetingTime(null);
    setIsEmergencyModalOpen(false);
    showToast('Đã phát tín hiệu Pop-up Đỏ Triệu Tập Khẩn Cấp trên toàn bộ các Tab!', 'danger');
  };

  const handleStopEmergency = () => {
    commitWorkspaces((prev) =>
      prev.map((w: any) =>
        w.id === currentWorkspace.id
          ? {
              ...w,
              emergencyMeeting: {
                ...w.emergencyMeeting,
                active: false,
              },
            }
          : w
      )
    );
    showToast('Đã kết thúc lệnh triệu tập khẩn cấp.', 'info');
  };

  const handleSimulateOverdueDemo = () => {
    const now = Date.now();
    const hour = 3600 * 1000;
    const demoTaskId = `TSK-${101 + currentWorkspace.tasks.length}`;
    const targetMember =
      currentWorkspace.members.find((m: any) => m.role === 'MEMBER') || currentWorkspace.members[0];

    const overdueTask = {
      id: demoTaskId,
      title: 'Bổ sung Bản vẽ Mạch & Lưu đồ Thuật toán (Mô phỏng Quá hạn để Test FR-005)',
      description: 'Task tạo nhanh phục vụ Hội đồng chấm bài kiểm chứng tính năng Tự động báo Quá hạn (OVERDUE) và Duyệt Ngoại Lệ.',
      category: 'CAD',
      assigneeId: targetMember.id,
      createdBy: currentMember.id,
      createdAt: now - 26 * hour,
      deadline: now - 2 * hour,
      status: 'TODO',
      submissionUrl: '',
      submissionNote: '',
      submittedAt: null as number | null,
      isLate: false,
      rejectCount: 0,
      lastRejectReason: '',
      overrideFlag: false,
      overrideReason: '',
      overrideBy: '',
      reviewedBy: '',
      reviewedAt: null as number | null,
    };

    commitWorkspaces((prev) =>
      prev.map((w: any) =>
        w.id === currentWorkspace.id
          ? {
              ...w,
              tasks: [overdueTask, ...w.tasks],
              logs: [
                {
                  id: `log-${now}`,
                  time: now,
                  actor: currentMember.name,
                  type: 'SYSTEM',
                  text: `[DEMO SIMULATOR] Tạo nhanh task quá hạn [${demoTaskId}] cho ${targetMember.name} để kiểm thử FR-005.`,
                },
                ...w.logs,
              ],
            }
          : w
      )
    );
    showToast(`Đã tạo task quá hạn [${demoTaskId}]! Bạn có thể bấm "Duyệt Ngoại Lệ" ngay trên thẻ task.`, 'warning');
  };

  const handleResetDemoData = () => {
    const fresh = [createInitialDemoWorkspace()];
    commitWorkspaces(() => fresh);
    setActiveWsId('ws-k22iuh-default');
    setActiveMemberId('mem-1');
    setDismissedMeetingTime(null);
    showToast('Đã khôi phục toàn bộ dữ liệu mẫu chuẩn Gate 3 Baseline!', 'info');
  };

  // ============================================================================
  // REPORT ANALYTICS ENGINE (FR-007 + PATCH #3 DUAL METRICS)
  // ============================================================================
  const reportMetrics = useMemo(() => {
    if (!currentWorkspace) return { rows: [], summary: {} as any };
    const totalProjectTasks = currentWorkspace.tasks.length;

    const rows = currentWorkspace.members.map((member: any) => {
      const assignedTasks = currentWorkspace.tasks.filter((t: any) => t.assigneeId === member.id);
      const assignedCount = assignedTasks.length;
      const doneTasks = assignedTasks.filter((t: any) => t.status === 'DONE');
      const doneCount = doneTasks.length;

      const lateCount = assignedTasks.filter(
        (t: any) => t.isLate || getEffectiveStatus(t) === 'OVERDUE'
      ).length;

      const totalRejections = assignedTasks.reduce((sum: number, t: any) => sum + (t.rejectCount || 0), 0);
      const overrideTasks = assignedTasks.filter((t: any) => t.overrideFlag);

      const personalCompletionRate =
        assignedCount > 0 ? Math.round((doneCount / assignedCount) * 100) : 0;

      const projectContributionRate =
        totalProjectTasks > 0 ? Math.round((doneCount / totalProjectTasks) * 100) : 0;

      const rawScore =
        personalCompletionRate * 0.7 +
        Math.min(100, projectContributionRate * 3) * 0.3 -
        totalRejections * 5 -
        Math.max(0, lateCount - overrideTasks.length) * 10;
      const finalScore = assignedCount === 0 ? 0 : Math.max(40, Math.min(100, Math.round(rawScore)));

      let gradeLabel = 'Đạt yêu cầu';
      if (finalScore >= 90) gradeLabel = 'Xuất sắc (Key Contributor)';
      else if (finalScore >= 80) gradeLabel = 'Tốt (Đúng tiến độ)';
      else if (finalScore < 65) gradeLabel = 'Cần chấn chỉnh';

      return {
        member,
        assignedCount,
        doneCount,
        personalCompletionRate,
        projectContributionRate,
        lateCount,
        totalRejections,
        overrideCount: overrideTasks.length,
        overrideReasons: overrideTasks.map((t: any) => `[${t.id}] ${t.overrideReason}`).join('; '),
        finalScore,
        gradeLabel,
      };
    });

    const totalDone = currentWorkspace.tasks.filter((t: any) => t.status === 'DONE').length;
    const totalPending = currentWorkspace.tasks.filter((t: any) => t.status === 'PENDING_REVIEW').length;
    const totalLateOrOverdue = currentWorkspace.tasks.filter(
      (t: any) => t.isLate || getEffectiveStatus(t) === 'OVERDUE'
    ).length;
    const totalOverrides = currentWorkspace.tasks.filter((t: any) => t.overrideFlag).length;

    return {
      rows,
      summary: {
        totalProjectTasks,
        totalDone,
        totalPending,
        totalLateOrOverdue,
        totalOverrides,
        overallProgress:
          totalProjectTasks > 0 ? Math.round((totalDone / totalProjectTasks) * 100) : 0,
      },
    };
  }, [currentWorkspace, getEffectiveStatus]);

  const handleExportCSV = () => {
    if (!isAdminOrOwner) {
      showToast('Chỉ OWNER hoặc ADMIN mới có quyền xuất báo cáo đánh giá!', 'danger');
      return;
    }

    const headers = [
      'MSSV',
      'Ho va Ten Thanh Vien',
      'Vai Tro (Role)',
      'So Task Duoc Giao',
      'So Task Hoan Thanh (DONE)',
      'Tien Do Ca Nhan (%)',
      'Ty Trong Dong Gop Nhom (%)',
      'So Lan Tre Han (LATE/OVERDUE)',
      'So Lan Bi Tra Bai (REJECT)',
      'So Lan Duyet Ngoai Le (OVERRIDE)',
      'Ly Do Duyet Ngoai Le (Minh Bach)',
      'Diem Hieu Suat De Xuat (Thang 100)',
      'Xep Loai Danh Gia',
    ];

    const csvRows = reportMetrics.rows.map((r: any) => [
      `"${r.member.studentId}"`,
      `"${r.member.name}"`,
      `"${r.member.role}"`,
      r.assignedCount,
      r.doneCount,
      `${r.personalCompletionRate}%`,
      `${r.projectContributionRate}%`,
      r.lateCount,
      r.totalRejections,
      r.overrideCount,
      `"${(r.overrideReasons || 'Khong co').replace(/"/g, '""')}"`,
      r.finalScore,
      `"${r.gradeLabel}"`,
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...csvRows.map((row: any[]) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BAO_CAO_ONEFLOW_${currentWorkspace.inviteCode}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Đã xuất và tải xuống file Excel (.CSV) thành công!', 'success');
  };

  const filteredTasks = useMemo(() => {
    if (!currentWorkspace) return [];
    return currentWorkspace.tasks.filter((task: any) => {
      const effStatus = getEffectiveStatus(task);
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'LATE_OR_OVERDUE'
          ? task.isLate || effStatus === 'OVERDUE'
          : statusFilter === 'OVERRIDE'
          ? task.overrideFlag
          : effStatus === statusFilter;

      const matchAssignee =
        assigneeFilter === 'ALL' ? true : task.assigneeId === assigneeFilter;

      const matchSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchStatus && matchAssignee && matchSearch;
    });
  }, [currentWorkspace, statusFilter, assigneeFilter, searchQuery, getEffectiveStatus]);

  const showEmergencyBanner =
    currentWorkspace?.emergencyMeeting?.active &&
    dismissedMeetingTime !== currentWorkspace?.emergencyMeeting?.triggeredAt;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
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
            background: #ffffff !important;
            color: #000000 !important;
            padding: 16px !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900 border border-slate-700 shadow-2xl rounded-xl px-4 py-3 flex items-center gap-3">
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />}
          {toast.type === 'danger' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />}
          <span className="text-sm font-medium text-slate-100">{toast.message}</span>
        </div>
      )}

      {showEmergencyBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-950/85 backdrop-blur-md">
          <div className="w-full max-w-xl bg-slate-900 border-2 border-rose-500 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl animate-bounce">
                  <Siren className="w-7 h-7 text-white" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-rose-100 block">
                    FR-006 · TÍN HIỆU TRIỆU TẬP KHẨN CẤP (REAL-TIME SYNC-MEETING)
                  </span>
                  <h2 className="text-xl font-extrabold text-white">
                    LỆNH TRIỆU TẬP HỌP NHÓM KHẨN CẤP!
                  </h2>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
                <p className="text-xs text-rose-300 font-semibold uppercase mb-1">
                  Thông điệp từ {currentWorkspace.emergencyMeeting.triggeredBy}:
                </p>
                <p className="text-base font-medium text-white">
                  "{currentWorkspace.emergencyMeeting.message}"
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Thời점 phát lệnh: {formatDateTime(currentWorkspace.emergencyMeeting.triggeredAt)}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <a
                  href={currentWorkspace.emergencyMeeting.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-3.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-center flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <ExternalLink className="w-5 h-5" />
                  THAM GIA PHÒNG HỌP NGAY LẬP TỨC
                </a>

                <button
                  onClick={() =>
                    setDismissedMeetingTime(currentWorkspace.emergencyMeeting.triggeredAt)
                  }
                  className="w-full sm:w-auto py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
                >
                  Đã biết (Ẩn trên Tab này)
                </button>
              </div>

              {isAdminOrOwner && (
                <div className="pt-3 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={handleStopEmergency}
                    className="text-xs text-rose-400 hover:text-rose-300 underline font-medium"
                  >
                    [Quyền Admin/Owner] Tắt tín hiệu triệu tập cho toàn bộ nhóm
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOP BAR: MULTI-TAB DEMO SWITCHER */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border-b border-indigo-500/30 px-4 py-2 text-xs no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40">
              <Sparkles className="w-3.5 h-3.5" /> CHẾ ĐỘ DEMO HỘI ĐỒNG (sessionStorage Tab-Isolated)
            </span>
            <span className="text-slate-400 hidden md:inline">
              Đóng vai nhanh trên Tab này (Mở 2 Tab cạnh nhau để test đồng bộ Real-time):
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {currentWorkspace?.members.map((m: any) => {
              const active = m.id === currentMember?.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveMemberId(m.id);
                    showToast(`Đang đóng vai: ${m.name} (${m.role}) trên Tab hiện tại`, 'info');
                  }}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 border ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {m.role === 'OWNER' && <Crown className="w-3 h-3 text-amber-300" />}
                  {m.role === 'ADMIN' && <Shield className="w-3 h-3 text-emerald-300" />}
                  {m.role === 'MEMBER' && <User className="w-3 h-3 text-slate-400" />}
                  <span>{m.name}</span>
                  <span className="text-[10px] opacity-75">({m.role})</span>
                </button>
              );
            })}

            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

            <button
              onClick={handleSimulateOverdueDemo}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1 transition-colors"
              title="Tạo ngay 1 task đã quá giờ Deadline để biểu diễn tính năng Duyệt Ngoại Lệ (FR-005)"
            >
              <Clock className="w-3.5 h-3.5" /> + Mô phỏng Task Quá Hạn
            </button>

            <button
              onClick={handleResetDemoData}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700"
              title="Khôi phục dữ liệu mẫu ban đầu"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN BRAND HEADER */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md no-print">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg border border-white/15">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {BRAND.appName}
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-extrabold rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-
