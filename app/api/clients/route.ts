import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  const db = await connectToDatabase();
  const clients = await db
    .collection('clients')
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json(
    clients.map((client) => ({
      ...client,
      _id: client._id.toString(),
      createdAt: client.createdAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    namaKlien,
    namaBarang,
    jenisBarang,
    hargaBarang,
    hargaAsli,
    tanggalPembelian,
    bunga,
    tenorBulan,
    dp,
    cicilan,
  } = body;

  // Validasi field
  if (
    !namaKlien ||
    !namaBarang ||
    !jenisBarang ||
    hargaBarang <= 0 ||
    hargaAsli <= 0 ||
    !tanggalPembelian ||
    bunga < 0 ||
    tenorBulan < 1 ||
    dp < 0
  ) {
    return NextResponse.json(
      { message: 'Semua field harus diisi dengan benar.' },
      { status: 400 }
    );
  }

  const db = await connectToDatabase();
  const inserted = await db.collection('clients').insertOne({
    namaKlien,
    namaBarang,
    jenisBarang,
    hargaBarang: Number(hargaBarang),
    hargaAsli: Number(hargaAsli),
    tanggalPembelian,
    bunga: Number(bunga),
    tenorBulan: Number(tenorBulan),
    dp: Number(dp),
    cicilan: cicilan || [],
    paymentLogs: [],
    createdAt: new Date(),
  });

  const created = await db.collection('clients').findOne({ _id: inserted.insertedId });

  return NextResponse.json({
    ...created,
    _id: created?._id.toString(),
    createdAt: created?.createdAt?.toISOString() ?? null,
  });
}
