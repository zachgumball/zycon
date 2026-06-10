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
