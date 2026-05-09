'use client';

import { Fragment, useEffect, useState } from 'react';
import ClientForm from '@/components/ClientForm';
import type { ClientData } from '@/types/client';
import { calculateClientValues, formatCurrency } from '@/lib/calculations';

export default function HomePage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newFormKey, setNewFormKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [expandedCicilanId, setExpandedCicilanId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/clients');
      if (!response.ok) throw new Error('Gagal mengambil data klien.');
      const data = await response.json();
      setClients(data || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave(client: ClientData) {
    setIsSaving(true);
    try {
      setError(null);
      const isUpdate = Boolean(client._id);
      const url = isUpdate ? `/api/clients/${client._id}` : '/api/clients';
      const method = isUpdate ? 'PATCH' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || 'Gagal menyimpan data.');
      }

      await fetchClients();
      if (!isUpdate) {
        setNewFormKey((current) => current + 1);
        setShowAddModal(false);
      }
      setEditingClient(null);
      setSuccessMessage(isUpdate ? 'Data klien berhasil diperbarui.' : 'Data klien berhasil ditambahkan.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateCicilan(id: string, cicilan: ClientData['cicilan']) {
    try {
      setError(null);
      const response = await fetch(`/api/clients/${id}/cicilan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cicilan }),
      });

      if (!response.ok) throw new Error('Gagal memperbarui cicilan.');
      await fetchClients();
      setSuccessMessage('Status cicilan berhasil diperbarui.');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleToggleCicilanRow(id: string) {
    setExpandedCicilanId((current) => (current === id ? null : id));
  }

  function handleToggleCicilanPayment(client: ClientData, bulanKe: number) {
    if (!client._id || !client.cicilan) return;

    const updated = client.cicilan.map((c) =>
      c.bulanKe === bulanKe ? { ...c, sudahBayar: !c.sudahBayar } : c
    );

    handleUpdateCicilan(client._id, updated);
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus klien ini?')) return;

    setDeletingId(id);
    try {
      setError(null);
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Gagal menghapus data klien.');
      await fetchClients();
      setSuccessMessage('Data klien berhasil dihapus.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(null), 4500);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const totalDp = clients.reduce((sum, client) => sum + client.dp, 0);
  const totalPaidInstallments = clients.reduce(
    (sum, client) => sum + (client.cicilan?.filter((c) => c.sudahBayar).length ?? 0),
    0
  );
  const totalInstallments = clients.reduce((sum, client) => sum + (client.cicilan?.length ?? 0), 0);
  const totalKeuntungan = clients.reduce((sum, client) => sum + calculateClientValues(client).totalKeuntungan, 0);
  const averageTenor = clients.length ? Math.round(clients.reduce((sum, client) => sum + client.tenorBulan, 0) / clients.length) : 0;

  return (
    <main className="page-shell">
      <section className="content-grid">
        <div className="panel card-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Daftar Klien</p>
              <h2>Data klien terbaru</h2>
            </div>
            <button
              type="button"
              className="primary"
              onClick={() => setShowAddModal(true)}
            >
              Tambah Data
            </button>
          </div>

          {error && <div className="alert">{error}</div>}
          {successMessage && <div className="success">{successMessage}</div>}
          {isLoading ? (
            <div className="loader">Memuat data...</div>
          ) : clients.length === 0 ? (
            <p className="empty-state">Belum ada data klien. Tambahkan klien baru untuk memulai.</p>
          ) : (
            <div className="table-wrapper">
              <table className="client-table">
                <thead>
                  <tr>
                    <th>Nama Klien</th>
                    <th>Barang</th>
                    <th>Jenis Barang</th>
                    <th>Harga</th>
                    <th>DP</th>
                    <th>Bunga</th>
                    <th>Tenor</th>
                    <th>Cicilan/Bulan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => {
                    const computed = calculateClientValues(client);
                    const paidCount = client.cicilan?.filter((c) => c.sudahBayar).length ?? 0;
                    const isExpanded = expandedCicilanId === client._id;

                    return (
                      <Fragment key={client._id}>
                        <tr>
                          <td data-label="Nama Klien">{client.namaKlien}</td>
                          <td data-label="Barang">{client.namaBarang}</td>
                          <td data-label="Jenis Barang">{client.jenisBarang ?? '-'}</td>
                          <td data-label="Harga">{formatCurrency(client.hargaBarang)}</td>
                          <td data-label="DP">{formatCurrency(client.dp)}</td>
                          <td data-label="Bunga">{client.bunga}%</td>
                          <td data-label="Tenor">{client.tenorBulan} bulan</td>
                          <td data-label="Cicilan/Bulan">{formatCurrency(computed.cicilanPerbulan)}</td>
                          <td data-label="Status">{paidCount}/{client.tenorBulan} dibayar</td>
                          <td className="actions-cell" data-label="Aksi">
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setEditingClient(client)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              disabled={deletingId === client._id}
                              onClick={() => client._id && handleDelete(client._id)}
                            >
                              {deletingId === client._id ? (
                                <>
                                  <span className="button-spinner" />
                                  Menghapus...
                                </>
                              ) : (
                                'Hapus'
                              )}
                            </button>
                            <button
                              type="button"
                              className="secondary small"
                              onClick={() => client._id && handleToggleCicilanRow(client._id)}
                            >
                              {isExpanded ? 'Tutup Cicilan' : 'Lihat Cicilan'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && client.cicilan && (
                          <tr className="cicilan-detail-row">
                            <td colSpan={9}>
                              <div className="cicilan-detail">
                                {client.cicilan.map((cic) => (
                                  <label key={cic.bulanKe} className="cicilan-item">
                                    <input
                                      type="checkbox"
                                      checked={cic.sudahBayar}
                                      onChange={() => handleToggleCicilanPayment(client, cic.bulanKe)}
                                    />
                                    <span>
                                      Bulan {cic.bulanKe}: {formatCurrency(cic.jumlah)}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {editingClient && (
        <div className="modal-overlay" onClick={() => setEditingClient(null)}>
          <div className="edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Edit Klien</p>
                <h2>Perbarui informasi klien</h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setEditingClient(null)}
                aria-label="Tutup modal edit"
              >
                Close
              </button>
            </div>

            <ClientForm
              key={editingClient._id}
              initialData={editingClient}
              onSave={handleSave}
              onCancel={() => setEditingClient(null)}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Tambah Klien</p>
                <h2>Masukkan data klien baru</h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setShowAddModal(false)}
                aria-label="Tutup modal tambah"
              >
                Close
              </button>
            </div>

            <ClientForm
              key={newFormKey}
              onSave={handleSave}
              onCancel={() => setShowAddModal(false)}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}
    </main>
  );
}
