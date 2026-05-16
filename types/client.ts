export interface CicilanItem {
  bulanKe: number;
  jumlah: number;
  sudahBayar: boolean;
}

export interface PaymentLogItem {
  bulanKe: number;
  jumlah: number;
  tanggalBayar: string;
}

export interface ClientData {
  _id?: string;
  clientId?: string;
  namaKlien: string;
  namaBarang: string;
  jenisBarang: string;
  hargaBarang: number;
  hargaAsli: number;
  tanggalPembelian: string;
  bunga: number;
  tenorBulan: number;
  dp: number;
  cicilan?: CicilanItem[];
  paymentLogs?: PaymentLogItem[];
  createdAt?: string | null;
}

export interface ClientComputed {
  sisaTagihan: number;
  bungaTotal: number;
  totalKeuntungan: number;
  cicilanPerbulan: number;
}
