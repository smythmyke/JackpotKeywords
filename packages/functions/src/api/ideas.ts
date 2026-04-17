import { Router } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { authMiddleware, type AuthRequest } from '../middleware/auth';
import { generateIdeaBoard } from '../services/ideaBoard';
import type { IdeaBoard } from '@jackpotkeywords/shared';

const router = Router();
const db = admin.firestore();

/**
 * POST /api/ideas/generate
 * Generate an idea board from a keyword search.
 * No additional credit cost — uses data from an already-paid search.
 */
router.post('/generate', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { searchId } = req.body;

  if (!searchId) {
    res.status(400).json({ error: 'searchId is required.' });
    return;
  }

  // Load search from Firestore
  let searchData: any;
  try {
    const doc = await db.collection('searches').doc(searchId).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Search not found.' });
      return;
    }
    searchData = doc.data();
  } catch (err: any) {
    functions.logger.error('Ideas: failed to load search:', err.message);
    res.status(500).json({ error: 'Failed to load search data.' });
    return;
  }

  const context = searchData.productContext;
  const keywords = searchData.keywords || [];
  const domain = searchData.url || '';

  if (!context) {
    res.status(400).json({ error: 'Search has no product context.' });
    return;
  }

  // Check if board already exists for this search
  const existing = await db.collection('ideaBoards')
    .where('searchId', '==', searchId)
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!existing.empty) {
    // Return existing board
    const board = { id: existing.docs[0].id, ...existing.docs[0].data() } as IdeaBoard;
    res.json(board);
    return;
  }

  // Load AEO result if available
  let aeoResult = null;
  try {
    const aeoSnap = await db.collection('aeoScans')
      .where('searchId', '==', searchId)
      .where('userId', '==', userId)
      .limit(1)
      .get();
    if (!aeoSnap.empty) {
      aeoResult = aeoSnap.docs[0].data() as any;
    }
  } catch { /* no AEO data available */ }

  const startTime = Date.now();
  try {
    functions.logger.info(`Idea Board: generating for search ${searchId}, user ${userId}`);
    const items = await generateIdeaBoard(context, keywords, domain, aeoResult);

    const boardId = db.collection('ideaBoards').doc().id;
    const board: IdeaBoard = {
      id: boardId,
      searchId,
      userId,
      productName: context.productName || context.productLabel || 'Unknown',
      domain,
      createdAt: new Date().toISOString(),
      items,
    };

    await db.collection('ideaBoards').doc(boardId).set(board);
    functions.logger.info(`Idea Board: created ${boardId} with ${items.length} items in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

    res.json(board);
  } catch (error: any) {
    functions.logger.error(`Idea Board error: ${error.message}`);
    res.status(500).json({ error: 'Idea Board generation failed. Please try again.' });
  }
});

/**
 * GET /api/ideas
 * List all idea boards for the authenticated user.
 */
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;

  try {
    const snapshot = await db.collection('ideaBoards')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const boards = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ boards });
  } catch (error: any) {
    functions.logger.error(`List ideas error: ${error.message}`);
    res.status(500).json({ error: 'Failed to load idea boards.' });
  }
});

/**
 * PATCH /api/ideas/:boardId/items/:itemId
 * Toggle an item's completed status.
 */
router.patch('/:boardId/items/:itemId', authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.userId!;
  const { boardId, itemId } = req.params;
  const { completed } = req.body;

  try {
    const docRef = db.collection('ideaBoards').doc(boardId);
    const doc = await docRef.get();

    if (!doc.exists) {
      res.status(404).json({ error: 'Board not found.' });
      return;
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      res.status(403).json({ error: 'Not your board.' });
      return;
    }

    const items = data.items || [];
    const itemIndex = items.findIndex((i: any) => i.id === itemId);
    if (itemIndex === -1) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    items[itemIndex].completed = typeof completed === 'boolean' ? completed : !items[itemIndex].completed;
    await docRef.update({ items });

    res.json({ id: itemId, completed: items[itemIndex].completed });
  } catch (error: any) {
    functions.logger.error(`Toggle idea error: ${error.message}`);
    res.status(500).json({ error: 'Failed to update item.' });
  }
});

export default router;
