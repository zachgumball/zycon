'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import ClientForm from '@/components/ClientForm';
import type { ClientData } from '@/types/client';
import {
  applyManualPayment,
  calculateClientValues,
  formatCurrency,
} from '@/lib/calculations';

export default function HomePage() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newFormKey, setNewFormKey] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'guest' | null>(null);
  const [guestId, setGuestId] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginTab, setLoginTab] = useState<'admin' | 'guest'>('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [detailClient, setDetailClient] = useState<ClientData | null>(null);
  const [expandedCicilanId, setExpandedCicilanId] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{
    client: ClientData;
    bulanKe: number;
    expected: number;
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

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

  async function handleUpdateCicilan(
    id: string,
    cicilan: ClientData['cicilan'],
    paymentLogs?: ClientData['paymentLogs']
  ) {
    try {
      setError(null);
      const body: Record<string, unknown> = { cicilan };
      if (paymentLogs !== undefined) {
        body.paymentLogs = paymentLogs;
      }

      const response = await fetch(`/api/clients/${id}/cicilan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

    const targetPayment = client.cicilan.find((c) => c.bulanKe === bulanKe);
    if (!targetPayment) return;

    const updated = client.cicilan.map((c) =>
      c.bulanKe === bulanKe ? { ...c, sudahBayar: !c.sudahBayar } : c
    );

    const paymentLogs =
      !targetPayment.sudahBayar && targetPayment.jumlah > 0
        ? [
            ...(client.paymentLogs ?? []),
            {
              bulanKe,
              jumlah: targetPayment.jumlah,
              tanggalBayar: new Date().toISOString(),
            },
          ]
        : undefined;

    handleUpdateCicilan(client._id, updated, paymentLogs);
  }

  function openPaymentModal(client: ClientData, bulanKe: number) {
    const installment = client.cicilan?.find((c) => c.bulanKe === bulanKe);
    if (!installment) return;

    setPaymentTarget({ client, bulanKe, expected: installment.jumlah });
    setPaymentAmount(installment.jumlah.toString());
    setPaymentError(null);
  }

  async function handleConfirmManualPayment() {
    if (!paymentTarget || !paymentTarget.client._id) return;

    const amount = parseInt(paymentAmount.replace(/\D/g, ''), 10);
    if (!amount || amount <= 0) {
      setPaymentError('Masukkan nominal pembayaran yang valid.');
      return;
    }

    const updated = applyManualPayment(paymentTarget.client, paymentTarget.bulanKe, amount);
    const paymentLogs = [
      ...(paymentTarget.client.paymentLogs ?? []),
      {
        bulanKe: paymentTarget.bulanKe,
        jumlah: amount,
        tanggalBayar: new Date().toISOString(),
      },
    ];

    await handleUpdateCicilan(paymentTarget.client._id, updated, paymentLogs);
    setPaymentTarget(null);
    setPaymentAmount('');
    setPaymentError(null);
  }

  function formatDisplayValue(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  function handleCancelPayment() {
    setPaymentTarget(null);
    setPaymentAmount('');
    setPaymentError(null);
  }

  function handlePriceChange(rawValue: string, setter: (value: string) => void) {
    const numValue = parseInt(rawValue.replace(/\D/g, ''), 10) || 0;
    setter(numValue.toString());
  }


  function handleExportCSV() {
    if (filteredClients.length === 0) {
      setError('Tidak ada data untuk diekspor.');
      return;
    }

    const headers = [
      'Nama Klien',
      'Nama Barang',
      'Jenis Barang',
      'Harga Barang',
      'DP',
      'Bunga (%)',
      'Tenor (bulan)',
      'Tanggal Pembelian',
      'Cicilan/Bulan',
      'Sisa Tagihan',
      'Total Keuntungan',
      'Status Cicilan',
    ];

    const rows = filteredClients.map((client) => {
      const computed = calculateClientValues(client);
      const paidCount = client.cicilan?.filter((c) => c.sudahBayar).length ?? 0;
      return [
        client.namaKlien,
        client.namaBarang,
        client.jenisBarang,
        client.hargaBarang.toString(),
        client.dp.toString(),
        client.bunga.toString(),
        client.tenorBulan.toString(),
        client.tanggalPembelian,
        computed.cicilanPerbulan.toString(),
        computed.sisaTagihan.toString(),
        computed.totalKeuntungan.toString(),
        `${paidCount}/${client.tenorBulan}`,
      ];
    });

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `klien-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return clients.filter((client) => {
      const matchesSearch =
        !normalizedSearch ||
        [client.namaKlien, client.namaBarang, client.jenisBarang, client.clientId]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch);

      const isPaid = (client.cicilan?.length ?? 0) > 0 && client.cicilan?.every((c) => c.sudahBayar);
      const statusMatches =
        statusFilter === 'all' ||
        (statusFilter === 'paid' && isPaid) ||
        (statusFilter === 'unpaid' && !isPaid);

      const isGuestMatch =
        userRole === 'guest'
          ? client.clientId?.toLowerCase() === normalizedSearch
          : true;

      return matchesSearch && statusMatches && isGuestMatch;
    });
  }, [clients, searchTerm, statusFilter, userRole, guestId]);

  function handleAdminLogin() {
    setLoginError(null);
    const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    if (adminPassword === correctPassword) {
      setUserRole('admin');
      setShowLoginModal(false);
      setAdminPassword('');
    } else {
      setLoginError('Password salah.');
    }
  }

  function handleGuestLogin() {
    setLoginError(null);
    if (!guestId.trim()) {
      setLoginError('Masukkan ID Klien.');
      return;
    }

    const normalizedId = guestId.trim().toLowerCase();
    const matchedClient = clients.find(
      (client) => client.clientId?.toLowerCase() === normalizedId
    );

    if (!matchedClient) {
      setLoginError('ID Klien tidak ditemukan.');
      return;
    }

    setUserRole('guest');
    setShowLoginModal(false);
    setSearchTerm(matchedClient.clientId || '');
    setGuestId('');
  }

  function handleLogout() {
    setUserRole(null);
    setShowLoginModal(true);
    setGuestId('');
    setAdminPassword('');
    setLoginTab('admin');
    setSearchTerm('');
    setStatusFilter('all');
  }

  const summaryClients = userRole === 'guest' ? filteredClients : clients;
  const totalInstallments = summaryClients.reduce((sum, client) => sum + (client.cicilan?.length ?? 0), 0);
  const totalOutstanding = summaryClients.reduce(
    (sum, client) =>
      sum +
      (client.cicilan?.reduce((installmentSum, c) =>
        installmentSum + (c.sudahBayar ? 0 : c.jumlah),
      0) ?? 0),
    0
  );
  const totalUnpaidInstallments = summaryClients.reduce(
    (sum, client) => sum + (client.cicilan?.filter((c) => !c.sudahBayar).length ?? 0),
    0
  );
  const totalKeuntungan = summaryClients.reduce((sum, client) => sum + calculateClientValues(client).totalKeuntungan, 0);
  const averageTenor = summaryClients.length ? Math.round(summaryClients.reduce((sum, client) => sum + client.tenorBulan, 0) / summaryClients.length) : 0;

  if (showLoginModal) {
    return (
      <main className="page-shell">
        <div className="modal-overlay" style={{ zIndex: 100 }}>
          <div className="edit-modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Zynext Counter</p>
                <h2>Masuk ke aplikasi</h2>
              </div>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab ${loginTab === 'admin' ? 'active' : ''}`}
                onClick={() => setLoginTab('admin')}
              >
                Admin
              </button>
              <button
                type="button"
                className={`auth-tab ${loginTab === 'guest' ? 'active' : ''}`}
                onClick={() => setLoginTab('guest')}
              >
                Guest
              </button>
            </div>

            <div className="auth-form">
              {loginError && <div className="alert" style={{ marginBottom: '16px' }}>{loginError}</div>}

              {loginTab === 'admin' ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAdminLogin();
                  }}
                >
                  <div className="field">
                    <label htmlFor="adminPassword">Password Admin</label>
                    <input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Masukkan password admin"
                    />
                  </div>
                  <button type="submit" className="primary" style={{ width: '100%', marginTop: '16px' }}>
                    Masuk sebagai Admin
                  </button>
                </form>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleGuestLogin();
                  }}
                >
                  <div className="field">
                    <label htmlFor="guestId">ID Klien</label>
                    <input
                      id="guestId"
                      type="text"
                      value={guestId}
                      onChange={(e) => setGuestId(e.target.value)}
                      placeholder="Masukkan ID Klien Anda"
                    />
                  </div>
                  <button type="submit" className="primary" style={{ width: '100%', marginTop: '16px' }}>
                    Masuk sebagai Guest
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="brand-stack">
            <div className="brand-logo" aria-hidden="true">
              <svg viewBox="0 0 64 64" role="img" aria-label="Logo">
                <path d="M32 6C18.7 6 8 16.7 8 30s10.7 24 24 24 24-10.7 24-24S45.3 6 32 6Zm0 4c10.5 0 19 8.5 19 19S42.5 48 32 48 13 39.5 13 29 21.5 10 32 10Zm-4.5 7.8c-6.1 1.7-10.5 7.4-10.5 13.8 0 1.1.9 2 2 2s2-.9 2-2c0-4.8 3.6-8.8 8.3-9.4V34h-5c-1.1 0-2 .9-2 2s.9 2 2 2h7c1.1 0 2-.9 2-2V24c0-1.1-.9-2-2-2s-2 .9-2 2v5.1c-1.6.3-3 .9-4.5 1.7v-9.1c0-1.1-.9-2-2-2s-2 .9-2 2v5.6Z"/>
              </svg>
            </div>
            <div className="brand-text">
              <h1>Zynext Counter</h1>
              <p>Kelola data klien dan cicilan dengan mudah</p>
            </div>
          </div>
        </div>
        <div className="page-header-actions">
          {userRole === 'admin' && (
            <button
              type="button"
              className="primary"
              onClick={() => setShowAddModal(true)}
            >
              + Tambah Data
            </button>
          )}
          <button
            type="button"
            className="secondary"
            onClick={toggleTheme}
            title="Ubah tema"
          >
            {theme === 'dark' ? '☀️ Terang' : '🌙 Gelap'}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleLogout}
            title="Keluar dari aplikasi"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {userRole === 'guest' && (
        <div className="guest-banner">
          <span>Anda login sebagai Guest: <strong>{summaryClients[0]?.namaKlien || searchTerm}</strong></span>
        </div>
      )}
      {userRole === 'admin' && (
        <div className="admin-banner">
          <span>✓ Anda login sebagai Admin</span>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="alert alert error" style={{ marginBottom: '24px' }}>
          <strong>Terjadi kesalahan:</strong> {error}
        </div>
      )}
      {successMessage && (
        <div className="alert success" style={{ marginBottom: '24px' }}>
          <strong>Berhasil!</strong> {successMessage}
        </div>
      )}

      <section className="content-grid">
        {(userRole === 'admin' || userRole === 'guest') && (
        <div className="panel">
          <div className="panel-header">
            <h2>Ringkasan Data</h2>
          </div>

          <div className="summary-grid">
            <div className="summary-item">
              <span>Klien Aktif</span>
              <strong>{summaryClients.length}</strong>
            </div>
            {userRole === 'guest' && summaryClients[0]?.clientId && (
              <div className="summary-item">
                <span>ID Klien</span>
                <strong>{summaryClients[0].clientId}</strong>
              </div>
            )}
            <div className="summary-item">
              <span>Total DP</span>
              <strong>{formatCurrency(summaryClients.reduce((sum, client) => sum + client.dp, 0))}</strong>
            </div>
            <div className="summary-item">
              <span>Total Piutang</span>
              <strong>{formatCurrency(totalOutstanding)}</strong>
            </div>
            <div className="summary-item">
              <span>Cicilan Dibayar</span>
              <strong>{summaryClients.reduce((sum, client) => sum + (client.cicilan?.filter((c) => c.sudahBayar).length ?? 0), 0)}/{totalInstallments}</strong>
            </div>
            <div className="summary-item">
              <span>Cicilan Tersisa</span>
              <strong>{totalUnpaidInstallments}</strong>
            </div>
            {userRole === 'admin' && (
              <div className="summary-item">
                <span>Total Keuntungan</span>
                <strong>{formatCurrency(totalKeuntungan)}</strong>
              </div>
            )}
            {userRole === 'admin' && (
              <div className="summary-item">
                <span>Rata-rata Tenor</span>
                <strong>{averageTenor} bln</strong>
              </div>
            )}
          </div>
        </div>
      )}

        {userRole === 'admin' && (
        <div className="panel">
          <div className="panel-header">
            <h2>Daftar Klien</h2>
            <div className="panel-header .actions" style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="secondary"
                onClick={handleExportCSV}
                title="Export data klien sebagai CSV"
              >
                📊 Export CSV
              </button>
            </div>
          </div>

          <div className="search-filters">
            <div>
              <label htmlFor="searchTerm">Cari klien / barang</label>
              <input
                id="searchTerm"
                type="search"
                placeholder="Cari nama klien, barang, atau jenis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="statusFilter">Filter status cicilan</label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'unpaid')}
              >
                <option value="all">Semua status</option>
                <option value="paid">Lunas</option>
                <option value="unpaid">Belum lunas</option>
              </select>
            </div>
          </div>
          {isLoading ? (
            <div className="loader">Memuat data...</div>
          ) : clients.length === 0 ? (
            <p className="empty-state">Belum ada data klien. Tambahkan klien baru untuk memulai.</p>
          ) : filteredClients.length === 0 ? (
            <p className="empty-state">Tidak ada data yang cocok dengan pencarian atau filter.</p>
          ) : (
            <div className="table-wrapper">
              <table className="client-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama Klien</th>
                    {userRole === 'admin' && <th>ID Klien</th>}
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
                  {filteredClients.map((client, index) => {
                    const computed = calculateClientValues(client);
                    const paidCount = client.cicilan?.filter((c) => c.sudahBayar).length ?? 0;
                    const isExpanded = expandedCicilanId === client._id;

                    return (
                      <Fragment key={client._id}>
                        <tr>
                          <td data-label="No">{index + 1}</td>
                          <td data-label="Nama Klien">{client.namaKlien}</td>
                          {userRole === 'admin' && (
                            <td data-label="ID Klien">{client.clientId ?? '-'}</td>
                          )}
                          <td data-label="Barang">{client.namaBarang}</td>
                          <td data-label="Jenis Barang">{client.jenisBarang ?? '-'}</td>
                          <td data-label="Harga">{formatCurrency(client.hargaBarang)}</td>
                          <td data-label="DP">{formatCurrency(client.dp)}</td>
                          <td data-label="Bunga">{client.bunga}%</td>
                          <td data-label="Tenor">{client.tenorBulan} bulan</td>
                          <td data-label="Cicilan/Bulan">{formatCurrency(computed.cicilanPerbulan)}</td>
                          <td data-label="Status">{paidCount}/{client.tenorBulan} dibayar</td>
                          <td className="actions-cell" data-label="Aksi">
                            {userRole === 'admin' ? (
                              <>
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => setDetailClient(client)}
                                >
                                  Detail
                                </button>
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
                              </>
                            ) : (
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => setDetailClient(client)}
                              >
                                Detail
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && client.cicilan && (
                          <tr className="cicilan-detail-row">
                            <td colSpan={userRole === 'admin' ? 10 : 9}>
                              <div className="cicilan-detail">
                                {client.cicilan.map((cic) => {
                                  const cikNominal = cic.jumlah;

                                  return (
                                    <div key={cic.bulanKe} className="cicilan-item">
                                      <div style={{ display: 'flex', flex: 1, gap: '10px', alignItems: 'center' }}>
                                        <input
                                          type="checkbox"
                                          checked={cic.sudahBayar}
                                          readOnly
                                        />
                                        <span>
                                          Bulan {cic.bulanKe}: {formatCurrency(cikNominal)}
                                        </span>
                                      </div>
                                      {userRole === 'admin' && (
                                        <button
                                          type="button"
                                          className="secondary small"
                                          onClick={() =>
                                            cic.sudahBayar
                                              ? handleToggleCicilanPayment(client, cic.bulanKe)
                                              : openPaymentModal(client, cic.bulanKe)
                                          }
                                        >
                                          {cic.sudahBayar ? 'Batalkan' : 'Bayar'}
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
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
      )}
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

      {detailClient && (
        <div className="modal-overlay" onClick={() => setDetailClient(null)}>
          <div className="edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Detail Klien</p>
                <h2>{detailClient.namaKlien}</h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setDetailClient(null)}
                aria-label="Tutup modal detail"
              >
                Close
              </button>
            </div>
            <div className="summary-grid">
              <div className="summary-item">
                <span>Nama Barang</span>
                <strong>{detailClient.namaBarang}</strong>
              </div>
              <div className="summary-item">
                <span>Jenis Barang</span>
                <strong>{detailClient.jenisBarang}</strong>
              </div>
              <div className="summary-item">
                <span>Harga Barang</span>
                <strong>{formatCurrency(detailClient.hargaBarang)}</strong>
              </div>
              {userRole === 'admin' && detailClient.clientId && (
                <div className="summary-item">
                  <span>ID Klien</span>
                  <strong>{detailClient.clientId}</strong>
                </div>
              )}
              <div className="summary-item">
                <span>DP</span>
                <strong>{formatCurrency(detailClient.dp)}</strong>
              </div>
              <div className="summary-item">
                <span>Bunga</span>
                <strong>{detailClient.bunga}%</strong>
              </div>
              <div className="summary-item">
                <span>Tenor</span>
                <strong>{detailClient.tenorBulan} bulan</strong>
              </div>
              <div className="summary-item">
                <span>Tanggal Pembelian</span>
                <strong>{detailClient.tanggalPembelian}</strong>
              </div>
            </div>
            <div className="cicilan-detail" style={{ marginTop: '20px' }}>
              <h3>Riwayat Cicilan</h3>
              {detailClient.cicilan?.length ? (
                <div className="cicilan-checklist">
                  {detailClient.cicilan.map((cic) => {
                    const detailCicilanAmount =
                      userRole === 'guest' && detailClient
                        ? calculateClientValues(detailClient).cicilanPerbulan
                        : cic.jumlah;

                    return (
                      <div key={cic.bulanKe} className="cicilan-item" style={{ cursor: 'default' }}>
                        <span>
                          Bulan {cic.bulanKe}: {formatCurrency(detailCicilanAmount)}
                        </span>
                        <strong>{cic.sudahBayar ? 'Lunas' : 'Belum lunas'}</strong>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">Belum ada jadwal cicilan untuk klien ini.</p>
              )}
            </div>
            <div className="cicilan-detail" style={{ marginTop: '20px' }}>
              <h3>Riwayat Pembayaran</h3>
              {detailClient.paymentLogs?.length ? (
                <div className="payment-log-list">
                  {[...detailClient.paymentLogs]
                    .sort((a, b) => new Date(b.tanggalBayar).getTime() - new Date(a.tanggalBayar).getTime())
                    .map((log, index) => (
                      <div key={`${log.bulanKe}-${index}`} className="payment-log-item">
                        <div>
                          <strong>Bulan {log.bulanKe}</strong>
                          <span>{formatCurrency(log.jumlah)}</span>
                        </div>
                        <small>
                          {new Intl.DateTimeFormat('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          }).format(new Date(log.tanggalBayar))}
                        </small>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="empty-state">Belum ada catatan pembayaran.</p>
              )}
            </div>
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

      {paymentTarget && (
        <div className="modal-overlay" onClick={handleCancelPayment}>
          <div className="edit-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Pembayaran Cicilan</p>
                <h2>Bayar Bulan {paymentTarget.bulanKe}</h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={handleCancelPayment}
                aria-label="Tutup modal pembayaran"
              >
                Close
              </button>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Nama Klien</label>
                <input value={paymentTarget.client.namaKlien} readOnly />
              </div>
              <div className="field">
                <label>Nominal Angsuran Saat Ini</label>
                <input value={formatCurrency(paymentTarget.expected)} readOnly />
              </div>
              <div className="field">
                <label htmlFor="manualPaymentAmount">Nominal yang diterima</label>
                <input
                  id="manualPaymentAmount"
                  type="text"
                  inputMode="numeric"
                  value={formatDisplayValue(parseInt(paymentAmount) || 0)}
                  onChange={(e) => handlePriceChange(e.target.value, setPaymentAmount)}
                  placeholder="0"
                />
                {paymentError && <div className="field-error">{paymentError}</div>}
              </div>
              <div className="panel-header" style={{ justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="secondary" onClick={handleCancelPayment}>
                  Batal
                </button>
                <button type="button" className="primary" onClick={handleConfirmManualPayment}>
                  Simpan Pembayaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
