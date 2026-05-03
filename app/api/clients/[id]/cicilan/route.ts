import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/mongodb';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ message: 'ID klien tidak valid.' }, { status: 400 });
  }

  const body = await request.json();
  const { cicilan } = body;

  if (!Array.isArray(cicilan)) {
    return NextResponse.json({ message: 'Data cicilan tidak valid.' }, { status: 400 });
  }

  const db = await connectToDatabase();
  const result = await db.collection('clients').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { cicilan } },
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
