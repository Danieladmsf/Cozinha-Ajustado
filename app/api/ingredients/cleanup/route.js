import { db } from '@/lib/firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

// POST /api/ingredients/cleanup - Limpar ingredientes duplicados antigos
export async function POST(request) {
  try {
    const { ids, action = 'deactivate' } = await request.json();

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { error: 'IDs array is required' },
        { status: 400 }
      );
    }

    const results = [];

    for (const id of ids) {
      try {
        const docRef = doc(db, 'Ingredient', id);

        if (action === 'delete') {
          await deleteDoc(docRef);
          results.push({ id, status: 'deleted', success: true });
        } else {
          // Desativar
          await updateDoc(docRef, { active: false });
          results.push({ id, status: 'deactivated', success: true });
        }
      } catch (error) {
        results.push({
          id,
          status: 'error',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      total: ids.length,
      successCount,
      errorCount,
      results
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to cleanup ingredients', details: error.message },
      { status: 500 }
    );
  }
}
