import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  createSession,
  listMySessionClasses,
  listSessionsByPayrollMonth,
  updateSessionFinancial,
} from '../../services/sessionService';
import { CreateSessionRequest, SessionListItem, TutorSessionClassOptionResponse } from '../../types/sessions';
import { extractApiErrorMessage } from '../../services/authService';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import SessionFinancialDrawer from '../../components/sessions/SessionFinancialDrawer';
import { StudentTuitionRow } from '../../components/sessions/StudentTuitionDrawer';
import { useToast } from '../../components/feedback/ToastProvider';
import { getCurrentYearMonth } from '../../utils/format';
import TutorSessionCreateForm from './sessions/TutorSessionCreateForm';
import TutorSessionMonthList from './sessions/TutorSessionMonthList';

function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}-${`${now.getDate()}`.padStart(2, '0')}`;
}

const initialForm: CreateSessionRequest = {
  classId: '',
  date: getTodayDate(),
  durationHours: 1,
  salaryRateAtLog: 0.75,
  studentTuitions: [],
  payrollMonth: getCurrentYearMonth(),
  note: '',
};

function TutorSessionsPage() {
  const { showToast } = useToast();
  const [month, setMonth] = useState<string>(getCurrentYearMonth());
  const [editItem, setEditItem] = useState<SessionListItem | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [classes, setClasses] = useState<TutorSessionClassOptionResponse[]>([]);
  const [sessionHasNext, setSessionHasNext] = useState<boolean>(false);
  const [sessionPage, setSessionPage] = useState<number>(0);
  const [sessionLoadingMore, setSessionLoadingMore] = useState<boolean>(false);
  const [form, setForm] = useState<CreateSessionRequest>(initialForm);
  const [salaryRatePercent, setSalaryRatePercent] = useState<number>(75);
  const [tuitionDrawerOpen, setTuitionDrawerOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === form.classId) || null,
    [classes, form.classId]
  );

  async function loadSessions(): Promise<void> {
    setLoading(true);
    setError('');
    try {
      const response = await listSessionsByPayrollMonth(month, 0);
      setItems(response.items);
      setSessionPage(0);
      setSessionHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load sessions'));
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreSessions(): Promise<void> {
    if (!sessionHasNext || sessionLoadingMore) {
      return;
    }
    setSessionLoadingMore(true);
    setError('');
    try {
      const nextPage = sessionPage + 1;
      const response = await listSessionsByPayrollMonth(month, nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        const merged = [...prev];
        for (const row of response.items) {
          if (!seen.has(row.id)) {
            seen.add(row.id);
            merged.push(row);
          }
        }
        return merged;
      });
      setSessionPage(nextPage);
      setSessionHasNext(response.hasNext);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load more sessions'));
    } finally {
      setSessionLoadingMore(false);
    }
  }

  async function loadClasses(): Promise<void> {
    try {
      const response = await listMySessionClasses();
      setClasses(response);
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to load tutor classes'));
    }
  }

  useEffect(() => {
    loadClasses();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  function resetForm(): void {
    setForm({
      ...initialForm,
      payrollMonth: month,
      date: getTodayDate(),
    });
    setSalaryRatePercent(75);
    setTuitionDrawerOpen(false);
  }

  function overwriteAllStudentTuitions(
    nextDurationHours: number,
    nextClass: TutorSessionClassOptionResponse | null
  ): void {
    const tuitionPerStudent = Math.round((nextClass?.pricePerHour ?? 0) * nextDurationHours);
    setForm((prev) => ({
      ...prev,
      durationHours: nextDurationHours,
      studentTuitions: nextClass?.students?.map((s) => ({ studentId: s.id, tuitionAtLog: tuitionPerStudent })) ?? [],
    }));
  }

  function handleResetToDefault(): void {
    if (!selectedClass) {
      return;
    }
    overwriteAllStudentTuitions(form.durationHours, selectedClass);
  }

  function handleTuitionApply(rows: StudentTuitionRow[]): void {
    setForm((prev) => ({
      ...prev,
      studentTuitions: rows.map((row) => ({ studentId: row.studentId, tuitionAtLog: row.tuitionAtLog })),
    }));
  }

  function handleTuitionChange(studentId: string, tuitionAtLog: number): void {
    setForm((prev) => {
      const exists = prev.studentTuitions.some((t) => t.studentId === studentId);
      if (!exists) {
        return {
          ...prev,
          studentTuitions: [...prev.studentTuitions, { studentId, tuitionAtLog }],
        };
      }
      return {
        ...prev,
        studentTuitions: prev.studentTuitions.map((t) =>
          t.studentId === studentId ? { ...t, tuitionAtLog } : t
        ),
      };
    });
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    try {
      await createSession({
        ...form,
        salaryRateAtLog: Number((salaryRatePercent / 100).toFixed(4)),
      });
      showToast('Session logged successfully', 'success');
      resetForm();
      await loadSessions();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to create session'));
    }
  }

  async function handleUpdateFinancial(item: SessionListItem, reason: string): Promise<void> {
    if (!reason) {
      setError('Update reason is required for financial changes.');
      return;
    }
    setError('');
    setSaveLoading(true);
    try {
      await updateSessionFinancial(item.id, {
        tuitionAtLog: item.tuitionAtLog,
        salaryRateAtLog: item.salaryRateAtLog,
        payrollMonth: item.payrollMonth,
        note: item.note || '',
        reason,
      });
      showToast('Financials updated', 'success');
      setEditItem(null);
      await loadSessions();
    } catch (err: unknown) {
      setError(extractApiErrorMessage(err, 'Failed to update session'));
    } finally {
      setSaveLoading(false);
    }
  }

  return (
    <div className="stack-16">
      <PageHeader title="Sessions" subtitle="Log teaching sessions after class and review monthly records." />
      <Tabs
        items={[
          {
            id: 'log',
            label: 'Log session',
            panel: (
              <TutorSessionCreateForm
                classes={classes}
                form={form}
                salaryRatePercent={salaryRatePercent}
                error={error}
                tuitionDrawerOpen={tuitionDrawerOpen}
                onFormChange={setForm}
                onSalaryRateChange={setSalaryRatePercent}
                onClassChange={(classId, nextClass) => {
                  setTuitionDrawerOpen(false);
                  setForm((prev) => ({ ...prev, classId }));
                  overwriteAllStudentTuitions(form.durationHours, nextClass);
                }}
                onDurationChange={(hours, nextClass) => overwriteAllStudentTuitions(hours, nextClass)}
                onReset={resetForm}
                onSubmit={(event) => void handleCreate(event)}
                onOpenTuitionDrawer={() => setTuitionDrawerOpen(true)}
                onCloseTuitionDrawer={() => setTuitionDrawerOpen(false)}
                onTuitionChange={handleTuitionChange}
                onTuitionReset={handleResetToDefault}
                onTuitionApply={handleTuitionApply}
              />
            ),
          },
          {
            id: 'list',
            label: 'Monthly list',
            panel: (
              <TutorSessionMonthList
                month={month}
                items={items}
                classes={classes}
                loading={loading}
                sessionHasNext={sessionHasNext}
                sessionLoadingMore={sessionLoadingMore}
                onMonthChange={setMonth}
                onEdit={setEditItem}
                onLoadMore={() => void loadMoreSessions()}
              />
            ),
          },
        ]}
      />
      <SessionFinancialDrawer
        open={!!editItem}
        item={editItem}
        loading={saveLoading}
        onClose={() => setEditItem(null)}
        onSave={(item, reason) => void handleUpdateFinancial(item, reason)}
      />
    </div>
  );
}

export default TutorSessionsPage;
