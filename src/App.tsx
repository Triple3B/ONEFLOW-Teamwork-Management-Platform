
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
