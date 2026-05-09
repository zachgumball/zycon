'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ClientData } from '@/types/client';
import { calculateClientValues, generateCicilanSchedule, formatCurrency } from '@/lib/calculations';

interface ClientFormProps {
  initialData?: ClientData | null;
  onSave: (client: ClientData) => void;
  onCancel: () => void;
  isSaving?: boolean;
}

const defaultValues = {
  namaKlien: '',
  namaBarang: '',
  jenisBarang: '',
  hargaBarang: 0,
  hargaAsli: 0,
  tanggalPembelian: '',
  bunga: 3,
  tenorBulan: 3,
  dp: 0,
  cicilan: [],
};

export default function ClientForm({ initialData, onSave, onCancel, isSaving = false }: ClientFormProps) {
  const [form, setForm] = useState<ClientData>(
    initialData ? { ...defaultValues, ...initialData } : { ...defaultValues }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ClientData, string>>>({});

  useEffect(() => {
    setForm(initialData ? { ...defaultValues, ...initialData } : { ...defaultValues });
    setErrors({});
  }, [initialData]);

  const computed = useMemo(() => calculateClientValues(form), [form]);
  const buttonLabel = initialData ? 'Perbarui Klien' : 'Simpan Klien';

  const isSubmitDisabled = useMemo(
    () =>
      !form.namaKlien ||
      !form.namaBarang ||
      !form.jenisBarang ||
      !form.hargaBarang ||
      !form.hargaAsli ||
      !form.tanggalPembelian ||
      form.bunga < 0 ||
      (form.tenorBulan !== 3 && form.tenorBulan !== 6) ||
      form.dp < 0,
    [form]
  );

  function updateField(field: keyof ClientData, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function formatDisplayValue(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  function handlePriceChange(field: keyof ClientData, rawValue: string) {
    const numValue = parseInt(rawValue.replace(/\D/g, ''), 10) || 0;
    updateField(field, numValue);
  }

  function validateForm() {
    const newErrors: Partial<Record<keyof ClientData, string>> = {};

    if (!form.namaKlien.trim()) newErrors.namaKlien = 'Nama klien wajib diisi.';
    if (!form.namaBarang.trim()) newErrors.namaBarang = 'Nama barang wajib diisi.';
    if (!form.jenisBarang.trim()) newErrors.jenisBarang = 'Jenis barang wajib diisi.';
    if (!form.hargaBarang || form.hargaBarang <= 0) newErrors.hargaBarang = 'Harga barang harus lebih dari 0.';
    if (!form.hargaAsli || form.hargaAsli <= 0) newErrors.hargaAsli = 'Harga asli harus lebih dari 0.';
    if (!form.tanggalPembelian) newErrors.tanggalPembelian = 'Tanggal pembelian wajib diisi.';
    if (form.dp < 0) newErrors.dp = 'DP tidak boleh negatif.';
    if (form.dp > form.hargaBarang) newErrors.dp = 'DP tidak boleh lebih besar dari harga barang.';
    if (form.bunga < 0) newErrors.bunga = 'Bunga tidak boleh negatif.';
    if (form.tenorBulan !== 3 && form.tenorBulan !== 6) newErrors.tenorBulan = 'Pilih tenor 3 atau 6 bulan.';

    setErrors(newErrors);
    return newErrors;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) return;

    const dataToSave = {
      ...form,
      cicilan: !initialData ? generateCicilanSchedule(form) : form.cicilan,
    };
    onSave(dataToSave);
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Data Klien</h3>
        <div className="form-grid">
          <div className={`field${errors.namaKlien ? ' invalid' : ''}`}>
            <label htmlFor="namaKlien">Nama Klien</label>
            <input
              id="namaKlien"
              value={form.namaKlien}
              onChange={(e) => updateField('namaKlien', e.target.value)}
              placeholder="Contoh: Budi Santoso"
              aria-invalid={Boolean(errors.namaKlien)}
            />
            {errors.namaKlien && <div className="field-error">{errors.namaKlien}</div>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Data Barang</h3>
        <div className="form-grid">
          <div className={`field${errors.namaBarang ? ' invalid' : ''}`}>
            <label htmlFor="namaBarang">Nama Barang</label>
            <input
              id="namaBarang"
              value={form.namaBarang}
              onChange={(e) => updateField('namaBarang', e.target.value)}
              placeholder="Contoh: Motor Honda"
              aria-invalid={Boolean(errors.namaBarang)}
            />
            {errors.namaBarang && <div className="field-error">{errors.namaBarang}</div>}
          </div>

          <div className={`field${errors.jenisBarang ? ' invalid' : ''}`}>
            <label htmlFor="jenisBarang">Jenis Barang</label>
            <input
              id="jenisBarang"
              value={form.jenisBarang}
              onChange={(e) => updateField('jenisBarang', e.target.value)}
              placeholder="Contoh: Elektronik / Kendaraan"
              aria-invalid={Boolean(errors.jenisBarang)}
            />
            {errors.jenisBarang && <div className="field-error">{errors.jenisBarang}</div>}
          </div>

          <div className="row-grid">
            <div className={`field${errors.hargaBarang ? ' invalid' : ''}`}>
              <label htmlFor="hargaBarang">Harga Barang (Rp)</label>
              <input
                id="hargaBarang"
                type="text"
                inputMode="numeric"
                value={formatDisplayValue(form.hargaBarang)}
                onChange={(e) => handlePriceChange('hargaBarang', e.target.value)}
                placeholder="0"
                aria-invalid={Boolean(errors.hargaBarang)}
              />
              {errors.hargaBarang && <div className="field-error">{errors.hargaBarang}</div>}
            </div>

            <div className={`field${errors.hargaAsli ? ' invalid' : ''}`}>
              <label htmlFor="hargaAsli">Harga Asli/Beli (Rp)</label>
              <input
                id="hargaAsli"
                type="text"
                inputMode="numeric"
                value={formatDisplayValue(form.hargaAsli)}
                onChange={(e) => handlePriceChange('hargaAsli', e.target.value)}
                placeholder="0"
                aria-invalid={Boolean(errors.hargaAsli)}
              />
              {errors.hargaAsli && <div className="field-error">{errors.hargaAsli}</div>}
            </div>
          </div>

          <div className={`field${errors.tanggalPembelian ? ' invalid' : ''}`}>
            <label htmlFor="tanggalPembelian">Tanggal Pembelian</label>
            <input
              id="tanggalPembelian"
              type="date"
              value={form.tanggalPembelian}
              onChange={(e) => updateField('tanggalPembelian', e.target.value)}
              aria-invalid={Boolean(errors.tanggalPembelian)}
            />
            {errors.tanggalPembelian && <div className="field-error">{errors.tanggalPembelian}</div>}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Cicilan & Bunga</h3>
        <div className="form-grid">
          <div className="row-grid">
            <div className={`field${errors.dp ? ' invalid' : ''}`}>
              <label htmlFor="dp">DP (Rp)</label>
              <input
                id="dp"
                type="text"
                inputMode="numeric"
                value={formatDisplayValue(form.dp)}
                onChange={(e) => handlePriceChange('dp', e.target.value)}
                placeholder="0"
                aria-invalid={Boolean(errors.dp)}
              />
              {errors.dp && <div className="field-error">{errors.dp}</div>}
            </div>

            <div className={`field${errors.bunga ? ' invalid' : ''}`}>
              <label htmlFor="bunga">Bunga (%/bulan)</label>
              <input
                id="bunga"
                type="number"
                min={0}
                step={0.1}
                value={form.bunga || ''}
                onChange={(e) => {
                  const numValue = e.target.value === '' ? 0 : Number(e.target.value);
                  updateField('bunga', numValue);
                }}
                aria-invalid={Boolean(errors.bunga)}
              />
              {errors.bunga && <div className="field-error">{errors.bunga}</div>}
            </div>

            <div className="field">
              <label>Tenor (bulan)</label>
              <div className="radio-group">
                {[3, 6].map((value) => (
                  <label key={value} className="radio-option" htmlFor={`tenor-${value}`}>
                    <input
                      id={`tenor-${value}`}
                      type="radio"
                      name="tenorBulan"
                      value={value}
                      checked={form.tenorBulan === value}
                      onChange={(e) => updateField('tenorBulan', Number(e.target.value))}
                    />
                    <span>{value} bulan</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Ringkasan Perhitungan</h3>
        <div className="summary-grid">
          <div className="summary-item">
            <span>Sisa Tagihan:</span>
            <strong>{formatCurrency(computed.sisaTagihan)}</strong>
          </div>
          <div className="summary-item">
            <span>Bunga Total:</span>
            <strong>{formatCurrency(computed.bungaTotal)}</strong>
          </div>
          <div className="summary-item">
            <span>Total Keuntungan:</span>
            <strong>{formatCurrency(computed.totalKeuntungan)}</strong>
          </div>
          <div className="summary-item">
            <span>Cicilan Per Bulan:</span>
            <strong>{formatCurrency(computed.cicilanPerbulan)}</strong>
          </div>
        </div>
      </div>

      <div className="actions">
        <button type="submit" className="primary" disabled={isSubmitDisabled || isSaving}>
          {isSaving ? (
            <>
              <span className="button-spinner" />
              Menyimpan...
            </>
          ) : (
            buttonLabel
          )}
        </button>
        {initialData && (
          <button type="button" className="secondary" onClick={onCancel}>
            Batalkan
          </button>
        )}
      </div>
    </form>
  );
}
