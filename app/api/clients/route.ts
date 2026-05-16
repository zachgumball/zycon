import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

function generateClientId() {
  const randomDigits = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, '0');
  return `Z${randomDigits}`;
}

async function generateUniqueClientId(db: Awaited<ReturnType<typeof connectToDatabase>>) {
  const collection = db.collection('clients');
  let clientId: string;
  let exists = true;

  while (exists) {
    clientId = generateClientId();
    exists = await collection.findOne({ clientId }) !== null;
  }

  return clientId!;
}

export async function GET() {
  const db = await connectToDatabase();
  const clients = await db
    .collection('clients')
    .find()
    .sort({ createdAt: -1 })
    .toArray();

  const clientsWithIds = await Promise.all(
    clients.map(async (client) => {
      if (client.clientId) return client;

      const clientId = await generateUniqueClientId(db);
      await db.collection('clients').updateOne(
        { _id: client._id },
        { $set: { clientId } }
      );
      return { ...client, clientId };
    })
  );

  return NextResponse.json(
    clientsWithIds.map((client) => ({
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
  const clientId = await generateUniqueClientId(db);
  const inserted = await db.collection('clients').insertOne({
    clientId,
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
