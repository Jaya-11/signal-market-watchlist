import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const createWatchlistSchema = z.object({
  name: z.string().min(1, 'Watchlist name is required').max(50, 'Name must be 50 characters or less'),
});

export const renameWatchlistSchema = z.object({
  name: z.string().min(1, 'Watchlist name is required').max(50, 'Name must be 50 characters or less'),
});

export const addStockSchema = z.object({
  symbol: z.string().min(1, 'Symbol is required').max(15, 'Symbol too long').transform((val) => val.toUpperCase().trim()),
  companyName: z.string().min(1, 'Company name is required'),
});

export interface WatchlistStockItem {
  id: string;
  watchlistId: string;
  symbol: string;
  companyName: string;
  addedAt: Date;
}

export interface WatchlistRecord {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  stocks: WatchlistStockItem[];
}

// In-memory clean deterministic fallback store
function getInitialDefaultWatchlists(userId: string): WatchlistRecord[] {
  return [
    {
      id: 'wl-default-main',
      userId,
      name: 'Main Watchlist',
      createdAt: new Date(),
      updatedAt: new Date(),
      stocks: [
        { id: 's-1', watchlistId: 'wl-default-main', symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd.', addedAt: new Date() },
        { id: 's-2', watchlistId: 'wl-default-main', symbol: 'TATAMOTORS', companyName: 'Tata Motors Limited', addedAt: new Date() },
        { id: 's-3', watchlistId: 'wl-default-main', symbol: 'INFY', companyName: 'Infosys Limited', addedAt: new Date() },
        { id: 's-4', watchlistId: 'wl-default-main', symbol: 'SBIN', companyName: 'State Bank of India', addedAt: new Date() },
        { id: 's-5', watchlistId: 'wl-default-main', symbol: 'NVDA', companyName: 'NVIDIA Corporation', addedAt: new Date() },
        { id: 's-6', watchlistId: 'wl-default-main', symbol: 'AAPL', companyName: 'Apple Inc.', addedAt: new Date() },
      ],
    },
  ];
}

const IN_MEMORY_WATCHLISTS: Record<string, WatchlistRecord[]> = {};

export class WatchlistsService {
  /**
   * Get user watchlists, creating a clean default "Main Watchlist" if none exist
   */
  public static async getUserWatchlists(userId: string): Promise<WatchlistRecord[]> {
    try {
      let watchlists = await prisma.watchlist.findMany({
        where: { userId },
        include: {
          stocks: {
            orderBy: { addedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (watchlists.length === 0) {
        const defaultList = await prisma.watchlist.create({
          data: {
            userId,
            name: 'Main Watchlist',
            stocks: {
              create: [
                { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd.' },
                { symbol: 'TATAMOTORS', companyName: 'Tata Motors Limited' },
                { symbol: 'INFY', companyName: 'Infosys Limited' },
                { symbol: 'SBIN', companyName: 'State Bank of India' },
                { symbol: 'NVDA', companyName: 'NVIDIA Corporation' },
                { symbol: 'AAPL', companyName: 'Apple Inc.' },
              ],
            },
          },
          include: {
            stocks: {
              orderBy: { addedAt: 'desc' },
            },
          },
        });
        watchlists = [defaultList];
      }

      return watchlists;
    } catch {
      // In-memory fallback if DB connection fails
      if (!IN_MEMORY_WATCHLISTS[userId] || IN_MEMORY_WATCHLISTS[userId].length === 0) {
        IN_MEMORY_WATCHLISTS[userId] = getInitialDefaultWatchlists(userId);
      }
      return IN_MEMORY_WATCHLISTS[userId];
    }
  }

  /**
   * Get single watchlist by ID
   */
  public static async getWatchlistById(id: string, userId: string): Promise<WatchlistRecord | null> {
    try {
      return await prisma.watchlist.findFirst({
        where: { id, userId },
        include: {
          stocks: {
            orderBy: { addedAt: 'desc' },
          },
        },
      });
    } catch {
      const userLists = await WatchlistsService.getUserWatchlists(userId);
      return userLists.find((w) => w.id === id) || null;
    }
  }

  /**
   * Create a new watchlist
   */
  public static async createWatchlist(userId: string, name: string): Promise<WatchlistRecord> {
    try {
      return await prisma.watchlist.create({
        data: {
          userId,
          name,
        },
        include: { stocks: true },
      });
    } catch {
      const userLists = await WatchlistsService.getUserWatchlists(userId);
      const newWl: WatchlistRecord = {
        id: `wl-mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        userId,
        name,
        createdAt: new Date(),
        updatedAt: new Date(),
        stocks: [],
      };
      userLists.push(newWl);
      IN_MEMORY_WATCHLISTS[userId] = userLists;
      return newWl;
    }
  }

  /**
   * Rename an existing watchlist
   */
  public static async renameWatchlist(id: string, userId: string, name: string): Promise<WatchlistRecord | null> {
    try {
      const watchlist = await prisma.watchlist.findFirst({ where: { id, userId } });
      if (!watchlist) return null;

      return await prisma.watchlist.update({
        where: { id },
        data: { name },
        include: { stocks: true },
      });
    } catch {
      const userLists = await WatchlistsService.getUserWatchlists(userId);
      const target = userLists.find((w) => w.id === id);
      if (!target) return null;
      target.name = name;
      target.updatedAt = new Date();
      return target;
    }
  }

  /**
   * Delete a watchlist
   */
  public static async deleteWatchlist(id: string, userId: string): Promise<boolean> {
    try {
      const watchlist = await prisma.watchlist.findFirst({ where: { id, userId } });
      if (!watchlist) return false;

      await prisma.watchlist.delete({ where: { id } });
      return true;
    } catch {
      const userLists = await WatchlistsService.getUserWatchlists(userId);
      const idx = userLists.findIndex((w) => w.id === id);
      if (idx === -1) return false;
      userLists.splice(idx, 1);
      IN_MEMORY_WATCHLISTS[userId] = userLists;
      return true;
    }
  }

  /**
   * Add a stock to a watchlist
   */
  public static async addStockToWatchlist(watchlistId: string, userId: string, symbol: string, companyName: string): Promise<WatchlistStockItem> {
    const cleanSymbol = symbol.toUpperCase().trim();

    try {
      const watchlist = await prisma.watchlist.findFirst({ where: { id: watchlistId, userId } });
      if (!watchlist) {
        throw new Error('Watchlist not found');
      }

      const existing = await prisma.watchlistStock.findFirst({
        where: { watchlistId, symbol: cleanSymbol },
      });

      if (existing) {
        throw new Error(`Stock '${cleanSymbol}' is already in this watchlist`);
      }

      return await prisma.watchlistStock.create({
        data: {
          watchlistId,
          symbol: cleanSymbol,
          companyName,
        },
      });
    } catch (dbErr: any) {
      if (dbErr.message?.includes('already in this watchlist')) throw dbErr;
      if (dbErr.message?.includes('Watchlist not found')) throw dbErr;

      const userLists = await WatchlistsService.getUserWatchlists(userId);
      const targetWl = userLists.find((w) => w.id === watchlistId);
      if (!targetWl) {
        throw new Error('Watchlist not found');
      }

      if (targetWl.stocks.some((s) => s.symbol === cleanSymbol)) {
        throw new Error(`Stock '${cleanSymbol}' is already in this watchlist`);
      }

      const newStock: WatchlistStockItem = {
        id: `s-mem-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        watchlistId,
        symbol: cleanSymbol,
        companyName,
        addedAt: new Date(),
      };
      targetWl.stocks.unshift(newStock);
      return newStock;
    }
  }

  /**
   * Remove a stock from a watchlist
   */
  public static async removeStockFromWatchlist(watchlistId: string, userId: string, symbol: string): Promise<boolean> {
    const cleanSymbol = symbol.toUpperCase().trim();

    try {
      const watchlist = await prisma.watchlist.findFirst({ where: { id: watchlistId, userId } });
      if (!watchlist) return false;

      const stock = await prisma.watchlistStock.findFirst({
        where: { watchlistId, symbol: cleanSymbol },
      });

      if (!stock) return false;

      await prisma.watchlistStock.delete({
        where: { id: stock.id },
      });

      return true;
    } catch {
      const userLists = await WatchlistsService.getUserWatchlists(userId);
      const targetWl = userLists.find((w) => w.id === watchlistId);
      if (!targetWl) return false;
      const sIdx = targetWl.stocks.findIndex((s) => s.symbol === cleanSymbol);
      if (sIdx === -1) return false;
      targetWl.stocks.splice(sIdx, 1);
      return true;
    }
  }
}
