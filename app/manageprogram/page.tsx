'use client';

import AppShell from '@/components/AppShell';
import React, { useState, useEffect } from 'react';
import { getCertificationsEarnedCount } from '@/lib/certifications';
import { apiUrl } from '@/lib/api';
import { normalizeResourceUrl } from '@/lib/url';

// Team options available when creating/editing a user (mirrors signup).
const TEAM_OPTIONS = ['TAC', 'Change Management', 'Client Director', 'CEM', 'CAC', 'IM', 'Management'];

// --- CONFIGURATION DEFINITIONS ---
const PRODUCTS = [
  { id: 'rtp', name: 'Ranger RTP', icon: '🤖', certs: ['l1', 'l2', 'l3'], sections: [{ title: 'Core Architecture', mods: [{ code: 'MOD-101', title: 'Introduction to Butler', content: { l1: 'Default content text' }, docLink: '', videoLink: '', videoTitle: '' }] }] },
  { id: 'ttp', name: 'Ranger TTP', icon: '📦', certs: ['l1', 'l2', 'l3'], sections: [] },
  { id: 'tools', name: 'Tools & Techniques', icon: '🛠️', certs: ['specialist'], sections: [] },
];

const CMETA: Record<string, { name: string; slug: string; icon: string; dt: number; dp: number }> = {
  l1: { name: 'PathFinder', slug: 'pathfinder', icon: '🧭', dt: 60, dp: 80 },
  l2: { name: 'Navigator', slug: 'navigator', icon: '🗺️', dt: 90, dp: 85 },
  l3: { name: 'GrandMaster', slug: 'grandmaster', icon: '🏆', dt: 90, dp: 85 },
  specialist: { name: 'Tools Specialist', slug: 'specialist', icon: '🛠️', dt: 90, dp: 85 },
};

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; rawGlow: string }> = {
  l1: { bg: 'rgba(99, 102, 241, 0.15)', border: '#6366f1', text: '#a5b4fc', rawGlow: '99, 102, 241' },
  l2: { bg: 'rgba(56, 189, 248, 0.12)', border: '#38bdf8', text: '#7dd3fc', rawGlow: '56, 189, 248' },
  l3: { bg: 'rgba(234, 179, 8, 0.12)', border: '#eab308', text: '#fde047', rawGlow: '234, 179, 8' },
  specialist: { bg: 'rgba(16, 185, 129, 0.12)', border: '#10b981', text: '#6ee7b7', rawGlow: '16, 185, 129' },
};

// --- INTERFACES MATCHING BACKEND SCHEMA ---
interface AdminModuleResource {
  label: string;
  type: string;
  url: string;
}

interface AdminModule {
  code: string;
  title: string;
  description: string;
  resources?: AdminModuleResource[];
}

interface AdminTopic {
  title: string;
  modules: AdminModule[];
}

interface AdminLevel {
  name: string;
  topics: AdminTopic[];
}

function compareModuleCode(a: string, b: string): number {
  const aParts = (a || "").split(".").map(Number);
  const bParts = (b || "").split(".").map(Number);
  const len = Math.max(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff) return diff;
  }
  return 0;
}

interface AdminSyllabusPayload {
  id: string;
  name: string;
  levels: AdminLevel[];
  sub?: string;
}

interface FirebaseQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
}

interface AssessmentPayload {
  id: string;
  quizId: string;
  passingPercentage: number;
  totalMarks: number;
  timeLimit: number;
  questions: FirebaseQuestion[];
}

interface CustomAlert {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ManagedUser {
  uid: string;
  name: string;
  email: string;
  team: string;
  role: 'admin' | 'learner';
  certifications: unknown[];
}

export default function ManageProgram() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'questions' | 'timers' | 'syllabus' | 'users'>('questions');

  // Custom Notifications Alert State
  const [alert, setAlert] = useState<CustomAlert | null>(null);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, message: '', onConfirm: () => {} });

  // Filter States
  const [admQProd, setAdmQProd] = useState(PRODUCTS[0].id);
  const [admQCert, setAdmQCert] = useState(PRODUCTS[0].certs[0]);
  const [admProd, setAdmProd] = useState(PRODUCTS[0].id);
  const [admLvl, setAdmLvl] = useState(PRODUCTS[0].certs[0]); 

  // Dynamic Data & Loading States
  const [currentQuizData, setCurrentQuizData] = useState<AssessmentPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSyllabusData, setCurrentSyllabusData] = useState<AdminSyllabusPayload | null>(null);
  const [sylLoading, setSylLoading] = useState<boolean>(false);

  // Modal Control States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null);
  const [modalQText, setModalQText] = useState('');
  const [modalOpts, setModalOpts] = useState<string[]>(['', '', '', '']);
  const [modalCorrectIdx, setModalCorrectIdx] = useState(0);

  // Syllabus Link Editor State Management
  const [isLnkModalOpen, setIsLnkModalOpen] = useState(false);
  const [activeModCode, setActiveModCode] = useState<string>('');
  const [activeResIdx, setActiveResIdx] = useState<number | null>(null);
  const [modalLnkLabel, setModalLnkLabel] = useState('');
  const [modalLnkUrl, setModalLnkUrl] = useState('');
  const [modalLnkType, setModalLnkType] = useState('doc');

  // NEW: Module Description Editor State Management
  const [isDescModalOpen, setIsDescModalOpen] = useState(false);
  const [descModCode, setDescModCode] = useState<string>('');
  const [modalDescText, setModalDescText] = useState('');

  // Accordion Expand State for Syllabus
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  // Add Topic Modal State
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');

  // Add Module Modal State
  const [isAddModuleModalOpen, setIsAddModuleModalOpen] = useState(false);
  const [addModTopicIdx, setAddModTopicIdx] = useState<number>(-1);
  const [newModCode, setNewModCode] = useState('');
  const [newModTitle, setNewModTitle] = useState('');
  const [newModDesc, setNewModDesc] = useState('');

  // Add Resource Modal State
  const [isAddResModalOpen, setIsAddResModalOpen] = useState(false);
  const [addResModCode, setAddResModCode] = useState('');

  // Inline resource builder (used inside Add Module modal)
  const [newModResources, setNewModResources] = useState<AdminModuleResource[]>([]);
  const [newResLabel, setNewResLabel] = useState('');
  const [newResUrl, setNewResUrl] = useState('');
  const [newResType, setNewResType] = useState('doc');

  // --- USER MANAGEMENT STATE ---
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState<boolean>(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [sessionUid, setSessionUid] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userTeamFilter, setUserTeamFilter] = useState('');

  // User add/edit modal control
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'add' | 'edit'>('add');
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [userSaving, setUserSaving] = useState(false);
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPassword, setUPassword] = useState('');
  const [uTeam, setUTeam] = useState(TEAM_OPTIONS[0]);
  const [uRole, setURole] = useState<'admin' | 'learner'>('learner');

  // Resolve the signed-in user once on mount (for "(you)" + self-delete guard).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('ace2_session_user');
      if (raw) {
        const parsed = JSON.parse(raw) as { id?: string };
        if (typeof parsed?.id === 'string') setSessionUid(parsed.id);
      }
    } catch {
      // Ignore malformed session payloads.
    }
  }, []);

  // Active Layout UI context color decoders
  const activeQColors = LEVEL_COLORS[admQCert] || { bg: 'transparent', border: 'transparent', text: 'inherit', rawGlow: '0,0,0' };
  const activeSylColors = LEVEL_COLORS[admLvl] || { bg: 'transparent', border: 'transparent', text: 'inherit', rawGlow: '0,0,0' };

  // Helper function to show notifications auto-dismissing after 4 seconds
  const showAlert = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setAlert({ message, type });
  };

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => setAlert(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const getQuizId = (productId: string, certLevel: string): string => {
    const genericProd = productId.replace('ranger-', '');
    const metaSlug = CMETA[certLevel]?.slug || 'level';
    return `${genericProd}-${metaSlug}`;
  };

  const activeQuizId = getQuizId(admQProd, admQCert);

  // --- API DATA ENGINE 1: ASSESSMENTS ---
  useEffect(() => {
    async function fetchAssessmentData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(apiUrl(`/api/postgres/assessments?quizId=${activeQuizId}`));
        if (!response.ok) {
          throw new Error(`Failed to load data for query identity key: ${activeQuizId}`);
        }
        const data: AssessmentPayload = await response.json();
        setCurrentQuizData(data);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
        setCurrentQuizData(null);
      } finally {
        setLoading(false);
      }
    }

    if (activeTab === 'questions' || activeTab === 'timers') {
      fetchAssessmentData();
    }
  }, [admQProd, admQCert, activeTab, activeQuizId]);

  // --- API DATA ENGINE 2: SYLLABUS CONTENT ---
  useEffect(() => {
    async function fetchSyllabusStructure() {
      if (activeTab !== 'syllabus') return;
      setSylLoading(true);
      try {
        const response = await fetch(apiUrl(`/api/postgres/syllabus/${admProd}`));
        if (!response.ok) throw new Error("Failed to pull dynamic backend syllabus schema.");
        const data: AdminSyllabusPayload = await response.json();
        setCurrentSyllabusData(data);
      } catch (err) {
        console.error("Syllabus Fetch Error:", err);
        setCurrentSyllabusData(null);
      } finally {
        setSylLoading(false);
      }
    }

    fetchSyllabusStructure();
  }, [admProd, activeTab]);

  const currentAdminLevelData = currentSyllabusData?.levels?.find(
    (l) => l.name.toLowerCase().replace(/[\s-]+/g, "") === (CMETA[admLvl]?.name || '').toLowerCase().replace(/[\s-]+/g, "")
  );

  // --- MUTATION SUBMISSION HANDLERS ---
  const handleOpenAddQ = () => {
    setEditingQIdx(null);
    setModalQText('');
    setModalOpts(['', '', '', '']);
    setModalCorrectIdx(0);
    setIsModalOpen(true);
  };

  const handleOpenEditQ = (idx: number) => {
    if (!currentQuizData) return;
    const q = currentQuizData.questions[idx];
    if (!q) return;

    const correctIdx = q.options.indexOf(q.correctAnswer);

    setEditingQIdx(idx);
    setModalQText(q.questionText);
    setModalOpts([...q.options]);
    setModalCorrectIdx(correctIdx !== -1 ? correctIdx : 0);
    setIsModalOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalQText.trim()) return showAlert('Please enter a question.', 'error');
    if (modalOpts.some(o => !o.trim())) return showAlert('All four options must be filled in.', 'error');

    const updatedQuestion: FirebaseQuestion = {
      questionText: modalQText.trim(),
      options: modalOpts.map(o => o.trim()),
      correctAnswer: modalOpts[modalCorrectIdx].trim()
    };

    let updatedQuestionsList: FirebaseQuestion[] = [];
    if (currentQuizData && Array.isArray(currentQuizData.questions)) {
      updatedQuestionsList = [...currentQuizData.questions];
    }

    if (editingQIdx !== null) {
      updatedQuestionsList[editingQIdx] = updatedQuestion;
    } else {
      updatedQuestionsList.push(updatedQuestion);
    }

    const payload = {
      quizId: activeQuizId,
      totalMarks: currentQuizData?.totalMarks ?? 100,
      passingPercentage: currentQuizData?.passingPercentage ?? 70,
      timeLimit: currentQuizData?.timeLimit ?? 1800,
      questions: updatedQuestionsList
    };

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/postgres/assessments/${payload.quizId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseData: any = {};
      
      if (responseText) {
        try { responseData = JSON.parse(responseText); } catch { responseData = { message: responseText }; }
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Server responded with status ${response.status}`);
      }

      setCurrentQuizData({
        id: activeQuizId,
        quizId: activeQuizId,
        totalMarks: payload.totalMarks,
        passingPercentage: payload.passingPercentage,
        timeLimit: payload.timeLimit,
        questions: updatedQuestionsList,
      });

      setIsModalOpen(false);
      showAlert(editingQIdx !== null ? 'Question updated successfully!' : 'Question appended successfully!', 'success');

    } catch (err: any) {
      console.error("❌ Save error detailed trace:", err);
      setError(err.message || 'Error occurred while saving question payload.');
      showAlert(`Failed to save: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQ = (idx: number) => {
    if (!currentQuizData) return;

    setConfirmDialog({
      isOpen: true,
      message: 'Are you sure you want to delete this question?',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        const updatedQuestionsList = currentQuizData.questions.filter((_, qIdx) => qIdx !== idx);

        const payload = {
          quizId: activeQuizId,
          totalMarks: currentQuizData.totalMarks ?? 100,
          passingPercentage: currentQuizData.passingPercentage ?? 70,
          timeLimit: currentQuizData.timeLimit ?? 1800,
          questions: updatedQuestionsList
        };

        setLoading(true);

        try {
          const response = await fetch(apiUrl(`/api/postgres/assessments/${activeQuizId}`), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const responseText = await response.text();
          let responseData: any = {};
          if (responseText) {
            try { responseData = JSON.parse(responseText); } catch { responseData = { message: responseText }; }
          }

          if (!response.ok) {
            throw new Error(responseData.error || 'Failed to delete question from backend.');
          }

          setCurrentQuizData({
            ...currentQuizData,
            questions: updatedQuestionsList
          });
          showAlert('Question deleted successfully!', 'success');
        } catch (err: any) {
          console.error(err);
          showAlert(`Error during deletion processing: ${err.message}`, 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleSaveTimers = async () => {
    if (!currentQuizData) {
      return showAlert('No active track configuration data loaded to save.', 'error');
    }

    const payload = {
      quizId: activeQuizId,
      totalMarks: currentQuizData.totalMarks ?? 100,
      passingPercentage: currentQuizData.passingPercentage,
      timeLimit: currentQuizData.timeLimit, 
      questions: currentQuizData.questions || []
    };

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl(`/api/postgres/assessments/${activeQuizId}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseData: any = {};
      if (responseText) {
        try { responseData = JSON.parse(responseText); } catch { responseData = { message: responseText }; }
      }

      if (!response.ok) {
        throw new Error(responseData.error || `Server returned status ${response.status}`);
      }

      showAlert('Runtime configurations saved successfully!', 'success');
    } catch (err: any) {
      console.error("Timer configuration error details:", err);
      showAlert(`Failed to save runtime metrics: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- SYLLABUS RESOURCE UTILITY MUTATION HANDLERS ---
  const handleOpenEditLink = (modCode: string, resIdx: number, resource: AdminModuleResource) => {
    setActiveModCode(modCode);
    setActiveResIdx(resIdx);
    setModalLnkLabel(resource.label);
    setModalLnkUrl(resource.url);
    setModalLnkType(resource.type);
    setIsLnkModalOpen(true);
  };

  const handleSaveSyllabusLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalLnkLabel.trim() || !modalLnkUrl.trim()) {
      return showAlert('Both resource title label description and path URL are explicitly required.', 'error');
    }
    if (!currentSyllabusData) return;

    const clonedData = JSON.parse(JSON.stringify(currentSyllabusData));
    const targetLevelName = (CMETA[admLvl]?.name || '').toLowerCase().replace(/[\s-]+/g, "");
    
    const targetLevel = clonedData.levels?.find(
      (l: any) => l.name.toLowerCase().replace(/[\s-]+/g, "") === targetLevelName
    );

    if (!targetLevel) {
      return showAlert(`Target level context map reference could not be localized for: ${admLvl}`, 'error');
    }

    let localizedMatch = false;
    for (const topic of targetLevel.topics) {
      for (const mod of topic.modules) {
        if (mod.code === activeModCode) {
          if (!mod.resources) mod.resources = [];
          if (activeResIdx !== null && mod.resources[activeResIdx]) {
            mod.resources[activeResIdx] = {
              label: modalLnkLabel.trim(),
              type: modalLnkType,
              url: normalizeResourceUrl(modalLnkUrl)
            };
           localizedMatch = true;
          }
          break;
        }
      }
      if (localizedMatch) break;
    }

    if (!localizedMatch) {
      return showAlert(`Could not map resource update. Module code or resource index missing layout context validation.`, 'error');
    }

    setSylLoading(true);

    const finalRequestBody = {
      product: {
        id: admProd, 
        name: PRODUCTS.find(p => p.id === admProd)?.name || "Tools & Techniques",
        sub: clonedData.sub || "Operational Toolkit",
        icon: PRODUCTS.find(p => p.id === admProd)?.icon || "🛠️",
        levels: clonedData.levels 
      }
    };

    try {
      const response = await fetch(apiUrl('/api/postgres/syllabus'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(finalRequestBody)
      });

      const responseText = await response.text();
      let responseData: any = {};
      if (responseText) {
        try { responseData = JSON.parse(responseText); } catch { responseData = { error: responseText }; }
      }

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Server responded with HTTP Status Code ${response.status}`);
      }

      setCurrentSyllabusData(clonedData);
      setIsLnkModalOpen(false);
      showAlert('Resource link updated successfully!', 'success');
    } catch (err: any) {
      console.error("Syllabus sync execution failure detailed trace:", err);
      showAlert(`Syllabus asset synchronization failure: ${err.message}`, 'error');
    } finally {
      setSylLoading(false);
    }
  };

  // NEW: Handler to open Module Description Modifying Modal
  const handleOpenEditDesc = (modCode: string, currentDesc: string) => {
    setDescModCode(modCode);
    setModalDescText(currentDesc || '');
    setIsDescModalOpen(true);
  };

  // NEW: Handler to save updated Module Description context map
  const handleSaveModuleDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDescText.trim()) {
      return showAlert('Module description logic text cannot be empty.', 'error');
    }
    if (!currentSyllabusData) return;

    const clonedData = JSON.parse(JSON.stringify(currentSyllabusData));
    const targetLevelName = (CMETA[admLvl]?.name || '').toLowerCase().replace(/[\s-]+/g, "");
    
    const targetLevel = clonedData.levels?.find(
      (l: any) => l.name.toLowerCase().replace(/[\s-]+/g, "") === targetLevelName
    );

    if (!targetLevel) {
      return showAlert(`Target milestone level reference map missing for context: ${admLvl}`, 'error');
    }

    let localizedMatch = false;
    for (const topic of targetLevel.topics) {
      for (const mod of topic.modules) {
        if (mod.code === descModCode) {
          mod.description = modalDescText.trim();
          localizedMatch = true;
          break;
        }
      }
      if (localizedMatch) break;
    }

    if (!localizedMatch) {
      return showAlert(`Target Module execution identity reference could not be localized on current branch context.`, 'error');
    }

    setSylLoading(true);

    const finalRequestBody = {
      product: {
        id: admProd, 
        name: PRODUCTS.find(p => p.id === admProd)?.name || "Tools & Techniques",
        sub: clonedData.sub || "Operational Toolkit",
        icon: PRODUCTS.find(p => p.id === admProd)?.icon || "🛠️",
        levels: clonedData.levels 
      }
    };

    try {
      const response = await fetch(apiUrl('/api/postgres/syllabus'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(finalRequestBody)
      });

      const responseText = await response.text();
      let responseData: any = {};
      if (responseText) {
        try { responseData = JSON.parse(responseText); } catch { responseData = { error: responseText }; }
      }

      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || `Server responded with HTTP Status Code ${response.status}`);
      }

      setCurrentSyllabusData(clonedData);
      setIsDescModalOpen(false);
      showAlert('Module description updated successfully!', 'success');
    } catch (err: any) {
      console.error("Module summary trace error sync:", err);
      showAlert(`Failed to update core module architecture content: ${err.message}`, 'error');
    } finally {
      setSylLoading(false);
    }
  };

  const toggleSyllabusCard = (key: string) => {
    setExpandedCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Shared helper: deep-clone syllabus data, find the active level, POST updated payload to Firebase
  const saveSyllabusData = async (clonedData: AdminSyllabusPayload): Promise<boolean> => {
    const finalRequestBody = {
      product: {
        id: admProd,
        name: PRODUCTS.find(p => p.id === admProd)?.name || 'Tools & Techniques',
        sub: clonedData.sub || 'Operational Toolkit',
        icon: PRODUCTS.find(p => p.id === admProd)?.icon || '🛠️',
        levels: clonedData.levels,
      },
    };
    const response = await fetch(apiUrl('/api/postgres/syllabus'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(finalRequestBody),
    });
    const responseText = await response.text();
    let responseData: any = {};
    if (responseText) {
      try { responseData = JSON.parse(responseText); } catch { responseData = { error: responseText }; }
    }
    if (!response.ok) {
      throw new Error(responseData.error || responseData.message || `Server error ${response.status}`);
    }
    return true;
  };

  const getActiveLevel = (clonedData: AdminSyllabusPayload) => {
    const targetLevelName = (CMETA[admLvl]?.name || '').toLowerCase().replace(/[\s-]+/g, '');
    return clonedData.levels?.find(
      (l: any) => l.name.toLowerCase().replace(/[\s-]+/g, '') === targetLevelName
    );
  };

  // --- ADD TOPIC HANDLERS ---
  const handleOpenAddTopic = () => {
    setNewTopicTitle('');
    setIsAddTopicModalOpen(true);
  };

  const handleSaveNewTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return showAlert('Topic title is required.', 'error');
    if (!currentSyllabusData) return;

    const clonedData: AdminSyllabusPayload = JSON.parse(JSON.stringify(currentSyllabusData));
    const targetLevel = getActiveLevel(clonedData);
    if (!targetLevel) return showAlert('Could not find target level.', 'error');

    targetLevel.topics.push({ title: newTopicTitle.trim(), modules: [] });

    setSylLoading(true);
    try {
      await saveSyllabusData(clonedData);
      setCurrentSyllabusData(clonedData);
      setIsAddTopicModalOpen(false);
      showAlert('Topic added successfully!', 'success');
    } catch (err: any) {
      showAlert(`Failed to add topic: ${err.message}`, 'error');
    } finally {
      setSylLoading(false);
    }
  };

  // --- ADD MODULE HANDLERS ---
  const handleOpenAddModule = (topicIdx: number) => {
    setAddModTopicIdx(topicIdx);
    const existingCount = currentAdminLevelData?.topics[topicIdx]?.modules.length ?? 0;
    setNewModCode(`${topicIdx + 1}.${existingCount + 1}`);
    setNewModTitle('');
    setNewModDesc('');
    setNewModResources([]);
    setNewResLabel('');
    setNewResUrl('');
    setNewResType('doc');
    setIsAddModuleModalOpen(true);
  };

  const handleSaveNewModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModCode.trim()) return showAlert('Module code is required.', 'error');
    if (!newModTitle.trim()) return showAlert('Module title is required.', 'error');
    if (!currentSyllabusData) return;

    const clonedData: AdminSyllabusPayload = JSON.parse(JSON.stringify(currentSyllabusData));
    const targetLevel = getActiveLevel(clonedData);
    if (!targetLevel) return showAlert('Could not find target level.', 'error');
    if (!targetLevel.topics[addModTopicIdx]) return showAlert('Invalid topic index.', 'error');

    const newMod: AdminModule = {
      code: newModCode.trim(),
      title: newModTitle.trim(),
      description: newModDesc.trim(),
      resources: newModResources,
    };
    targetLevel.topics[addModTopicIdx].modules.push(newMod);

    setSylLoading(true);
    try {
      await saveSyllabusData(clonedData);
      setCurrentSyllabusData(clonedData);
      setIsAddModuleModalOpen(false);
      showAlert('Module added successfully!', 'success');
    } catch (err: any) {
      showAlert(`Failed to add module: ${err.message}`, 'error');
    } finally {
      setSylLoading(false);
    }
  };

  // --- ADD RESOURCE HANDLERS ---
  const handleOpenAddResource = (modCode: string) => {
    setAddResModCode(modCode);
    setModalLnkLabel('');
    setModalLnkUrl('');
    setModalLnkType('doc');
    setIsAddResModalOpen(true);
  };

  const handleSaveNewResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalLnkLabel.trim()) return showAlert('Resource label is required.', 'error');
    if (!modalLnkUrl.trim()) return showAlert('Resource URL is required.', 'error');
    if (!currentSyllabusData) return;

    const clonedData: AdminSyllabusPayload = JSON.parse(JSON.stringify(currentSyllabusData));
    const targetLevel = getActiveLevel(clonedData);
    if (!targetLevel) return showAlert('Could not find target level.', 'error');

    let found = false;
    for (const topic of targetLevel.topics) {
      for (const mod of topic.modules) {
        if (mod.code === addResModCode) {
          if (!mod.resources) mod.resources = [];
          mod.resources.push({ label: modalLnkLabel.trim(), type: modalLnkType, url: normalizeResourceUrl(modalLnkUrl) });
          found = true;
          break;
        }
      }
      if (found) break;
    }

    if (!found) return showAlert('Module not found.', 'error');

    setSylLoading(true);
    try {
      await saveSyllabusData(clonedData);
      setCurrentSyllabusData(clonedData);
      setIsAddResModalOpen(false);
      showAlert('Resource added successfully!', 'success');
    } catch (err: any) {
      showAlert(`Failed to add resource: ${err.message}`, 'error');
    } finally {
      setSylLoading(false);
    }
  };

  // --- DELETE SYLLABUS STRUCTURE HANDLERS ---
  const handleDeleteTopic = (topicIdx: number) => {
    const topicTitle = currentAdminLevelData?.topics[topicIdx]?.title || 'this topic';
    setConfirmDialog({
      isOpen: true,
      message: `Delete topic "${topicTitle}" and all its modules? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        if (!currentSyllabusData) return;
        const clonedData: AdminSyllabusPayload = JSON.parse(JSON.stringify(currentSyllabusData));
        const targetLevel = getActiveLevel(clonedData);
        if (!targetLevel) return showAlert('Could not find target level.', 'error');
        targetLevel.topics.splice(topicIdx, 1);
        setSylLoading(true);
        try {
          await saveSyllabusData(clonedData);
          setCurrentSyllabusData(clonedData);
          showAlert('Topic deleted successfully!', 'success');
        } catch (err: any) {
          showAlert(`Failed to delete topic: ${err.message}`, 'error');
        } finally {
          setSylLoading(false);
        }
      },
    });
  };

  const handleDeleteModule = (topicIdx: number, modIdx: number) => {
    const modTitle = currentAdminLevelData?.topics[topicIdx]?.modules[modIdx]?.title || 'this module';
    setConfirmDialog({
      isOpen: true,
      message: `Delete module "${modTitle}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        if (!currentSyllabusData) return;
        const clonedData: AdminSyllabusPayload = JSON.parse(JSON.stringify(currentSyllabusData));
        const targetLevel = getActiveLevel(clonedData);
        if (!targetLevel) return showAlert('Could not find target level.', 'error');
        targetLevel.topics[topicIdx].modules.splice(modIdx, 1);
        setSylLoading(true);
        try {
          await saveSyllabusData(clonedData);
          setCurrentSyllabusData(clonedData);
          showAlert('Module deleted successfully!', 'success');
        } catch (err: any) {
          showAlert(`Failed to delete module: ${err.message}`, 'error');
        } finally {
          setSylLoading(false);
        }
      },
    });
  };

  const handleDeleteResource = (modCode: string, resIdx: number) => {
    setConfirmDialog({
      isOpen: true,
      message: 'Delete this resource? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        if (!currentSyllabusData) return;
        const clonedData: AdminSyllabusPayload = JSON.parse(JSON.stringify(currentSyllabusData));
        const targetLevel = getActiveLevel(clonedData);
        if (!targetLevel) return showAlert('Could not find target level.', 'error');
        let found = false;
        for (const topic of targetLevel.topics) {
          for (const mod of topic.modules) {
            if (mod.code === modCode) {
              mod.resources = (mod.resources || []).filter((_: AdminModuleResource, i: number) => i !== resIdx);
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) return showAlert('Module not found.', 'error');
        setSylLoading(true);
        try {
          await saveSyllabusData(clonedData);
          setCurrentSyllabusData(clonedData);
          showAlert('Resource deleted successfully!', 'success');
        } catch (err: any) {
          showAlert(`Failed to delete resource: ${err.message}`, 'error');
        } finally {
          setSylLoading(false);
        }
      },
    });
  };

  // --- USER MANAGEMENT DATA + MUTATION HANDLERS ---
  const fetchUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const response = await fetch(apiUrl('/api/postgres/users'));
      if (!response.ok) throw new Error('Failed to load the user registry.');
      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (err: any) {
      setUsersError(err.message || 'Something went wrong while loading users.');
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
  }, [activeTab]);

  const getInitials = (name: string): string =>
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

  const handleOpenAddUser = () => {
    setUserModalMode('add');
    setEditingUid(null);
    setUName('');
    setUEmail('');
    setUPassword('');
    setUTeam(TEAM_OPTIONS[0]);
    setURole('learner');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: ManagedUser) => {
    setUserModalMode('edit');
    setEditingUid(user.uid);
    setUName(user.name);
    setUEmail(user.email);
    setUPassword('');
    setUTeam(TEAM_OPTIONS.includes(user.team) ? user.team : TEAM_OPTIONS[0]);
    setURole(user.role);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uName.trim()) return showAlert('Please enter the user\'s full name.', 'error');
    if (!uTeam) return showAlert('Please select a team.', 'error');

    if (userModalMode === 'add') {
      if (!uEmail.trim()) return showAlert('Please enter an email address.', 'error');
      if (!uPassword || uPassword.length < 6) return showAlert('Password must be at least 6 characters.', 'error');
    }

    setUserSaving(true);
    try {
      let response: Response;
      if (userModalMode === 'add') {
        response = await fetch(apiUrl('/api/postgres/users'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: uName.trim(),
            email: uEmail.trim(),
            password: uPassword,
            team: uTeam,
            role: uRole,
          }),
        });
      } else {
        response = await fetch(apiUrl(`/api/postgres/user/${editingUid}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: uName.trim(), team: uTeam, role: uRole }),
        });
      }

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.error || `Server responded with status ${response.status}`);
      }

      setIsUserModalOpen(false);
      showAlert(userModalMode === 'add' ? 'User created successfully!' : 'User updated successfully!', 'success');
      await fetchUsers();
    } catch (err: any) {
      showAlert(`Failed to save user: ${err.message}`, 'error');
    } finally {
      setUserSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesTeam = !userTeamFilter || u.team === userTeamFilter;
    return matchesSearch && matchesTeam;
  });

  const handleExportCsv = () => {
    const headers = ['Name', 'Email', 'Team', 'Role', 'Certifications Earned'];
    const rows = filteredUsers.map(u => [
      u.name,
      u.email,
      u.team,
      u.role,
      getCertificationsEarnedCount(u.certifications),
    ]);
    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ace_users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteUser = (user: ManagedUser) => {
    if (user.uid === sessionUid) return;
    setConfirmDialog({
      isOpen: true,
      message: `Delete ${user.name || user.email}? This removes their login and profile permanently.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        try {
          const response = await fetch(apiUrl(`/api/postgres/user/${user.uid}`), { method: 'DELETE' });
          const responseData = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(responseData.error || 'Failed to delete user.');
          }
          showAlert('User deleted successfully!', 'success');
          await fetchUsers();
        } catch (err: any) {
          showAlert(`Error during deletion: ${err.message}`, 'error');
        }
      },
    });
  };

  return (
    <AppShell currentTab="manageprogram">
      <div className="admin-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
        
        {/* ─── CUSTOM TOAST ALERT SYSTEM ─── */}
        {alert && (
          <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 1100,
            padding: '12px 20px',
            borderRadius: '6px',
            backgroundColor: alert.type === 'success' ? 'rgba(34, 197, 94, 0.95)' : alert.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 'rgba(59, 130, 246, 0.95)',
            color: '#fff',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.3s ease'
          }}>
            <span>{alert.type === 'success' ? '✅' : alert.type === 'error' ? '❌' : 'ℹ️'}</span>
            <span>{alert.message}</span>
            <button onClick={() => setAlert(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}>×</button>
          </div>
        )}

        {/* ─── CUSTOM CONFIRMATION MODAL ─── */}
        {confirmDialog.isOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '400px', border: '1px solid var(--border)', textAlign: 'center' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--text1)' }}>Confirm Action</h4>
              <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '24px' }}>{confirmDialog.message}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <button className="btn-edit" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}>Cancel</button>
                <button className="btn-add" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#fff' }} onClick={confirmDialog.onConfirm}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="ph" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>Manage Program</h2>
          <p style={{ color: 'var(--text3)', margin: 0, fontSize: '14px' }}>
            Configure dynamic database modules, assessment sets, parameters and core content layouts.
          </p>
        </div>

        {/* Global Configuration Tab Navigators */}
        <div className="admin-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          {(['questions', 'timers', 'syllabus', 'users'] as const).map((tab) => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`atab ${activeTab === tab ? 'on' : ''}`}
              style={{
                padding: '10px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                borderBottom: activeTab === tab ? '2px solid var(--purple)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--purple-l)' : 'var(--text2)'
              }}
            >
              {tab === 'questions' && '📝 Questions'}
              {tab === 'timers' && '⏱ Timers & Pass Marks'}
              {tab === 'syllabus' && '📝 Syllabus Content & Links'}
              {tab === 'users' && '👥 User Management'}
            </div>
          ))}
        </div>

        {/* ──────────────── QUESTIONS MANAGEMENT FEATURE TAB VIEW ──────────────── */}
        {activeTab === 'questions' && (
          <div id="adminQuestions">
            <div className="sec-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                {/* Product Selectors */}
                <div className="ptabs" style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                  {PRODUCTS.map(p => (
                    <div 
                      key={p.id} 
                      className={`ptab ${p.id} ${admQProd === p.id ? 'on' : ''}`}
                      onClick={() => {
                        setAdmQProd(p.id);
                        setAdmQCert(p.certs[0]);
                      }}
                    >
                      {p.icon} {p.name}
                    </div>
                  ))}
                </div>
                
                {/* Level Tier Node Capsules */}
                <div className="ltabs" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {(PRODUCTS.find(p => p.id === admQProd)?.certs || []).map(c => {
                    const isSelected = admQCert === c;
                    const cColor = LEVEL_COLORS[c];
                    return (
                      <div 
                        key={c} 
                        className={`ltab ${c} ${isSelected ? 'on' : ''}`}
                        onClick={() => setAdmQCert(c)}
                        style={{
                          padding: '8px 20px',
                          cursor: 'pointer',
                          borderRadius: '9999px',
                          border: isSelected ? `1px solid ${cColor.border}` : '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: isSelected ? cColor.bg : 'rgba(255,255,255,0.02)',
                          color: isSelected ? cColor.text : 'rgba(255, 255, 255, 0.4)',
                          fontWeight: 600,
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: isSelected ? `0 0 12px rgba(${cColor.rawGlow}, 0.25)` : 'none',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <span style={{ opacity: isSelected ? 1 : 0.5 }}>{CMETA[c]?.icon}</span>
                        {CMETA[c]?.name}
                      </div>
                    );
                  })}
                </div>
              </div>
              <button 
                className="btn-add" 
                onClick={handleOpenAddQ}
                disabled={loading}
                style={{ backgroundColor: activeQColors.border, borderColor: activeQColors.border, color: '#fff', opacity: loading ? 0.6 : 1 }}
              >
                + Add Question
              </button>
            </div>

            {/* Assessment Database Workspace Area */}
            <div className="q-list-container" style={{ marginTop: '20px' }}>
              {loading ? (
                <div className="empty"><p>Loading live schema for id: "{activeQuizId}"...</p></div>
              ) : error ? (
                <div className="empty" style={{ border: '1px dashed red' }}>
                  <p style={{ color: '#f87171' }}>⚠️ Error retrieving dataset configuration: {error}</p>
                </div>
              ) : !currentQuizData || currentQuizData.questions.length === 0 ? (
                <div className="empty">
                  <div className="empty-ico">📝</div>
                  <p>No backend questions returned for identity query point: <strong>{activeQuizId}</strong>.</p>
                </div>
              ) : (
                currentQuizData.questions.map((q, i) => (
                  <div className="q-item" key={i} style={{ borderLeft: `4px solid ${activeQColors.border}`, paddingLeft: '16px', background: 'rgba(255,255,255,0.01)', borderRadius: '0 8px 8px 0', marginBottom: '16px' }}>
                    <div className="q-item-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span className="q-item-num" style={{ color: activeQColors.text, fontWeight: '700', marginRight: '8px' }}>Q{i + 1}</span>
                        <span className="q-item-text">{q.questionText}</span>
                      </div>
                      <div className="q-item-actions">
                        <button className="btn-edit" onClick={() => handleOpenEditQ(i)}>Edit</button>
                        <button className="btn-del" onClick={() => handleDeleteQ(i)}>Delete</button>
                      </div>
                    </div>
                    <div className="q-opts-preview" style={{ marginTop: '12px' }}>
                      {q.options.map((o, oi) => {
                        const isCorrect = o === q.correctAnswer;
                        return (
                          <div key={oi} className={`q-opt-prev ${isCorrect ? 'correct' : 'wrong'}`}>
                            <div className="q-dot">{isCorrect ? '✓' : ''}</div>
                            {o}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ──────────────── TIMERS & CONFIG PARAMETERS TAB VIEW ──────────────── */}
        {activeTab === 'timers' && (
          <div id="adminTimers">
            <div className="timers-filter-panel" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div className="ptabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRODUCTS.map(p => (
                    <div 
                      key={p.id} 
                      className={`ptab ${p.id} ${admQProd === p.id ? 'on' : ''}`}
                      onClick={() => {
                        setAdmQProd(p.id);
                        setAdmQCert(p.certs[0]);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {p.icon} {p.name}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="ltabs" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {(PRODUCTS.find(p => p.id === admQProd)?.certs || []).map(c => {
                    const isSelected = admQCert === c;
                    const cColor = LEVEL_COLORS[c];
                    return (
                      <div 
                        key={c} 
                        className={`ltab ${c} ${isSelected ? 'on' : ''}`}
                        onClick={() => setAdmQCert(c)}
                        style={{
                          padding: '8px 20px',
                          cursor: 'pointer',
                          borderRadius: '9999px',
                          border: isSelected ? `1px solid ${cColor.border}` : '1px solid rgba(255,255,255,0.08)',
                          backgroundColor: isSelected ? cColor.bg : 'rgba(255,255,255,0.02)',
                          color: isSelected ? cColor.text : 'rgba(255, 255, 255, 0.4)',
                          fontWeight: 600,
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: isSelected ? `0 0 12px rgba(${cColor.rawGlow}, 0.25)` : 'none',
                          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      >
                        <span style={{ opacity: isSelected ? 1 : 0.5 }}>{CMETA[c]?.icon}</span>
                        {CMETA[c]?.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="empty"><p>Loading configurations for id: "{activeQuizId}"...</p></div>
            ) : currentQuizData ? (
              <div className="timer-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
                <div className="timer-card" style={{ borderTop: `4px solid ${activeQColors.border}`, padding: '16px', background: 'var(--surface)', borderRadius: '6px' }}>
                  <div className="tcl" style={{ fontWeight: 600, marginBottom: '12px', color: activeQColors.text }}>
                    🚀 Current Selected Track: {activeQuizId}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Time Limit:</span>
                      <div className="tcr-group">
                        <input 
                          type="number" 
                          className="t-inp" 
                          value={Math.round(currentQuizData.timeLimit / 60)} 
                          onChange={(e) => setCurrentQuizData({ ...currentQuizData, timeLimit: Number(e.target.value) * 60 })}
                          min="5" 
                          max="180" 
                        />
                        <span> mins</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Passing Grade Threshold:</span>
                      <div className="tcr-group">
                        <input 
                          type="number" 
                          className="t-inp" 
                          value={currentQuizData.passingPercentage} 
                          onChange={(e) => setCurrentQuizData({ ...currentQuizData, passingPercentage: Number(e.target.value) })}
                          min="50" 
                          max="100" 
                          style={{ width: '52px' }} 
                        />
                        <span> %</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p>Select the questions tab to refresh configurations parameters.</p>
            )}

            <div style={{ marginTop: '14px' }}>
              <button 
                className="btn-add" 
                style={{ 
                  backgroundColor: activeQColors.border, 
                  borderColor: activeQColors.border,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }} 
                disabled={loading}
                onClick={handleSaveTimers}
              >
                {loading ? 'Saving Properties...' : 'Save Runtime Configurations'}
              </button>
            </div>
          </div>
        )}

        {/* ──────────────── SYLLABUS EDIT LAYER ──────────────── */}
        {activeTab === 'syllabus' && (
          <div id="adminSyllabus">
            <div style={{ marginBottom: '20px', padding: '12px 16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '6px', fontSize: '13px', color: '#a5b4fc' }}>
              <strong>Curriculum Sandbox Modeler:</strong> Inspecting live production curriculum definitions. Select topic layouts and certification milestones below.
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div className="ptabs" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {PRODUCTS.map(p => (
                  <div 
                    key={p.id} 
                    className={`ptab ${p.id} ${admProd === p.id ? 'on' : ''}`} 
                    onClick={() => {
                      setAdmProd(p.id);
                      setAdmLvl(p.certs[0]);
                    }}
                  >
                    {p.icon} {p.name}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div className="ltabs" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                {(PRODUCTS.find(p => p.id === admProd)?.certs || []).map(lvlKey => {
                  const isSelected = admLvl === lvlKey;
                  const cColor = LEVEL_COLORS[lvlKey] || { bg: 'transparent', border: 'transparent', text: 'inherit', rawGlow: '0,0,0' };
                  const meta = CMETA[lvlKey];

                  return (
                    <div 
                      key={lvlKey} 
                      className={`ltab ${lvlKey} ${isSelected ? 'on' : ''}`} 
                      onClick={() => setAdmLvl(lvlKey)}
                      style={{
                        padding: '8px 20px',
                        cursor: 'pointer',
                        borderRadius: '9999px',
                        border: isSelected ? `1px solid ${cColor.border}` : '1px solid rgba(255,255,255,0.08)',
                        backgroundColor: isSelected ? cColor.bg : 'rgba(255,255,255,0.02)',
                        color: isSelected ? cColor.text : 'rgba(255, 255, 255, 0.4)',
                        fontWeight: 600,
                        fontSize: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: isSelected ? `0 0 12px rgba(${cColor.rawGlow}, 0.25)` : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span>{meta?.icon}</span> {meta?.name}
                    </div>
                  );
                })}
              </div>
            </div>

            {sylLoading ? (
              <div className="empty"><p>Loading live database curriculum maps...</p></div>
            ) : currentAdminLevelData ? (
              <div id="adSylCards">
                {currentAdminLevelData.topics.map((topic, tIdx) => (
                  <div key={tIdx} style={{ marginBottom: '28px' }}>
                    <div className="sec-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: activeSylColors.text, fontWeight: '700', marginBottom: '12px' }}>
                      <span><span>◆ </span>{topic.title}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenAddModule(tIdx)}
                          style={{ background: activeSylColors.bg, border: `1px solid ${activeSylColors.border}`, color: activeSylColors.text, cursor: 'pointer', fontSize: '12px', padding: '4px 12px', borderRadius: '4px', fontWeight: 600 }}
                        >
                          + Add Module
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTopic(tIdx)}
                          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#f87171', cursor: 'pointer', fontSize: '12px', padding: '4px 10px', borderRadius: '4px', fontWeight: 600 }}
                          title="Delete topic"
                        >
                          🗑
                        </button>
                      </div>
                    </div>

                    <div className="mod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(1fr, 1fr))', gap: '16px' }}>
                      {[...topic.modules].sort((a, b) => compareModuleCode(a.code, b.code)).map((mod, mIdx) => {
                        const moduleUniqueKey = mod.code || `${tIdx}-${mIdx}`;
                        const isExpanded = !!expandedCards[moduleUniqueKey];
                        
                        return (
                          <div 
                            className={`mod-card ${isExpanded ? 'open' : ''}`} 
                            key={moduleUniqueKey} 
                            style={{ 
                              borderLeft: isExpanded ? `3px solid ${activeSylColors.border}` : '1px solid var(--border)', 
                              background: 'var(--surface)',
                              borderRadius: '4px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              className="mod-head"
                              style={{ display: 'flex', alignItems: 'center', padding: '14px' }}
                            >
                              <div
                                onClick={() => toggleSyllabusCard(moduleUniqueKey)}
                                style={{ display: 'flex', alignItems: 'center', flex: 1, cursor: 'pointer', minWidth: 0 }}
                              >
                                <span className="mod-code" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', marginRight: '10px', flexShrink: 0, background: activeSylColors.bg, color: activeSylColors.text, padding: '3px 6px', borderRadius: '4px', border: `1px solid rgba(${activeSylColors.rawGlow}, 0.3)` }}>
                                  {mod.code || "0.0.0"}
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: 600, flex: 1, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.title}</span>
                                <span className="mod-chev" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginRight: '10px' }}>▼</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDeleteModule(tIdx, topic.modules.indexOf(mod)); }}
                                style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.5)', cursor: 'pointer', fontSize: '14px', padding: '2px 4px', flexShrink: 0, transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239,68,68,0.5)'}
                                title="Delete module"
                              >
                                🗑
                              </button>
                            </div>
                            
                            {isExpanded && (
                              <div className="mod-body" style={{ padding: '16px', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--border)' }}>
                                <div style={{ marginBottom: '12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Module Description Preview:</div>
                                    
                                    {/* NEW: Edit Description Trigger Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenEditDesc(mod.code, mod.description);
                                      }}
                                      style={{ background: 'transparent', border: 'none', color: 'var(--purple-l)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                      ✏️ Edit Description
                                    </button>
                                  </div>
                                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5' }}>{mod.description}</p>
                                </div>

                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>Attached Resource Materials:</div>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleOpenAddResource(mod.code); }}
                                      style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: 'var(--purple-l)', cursor: 'pointer', fontSize: '11px', padding: '3px 10px', borderRadius: '4px', fontWeight: 600 }}
                                    >
                                      + Add Resource
                                    </button>
                                  </div>
                                  {mod.resources && mod.resources.length > 0 ? (
                                    <div className="mod-links" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {mod.resources.map((res, rIdx) => {
                                        const isVideo = res.type.toLowerCase() === 'video';
                                        return (
                                          <div
                                            key={rIdx}
                                            className={`mod-link ${isVideo ? 'vid' : 'doc'}`}
                                            style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', display: 'inline-flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(255,255,255,0.05)' }}
                                          >
                                            <a href={normalizeResourceUrl(res.url)} target="_blank" rel="noreferrer" style={{ color: isVideo ? '#f43f5e' : '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                              <span>{isVideo ? '▶' : '📄'}</span>
                                              {res.label}
                                            </a>
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleOpenEditLink(mod.code, rIdx, res); }}
                                              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: '2px 4px', fontSize: '11px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--purple-l)'}
                                              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
                                              title="Edit resource"
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              type="button"
                                              onClick={(e) => { e.stopPropagation(); handleDeleteResource(mod.code, rIdx); }}
                                              style={{ background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.45)', cursor: 'pointer', padding: '2px 4px', fontSize: '12px', display: 'flex', alignItems: 'center', transition: 'color 0.2s' }}
                                              onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
                                              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(239,68,68,0.45)'}
                                              title="Delete resource"
                                            >
                                              🗑
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '12px', color: 'var(--text3)', fontStyle: 'italic' }}>No resources attached yet.</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleOpenAddTopic}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: `1px dashed ${activeSylColors.border}`, color: activeSylColors.text, cursor: 'pointer', fontSize: '13px', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, marginTop: '8px', opacity: 0.8 }}
                >
                  + Add New Topic
                </button>
              </div>
            ) : (
              <div className="empty">
                <div className="empty-ico">📂</div>
                <p>No content parameters mapped inside this structural index database query target.</p>
                <button
                  type="button"
                  onClick={handleOpenAddTopic}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'transparent', border: `1px dashed ${activeSylColors.border}`, color: activeSylColors.text, cursor: 'pointer', fontSize: '13px', padding: '10px 20px', borderRadius: '6px', fontWeight: 600, marginTop: '16px' }}
                >
                  + Add First Topic
                </button>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── USER MANAGEMENT ──────────────── */}
        {activeTab === 'users' && (
          <div id="adminUsers">
            {usersLoading ? (
              <div className="empty"><p>Loading the user registry...</p></div>
            ) : usersError ? (
              <div className="empty" style={{ border: '1px dashed red' }}>
                <p style={{ color: '#f87171' }}>⚠️ {usersError}</p>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  {[
                    { label: 'Total users', value: users.length, color: 'var(--purple-l)' },
                    { label: 'Admins', value: users.filter(u => u.role === 'admin').length, color: '#fb923c' },
                    { label: 'Learners', value: users.filter(u => u.role === 'learner').length, color: '#38bdf8' },
                  ].map(stat => (
                    <div key={stat.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                      <div style={{ fontSize: '28px', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Search / Filter / Export toolbar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="🔍 Search by name or email..."
                    style={{
                      flex: '1 1 240px',
                      minWidth: '200px',
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: 'var(--text1)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                  />
                  <select
                    value={userTeamFilter}
                    onChange={(e) => setUserTeamFilter(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      fontSize: '14px',
                      color: 'var(--text1)',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">All Teams</option>
                    {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button
                    className="btn-add"
                    onClick={handleExportCsv}
                    disabled={filteredUsers.length === 0}
                    style={{
                      backgroundColor: 'var(--purple)',
                      borderColor: 'var(--purple)',
                      color: '#fff',
                      opacity: filteredUsers.length === 0 ? 0.5 : 1,
                      cursor: filteredUsers.length === 0 ? 'not-allowed' : 'pointer',
                      marginLeft: 'auto',
                    }}
                  >
                    ⬇ Export CSV
                  </button>
                </div>

                {filteredUsers.length === 0 && !usersLoading && (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)' }}>
                    {users.length === 0 ? 'No users found.' : 'No users match your search or filters.'}
                  </div>
                )}

                {/* User Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '16px' }}>
                  {filteredUsers.map(user => {
                    const isSelf = user.uid === sessionUid;
                    const isAdmin = user.role === 'admin';
                    const earned = getCertificationsEarnedCount(user.certifications);
                    return (
                      <div key={user.uid} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: isAdmin ? 'linear-gradient(135deg, #fb923c, #f97316)' : 'linear-gradient(135deg, #38bdf8, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: '14px', flexShrink: 0 }}>
                            {getInitials(user.name)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: 'var(--text1)', fontSize: '15px' }}>
                              {user.name || '(unnamed)'}
                              {isSelf && <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: '12px', marginLeft: '6px' }}>(you)</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: isAdmin ? 'rgba(251, 146, 60, 0.15)' : 'rgba(56, 189, 248, 0.12)', color: isAdmin ? '#fb923c' : '#7dd3fc', border: `1px solid ${isAdmin ? 'rgba(251,146,60,0.3)' : 'rgba(56,189,248,0.3)'}` }}>
                            {isAdmin ? '⚙ Admin' : '◎ Learner'}
                          </span>
                          {user.team && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(255,255,255,0.04)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
                              {user.team}
                            </span>
                          )}
                          {earned > 0 && (
                            <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}>
                              🏆 {earned} cert{earned > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-edit" style={{ flex: 1 }} onClick={() => handleOpenEditUser(user)}>✎ Edit</button>
                          <button
                            className="btn-del"
                            disabled={isSelf}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                            style={{ opacity: isSelf ? 0.4 : 1, cursor: isSelf ? 'not-allowed' : 'pointer' }}
                            onClick={() => handleDeleteUser(user)}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New User Card */}
                  <button
                    onClick={handleOpenAddUser}
                    style={{ background: 'transparent', border: '1px dashed var(--border)', borderRadius: '8px', padding: '16px', minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text3)', cursor: 'pointer', fontSize: '14px' }}
                  >
                    <span style={{ fontSize: '28px' }}>+</span>
                    Add New User
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ──────────────── QUESTION MUTATION DIALOG MODAL ──────────────── */}
        {isModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="modal-content" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '500px', border: `1px solid ${activeQColors.border}`, boxShadow: `0 0 24px rgba(${activeQColors.rawGlow}, 0.15)` }}>
              <h3 id="modalTitle" style={{ margin: '0 0 16px 0', fontSize: '18px', color: activeQColors.text }}>{editingQIdx !== null ? 'Edit Question' : 'Add New Question'}</h3>
              <form onSubmit={handleSaveQuestion}>
                <div style={{ marginBottom: '14px' }}>
                  <label className="syl-field-label" style={{ display: 'block', marginBottom: '6px' }}>Question String Prompt</label>
                  <textarea 
                    className="syl-textarea" 
                    rows={3} 
                    value={modalQText} 
                    onChange={(e) => setModalQText(e.target.value)}
                    placeholder="Enter explicit string logic prompt..."
                    style={{ width: '100%' }}
                  />
                </div>

                <div id="optEditor" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {['A', 'B', 'C', 'D'].map((label, idx) => (
                    <div className="opt-row" key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="opt-idx" style={{ fontWeight: 'bold', color: activeQColors.text }}>{label}</span>
                      <input 
                        type="text" 
                        className="inp"
                        style={{ flex: 1 }}
                        value={modalOpts[idx]} 
                        placeholder={`Option alternative string label description ${label}...`}
                        onChange={(e) => {
                          const updated = [...modalOpts];
                          updated[idx] = e.target.value;
                          setModalOpts(updated);
                        }}
                      />
                      <button 
                        type="button" 
                        className={`opt-correct-btn ${modalCorrectIdx === idx ? 'correct' : ''}`}
                        onClick={() => setModalCorrectIdx(idx)}
                        style={{ background: modalCorrectIdx === idx ? '#22c55e' : 'transparent', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer', padding: '4px 8px' }}
                      >
                        ✓
                      </button>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-edit" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-add" style={{ boxShadow: 'none', backgroundColor: activeQColors.border, borderColor: activeQColors.border, color: '#fff' }}>Save Structural Question</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────── LINK MUTATION DIALOG MODAL ──────────────── */}
        {isLnkModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
            <div className="modal-content" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '460px', border: `1px solid ${activeSylColors.border}`, boxShadow: `0 0 24px rgba(0,0,0,0.5)` }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: activeSylColors.text }}>Edit Resource Blueprint Context</h3>
              <form onSubmit={handleSaveSyllabusLink}>
                
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Resource Title Label</label>
                  <input 
                    type="text" 
                    className="inp"
                    style={{ width: '100%' }}
                    value={modalLnkLabel} 
                    onChange={(e) => setModalLnkLabel(e.target.value)}
                    placeholder="Confluence Space Document Reference Name..."
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Resource Destination path URL</label>
                  <input 
                    type="text" 
                    className="inp"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                    value={modalLnkUrl} 
                    onChange={(e) => setModalLnkUrl(e.target.value)}
                    placeholder="https://your-company.atlassian.net/wiki/spaces/..."
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Asset Media Type Classification</label>
                  <select 
                    value={modalLnkType} 
                    onChange={(e) => setModalLnkType(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '4px', width: '100%' }}
                  >
                    <option value="doc">📄 Confluence Doc</option>
                    <option value="video">▶ Video</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-edit" onClick={() => setIsLnkModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-add" style={{ backgroundColor: activeSylColors.border, borderColor: activeSylColors.border, color: '#fff', boxShadow: 'none' }}>
                    {sylLoading ? 'Updating Database...' : 'Save Asset Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── NEW: MODULE DESCRIPTION DIALOG MODAL ─── */}
        {isDescModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1002 }}>
            <div className="modal-content" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '500px', border: `1px solid ${activeSylColors.border}`, boxShadow: `0 0 24px rgba(0,0,0,0.5)` }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: activeSylColors.text }}>Edit Module Description</h3>
              <form onSubmit={handleSaveModuleDescription}>
                
                <div style={{ marginBottom: '6px', fontSize: '11px', fontFamily: 'monospace', color: activeSylColors.text }}>
                  Target Module Code: {descModCode}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Module Description Content Text</label>
                  <textarea 
                    className="syl-textarea" 
                    rows={5} 
                    value={modalDescText} 
                    onChange={(e) => setModalDescText(e.target.value)}
                    placeholder="Enter structural description content text summary..."
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border)', padding: '10px', borderRadius: '4px', fontSize: '13px', lineHeight: '1.5' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-edit" onClick={() => setIsDescModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-add" style={{ backgroundColor: activeSylColors.border, borderColor: activeSylColors.border, color: '#fff', boxShadow: 'none' }}>
                    {sylLoading ? 'Updating Sandbox...' : 'Save Description Text'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────── ADD RESOURCE MODAL ──────────────── */}
        {isAddResModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1004 }}>
            <div className="modal-content" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '480px', border: `1px solid ${activeSylColors.border}`, boxShadow: '0 0 24px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: activeSylColors.text }}>Add Resource</h3>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px', fontFamily: 'monospace' }}>
                Module: {addResModCode}
              </div>
              <form onSubmit={handleSaveNewResource}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Label</label>
                  <input
                    type="text"
                    className="inp"
                    style={{ width: '100%' }}
                    value={modalLnkLabel}
                    onChange={(e) => setModalLnkLabel(e.target.value)}
                    placeholder="e.g. Training Doc"
                    autoFocus
                  />
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>URL</label>
                  <input
                    type="text"
                    className="inp"
                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                    value={modalLnkUrl}
                    onChange={(e) => setModalLnkUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Type</label>
                  <select
                    value={modalLnkType}
                    onChange={(e) => setModalLnkType(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '4px', width: '100%' }}
                  >
                    <option value="doc">📄 Confluence Doc</option>
                    <option value="video">▶ Video</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-edit" onClick={() => setIsAddResModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-add" disabled={sylLoading} style={{ backgroundColor: activeSylColors.border, borderColor: activeSylColors.border, color: '#fff', boxShadow: 'none', opacity: sylLoading ? 0.6 : 1 }}>
                    {sylLoading ? 'Saving...' : 'Add Resource'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────── ADD TOPIC MODAL ──────────────── */}
        {isAddTopicModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1003 }}>
            <div className="modal-content" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '460px', border: `1px solid ${activeSylColors.border}`, boxShadow: '0 0 24px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: activeSylColors.text }}>Add New Topic</h3>
              <form onSubmit={handleSaveNewTopic}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Topic Title</label>
                  <input
                    type="text"
                    className="inp"
                    style={{ width: '100%' }}
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="e.g. Platform & Infrastructure"
                    autoFocus
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-edit" onClick={() => setIsAddTopicModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-add" disabled={sylLoading} style={{ backgroundColor: activeSylColors.border, borderColor: activeSylColors.border, color: '#fff', boxShadow: 'none', opacity: sylLoading ? 0.6 : 1 }}>
                    {sylLoading ? 'Saving...' : 'Add Topic'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────── ADD MODULE MODAL ──────────────── */}
        {isAddModuleModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1003 }}>
            <div className="modal-content" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '560px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${activeSylColors.border}`, boxShadow: '0 0 24px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: activeSylColors.text }}>Add New Module</h3>
              <div style={{ fontSize: '12px', color: 'var(--text3)', marginBottom: '16px' }}>
                Topic: <span style={{ color: activeSylColors.text, fontWeight: 600 }}>{currentAdminLevelData?.topics[addModTopicIdx]?.title}</span>
              </div>
              <form onSubmit={handleSaveNewModule}>
                {/* Code + Title */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '120px', flexShrink: 0 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Module Code</label>
                    <input
                      type="text"
                      className="inp"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '12px' }}
                      value={newModCode}
                      onChange={(e) => setNewModCode(e.target.value)}
                      placeholder="1.1.1"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Module Title</label>
                    <input
                      type="text"
                      className="inp"
                      style={{ width: '100%' }}
                      value={newModTitle}
                      onChange={(e) => setNewModTitle(e.target.value)}
                      placeholder="e.g. Basic Architecture"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Description <span style={{ color: 'var(--text3)' }}>(optional)</span></label>
                  <textarea
                    className="syl-textarea"
                    rows={2}
                    value={newModDesc}
                    onChange={(e) => setNewModDesc(e.target.value)}
                    placeholder="Brief description of module content..."
                    style={{ width: '100%', background: 'rgba(0,0,0,0.2)', color: '#fff', border: '1px solid var(--border)', padding: '10px', borderRadius: '4px', fontSize: '13px', lineHeight: '1.5' }}
                  />
                </div>

                {/* Inline Resource Builder */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text2)', fontWeight: 600, marginBottom: '10px', textTransform: 'uppercase' }}>
                    Resources <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
                  </div>

                  {/* Added resources list */}
                  {newModResources.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      {newModResources.map((r, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px', padding: '6px 10px' }}>
                          <a
                            href={normalizeResourceUrl(r.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, color: r.type === 'video' ? '#f43f5e' : '#38bdf8', textDecoration: 'none', fontSize: '13px', overflow: 'hidden' }}
                          >
                            <span style={{ flexShrink: 0 }}>{r.type === 'video' ? '▶' : '📄'}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
                          </a>
                          <span style={{ fontSize: '11px', color: 'var(--text3)', flexShrink: 0 }}>{r.type === 'video' ? 'Video' : 'Confluence Doc'}</span>
                          <button
                            type="button"
                            onClick={() => setNewModResources(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px', flexShrink: 0 }}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add row */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text3)' }}>Label</label>
                      <input
                        type="text"
                        className="inp"
                        style={{ width: '100%', fontSize: '12px' }}
                        value={newResLabel}
                        onChange={(e) => setNewResLabel(e.target.value)}
                        placeholder="e.g. Training Doc"
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text3)' }}>URL</label>
                      <input
                        type="text"
                        className="inp"
                        style={{ width: '100%', fontSize: '12px', fontFamily: 'monospace' }}
                        value={newResUrl}
                        onChange={(e) => setNewResUrl(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div style={{ width: '140px', flexShrink: 0 }}>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '11px', color: 'var(--text3)' }}>Type</label>
                      <select
                        value={newResType}
                        onChange={(e) => setNewResType(e.target.value)}
                        style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border)', padding: '7px 8px', borderRadius: '4px', width: '100%', fontSize: '12px' }}
                      >
                        <option value="doc">📄 Confluence Doc</option>
                        <option value="video">▶ Video</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newResLabel.trim() || !newResUrl.trim()) return showAlert('Label and URL are required to add a resource.', 'error');
                        setNewModResources(prev => [...prev, { label: newResLabel.trim(), url: normalizeResourceUrl(newResUrl), type: newResType }]);
                        setNewResLabel('');
                        setNewResUrl('');
                        setNewResType('doc');
                      }}
                      style={{ background: activeSylColors.bg, border: `1px solid ${activeSylColors.border}`, color: activeSylColors.text, cursor: 'pointer', padding: '7px 14px', borderRadius: '4px', fontWeight: 600, fontSize: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-edit" onClick={() => setIsAddModuleModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-add" disabled={sylLoading} style={{ backgroundColor: activeSylColors.border, borderColor: activeSylColors.border, color: '#fff', boxShadow: 'none', opacity: sylLoading ? 0.6 : 1 }}>
                    {sylLoading ? 'Saving...' : 'Add Module'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ──────────────── USER ADD / EDIT DIALOG MODAL ──────────────── */}
        {isUserModalOpen && (
          <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1003 }}>
            <div className="modal-content" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', width: '460px', border: '1px solid var(--purple)', boxShadow: '0 0 24px rgba(0,0,0,0.5)' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--purple-l)' }}>
                {userModalMode === 'add' ? 'Add New User' : 'Edit User'}
              </h3>
              <form onSubmit={handleSaveUser}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Full Name</label>
                  <input
                    type="text"
                    className="inp"
                    style={{ width: '100%' }}
                    value={uName}
                    onChange={(e) => setUName(e.target.value)}
                    placeholder="Alex Morgan"
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Email Address</label>
                  <input
                    type="email"
                    className="inp"
                    style={{ width: '100%', opacity: userModalMode === 'edit' ? 0.6 : 1 }}
                    value={uEmail}
                    onChange={(e) => setUEmail(e.target.value)}
                    placeholder="you@greyorange.com"
                    disabled={userModalMode === 'edit'}
                  />
                  {userModalMode === 'edit' && (
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: 'var(--text3)' }}>Email cannot be changed after creation.</p>
                  )}
                </div>

                {userModalMode === 'add' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Temporary Password</label>
                    <input
                      type="text"
                      className="inp"
                      style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px' }}
                      value={uPassword}
                      onChange={(e) => setUPassword(e.target.value)}
                      placeholder="At least 6 characters"
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Team</label>
                    <select
                      value={uTeam}
                      onChange={(e) => setUTeam(e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '4px', width: '100%' }}
                    >
                      {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--text2)' }}>Role</label>
                    <select
                      value={uRole}
                      onChange={(e) => setURole(e.target.value as 'admin' | 'learner')}
                      style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid var(--border)', padding: '8px 10px', borderRadius: '4px', width: '100%' }}
                    >
                      <option value="learner">◎ Learner</option>
                      <option value="admin">⚙ Admin</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-edit" onClick={() => setIsUserModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-add" disabled={userSaving} style={{ backgroundColor: 'var(--purple)', borderColor: 'var(--purple)', color: '#fff', boxShadow: 'none', opacity: userSaving ? 0.6 : 1 }}>
                    {userSaving ? 'Saving...' : userModalMode === 'add' ? 'Create User' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}