'use client';

import { useState } from 'react';
import type { ClientData } from '@/types/client';
import { calculateClientValues, formatCurrency } from '@/lib/calculations';

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
