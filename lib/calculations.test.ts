import { describe, expect, it } from 'vitest';
import { applyManualPayment, generateCicilanSchedule } from './calculations';
import type { ClientData } from '../types/client';

describe('applyManualPayment', () => {
  it('marks the selected installment as paid and updates its amount', () => {
    const client: ClientData = {
      namaKlien: 'Budi',
      namaBarang: 'Motor',
      jenisBarang: 'Kendaraan',
      hargaBarang: 12000000,
      hargaAsli: 9000000,
      tanggalPembelian: '2026-05-01',
      bunga: 5,
      tenorBulan: 3,
      dp: 2000000,
      cicilan: [
        { bulanKe: 1, jumlah: 335000, sudahBayar: false },
        { bulanKe: 2, jumlah: 335000, sudahBayar: false },
        { bulanKe: 3, jumlah: 335000, sudahBayar: false },
      ],
    };

    const updated = applyManualPayment(client, 1, 350000);

    expect(updated[0].sudahBayar).toBe(true);
    expect(updated[0].jumlah).toBe(350000);
    expect(updated[1].jumlah).toBe(327500);
    expect(updated[2].jumlah).toBe(327500);
  });

  it('distributes underpayment across remaining installments', () => {
    const client: ClientData = {
      namaKlien: 'Siti',
      namaBarang: 'TV',
      jenisBarang: 'Elektronik',
      hargaBarang: 8000000,
      hargaAsli: 6000000,
      tanggalPembelian: '2026-05-01',
      bunga: 3,
      tenorBulan: 3,
      dp: 1000000,
      cicilan: [
        { bulanKe: 1, jumlah: 2500000, sudahBayar: false },
        { bulanKe: 2, jumlah: 2500000, sudahBayar: false },
        { bulanKe: 3, jumlah: 2500000, sudahBayar: false },
      ],
    };

    const updated = applyManualPayment(client, 1, 2400000);

    expect(updated[0].sudahBayar).toBe(true);
    expect(updated[1].jumlah).toBe(2550000);
    expect(updated[2].jumlah).toBe(2550000);
  });

  it('keeps future installments unchanged if there are no remaining unpaid installments', () => {
    const client: ClientData = {
      namaKlien: 'Andi',
      namaBarang: 'Laptop',
      jenisBarang: 'Elektronik',
      hargaBarang: 10000000,
      hargaAsli: 8000000,
      tanggalPembelian: '2026-05-01',
      bunga: 4,
      tenorBulan: 1,
      dp: 2000000,
      cicilan: [
        { bulanKe: 1, jumlah: 8000000, sudahBayar: false },
      ],
    };

    const updated = applyManualPayment(client, 1, 8100000);

    expect(updated[0].sudahBayar).toBe(true);
    expect(updated[0].jumlah).toBe(8100000);
  });
});

describe('generateCicilanSchedule', () => {
  it('creates a full schedule of installments', () => {
    const client: ClientData = {
      namaKlien: 'Dewi',
      namaBarang: 'Smartphone',
      jenisBarang: 'Elektronik',
      hargaBarang: 6000000,
      hargaAsli: 5000000,
      tanggalPembelian: '2026-05-10',
      bunga: 2,
      tenorBulan: 3,
      dp: 1000000,
    };

    const cicilan = generateCicilanSchedule(client);

    expect(cicilan).toHaveLength(3);
    expect(cicilan[0].jumlah).toBeGreaterThan(0);
    expect(cicilan[0].sudahBayar).toBe(false);
  });
});
