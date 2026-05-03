import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID klien tidak valid.' }, { status: 400 });
  }

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
  } = body;

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
  const result = await db.collection('clients').findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        namaKlien,
        namaBarang,
        jenisBarang,
        hargaBarang: Number(hargaBarang),
        hargaAsli: Number(hargaAsli),
        tanggalPembelian,
        bunga: Number(bunga),
        tenorBulan: Number(tenorBulan),
        dp: Number(dp),
      },
    },
    { returnDocument: 'after' }
  );

  if (!result.value) {
    return NextResponse.json({ message: 'Klien tidak ditemukan.' }, { status: 404 });
  }

  return NextResponse.json({
    ...result.value,
    _id: result.value._id.toString(),
    createdAt: result.value.createdAt?.toISOString() ?? null,
  });
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID klien tidak valid.' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const result = await db.collection('clients').deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return NextResponse.json({ message: 'Klien tidak ditemukan.' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
