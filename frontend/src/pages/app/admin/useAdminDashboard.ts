import { useQuery } from '@tanstack/react-query';
import { listPublishedClasses } from '../../../services/classAssignmentService';
import { listAdminInvoices } from '../../../services/adminInvoiceService';
import { listPayoutsByMonth } from '../../../services/payoutService';
import { getAdminTutorSummary } from '../../../services/dashboardService';

export function useAdminDashboard(month: string) {
  return useQuery({
    queryKey: ['adminDashboard', month],
    queryFn: async () => {
      const [classesRes, payouts, invoices, tutorsRes] = await Promise.all([
        listPublishedClasses(0, 100),
        listPayoutsByMonth(month),
        listAdminInvoices(month),
        getAdminTutorSummary(month, 0, 100),
      ]);

      const classes = classesRes.items;
      const activeClasses = classes.filter((c) => c.status === 'ACTIVE').length;
      const awaitingTutor = classes.filter((c) => c.status === 'AVAILABLE').length;
      const pendingApplications = classes.reduce(
        (sum, c) => sum + c.applications.filter((a) => a.status === 'PENDING').length,
        0
      );

      const openPayouts = payouts.filter((p) => p.status !== 'PAID').length;
      const paidPayouts = payouts.filter((p) => p.status === 'PAID').length;
      const unpaidInvoices = invoices.filter((i) => i.status !== 'PAID').length;

      return {
        activeClasses,
        awaitingTutor,
        pendingApplications,
        tutorCount: tutorsRes.items.length,
        openPayouts,
        paidPayouts,
        payoutTotal: payouts.length,
        unpaidInvoices,
        invoiceTotal: invoices.length,
      };
    },
  });
}
