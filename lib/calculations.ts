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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
}
