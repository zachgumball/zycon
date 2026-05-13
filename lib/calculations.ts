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
  const totalKeuntungan = (client.hargaBarang - client.hargaAsli) + bungaTotal;
  const cicilanPerbulan = (sisaTagihan + bungaTotal) / client.tenorBulan;

  return {
    sisaTagihan: Math.round(sisaTagihan),
    bungaTotal: Math.round(bungaTotal),
    totalKeuntungan: Math.round(totalKeuntungan),
    cicilanPerbulan: roundInstallment(cicilanPerbulan),
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
    });
  }

  return cicilan;
}

export function applyManualPayment(
  client: ClientData,
  bulanKe: number,
  actualAmount: number
): ClientData['cicilan'] {
  if (!client.cicilan) return [];

  const updated = client.cicilan.map((item) => ({ ...item }));
  const target = updated.find((item) => item.bulanKe === bulanKe);
  if (!target) return updated;

  const expectedAmount = target.jumlah;
  const diff = actualAmount - expectedAmount;
  target.jumlah = actualAmount;
  target.sudahBayar = true;

  const future = updated.filter((item) => item.bulanKe > bulanKe && !item.sudahBayar);
  if (future.length === 0 || diff === 0) return updated;

  const totalAdjustment = -diff;
  const baseChange = Math.trunc(totalAdjustment / future.length);
  let remainder = totalAdjustment - baseChange * future.length;

  future.forEach((item) => {
    const extra = remainder !== 0 ? Math.sign(totalAdjustment) : 0;
    item.jumlah += baseChange + extra;
    remainder -= extra;
  });

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
