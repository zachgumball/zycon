export interface CicilanItem {
  bulanKe: number;
  jumlah: number;
  sudahBayar: boolean;
}

export interface ClientData {
  _id?: string;
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
  createdAt?: string | null;
}

export interface ClientComputed {
  sisaTagihan: number;
  bungaTotal: number;
  totalKeuntungan: number;
  cicilanPerbulan: number;
}
