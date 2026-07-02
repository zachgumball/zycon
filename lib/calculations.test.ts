import { describe, expect, it } from 'vitest';
import {
  applyManualPayment,
  calculateClientValues,
  calculatePaymentReminders,
  calculateRemainingPiutang,
  generateCicilanSchedule,
  rebuildCicilanSchedule,
} from './calculations';
import type { ClientData } from '../types/client';

describe('applyManualPayment', () => {
  it('accumulates partial payments until the installment is fully paid', () => {
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
        { bulanKe: 1, jumlah: 300000, sudahBayar: false, dibayar: 0 },
        { bulanKe: 2, jumlah: 300000, sudahBayar: false, dibayar: 0 },
        { bulanKe: 3, jumlah: 300000, sudahBayar: false, dibayar: 0 },
      ],
    };

    const firstPayment = applyManualPayment(client, 1, 150000);
    const secondPayment = applyManualPayment(
      { ...client, cicilan: firstPayment as ClientData['cicilan'] },
      1,
      150000
    );

    expect(secondPayment?.[0].sudahBayar).toBe(true);
    expect(secondPayment?.[0].dibayar).toBe(300000);
    expect(secondPayment?.[1].jumlah).toBe(300000);
    expect(secondPayment?.[2].jumlah).toBe(300000);
  });

  it('keeps a month partially paid until the balance is completed', () => {
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
    expect(updated[0].dibayar).toBe(350000);
    expect(updated[1].jumlah).toBe(328000);
    expect(updated[2].jumlah).toBe(328000);
  });

  it('keeps future installment amounts unchanged when extra payment is treated as bonus', () => {
    const client: ClientData = {
      namaKlien: 'Rina',
      namaBarang: 'Laptop',
      jenisBarang: 'Elektronik',
      hargaBarang: 3000000,
      hargaAsli: 2500000,
      tanggalPembelian: '2026-05-01',
      bunga: 2,
      tenorBulan: 6,
      dp: 500000,
      cicilan: [
        { bulanKe: 1, jumlah: 404000, sudahBayar: false, dibayar: 0 },
        { bulanKe: 2, jumlah: 404000, sudahBayar: false, dibayar: 0 },
        { bulanKe: 3, jumlah: 404000, sudahBayar: false, dibayar: 0 },
        { bulanKe: 4, jumlah: 404000, sudahBayar: false, dibayar: 0 },
        { bulanKe: 5, jumlah: 404000, sudahBayar: false, dibayar: 0 },
        { bulanKe: 6, jumlah: 404000, sudahBayar: false, dibayar: 0 },
      ],
    };

    const updated = applyManualPayment(client, 1, 410000);

    expect(updated[0].sudahBayar).toBe(true);
    expect(updated[0].dibayar).toBe(410000);
    expect(updated[1].jumlah).toBe(403000);
    expect(updated[2].jumlah).toBe(403000);
    expect(updated[3].jumlah).toBe(403000);
    expect(updated[4].jumlah).toBe(403000);
    expect(updated[5].jumlah).toBe(403000);
  });

  it('stores partial payments without changing future installment amounts', () => {
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

    expect(updated[0].sudahBayar).toBe(false);
    expect(updated[0].dibayar).toBe(2400000);
    expect(updated[1].jumlah).toBe(2500000);
    expect(updated[2].jumlah).toBe(2500000);
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
    expect(updated[0].dibayar).toBe(8100000);
    expect(updated[0].jumlah).toBe(8000000);
  });
});

describe('calculateClientValues', () => {
  it('includes rounded installment surplus in total keuntungan', () => {
    const client: ClientData = {
      namaKlien: 'Rina',
      namaBarang: 'Laptop',
      jenisBarang: 'Elektronik',
      hargaBarang: 3000000,
      hargaAsli: 2500000,
      tanggalPembelian: '2026-05-01',
      bunga: 2,
      tenorBulan: 6,
      dp: 500000,
    };

    const computed = calculateClientValues(client);

    expect(computed.cicilanPerbulan).toBe(467000);
    expect(computed.totalKeuntungan).toBe(802000);
  });
});

describe('calculateRemainingPiutang', () => {
  it('uses payment history to reduce remaining balance when dibayar is missing', () => {
    const client: ClientData = {
      namaKlien: 'Rina',
      namaBarang: 'Laptop',
      jenisBarang: 'Elektronik',
      hargaBarang: 3000000,
      hargaAsli: 2500000,
      tanggalPembelian: '2026-05-01',
      bunga: 2,
      tenorBulan: 6,
      dp: 500000,
      cicilan: [
        { bulanKe: 1, jumlah: 100000, sudahBayar: false },
        { bulanKe: 2, jumlah: 100000, sudahBayar: false },
      ],
      paymentLogs: [
        { bulanKe: 1, jumlah: 40000, tanggalBayar: '2026-06-01T00:00:00.000Z' },
      ],
    };

    expect(calculateRemainingPiutang(client)).toBe(160000);
  });
});

describe('calculatePaymentReminders', () => {
  it('flags clients whose next installment due date is within seven days', () => {
    const referenceDate = new Date('2026-06-25T00:00:00.000Z');
    const clients: ClientData[] = [
      {
        namaKlien: 'Rina',
        namaBarang: 'Laptop',
        jenisBarang: 'Elektronik',
        hargaBarang: 3000000,
        hargaAsli: 2500000,
        tanggalPembelian: '2026-05-01',
        bunga: 2,
        tenorBulan: 6,
        dp: 500000,
        cicilan: [
          { bulanKe: 1, jumlah: 100000, sudahBayar: true, dibayar: 100000 },
          { bulanKe: 2, jumlah: 100000, sudahBayar: false, dibayar: 0 },
        ],
        paymentLogs: [
          { bulanKe: 1, jumlah: 100000, tanggalBayar: '2026-06-02T00:00:00.000Z' },
        ],
      },
    ];

    const reminders = calculatePaymentReminders(clients, referenceDate);

    expect(reminders).toHaveLength(1);
    expect(reminders[0].daysLeft).toBe(7);
    expect(reminders[0].status).toBe('upcoming');
  });
});

describe('rebuildCicilanSchedule', () => {
  it('recalculates installment amounts on edit while preserving existing payment status', () => {
    const client: ClientData = {
      namaKlien: 'Dewi',
      namaBarang: 'Smartphone',
      jenisBarang: 'Elektronik',
      hargaBarang: 9000000,
      hargaAsli: 7000000,
      tanggalPembelian: '2026-05-10',
      bunga: 2,
      tenorBulan: 6,
      dp: 1000000,
      cicilan: [
        { bulanKe: 1, jumlah: 200000, sudahBayar: true, dibayar: 200000 },
        { bulanKe: 2, jumlah: 200000, sudahBayar: false, dibayar: 50000 },
      ],
    };

    const rebuilt = rebuildCicilanSchedule(client);

    expect(rebuilt).toHaveLength(6);
    expect(rebuilt[0].jumlah).toBeGreaterThan(0);
    expect(rebuilt[0].sudahBayar).toBe(true);
    expect(rebuilt[0].dibayar).toBe(200000);
    expect(rebuilt[1].sudahBayar).toBe(false);
    expect(rebuilt[1].dibayar).toBe(50000);
    expect(rebuilt[5].sudahBayar).toBe(false);
    expect(rebuilt[5].dibayar).toBe(0);
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
