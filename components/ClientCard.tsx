'use client';

import { useState } from 'react';
import type { ClientData } from '@/types/client';
import { calculateClientValues, formatCurrency, getInstallmentCountdown, calculateRemainingPiutang } from '@/lib/calculations';

interface ClientCardProps {
  client: ClientData;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateCicilan?: (id: string, cicilan: ClientData['cicilan']) => void;
}

export default function ClientCard({
  client,
  onEdit,
  onDelete,
  onUpdateCicilan,
}: ClientCardProps) {
  const [showCicilan, setShowCicilan] = useState(false);
  const computed = calculateClientValues(client);

  const handleToggleCicilan = (bulanKe: number) => {
    if (!client._id || !client.cicilan) return;

    const updated = client.cicilan.map((c) =>
      c.bulanKe === bulanKe ? { ...c, sudahBayar: !c.sudahBayar } : c
    );

    onUpdateCicilan?.(client._id, updated);
  };

  const totalCicilanBayar = client.cicilan?.filter((c) => c.sudahBayar).length ?? 0;
  const nextUnpaidInstallment = client.cicilan?.find((c) => !c.sudahBayar);
  const nextInstallmentCountdownData = nextUnpaidInstallment
    ? getInstallmentCountdown(client, nextUnpaidInstallment)
    : { isPaid: true, daysLeft: null, label: 'Lunas' };
  const nextInstallmentCountdown = nextInstallmentCountdownData.label;

  const isFullyPaid = (client.cicilan?.every((c) => c.sudahBayar) ?? false) || calculateRemainingPiutang(client) === 0;
  let fullyPaidDate: string | null = null;
  if (isFullyPaid && client.paymentLogs && client.paymentLogs.length > 0) {
    const latest = client.paymentLogs
      .map((l) => new Date(l.tanggalBayar))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    if (latest) {
      fullyPaidDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(latest);
    }
  }

  return (
    <article className="client-card">
      <div className="client-header">
        <div>
          <h3>{client.namaKlien}</h3>
          <p className="barang-name">{client.namaBarang}</p>
        </div>
      </div>

      <div className="client-grid">
        <div>
          <p className="label">Harga Barang</p>
          <p className="value">{formatCurrency(client.hargaBarang)}</p>
        </div>
        <div>
          <p className="label">DP</p>
          <p className="value">{formatCurrency(client.dp)}</p>
        </div>
        <div>
          <p className="label">Sisa Tagihan</p>
          <p className="value">{formatCurrency(computed.sisaTagihan)}</p>
        </div>
      </div>

      <div className="client-grid">
        <div>
          <p className="label">Bunga (%)</p>
          <p className="value">{client.bunga}%</p>
        </div>
        <div>
          <p className="label">Tenor</p>
          <p className="value">{client.tenorBulan} bulan</p>
        </div>
        <div>
          <p className="label">Cicilan/Bulan</p>
          <p className="value highlight">{formatCurrency(computed.cicilanPerbulan)}</p>
        </div>
      </div>

      <div className="client-grid">
        <div>
          <p className="label">Bunga Total</p>
          <p className="value">{formatCurrency(computed.bungaTotal)}</p>
        </div>
        <div>
          <p className="label">Total Keuntungan</p>
          <p className="value profit">{formatCurrency(computed.totalKeuntungan)}</p>
        </div>
        <div>
          <p className="label">Countdown Angsuran</p>
          <p className={"value countdown-value" + (nextInstallmentCountdownData.daysLeft !== null && nextInstallmentCountdownData.daysLeft < 0 ? ' late' : '')}>
            {isFullyPaid ? (fullyPaidDate ? `Lunas sejak ${fullyPaidDate}` : 'Lunas') : nextInstallmentCountdown}
          </p>
        </div>
      </div>

      <div className="cicilan-summary">
        <button
          type="button"
          className="cicilan-toggle"
          onClick={() => setShowCicilan(!showCicilan)}
        >
          Status Cicilan: {totalCicilanBayar}/{client.tenorBulan} bulan ✓
        </button>

        {showCicilan && client.cicilan && (
          <div className="cicilan-checklist">
            {client.cicilan.map((cic) => (
              <label key={cic.bulanKe} className="cicilan-item">
                <input
                  type="checkbox"
                  checked={cic.sudahBayar}
                  onChange={() => handleToggleCicilan(cic.bulanKe)}
                />
                <span>Bulan {cic.bulanKe}: {formatCurrency(cic.jumlah)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="actions">
        <button type="button" className="ghost" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="secondary" onClick={onDelete}>
          Hapus
        </button>
      </div>
    </article>
  );
}
