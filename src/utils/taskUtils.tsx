
import React from 'react';

import {
  Crown,
  Shield,
  UserCheck,
  FolderGit2,
  Figma,
  FileCode2,
  HardDrive,
  Presentation,
} from 'lucide-react';

// ============================================================================
// HELPER UTILITIES
// ============================================================================

// ============================================================================
// 1. FORMAT DATE TIME
// ============================================================================
export const formatDateTime = (
  ts: number | string | null | undefined
) => {
  if (!ts) return '—';

  const d = new Date(ts);

  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ============================================================================
// 2. GET EFFECTIVE TASK STATUS
// ============================================================================
export const getEffectiveTaskStatus = (
  task: {
    status: string;
    deadline?: number | null;
  },
  now: number = Date.now()
) => {
  if (task.status === 'DONE') return 'DONE';

  if (task.status === 'PENDING_REVIEW') {
    return 'PENDING_REVIEW';
  }

  if (task.status === 'REJECTED') {
    return 'REJECTED';
  }

  if (task.status === 'TODO' && now > (task.deadline ?? Infinity)) {
    return 'OVERDUE';
  }

  return 'TODO';
};

// ============================================================================
// 3. GET CATEGORY META
// ============================================================================
export const getCategoryMeta = (cat: string) => {
  switch (cat) {
    case 'GITHUB':
      return {
        label: 'GitHub / Source',
        icon: FolderGit2,
        color: 'text-slate-200 bg-slate-800 border-slate-600',
      };

    case 'FIGMA':
      return {
        label: 'Figma / UI-UX',
        icon: Figma,
        color: 'text-pink-300 bg-pink-950/60 border-pink-700/60',
      };

    case 'CAD':
      return {
        label: 'CAD / Engineering',
        icon: FileCode2,
        color: 'text-cyan-300 bg-cyan-950/60 border-cyan-700/60',
      };

    case 'SLIDE':
      return {
        label: 'Slide / Pitch Deck',
        icon: Presentation,
        color: 'text-amber-300 bg-amber-950/60 border-amber-700/60',
      };

    default:
      return {
        label: 'Google Drive / Docs',
        icon: HardDrive,
        color: 'text-blue-300 bg-blue-950/60 border-blue-700/60',
      };
  }
};

// ============================================================================
// 4. GET ROLE BADGE
// ============================================================================
export const getRoleBadge = (role: string) => {
  if (role === 'OWNER') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-400/40 shadow-sm">
        <Crown className="w-3.5 h-3.5 text-amber-400" />
        OWNER
      </span>
    );
  }

  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
        <Shield className="w-3.5 h-3.5 text-indigo-400" />
        ADMIN
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600">
      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
      MEMBER
    </span>
  );
};
