import type { ClientData, ClientComputed } from '@/types/client';

function roundInstallment(value: number) {
  const rounded = Math.round(value);
  const remainder = rounded % 1000;

  if (remainder < 100) {
    return rounded - remainder;
  }

  return rounded + (1000 - remainder);
}

export function calculateClientValues(client: ClientData): ClientComputed {
  const sisaTagihan = client.hargaBarang - client.dp;
  const bungaTotal = sisaTagihan * (client.bunga / 100) * client.tenorBulan;
  const cicilanPerbulan = (sisaTagihan + bungaTotal) / client.tenorBulan;
  const cicilanPerbulanRounded = roundInstallment(cicilanPerbulan);
  const roundingSurplus = cicilanPerbulanRounded * client.tenorBulan - (sisaTagihan + bungaTotal);
  const totalKeuntungan = (client.hargaBarang - client.hargaAsli) + bungaTotal + roundingSurplus;

  return {
    sisaTagihan: Math.round(sisaTagihan),
    bungaTotal: Math.round(bungaTotal),
    totalKeuntungan: Math.round(totalKeuntungan),
    cicilanPerbulan: cicilanPerbulanRounded,
  };
}

export function calculateRemainingPiutang(client: ClientData): number {
  const paymentByMonth = (client.paymentLogs ?? []).reduce<Record<number, number>>((acc, log) => {
    acc[log.bulanKe] = (acc[log.bulanKe] ?? 0) + log.jumlah;
    return acc;
  }, {});

  return (client.cicilan ?? []).reduce((sum, installment) => {
    if (installment.sudahBayar) {
      return sum;
    }

    const paidFromLogs = paymentByMonth[installment.bulanKe] ?? 0;
    const paidAmount = Math.max(installment.dibayar ?? 0, paidFromLogs);
    const remaining = Math.max(0, installment.jumlah - paidAmount);

    return sum + remaining;
  }, 0);
}

export interface PaymentReminder {
  clientId?: string;
  clientName: string;
  month: number;
  amount: number;
  dueDate: string;
  daysLeft: number;
  status: 'upcoming' | 'overdue';
}

export function calculatePaymentReminders(
  clients: ClientData[],
  referenceDate: Date = new Date()
): PaymentReminder[] {
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);

  return clients
    .flatMap((client) => {
      const installments = client.cicilan ?? [];
      const unpaidInstallments = installments.filter((item) => !item.sudahBayar);

      if (unpaidInstallments.length === 0) {
        return [];
      }

      const latestPaymentDate = (client.paymentLogs ?? [])
        .map((log) => new Date(log.tanggalBayar))
        .filter((value) => !Number.isNaN(value.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      const fallbackDate = client.tanggalPembelian
        ? new Date(client.tanggalPembelian)
        : new Date();

      const baseDate = latestPaymentDate ?? fallbackDate;
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0 || diffDays > 7) {
        return [];
      }

      return [
        {
          clientId: client._id,
          clientName: client.namaKlien,
          month: unpaidInstallments[0].bulanKe,
          amount: unpaidInstallments[0].jumlah,
          dueDate: dueDate.toISOString(),
          daysLeft: diffDays,
          status: diffDays < 0 ? 'overdue' : 'upcoming',
        },
      ];
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function generateCicilanSchedule(client: ClientData) {
  const { cicilanPerbulan } = calculateClientValues(client);
  const cicilan = [];

  for (let i = 1; i <= client.tenorBulan; i++) {
    cicilan.push({
      bulanKe: i,
      jumlah: cicilanPerbulan,
      sudahBayar: false,
      dibayar: 0,
    });
  }

  return cicilan;
}

export function rebuildCicilanSchedule(client: ClientData) {
  const currentSchedule = client.cicilan ?? [];
  const previousMap = new Map(currentSchedule.map((item) => [item.bulanKe, item]));
  const regenerated = generateCicilanSchedule(client);

  return regenerated.map((item) => {
    const previous = previousMap.get(item.bulanKe);

    return {
      ...item,
      sudahBayar: previous?.sudahBayar ?? false,
      dibayar: previous?.dibayar ?? 0,
    };
  });
}

export function applyManualPayment(
  client: ClientData,
  bulanKe: number,
  actualAmount: number
): ClientData['cicilan'] {
  if (!client.cicilan) return [];

  const updated = client.cicilan.map((item) => ({
    ...item,
    dibayar: item.dibayar ?? 0,
  }));
  const target = updated.find((item) => item.bulanKe === bulanKe);
  if (!target) return updated;

  const expectedAmount = target.jumlah;
  const currentPaid = target.dibayar ?? 0;
  const totalPaidForMonth = currentPaid + actualAmount;
  const overpayment = Math.max(0, totalPaidForMonth - expectedAmount);

  target.dibayar = totalPaidForMonth;
  target.sudahBayar = target.dibayar >= expectedAmount;

  if (overpayment > 0) {
    const future = updated.filter((item) => item.bulanKe > bulanKe && !item.sudahBayar);
    if (future.length > 0) {
      const totalAdjustment = -overpayment;
      const baseChange = Math.trunc(totalAdjustment / future.length / 1000) * 1000;

      future.forEach((item) => {
        item.jumlah = roundInstallment(item.jumlah + baseChange);
      });
    }
  }

  return updated;
}

export function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(Math.abs(value));

  return value < 0 ? `−${formatted}` : formatted;
}
